package nicks

func min3(a, b, c int) int {
	if a <= b && a <= c {
		return a
	}
	if b <= c {
		return b
	}
	return c
}

func min2(a, b int) int {
	if a <= b {
		return a
	}
	return b
}

// DamerauLevenshtein returns the edit distance between a and b in Unicode code points.
func DamerauLevenshtein(a, b string) int {
	ar := []rune(a)
	br := []rune(b)
	if len(ar) == 0 && len(br) == 0 {
		return 0
	}
	la, lb := len(ar), len(br)
	if la == 0 {
		return lb
	}
	if lb == 0 {
		return la
	}

	d := make([][]int, la+1)
	for i := range d {
		d[i] = make([]int, lb+1)
	}
	for i := 0; i <= la; i++ {
		d[i][0] = i
	}
	for j := 0; j <= lb; j++ {
		d[0][j] = j
	}

	for i := 1; i <= la; i++ {
		for j := 1; j <= lb; j++ {
			cost := 1
			if ar[i-1] == br[j-1] {
				cost = 0
			}
			d[i][j] = min3(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost)

			if i > 1 && j > 1 && ar[i-1] == br[j-2] && ar[i-2] == br[j-1] {
				d[i][j] = min2(d[i][j], d[i-2][j-2]+1)
			}
		}
	}

	return d[la][lb]
}

// ResolveNick resolves a nick using the default Damerau-Levenshtein threshold.
func ResolveNick(query, commandPlatform string, candidates []Candidate) (viewerID string, reason ResolveReason) {
	return Resolve(query, commandPlatform, candidates, DamerauLevenshtein)
}
