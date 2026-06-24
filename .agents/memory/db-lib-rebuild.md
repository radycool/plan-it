---
name: DB lib rebuild after schema change
description: Must run typecheck:libs after adding new tables to lib/db before API server typecheck will see the exports
---

`lib/db` is a composite lib that emits declarations. When new schema files are added (new tables), the declarations are stale until rebuilt.

**Rule:** After any change to `lib/db/src/schema/`, run `pnpm run typecheck:libs` before running `pnpm --filter @workspace/api-server run typecheck`.

**Why:** API server routes import from `@workspace/db`. If the lib declarations are stale, tsc reports "Module has no exported member 'xyzTable'" even though the file exists — misleading error that wastes time.

**How to apply:** The codegen command (`pnpm --filter @workspace/api-spec run codegen`) already includes `typecheck:libs`, so after codegen you're safe. Only manual schema additions need the explicit `typecheck:libs` step.
