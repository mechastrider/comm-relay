## Runtime

The same connector runs on desktop and headless builds. Only public HTTPS and WSS endpoints are contacted; the entered URL supplies a channel key. A network failure is isolated to this connector. Process shutdown cancels the request or closes the socket.
