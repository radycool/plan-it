---
name: Orval query param / path param collision
description: Orval generates <OperationId>Params for both path params and query params, causing TS2308 if both exist
---

When an OpenAPI operation has both path parameters and query parameters, Orval generates a TypeScript type called `<OperationId>Params` for the query params AND the Zod generator creates a `<OperationId>Params` Zod schema from the path params — they collide on import.

**Rule:** Do not add query parameters to operations that already have path parameters with the same `<operationId>Params` name. Either remove the query params (filter client-side) or rename the operationId so the generated names don't clash.

**Why:** Caused `TS2308: Module has already exported a member named 'ListPostsParams'` during codegen, blocking the build.

**How to apply:** When adding/modifying query params in `lib/api-spec/openapi.yaml`, check if the operation already generates a `*Params` type from its path. If so, move filtering to the client or pick a unique operationId.
