---
name: skail
description: Run, build and debug durable workflows on the Skail platform. Use when the user wants to try Skail or run one of its examples (the quickstart), when a project has a skail.json or imports @skail/runtime or Skail.Platform.Runtime, or when the user mentions Skail, workloads, SkailFunction/SkailCommand, durable tasks, task retries or the Skail Monitor.
metadata:
  version: "0.2.0"
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

C# (`-dotnet`) and TypeScript (`-node`) exist today; Java and Python are coming. Each example is one
app: it runs the worker (the Skail code) and serves a page at `http://localhost:8080` that starts and
stops runs; **the page is what triggers the example**, not the portal. The app reads `.env` from its
folder by itself. Read the example's README before running it: it is the source of truth for that
example.

### 1. Check the machine

Run these and report what is missing before going further — do not install system software without
asking:

- something to run the example with — any one is enough; the run script uses the first it finds, in
  this order: Docker (`docker info` must succeed: the service is running), Podman, or the language
  SDK — `node -v` (20.12 or newer, with `npm`) for TypeScript, `dotnet --list-sdks` (8 or newer; a
  runtime alone cannot build) for C#;
- the Skail CLI: `skail version --json`. If missing: for C#, `dotnet tool install -g Skail.Cli`; for
  TypeScript, `npm i -g @skail/cli` (or run it as `npx @skail/cli <command>`). `npx create-skail-app`
  only creates the project — it does not put `skail` on the PATH.

On Windows the run script works in the Windows PowerShell that ships with Windows; PowerShell 7 is not
needed.

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
`usdquote:v1.0.0`. **The workload in `.env` is the one the setup code carries** — the workload the
portal registered for this environment — and it can differ from the repository's `.env.example`: the
portal registers C# with a `dotnet` suffix (`usdquotedotnet:v1.0.0`) and TypeScript without it
(`usdquote:v1.0.0`), so both languages can share an environment without taking each other's runs.
When they differ, `init` warns `the setup code is for workload … and the template uses …: .env uses …`.
That warning is expected: keep what `.env` says and do not "fix" it back to `.env.example`. Without a
setup code, `.env` gets the `.env.example` value — make it match the workload registered in the portal.

### 3. Start the example

From the project folder, run the example's script — **with no arguments**:

- macOS, Linux, Git Bash, WSL: `scripts/run.sh`
- Windows (PowerShell or cmd): `powershell -ExecutionPolicy Bypass -File scripts\run.ps1`. Calling
  `scripts\run.ps1` directly stops on Windows' default execution policy.

The script picks Docker, then Podman, then the language SDK (it runs `npm ci` + `npm run build` +
`node dist/main.js`, or `dotnet run`), and if none is usable it says what to install — ask the user
before installing anything. There are no subcommands (no `up`, `logs`, `down` or `restart`): any
argument is passed on to the app. The app runs in the foreground; Ctrl+C stops it. If you start it
for the user, start it as a background process whose id you keep, so you can stop it and start it
again for step 4. To run it without the script, see
[references/run-without-containers.md](references/run-without-containers.md).

### 4. See it run — and see it survive

1. Ask the user to open `http://localhost:8080` and start a run (or open it for them).
2. The run shows up in the portal Monitor and with `skail tasks list --since 10m --json`, run from the
   project folder (the CLI reads the connection from `.env`). The quickstart page on dash.skail.dev
   also detects the worker and the first run.
3. **Durability**: while the run is waiting (the `usd-quote` example waits one minute between quotes),
   stop the app — Ctrl+C, or stop the process you started — and run the script again. The whole app
   closes; the run stays in Skail, waiting. The app that comes back receives it and the next quote
   arrives on schedule, numbered after the last one. The quotes from before the restart lived in the
   memory of the app that closed, so the page does not show them; the Monitor does. This is the point
   of Skail; show it.

### When something fails

| Symptom | Cause |
|---|---|
| `This setup code is no longer valid` | used, expired (15 min) or mistyped. Ask for a new one from the portal. |
| The CLI asked for the code and read the next command as the code | several commands were pasted at once. Run `init` alone. |
| `npx create-skail-app` answers 404 | the npm package is not available. Clone `github.com/skaildev/skail-<id>-node`, copy `.env.example` to `.env` and fill the connection from the portal's "Configure an existing project" tab. |
| `running scripts is disabled on this system` | `scripts\run.ps1` was called directly: use `powershell -ExecutionPolicy Bypass -File scripts\run.ps1`. |
| `Nothing to run the demo with` | none of Docker, Podman or the SDK is usable (the message lists what to install). Ask the user which one to install. `docker` installed but its service stopped counts as missing. |
| `Node.js … is too old` / `dotnet was found, but without the .NET 8 SDK` | install Node.js 20.12+ or the .NET 8 SDK. |
| `Missing .env` / `SKAIL_WORKLOAD is empty in .env` | `init` ran without a setup code, so it wrote no `.env`: copy `.env.example` to `.env` and fill it from the portal's "Configure an existing project" tab. |
| Worker is connected but never receives work | `SKAIL_WORKLOAD` in `.env` differs from the workload registered in the portal, or whoever triggers uses another version string (without the `v`, or other case). See [references/troubleshooting.md](references/troubleshooting.md). |
| A run started in one language is handled by the other language's app | both apps use the same `SKAIL_WORKLOAD` on the same environment and share its runs. Use the workload from the setup code (C# has the `dotnet` suffix), or another environment. |

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
| [run-without-containers.md](references/run-without-containers.md) | running an example without its `scripts/run.*` (an IDE, a debugger, a custom setup) |
| [troubleshooting.md](references/troubleshooting.md) | a task failed, never ran, or the worker gets no work |
