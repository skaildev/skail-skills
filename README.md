# Skail skills for AI agents

Instructions that teach an AI coding agent — Claude Code, Codex, Cursor, GitHub Copilot or any agent
that can read a URL — to run the Skail examples and to write, run and debug durable workflows on
[Skail](https://skail.dev).

The skill is a folder in the [Agent Skills](https://agentskills.io) format: a `SKILL.md` with a short
header that tells the agent when to use it, plus reference files the agent opens only when it needs
them.

```
skills/skail/
├── SKILL.md            run an example end to end; safety rules; index of the references
└── references/
    ├── concepts.md             replay, determinism, commands, idempotency, failures
    ├── csharp.md               C# / .NET setup and primitives
    ├── typescript.md           TypeScript / Node setup and primitives
    ├── environment-api.md      starting tasks and firing events over HTTP
    ├── cli.md                  the skail CLI: output, exit codes, login
    ├── run-without-containers.md
    └── troubleshooting.md
```

## Use it

### Point the agent at it

Works with any agent that can fetch a web page. The quickstart on
[dash.skail.dev](https://dash.skail.dev) gives you a ready prompt; the short version is:

```text
Follow the Skail skill at
https://raw.githubusercontent.com/skaildev/skail-skills/main/skills/skail/SKILL.md
and run the usd-quote example in C#, connected to my environment.
```

### Install it

Agents that support skills load it on their own whenever the task involves Skail.

| Agent | Project | All projects |
|---|---|---|
| Claude Code | `.claude/skills/skail/` | `~/.claude/skills/skail/` |
| Codex | `.agents/skills/skail/` | `~/.agents/skills/skail/` |

Copy the `skills/skail` folder there, or let the CLI do it:

```bash
skail agents install
```

Projects created with `skail init` already include the skill and an `AGENTS.md` that points to it.

## Versions

`main` is the current text, and what the portal's prompt points to. Each release of the Skail CLI
embeds the skill from a tag of this repository, so a project keeps the text that matches the CLI that
created it. The version is in the `metadata.version` field of `SKILL.md`.

## Contributing

Keep `SKILL.md` enough on its own to run an example: an agent that reads it by URL may never open the
references. Keep everything else in `references/`, linked from the index at the end of `SKILL.md`.
Write for any agent: say "run", "read", "ask the user" — never name one agent's tools. `npm run check`
(or `node tools/check-skill.mjs`) validates the header, the links and the size; CI runs it on every
pull request.

## License

Apache-2.0 — see [LICENSE](LICENSE).
