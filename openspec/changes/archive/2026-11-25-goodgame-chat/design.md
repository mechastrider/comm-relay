## Decisions

Resolve the case-preserving channel key with the public stream API v4. Connect to the documented [GoodGame chat v2 endpoint](https://github.com/GoodGame/API/blob/master/Chat/protocol2.md), check the welcome version and join using the numeric ID. Mark the connection live after acknowledgement, including in quiet rooms.

Publish only live public messages for the joined room. Decode escaped text once, namespace message IDs and retain upstream viewer IDs. Use the streamer's ID from the join response to identify the broadcaster. Existing bus consumers handle live views, commands, statistics and OBS delivery.

## Recovery

Monitor settings while the reader runs. Cancel and await the old session before replacing it. Bound discovery and handshake time, reconnect with capped exponential backoff, and keep a bounded in-memory window of recent IDs between retries. A new session does not request history.
