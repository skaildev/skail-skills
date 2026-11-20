# Running an example without its script

`scripts/run.sh` and `scripts/run.ps1` already run the example without containers when the machine has
no Docker or Podman: they fall back to the language SDK by themselves. Use this page only when the
script cannot be used: an IDE or debugger, a process you must manage yourself, a custom setup.

Each example is one app (worker + page on `http://localhost:8080`). It loads `.env` from its folder (or
a parent folder) by itself, so there is no variable to export and no second process to start.

## Commands, from the project folder

- **TypeScript** (Node.js 20.12 or newer): `npm ci` (or `npm install`), `npm run build`, `npm start`.
  The build bakes `SKAIL_WORKLOAD` from `.env` into the durable bundle (`.skail/`): **run
  `npm run build` again after changing `SKAIL_WORKLOAD`**, or the app keeps serving the old workload.
- **C#** (.NET 8 SDK or newer): `dotnet run`. It reads `SKAIL_WORKLOAD` at start; no rebuild needed.

Variables already set in the process environment win over `.env`. If the app connects with the wrong
workload or key, look for a stale `SKAIL_*` exported in that shell before editing `.env`.

For the durability demo, keep the process id: stop the app while a run waits, then start it again.

## Windows notes

- Windows PowerShell 5.1 (the one that ships with Windows) is enough, for the script and for these
  commands. Run the script as `powershell -ExecutionPolicy Bypass -File scripts\run.ps1`.
- If you write a helper script for the user, keep it ASCII-only: Windows PowerShell 5.1 reads a script
  without a byte order mark in the system code page, and a typographic dash or quote breaks parsing.
- In Windows PowerShell 5.1 with `$ErrorActionPreference = 'Stop'`, redirecting a native command's
  stderr turns any stderr line into a terminating error. Check `$LASTEXITCODE` instead.
