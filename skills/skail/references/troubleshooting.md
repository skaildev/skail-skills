# Troubleshooting

## A task failed

1. `skail tasks list --status failed --since 1h --json` → pick the task.
2. `skail tasks result <taskId> --json` → the error (`type`, `title`; `detail` has the stack).
3. `skail tasks timeline <taskId> --json` → which step failed and how many attempts it took.
4. Fix the code. If the fix changes the sequence of durable calls, ship a new workload version
   (see [concepts.md](concepts.md)).
5. `skail tasks retry <taskId> --json` runs it again. To replay it locally, `skail debug <taskId>
   --print --json` returns `SKAIL_DEBUG_FILE`; start the worker with it — completed steps come from the
   history and no side effect runs again ([cli.md](cli.md#replaying-a-task-locally)).

A function that exhausted its retries ends in `CompletedError`. A caller waiting on it through a stub
does **not** get an exception: it keeps waiting, so the task can be retried after the fix.

## `SkailNonDeterministicError`

The code no longer makes the same durable calls, in the same order, as the history of a running task:
a step was inserted, removed, reordered or renamed, or a branch depends on the clock, randomness or I/O.
Restore the old sequence for tasks in flight, or ship the change as a new workload version.

## The task never runs

The worker is connected but receives no work, or a trigger returned success and nothing happened.

| Check | How |
|---|---|
| The workload in `.env` | `SKAIL_WORKLOAD` must be exactly the workload registered in the portal, e.g. `usdquote:v1.0.0`. |
| The version in the trigger | `{version}` must carry the `v` and match case: `v1.0.0`, not `1.0.0`. Without it the task is queued where no worker listens, and the trigger still answers 200. |
| The task exists | `skail tasks get <taskId> --json` after the trigger. The Monitor reads a replica: a 404 in the first seconds is normal, try again before concluding the task is missing. |
| The task is waiting, not lost | `skail tasks timeline <taskId> --json`: a pending delay or event wait is normal. |

## Connection errors

| Symptom | Cause |
|---|---|
| The environment API answers 401 with the right key | the host does not belong to that key's environment. Use the address from the portal, not one built by hand. |
| 400 on every call | the `Authorization: Bearer <SKAIL_KEY>` header is missing, the body of a trigger is not a JSON array, or the task id is not a lowercase GUID (`uuidgen` prints uppercase on macOS). |
| Node worker logs only `Sidecar Consume request failed` | an old Node runtime that does not read `SKAIL_SIDECAR_URL`/`SKAIL_KEY`/`SKAIL_NAMESPACE` and connects to `localhost:8080` without a key; the real cause (`ECONNREFUSED`) is in the error's `cause`. Update `@skail/runtime`. |
| CLI exit code 3 | an account command without login (two-step login in [cli.md](cli.md); `device_login_unavailable` means login is not enabled in this CLI version), or a data command run outside the project folder, without the `.env` connection. |
| CLI exit code 6 | the organization is out of credits; the user handles it in the portal (`skail billing open`). |
