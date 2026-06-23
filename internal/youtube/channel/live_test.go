package channel

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type staticHTTPClient struct {
	responses []*http.Response
	index     int
}

func (c *staticHTTPClient) Do(req *http.Request) (*http.Response, error) {
	if c.index >= len(c.responses) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader("")),
			Header:     make(http.Header),
			Request:    req,
		}, nil
	}
	resp := c.responses[c.index]
	c.index++
	if resp.Request == nil {
		resp.Request = req
	}
	if resp.Header == nil {
		resp.Header = make(http.Header)
	}
	return resp, nil
}

func TestResolveLiveVideoID_WhenRedirectedToWatch_ExpectVideoID(t *testing.T) {
	t.Parallel()

	watchURL, err := http.NewRequest(http.MethodGet, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", nil)
	require.NoError(t, err)

	client := &staticHTTPClient{
		responses: []*http.Response{{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader("<html></html>")),
			Request:    watchURL,
		}},
	}

	resolver := NewLiveResolver(client)
	id, err := resolver.ResolveLiveVideoID(context.Background(), Ref{Handle: "example"})
	require.NoError(t, err)
	require.Equal(t, "dQw4w9WgXcQ", id)
}

func TestResolveLiveVideoID_WhenOfflinePage_ExpectErrNoLiveStream(t *testing.T) {
	t.Parallel()

	html := `<html><script>window["ytInitialData"] = {
		"contents": {
			"twoColumnBrowseResultsRenderer": {
				"tabs": [{
					"tabRenderer": {
						"content": {
							"sectionListRenderer": {
								"contents": [{
									"itemSectionRenderer": {
										"contents": [{
											"messageRenderer": {
												"text": {"runs": [{"text": "offline"}]}
											}
										}]
									}
								}]
							}
						}
					}
				}]
			}
		},
		"playabilityStatus": {"status": "LIVE_STREAM_OFFLINE"}
	};</script></html>`

	pageURL, err := http.NewRequest(http.MethodGet, "https://www.youtube.com/@example/live", nil)
	require.NoError(t, err)

	client := &staticHTTPClient{
		responses: []*http.Response{{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(html)),
			Request:    pageURL,
		}},
	}

	resolver := NewLiveResolver(client)
	_, err = resolver.ResolveLiveVideoID(context.Background(), Ref{Handle: "example"})
	require.ErrorIs(t, err, ErrNoLiveStream)
}

func TestResolveLiveVideoID_WhenCurrentVideoEndpointPresent_ExpectVideoID(t *testing.T) {
	t.Parallel()

	html := `<html><script>window["ytInitialData"] = {
		"currentVideoEndpoint": {
			"watchEndpoint": {"videoId": "dQw4w9WgXcQ"}
		}
	};</script></html>`

	pageURL, err := http.NewRequest(http.MethodGet, "https://www.youtube.com/@example/live", nil)
	require.NoError(t, err)

	client := &staticHTTPClient{
		responses: []*http.Response{{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(html)),
			Request:    pageURL,
		}},
	}

	resolver := NewLiveResolver(client)
	id, err := resolver.ResolveLiveVideoID(context.Background(), Ref{Handle: "example"})
	require.NoError(t, err)
	require.Equal(t, "dQw4w9WgXcQ", id)
}
