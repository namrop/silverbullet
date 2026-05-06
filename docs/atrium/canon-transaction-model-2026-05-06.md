# Atrium canon transaction model backbone

Date: 2026-05-06
Branch: `feat/atrium-canon-transactions`

## Status

Initial scaffold. This is not yet wired into SilverBullet save/sync/server behavior.

The first implementation slice is intentionally pure TypeScript because the schema needs to remain portable toward Atrium Core Service instead of becoming trapped inside the UI layer.

## Architectural role

The transaction model is the boundary object between a SilverBullet-derived editor surface and Atrium authority.

```text
editor buffer / UI action
  -> Atrium editor write transaction
  -> Atrium Service validation
  -> future Atrium Core Service atomic write
  -> git-backed canon commit/ref
```

## Non-authority rule

A transaction proposal may carry all data needed for review and validation, but it must not grant itself commit authority.

Therefore the initial validator requires:

```ts
commit.allowed === false
```

A later Atrium service/core layer can transform an accepted proposal into an approved commit result. The UI/fork module should not directly set that state.

## Current schema module

Source:

- `atrium/transactions.ts`
- `atrium/modes.ts`
- `atrium/source_fidelity.ts`

Tests:

- `atrium/transactions.test.ts`
- `atrium/modes.test.ts`
- `atrium/source_fidelity.test.ts`
- `client/service_worker/sync_engine.test.ts`

Client integration seams:

- `client/boot.ts` accepts optional `?atriumMode=inspect_only|projection_edit|canon_transaction`.
- `client/content_manager.ts` blocks direct save-to-space when an Atrium mode is active.
- `client/service_worker.ts` passes disabled sync config when an Atrium mode is active.
- `client/service_worker/sync_engine.ts` no-ops sync requests when disabled.

Exports:

- `ATRIUM_TRANSACTION_SCHEMA_VERSION`
- `ATRIUM_EDITOR_MODES`
- `AtriumEditorWriteTransaction`
- `validateAtriumEditorWriteTransaction(...)`

Current modes:

- `inspect_only`
- `projection_edit`
- `canon_transaction`

Current operation set:

- `create`
- `update`
- `delete`
- `move`
- `metadata_update`

Current validation dimensions:

- frontmatter profile;
- UID check;
- path projection check;
- ACL check;
- graph impact check;
- whitespace/visibility policy.

Current review dimensions:

- diff required;
- human confirmation required;
- dissonance status.

## Why this belongs below the viewer layer

SilverBullet's rendering/editor surface should not decide canonical validity. It can collect and display transaction data, but the eventual authority belongs to Atrium Service / Atrium Core Service.

This matters because Atrium atomic writes eventually need more than a file write:

- base hash validation;
- UID/path resolution;
- duplicate UID defense;
- frontmatter validation;
- graph/projection impact evaluation;
- ACL/capability checks;
- temp-write/rename or equivalent atomic operation;
- transaction log;
- recompute/review queue;
- git commit/ref and rollback semantics.

## Current tests

The current tests assert that:

1. the explicit editor modes are named;
2. a valid canon transaction proposal is accepted;
3. transaction proposals cannot pre-authorize commit;
4. hashes must be 64-character lowercase hex SHA-256 values;
5. canon transactions require visible diff and human confirmation flags;
6. source-fidelity helpers preserve exact UTF-8 bytes, including trailing spaces, tabs, frontmatter ordering, and wiki-link text;
7. Atrium modes default closed for autosave-to-space, service-worker sync, shell, and direct canon writes;
8. disabled service-worker sync rejects all candidates, including plugs.

## Next implementation steps

1. Add source-fidelity fixture tests.
2. Add an Atrium mode config object and tests.
3. Gate autosave in Atrium modes.
4. Gate service-worker local write/sync behavior in Atrium modes.
5. Replace direct canon file writes with transaction proposal submission.
6. Split durable transaction validation/atomic-write logic toward Atrium Core Service once the shape stabilizes.
