# .claude/plugins

Claude Code **plugins** are installable bundles of skills, subagents, slash commands, hooks, and MCP
servers, distributed through plugin _marketplaces_. This directory is where locally vendored or
project-pinned plugins would live so the whole team gets the same setup.

This repo does not vendor a plugin yet. To add one:

1. Add a marketplace: `/plugin marketplace add <owner/repo or url>`
2. Install: `/plugin install <name>@<marketplace>` (or browse with `/plugin`).
3. Commit any project-pinned config so teammates inherit it.

Keep plugins minimal and reviewed — they can register hooks and MCP servers that run automatically.
Repo-local building blocks already live alongside this folder: subagents in `../agents/`, commands in
`../commands/`, hooks in `../hooks/`, and MCP servers in the root `.mcp.json`.
