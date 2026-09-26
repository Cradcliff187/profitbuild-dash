# AGENTS.md

Follow `CLAUDE.md` in this directory. It is the single source of truth for this repo's rules, conventions and workflows, whatever agent or editor is reading this (Claude Code, Cursor, Codex, Cowork). Nothing in this file overrides it.

Machine-wide rules (where things live, the secrets store, how scheduled tasks are created) are in the global map installed at `%USERPROFILE%\.claude\CLAUDE.md` from the `workstation` repo.

## Notes for Cursor (carried over from the former `.cursorrules`)

- Before deploying any edge function, run `ReadLints` on the file to catch syntax errors. This supplements the pre-deploy checks in `CLAUDE.md`.
- Supabase MCP tool names in Cursor: `mcp_supabase_apply_migration` (DDL), `mcp_supabase_execute_sql` (queries and DML), `mcp_supabase_deploy_edge_function` (deploy), `mcp_supabase_list_edge_functions` / `mcp_supabase_get_edge_function` (verify).
- For the four branded-email functions (`send-auth-email`, `send-receipt-notification`, `send-training-notification`, `generate-media-report`), always include `_shared/brandedTemplate.ts` in the `files` array. `CLAUDE.md` has the full deployment details and pinned versions.
- Supabase project id: `clsjdxwbsjbhjibvlqbz`.