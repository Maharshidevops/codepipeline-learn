# .claude/skills

**Skills** are model-invokable capabilities: a folder with a `SKILL.md` (name + description +
instructions, optionally bundled scripts/resources) that Claude picks up **automatically** when a
task matches the description. Unlike slash commands (which you invoke explicitly), skills are
selected by Claude on demand.

This repo doesn't ship a custom skill yet. To add one:

1. Create `.claude/skills/<skill-name>/SKILL.md` with YAML front-matter:
   ```markdown
   ---
   name: <skill-name>
   description: When to use this skill (be specific — this is how Claude decides to trigger it).
   ---

   Step-by-step instructions. Reference any helper scripts in this folder.
   ```
2. Keep it focused on **this React / TypeScript frontend (e.g. new-page scaffolding, token-safe component generation)** workflows so it triggers reliably and doesn't overlap others.
3. Commit it so the whole team gets the same capability.

Skills can also arrive via installed **plugins** (see `../plugins/README.md`). Related building
blocks: subagents in `../agents/`, slash commands in `../commands/`.
