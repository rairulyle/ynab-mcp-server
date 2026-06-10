# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-10

### Changed
- **BREAKING:** Requires Node.js 24 or newer (added `engines` field)
- Upgraded `ynab` SDK from v2 to v4 — YNAB renamed budgets to plans at the SDK level (`api.budgets.getBudgets` → `api.plans.getPlans`, `getBudgetMonth(s)` → `getPlanMonth(s)`); tool names, inputs, and outputs are unchanged
- Upgraded `zod` from v3 to v4, fixing a TypeScript out-of-memory crash during build caused by type-instantiation explosion with `@modelcontextprotocol/sdk` ≥ 1.29
- Upgraded `@modelcontextprotocol/sdk` to 1.29, TypeScript to 6.0, vitest to 4, commander to 15, `@types/node` to 24
- Modernized `tsconfig.json` to `NodeNext` module resolution

### Removed
- Removed unused `axios` dependency and deprecated `@types/axios`

## [0.2.4] - 2026-06-10

### Changed
- Use the official YNAB logo as the server icon

## [0.2.3] - 2026-06-10

### Added
- Tool annotations (read-only / destructive hints) on all tools
- Server icon and metadata (title, website URL)

## [0.2.2] - 2026-06-10

### Added
- Optional bearer-token authentication for the HTTP transport via `MCP_AUTH_TOKEN` (header or tokenized `/mcp/<token>` URL)

## [0.2.1] - 2026-06-10

### Fixed
- Reject non-POST requests on `/mcp` with 405

### Changed
- README: Docker setup and agent connection instructions

## [0.2.0] - 2026-06-10

### Added
- Streamable HTTP transport mode (`--transport http`, `--port`, `--host`) alongside stdio
- GHCR Docker publish workflow
- New tools: get transactions (with filters), update transaction, bulk approve transactions, delete transaction, update category budget, import transactions, list payees, list categories, list accounts, list scheduled transactions, list months
- Shared `getErrorMessage` utility for consistent error reporting across tools
- GitHub Actions test workflow and test coverage for all tools

### Changed
- Migrated from mcp-framework to the official `@modelcontextprotocol/sdk`
- Prefixed all tool names with `ynab_`
- Split tools into separate modules, each with its own test file

## [0.1.2] - 2024-03-26

### Added
- New `ApproveTransaction` tool for approving existing transactions in YNAB
  - Can approve/unapprove transactions by ID
  - Works in conjunction with GetUnapprovedTransactions tool
  - Preserves existing transaction data when updating approval status
- Added Cursor rules for YNAB API development
  - New `.cursor/rules/ynabapi.mdc` file
  - Provides guidance for working with YNAB types and API endpoints
  - Helps maintain consistency in tool development

### Changed
- Updated project structure documentation to include `.cursor/rules` directory
- Enhanced README with documentation for the new ApproveTransaction tool 