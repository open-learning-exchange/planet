# Copilot instructions — Planet

Read `AGENTS.md` at the repo root first — it is the full codebase guide (commands, architecture, conventions, git workflow). `CLAUDE.md` is a symlink to the same file, so there is only one source of truth.

## Shared agent skills

Reusable skills live as git submodules under `.agents/skills/`:

- **merge-prepping** — rewrite PR titles into the house style `scope: smoother thing doing (fixes #N)` and ensure a tracking issue is attached (source: https://github.com/dogi/merge-prepping)

Submodules are **not** initialized on a default clone or `actions/checkout`. Before reading anything under `.agents/skills/`, run:

```bash
git submodule update --init --recursive
```

Each skill's entry point is `.agents/skills/<name>/SKILL.md`. Full setup and maintenance docs: `docs/AGENT_SPELLBOOK.md` → "The Skill Sync".
