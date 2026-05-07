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
- `atrium/proposals.ts`
- `atrium/drafts.ts`
- `client/atrium_commands.ts`

Tests:

- `atrium/transactions.test.ts`
- `atrium/modes.test.ts`
- `atrium/source_fidelity.test.ts`
- `atrium/proposals.test.ts`
- `client/service_worker/sync_engine.test.ts`
- `client/plugos/syscalls/shell.test.ts`
- `client/plugos/syscalls/space.test.ts`
- `client/plugos/syscalls/atrium.test.ts`
- `client/atrium_commands.test.ts`

Client integration seams:

- `client/boot.ts` accepts optional `?atriumMode=inspect_only|projection_edit|canon_transaction`.
- `client/content_manager.ts` blocks direct save-to-space when an Atrium mode is active.
- `client/service_worker.ts` passes disabled sync config when an Atrium mode is active.
- `client/service_worker/sync_engine.ts` no-ops sync requests when disabled.
- `client/plugos/syscalls/shell.ts` blocks `shell.run` before authenticated fetch when an Atrium mode is active.
- `client/plugos/syscalls/space.ts` blocks direct page/document/file write/delete syscalls when an Atrium mode is active.
- `client/plugos/syscalls/atrium.ts` exposes bounded Atrium syscalls for current-page canon proposal creation and projection-draft persistence; these syscalls do not write to the SilverBullet space/canon path.
- `client/atrium_commands.ts` registers explicit command-palette/menu actions for bounded Atrium work: `Atrium: Save Projection Draft` in projection-capable modes and `Atrium: Create Canon Proposal` in `canon_transaction` mode only.

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
8. disabled service-worker sync rejects all candidates, including plugs;
9. canon update proposals are built from exact source snapshots and retain base/proposed SHA-256 integrity;
10. shell syscall execution is blocked in Atrium modes before authenticated fetch, while omitted mode preserves upstream shell behavior;
11. direct space write syscalls are blocked in Atrium modes before touching page/document/file primitives, while omitted mode preserves upstream write behavior;
12. current-page proposal syscall emits a non-committing `atrium_editor_write_transaction_v0` proposal from exact editor/source snapshots;
13. current-page projection-draft syscalls persist exact draft text only into client datastore under `atrium_projection_draft_v0`, separated from canon and with `mayCommitCanon: false`;
14. Atrium UI commands are not exposed when `atriumMode` is omitted or `inspect_only`; `projection_edit` exposes only draft persistence, while `canon_transaction` exposes draft persistence and non-committing proposal creation.

## Projection drafts

`projection_edit` and `canon_transaction` modes may preserve editor work as explicit projection drafts. Drafts are intentionally not canon writes:

```text
editor buffer
  -> atrium.saveCurrentPageProjectionDraft
  -> client datastore key ["atrium", "projection-drafts", "by-path", currentPath]
```

The draft record stores exact source text plus SHA-256/byte length metadata, but policy remains:

```ts
separateFromCanon === true
mayCommitCanon === false
whitespaceVisibilityPolicy === "none"
```

This gives the fork a safe persistence seam for projection/draft state without granting local IndexedDB, plugs, autosave, or service-worker sync the right to mutate Atrium canon.

## Command surface

The current command-palette/menu surface is intentionally narrow:

```text
projection_edit
  -> Atrium: Save Projection Draft
  -> atrium.saveCurrentPageProjectionDraft
  -> client datastore only

canon_transaction
  -> Atrium: Save Projection Draft
  -> atrium.saveCurrentPageProjectionDraft
  -> client datastore only

canon_transaction
  -> Atrium: Create Canon Proposal
  -> atrium.createCurrentPageUpdateProposal
  -> non-committing atrium_editor_write_transaction_v0
```

No command calls SilverBullet space write/delete primitives. The command actor currently uses a local bounded surface (`silverbullet-client:atrium-client-command`) and a per-browser-session command session id; durable authenticated actor binding belongs in a later Atrium Service integration slice.

## Next implementation steps

1. Add create/delete/move proposal helpers after the first update proposal path has enough review UX.
2. Add a visible proposal/draft review panel that shows base/proposed hashes, stale-base status, and exact diff metadata before any service submission exists.
3. Design proposal submission toward Atrium Service without applying live canon writes.
4. Split durable transaction validation/atomic-write logic toward Atrium Core Service once the shape stabilizes.
