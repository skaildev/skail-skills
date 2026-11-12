# Starting tasks and firing events from outside

Use the SDK client where there is one, or the environment's public HTTP API described here.

## Address and authentication

`{base}` is the environment's API address from the portal (the same host as the sidecar URL in
`.env`). Do not build it by hand: the host is part of authentication, and a key used against a host of
another environment is a 401.

Authenticate with **`Authorization: Bearer <SKAIL_KEY>`** and nothing else. The namespace comes from the
key and the host; `skail-key` or `Skail-namespace` headers are not used by this API. A missing
`Authorization` header is a 400.

## Start a task

`POST {base}/api/v1/trigger/{name}/{version}/{method}/{taskId}` with a JSON **array of positional
arguments** as the body (a body that is not an array is a 400). Accepted means queued, not finished.

- `{version}` is the version **exactly as registered, with the `v`** — the version part of
  `SKAIL_WORKLOAD` (`usdquote:v1.0.0` → `usdquote/v1.0.0/...`). `1.0.0` without the `v` is a different
  subject: the call returns 200 and the task is queued where no worker listens — it never runs and
  nothing reports an error. The workload name is case-insensitive; version and method are not.
- `{taskId}` must be a **lowercase GUID** (uppercase letters, or anything else, is a 400) and is
  required. Generate it on the client and reuse it on every retry of the same logical start.
  `uuidgen` prints uppercase on macOS: lowercase it. In PowerShell, `[guid]::NewGuid().ToString()` is
  already lowercase.

```bash
curl -X POST "$BASE/api/v1/trigger/usdquote/v1.0.0/TrackUsdQuote/$(uuidgen | tr 'A-Z' 'a-z')" \
  -H "Authorization: Bearer $SKAIL_KEY" \
  -H "Content-Type: application/json" \
  -d '["BRL"]'
```

The v1 trigger answers with the full `ProduceResponse` (protojson). There is also
`/api/v2/trigger/{name}/{version}/{method}`, where the task id is optional and the answer is
`{"task_id": "..."}`; prefer v1 with your own GUID, so a retry can never start a second task. Do not
parse one shape expecting the other.

**After triggering, confirm the task exists**: `skail tasks get <taskId> --json`. A trigger with the
wrong version or workload is the most likely mistake and the only one that returns success. The
Monitor reads a replica, so a 404 in the first seconds is normal: try again before concluding the
task is missing.

## Fire an event

`POST {base}/api/v1/fire/{eventName}/{eventId}` with the event's JSON payload, using the same name and
id the function waits on. The function does not need to be waiting yet: an early fire is kept and
delivered to the next wait for that name and id ([concepts.md](concepts.md#events)). Each fire is
delivered once, so do not fire again "to be sure" — that would serve a second wait.

## Retries

Retry 429, 5xx and network errors **with the same task id**; do not retry 400, 401 or 403. Never build
internal frames or call internal RPC endpoints from application code.
