# Running an example without containers

The examples' `scripts/run.sh` and `scripts/run.ps1` need podman or docker. Without either, run the web
app and the worker straight from the SDK. The example's `.vscode/launch.json` lists, for each app, the
`program`, its `cwd` and its extra `env` — it is the reference for that example; reproduce it.

## Steps

1. **Load `.env`.** Put every `KEY=VALUE` line of `.env` into the environment of the processes you start.
   The apps do not read `.env` themselves. Strip surrounding quotes from values; ignore comments and
   blank lines.
2. **Point the worker at localhost.** `.env` sets `WEB_BASE_URL` to the web app's container name, which
   does not exist outside containers. Set `WEB_BASE_URL=http://localhost:<WEB_PORT>` (default port
   8080). For a .NET web app, also set `ASPNETCORE_URLS=http://localhost:<WEB_PORT>`.
3. **Build.**
   - C#: `dotnet build` on the solution at the root.
   - TypeScript: `pnpm install`, then `pnpm build` (it runs `skail build` for the durable bundle).
4. **Start the web app**, then wait until `http://localhost:<WEB_PORT>` answers.
5. **Start the worker.**
6. Keep each app in its own terminal, or as a background process whose id you keep. The durability demo
   needs to stop and start **only the worker** while a run waits.

Which project is the web app and which is the worker is in the example's README and `launch.json`
(for `usd-quote` in C#: `src/SkailUsdQuote.Web` and `src/SkailUsdQuote.Worker`).

## Windows notes

- Windows PowerShell 5.1 (the one that ships with Windows) is enough for this path; only
  `scripts/run.ps1` needs PowerShell 7.
- If you write a helper script for the user, keep it ASCII-only: Windows PowerShell 5.1 reads a script
  without a byte order mark in the system code page, and a typographic dash or quote breaks parsing.
- In Windows PowerShell 5.1 with `$ErrorActionPreference = 'Stop'`, redirecting a native command's
  stderr turns any stderr line into a terminating error. Check `$LASTEXITCODE` instead.
