# The `skail` CLI

## Output and exit codes

Always pass `--json` and read stdout as JSON. Errors arrive on stderr as
`{"error":{"code","message","hint"}}`.

| Exit code | Meaning |
|---|---|
| 0 | ok |
| 2 | bad usage |
| 3 | not logged in, or no permission |
| 4 | not found |
| 5 | conflict |
| 6 | out of credits |
| 7 | `--wait` timed out |
| 8 | the task failed |
| 9 | network or server error — safe to retry |

The CLI never prompts without a terminal; a missing input is the error `input_required`.
`skail commands --json` lists every command, flag and output shape — check it instead of guessing a
flag.

## Common commands

```bash
skail version --json
skail templates list --json                  # the examples available
skail run <workload>/<Method> --data '[...]' --wait --json
skail tasks list --since 1h --json           # recent tasks; --status failed, --workload <name:vX.Y.Z>
skail tasks get <taskId> --json              # status, retries, timing
skail tasks result <taskId> --json           # return value or error
skail tasks timeline <taskId> --json         # every durable step, in order
skail tasks retry <taskId> --json
skail events fire <name> <id> --data '<json>' --json
skail debug <taskId> --print --json          # SKAIL_DEBUG_FILE to replay the task locally
```

Run these from the project folder: they read the environment connection (`SKAIL_SIDECAR_URL`,
`SKAIL_NAMESPACE`, `SKAIL_KEY`) from `.env`, or from the process environment. No login needed.

Account commands — `skail whoami`, `skail up` (project + environment + workload + `.env`,
idempotent), `skail orgs`, `skail projects`, `skail envs` — need a login (below).

`skail dev` and `skail build` run the `dev` / `build` commands of `skail.json`. The examples do not
define them and answer `no_dev_command`: run an example with its `scripts/run.sh` (see the README).

Inside a TypeScript project, `npx skail` runs `@skail/build`'s binary, not this CLI; use the global
`skail` or `npx @skail/cli <command>` there.

## Replaying a task locally

`skail debug <taskId> --print --json` exports the task's recorded history and returns
`SKAIL_DEBUG_FILE` (a signed URL, valid 24 h). Start the worker with that variable set: completed steps
are replayed from the history, no side effect runs again, and the replay stops at the first step that
has not happened yet. Without `--print`, `skail debug` starts the worker itself with the `dev` command
of `skail.json`, or with `--command "<how this project starts its worker>"`.

## Login

Account commands need a login once. An agent's shell only shows output when a command ends, so use the
two-step login:

1. `skail login --start --json` returns `verificationUri` and `userCode`. **Show both to the user** and
   ask them to approve in the browser.
2. `skail login --complete --json` waits until they approve.

In CI the user sets `SKAIL_TOKEN` instead.

If `skail login --start` answers `device_login_unavailable`, browser login is not enabled in this CLI
version: the account commands are not available. The quickstart (setup code) and the commands that
read `.env` keep working.

## Secrets

Commands that take a secret read it from stdin (`--code -`, `--with-token`); never put a secret on the
command line. `.env` holds the environment key; never print or commit it.

## Destructive commands

Deleting environments, workloads or keys, and rotating keys, require `--confirm <name>`. Run them only
when the user explicitly asked, and let the user supply the confirmation. `skail keys rotate`
disconnects every worker still using the old key. `skail billing open` hands plans and billing to the
user's browser; do not change them yourself.
