---
name: mcp-tool-input-schema
description: Conventions for MCP tool input schemas so clients pass client-side JSON Schema validation. Use when adding or changing MCP tools (any language).
---

# MCP tool input schema ergonomics

MCP clients validate tool arguments against the tool's generated JSON Schema
**before** the request ever reaches your server. A schema that is stricter or
wronger than your handler causes silent client-side failures: the user sees a
validation error and your server logs show no request at all.

## Rules

1. **Mark only truly required fields as required.** Every optional field must be
   omittable from the schema (e.g. `omitempty` struct tags in Go, optional
   properties elsewhere). A field that is convenient-but-optional in the handler
   but `required` in the schema blocks every client that omits it.
2. **Type object-valued arguments as a generic object, not a raw-bytes type.**
   Raw byte buffers (e.g. Go's `json.RawMessage`, `[]byte`) often serialize to an
   `array-of-integers` schema that rejects ordinary JSON objects. Declare the
   argument as a free-form object and parse/normalize it inside the handler.
3. **Accept `null` and absence for optional fields.** Clients frequently send
   `null` for an omitted optional value (timestamps, ids, filters). Treat
   `null`, empty string, and absence as "not provided" rather than failing.
4. **Snapshot the generated schemas in a test.** Add a regression test that
   serializes each tool's input schema and asserts it against a stored snapshot,
   so an accidental `required` field or a type change fails CI instead of
   reaching clients.

## Symptom of a broken schema

An agent reports that an MCP tool call failed client-side validation, but the
server received and logged nothing. Inspect the generated schema for that tool:
look for spurious `required` entries or an object argument typed as an
array/byte buffer.
