# AGENTS.md

## Big picture
- This repo is a `pnpm` + Turbo monorepo (`pnpm-workspace.yaml`, `turbo.json`) split across `apps/*`, `packages/*`, and parser/target integration packages like `packages/test-openrpc-java`.
- Omnigen is a staged code generator, not a template system. The intended flow is documented in `README.md`: **schema -> common model -> model transforms -> AST -> CST/render -> files**.
- The concrete execution model is plugin-driven. `@omnigen/core-plugin` defines typed plugin contracts (`packages/core-plugin/src/Plugin2.ts`), and `@omnigen/plugin` builds an execution path by matching/merging Zod contexts (`packages/plugin/src/PluginManager.ts`).

## Package boundaries
- `packages/api`: shared domain types and option schemas used everywhere.
- `packages/core-plugin`: plugin primitives (`createPlugin`, `PluginAutoRegistry`, Zod context types).
- `packages/plugin`: runtime orchestration and plugin-path selection.
- `packages/core`: common pipeline steps such as `core`, `transform`, `transform2`, and `file-writer` (`packages/core/src/CoreUtilPluginInit.ts`).
- `packages/parser-*`: source-specific parsers that turn files into the common `model`. Example: `packages/parser-openrpc/src/OpenRpcPluginInit.ts`.
- `packages/target-*`: target-specific transforms/renderers. Example: `packages/target-java/src/JavaPluginInit.ts` takes `model` -> Java AST -> rendered compilation units.
- `packages/target-code`: reusable AST/model transformers shared by targets (many are consumed from `target-java`).
- `apps/omnigen-cli`: the main runnable entry point today; it wires built-in parser and target plugin sets into `PluginManager`.
- `apps/omnigen`: programmatic wrapper, but `src/index.ts` is mostly stubbed/commented; treat the CLI + plugin packages as the authoritative runtime path.

## Patterns to follow when changing code
- New pipeline stages should usually be plugins created with `createPlugin(...)`, with **Zod-typed input/output context** and a default export that auto-registers via `PluginAutoRegistry.register(...)`.
- Use a returned `ZodError` to mean “this plugin is not applicable for the current context”; throw `Error` only for real failures. `packages/parser-openrpc/src/OpenRpcPluginInit.ts` is the clearest example.
- Plugins communicate by **merging fields into context**, not by calling each other directly. `PluginManager.execute(...)` merges `ctx` with each plugin result as it advances.
- Scoring/order matter. Targets often use `score`, `scoreModifier`, and `ActionKind.RUNTIME_REFINES` to influence path selection; see `JavaPluginInit` and `Plugin2.ts`.
- CLI/user options are normalized into the generic `arguments` object. In `apps/omnigen-cli/src/index.ts`, `--types` becomes `target`/`targets`, and `--output` becomes `outputDirBase` plus `outputFiles=true`.
- Parser plugins may also pull defaults from schema content, but CLI arguments win. `OpenRpcPluginInit` merges `schemaIncomingOptions` first and `ctx.arguments` last.
- For target work, preserve transformer ordering unless you understand the downstream effects. `packages/target-java/src/JavaPluginInit.ts` intentionally runs ordered model passes, then ordered AST passes, then `java-render`.
- Local ESM imports often include the `.js` suffix even in TypeScript source (for example `apps/omnigen/src/Omnigen.ts`); match surrounding style.

## Workflows agents should prefer
- Use Node `>=24.8.0` (`package.json`). Package manager is pinned to `pnpm@11.20.0` and `preinstall` enforces pnpm-only.
- Repo-wide commands from root:
  - `pnpm build` -> Turbo build across packages
  - `pnpm test` -> Vitest across `config/*`, `packages/*`, `apps/*`, `tests/*`
  - `pnpm test-report` -> enables HTML/LCOV reporting
  - `pnpm dev` -> `turbo run dev --parallel`
  - `pnpm ts-profile` -> compile trace + analyze TypeScript performance
- Do **not** assume `pnpm lint` validates the whole monorepo: the root script is `eslint src/**/*.ts --fix`, which only targets a root `src` tree.
- Vitest is configured at the repo root in `vitest.config.mts`; it uses project mode, `passWithNoTests: true`, and filters `[debug` / `[info` console noise.

## Debugging and observability
- Logging is centralized through `@omnigen/core-log` / `LoggerFactory`.
- `docs/debug.md` documents the important env vars:
  - `DEBUG=*` (or `*:info`, `*:warn`) to enable logger namespaces/levels
  - `DEBUG_IDENTIFIER=<name>` to trace a specific model/type/field through the pipeline

## Good reference files
- `README.md`, `packages/core-plugin/src/Plugin2.ts`, `packages/plugin/src/PluginManager.ts`, `packages/core/src/CoreUtilPluginInit.ts`
- `packages/parser-openrpc/src/OpenRpcPluginInit.ts`, `packages/target-java/src/JavaPluginInit.ts`, `apps/omnigen-cli/src/index.ts`, `vitest.config.mts`

