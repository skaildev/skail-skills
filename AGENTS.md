# Notes for AI agents

This repository is the Skail skill itself. To use Skail, read
[skills/skail/SKILL.md](skills/skail/SKILL.md).

When editing the skill:

- `SKILL.md` must stay enough on its own to run an example end to end; anything else goes in
  `skills/skail/references/` and is linked from the index at the end of `SKILL.md`.
- Keep the text agent-neutral: no tool names of a specific agent.
- Run `node tools/check-skill.mjs` before proposing a change.
