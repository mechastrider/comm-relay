package overlayassets

import (
	"bytes"
	"encoding/binary"

	"github.com/muonsoft/errors"
)

var (
	// ErrInvalidAudio is returned when audio bytes cannot be parsed.
	ErrInvalidAudio = errors.New("invalid audio file")
	// ErrAudioDuration is returned when duration is outside the allowed alert range.
	ErrAudioDuration = errors.New("audio duration must be between 1 and 15 seconds")
)

const (
	minAlertSoundSeconds = 1.0
	maxAlertSoundSeconds = 15.0
)

// ValidateAlertSoundDuration inspects MP3 or WAV bytes and enforces the 1–15 s window.
func ValidateAlertSoundDuration(data []byte) error {
	duration, err := audioDurationSeconds(data)
	if err != nil {
		return err
	}
	if duration < minAlertSoundSeconds || duration > maxAlertSoundSeconds {
		return ErrAudioDuration
	}
	return nil
}

func audioDurationSeconds(data []byte) (float64, error) {
	if len(data) < 12 {
		return 0, ErrInvalidAudio
	}
	if bytes.Equal(data[0:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WAVE")) {
		return wavDurationSeconds(data)
	}
	if isMP3(data) {
		return mp3DurationSeconds(data)
	}
	return 0, ErrInvalidAudio
}

func isMP3(data []byte) bool {
	if len(data) >= 3 && data[0] == 'I' && data[1] == 'D' && data[2] == '3' {
		return true
	}
	if len(data) >= 2 && data[0] == 0xff && (data[1]&0xe0) == 0xe0 {
		return true
	}
	return false
}

func wavDurationSeconds(data []byte) (float64, error) {
	var sampleRate uint32
	var bitsPerSample uint16
	var channels uint16
	var dataSize uint32

	offset := 12
	for offset+8 <= len(data) {
		chunkID := string(data[offset : offset+4])
		chunkSize := binary.LittleEndian.Uint32(data[offset+4 : offset+8])
		chunkData := offset + 8
		if chunkData+int(chunkSize) > len(data) {
			break
		}
		switch chunkID {
		case "fmt ":
			if chunkSize >= 16 && chunkData+16 <= len(data) {
				channels = binary.LittleEndian.Uint16(data[chunkData+2 : chunkData+4])
				sampleRate = binary.LittleEndian.Uint32(data[chunkData+4 : chunkData+8])
				bitsPerSample = binary.LittleEndian.Uint16(data[chunkData+14 : chunkData+16])
			}
		case "data":
			dataSize = chunkSize
		}
		offset = chunkData + int(chunkSize)
		if chunkSize%2 == 1 {
			offset++
		}
	}

	if sampleRate == 0 || channels == 0 || bitsPerSample == 0 || dataSize == 0 {
		return 0, ErrInvalidAudio
	}

	bytesPerFrame := uint64(channels) * uint64(bitsPerSample) / 8
	if bytesPerFrame == 0 {
		return 0, ErrInvalidAudio
	}

	return float64(dataSize) / float64(sampleRate) / float64(bytesPerFrame), nil
}

var mp3SampleRates = []int{
	44100, 48000, 32000, 0, 0, 0, 0, 0,
	22050, 24000, 16000, 0, 0, 0, 0, 0,
	11025, 12000, 8000, 0, 0, 0, 0, 0,
}

func mp3DurationSeconds(data []byte) (float64, error) {
	offset := skipID3Tag(data)
	var totalSamples int64
	var sampleRate int
	frames := 0

	for offset+4 < len(data) {
		if data[offset] != 0xff || (data[offset+1]&0xe0) != 0xe0 {
			offset++
			continue
		}

		header := uint32(data[offset])<<24 | uint32(data[offset+1])<<16 | uint32(data[offset+2])<<8 | uint32(data[offset+3])
		version := int((header >> 19) & 0x3)
		layer := int((header >> 17) & 0x3)
		bitrateIndex := (header >> 12) & 0xf
		sampleRateIndex := (header >> 10) & 0x3
		padding := (header >> 9) & 0x1

		if layer == 0 || bitrateIndex == 0 || bitrateIndex == 0xf || sampleRateIndex == 0x3 {
			offset++
			continue
		}

		bitrate := mp3BitrateKbps(version, layer, int(bitrateIndex))
		if bitrate <= 0 {
			offset++
			continue
		}

		sampleRate = mp3SampleRate(version, int(sampleRateIndex))
		if sampleRate <= 0 {
			offset++
			continue
		}

		frameSamples := mp3FrameSamples(version, layer)
		if frameSamples <= 0 {
			offset++
			continue
		}

		frameLen := mp3FrameLength(version, layer, bitrate, sampleRate, int(padding))
		if frameLen <= 0 || offset+frameLen > len(data) {
			break
		}

		totalSamples += int64(frameSamples)
		frames++
		offset += frameLen
	}

	if frames == 0 || sampleRate == 0 {
		return 0, ErrInvalidAudio
	}

	return float64(totalSamples) / float64(sampleRate), nil
}

func skipID3Tag(data []byte) int {
	if len(data) < 10 || data[0] != 'I' || data[1] != 'D' || data[2] != '3' {
		return 0
	}
	size := int(data[6]&0x7f)<<21 | int(data[7]&0x7f)<<14 | int(data[8]&0x7f)<<7 | int(data[9]&0x7f)
	return 10 + size
}

func mp3SampleRate(version, index int) int {
	if index < 0 || index >= len(mp3SampleRates) {
		return 0
	}
	rate := mp3SampleRates[index]
	if version == 3 { // MPEG1
		return rate
	}
	if version == 2 { // MPEG2
		return rate / 2
	}
	if version == 0 { // MPEG2.5
		return rate / 4
	}
	return 0
}

func mp3FrameSamples(version, layer int) int {
	if layer == 3 { // Layer I
		return 384
	}
	if version == 3 {
		return 1152
	}
	return 576
}

func mp3FrameLength(version, layer, bitrateKbps, sampleRate, padding int) int {
	if sampleRate == 0 {
		return 0
	}
	if layer == 3 {
		return int((12*bitrateKbps*1000)/sampleRate) + padding
	}
	if version == 3 {
		return int((144*bitrateKbps*1000)/sampleRate) + padding
	}
	return int((72*bitrateKbps*1000)/sampleRate) + padding
}

func mp3BitrateKbps(version, layer, index int) int {
	// MPEG1 Layer III bitrates (kbps); index 1-14.
	mpeg1Layer3 := []int{0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320}
	mpeg2Layer3 := []int{0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160}
	if index < 0 || index >= len(mpeg1Layer3) {
		return 0
	}
	if version == 3 && layer == 1 {
		return mpeg1Layer3[index]
	}
	if layer == 1 {
		return mpeg2Layer3[index]
	}
	// Layer I/II fall back to MPEG1 tables for our duration gate.
	return mpeg1Layer3[index]
}
