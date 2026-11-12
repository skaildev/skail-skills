---
name: skail
description: Run, build and debug durable workflows on the Skail platform. Use when the user wants to try Skail or run one of its examples (the quickstart), when a project has a skail.json or imports @skail/runtime or Skail.Platform.Runtime, or when the user mentions Skail, workloads, SkailFunction/SkailCommand, durable tasks, task retries or the Skail Monitor.
metadata:
  version: "0.1.0"
---

# Skail

Skail runs **durable** code. A `SkailFunction` describes a flow; a `SkailCommand` performs one side
effect; a **Task** is one durable execution of a function, identified by a `TaskId`. The code runs on
the user's own machines (the **worker**); Skail stores the queue, the history and the Monitor. A Task
can wait for minutes or days — a timer, an external event — without keeping the function, the worker's
memory or a connection alive.

| Concept | What it means in application code |
|---|---|
| Workload | The application and its version, `name:vX.Y.Z` (e.g. `usdquote:v1.0.0`). A function is `<workload>/<Method>`. |
| Environment | Where tasks live. A worker connects to it with `SKAIL_WORKLOAD`, `SKAIL_NAMESPACE`, `SKAIL_KEY` and the sidecar URL. |
| Activation | One pass of the runtime over a Task: load the history, run the code until it completes, fails or needs to wait. A Task can have many activations, on different workers. |

**Reading this from a URL?** The files linked below are next to this one:
`https://raw.githubusercontent.com/skaildev/skail-skills/main/skills/skail/references/<file>.md`.

This file gets an example running end to end — do it when the user asks to try Skail or follow the
quickstart. Before writing or changing Skail code, read [references/concepts.md](references/concepts.md)
and the language file. The [index](#references) at the end says which file answers what.

---

## Run an example (the quickstart)

The user picked, or will pick, an example and a language on dash.skail.dev → Quickstart. Each example
is a public repository on github.com/skaildev, one per example and language:

| Example id | Shows | Repositories |
|---|---|---|
| `usd-quote` (start here) | durable delay, external event, "event or deadline, whichever comes first" | `skail-usd-quote-dotnet`, `skail-usd-quote-node` |
| `payment-webhook` | idempotent intake: resends of the same event land on the same run | `skail-payment-webhook-*` |
| `catalog-import` | paging an external API, retrying only the failed page, resuming after a crash | `skail-catalog-import-*` |
| `batch-billing` | fan-out in waves, per-item retry | `skail-batch-billing-*` |
| `saga` | compensation: undo previous steps in reverse order on failure | `skail-saga-*` |
| `purchase-approval` | human in the loop with escalation on deadline | `skail-purchase-approval-*` |
| `document-signing` | parallel approvals in any order, cancel on refusal or deadline | `skail-document-signing-*` |
| `subscription-cycle` | long-lived lifecycle: trial, monthly charge, retry, cancel | `skail-subscription-cycle-*` |
| `agent-with-tools` | an AI agent whose every decision is a recorded step | `skail-agent-with-tools-*` |

C# (`-dotnet`) and TypeScript (`-node`) exist today; Java and Python are coming. Each example has a
worker (the Skail code) and a small web app that starts and stops runs; **the web app is what triggers
the example**, not the portal. Read the example's README before running it: it is the source of truth
for that example.

### 1. Check the machine

Run these and report what is missing before going further — do not install system software without
asking:

- the language SDK: `dotnet --list-sdks` (needs .NET 8+) or `node -v` (20, 22 or 24) and `pnpm -v` (10);
- the Skail CLI: `skail version --json`. If missing: for C#, `dotnet tool install -g Skail.Cli`; for
  TypeScript, `npm i -g @skail/cli` (or run it as `npx @skail/cli <command>`). `npx create-skail-app`
  only creates the project — it does not put `skail` on the PATH;
- a container engine (optional): `podman --version` or `docker --version`;
- on Windows, PowerShell 7 (optional, only for `scripts/run.ps1`): `pwsh -v`.

### 2. Create the project, connected to the user's environment

The portal shows a **setup code** (`skail_qs_` + 32 hex characters, single use, valid for 15 minutes).
It is redeemed once for the environment's connection and written to `.env`.

```bash
# TypeScript
npx create-skail-app@latest --template <id> --code -
# C#
skail init --template <id> --lang cs --code -
```

`--code -` reads the code from **stdin**. Never pass it as an argument (it would land in the shell
history and the process list). Ask the user for a fresh code from the portal right before this step,
pipe it in with a shell builtin, and do not repeat it back:

```bash
printf '%s\n' "$CODE" | skail init --template <id> --lang cs --code -   # bash: printf is a builtin
'<code>' | skail init --template <id> --lang cs --code -                # PowerShell
```

If the user prefers to keep the code out of the chat, do not run step 2: give them the exact command
above **without** `--code -`, to run alone in their own terminal (it asks for the code there), and
continue from step 3 once the folder exists. Never paste several commands for them to run at once
after `init`: the code prompt would read the next line as the code.

The CLI creates a folder named after the example id, writes `.env` and prints the workload, e.g.
`usdquote:v1.0.0`. **The workload comes from the repository's `.env.example`, not from the example id**
— keep it as written.

### 3. Start the worker and the web app

Pick the first option that works on this machine:

1. **With podman or docker** — from the project folder:
   `scripts/run.sh up` (macOS, Linux, Git Bash, WSL) or `pwsh scripts/run.ps1 up` (Windows with
   PowerShell 7). `scripts/run.sh logs` follows the logs; `down` stops everything.
2. **Without containers** — run both apps straight from the SDK
   ([references/run-without-containers.md](references/run-without-containers.md) has the details):
   - load every `KEY=VALUE` of `.env` into the process environment (the apps do not read `.env`
     themselves);
   - set `WEB_BASE_URL=http://localhost:<WEB_PORT>` for the worker: `.env` points at the web app's
     container name, which does not exist outside containers;
   - build, start the web app, wait until it answers on `http://localhost:<WEB_PORT>` (default 8080),
     then start the worker — each in its own terminal or as a background process whose id you keep,
     so the worker can be restarted alone later.

### 4. See it run — and see it survive

1. Ask the user to open `http://localhost:8080` and start a run (or open it for them).
2. The run shows up in the portal Monitor and with `skail tasks list --since 10m --json`, run from the
   project folder (the CLI reads the connection from `.env`). The quickstart page on dash.skail.dev
   also detects the worker and the first run.
3. **Durability**: while the run is waiting (the `usd-quote` example waits 30 s between quotes),
   restart only the worker — `scripts/run.sh restart`, or stop and start the worker process. The run
   continues on schedule, handled by the new worker. This is the point of Skail; show it.

### When something fails

| Symptom | Cause |
|---|---|
| `This setup code is no longer valid` | used, expired (15 min) or mistyped. Ask for a new one from the portal. |
| The CLI asked for the code and read the next command as the code | several commands were pasted at once. Run `init` alone. |
| `npx create-skail-app` answers 404 | the npm package is not available. Clone `github.com/skaildev/skail-<id>-node`, copy `.env.example` to `.env` and fill the connection from the portal's "Configure an existing project" tab. |
| `'pwsh' is not recognized` | Windows without PowerShell 7: use `scripts/run.sh` in Git Bash/WSL, install PowerShell 7, or run without containers. |
| `neither podman nor docker found` | run without containers (step 3, option 2), or install one. |
| Worker is connected but never receives work | `SKAIL_WORKLOAD` in `.env` differs from the workload registered in the portal, or whoever triggers uses another version string (without the `v`, or other case). See [references/troubleshooting.md](references/troubleshooting.md). |
| The web app cannot reach the worker's progress | `WEB_BASE_URL` still points at the container name; set it to `http://localhost:<port>`. |

---

## Safety

- Never print, log or commit `.env` — it holds the environment key `SKAIL_KEY`. Never ask the user to
  paste keys or tokens into the chat. The quickstart setup code is the only secret you may receive, and
  only through stdin as described in step 2.
- Do not delete environments, workloads or keys, or rotate keys, unless the user explicitly asked.
  Destructive commands require `--confirm <name>`; let the user supply it. Rotating a key disconnects
  every worker still using the old one.
- Do not change plans or billing; `skail billing open` hands that to the user's browser.
- Ask before installing system software (container engines, PowerShell, SDKs).

## References

| File | Read it when |
|---|---|
| [concepts.md](references/concepts.md) | before writing or changing any Skail code: replay, determinism, commands, idempotency, failures |
| [csharp.md](references/csharp.md) | the project is C# / .NET |
| [typescript.md](references/typescript.md) | the project is TypeScript / Node |
| [environment-api.md](references/environment-api.md) | starting a task or firing an event from outside the worker (HTTP) |
| [cli.md](references/cli.md) | running any `skail` command: output, exit codes, login |
| [run-without-containers.md](references/run-without-containers.md) | the machine has neither podman nor docker |
| [troubleshooting.md](references/troubleshooting.md) | a task failed, never ran, or the worker gets no work |
