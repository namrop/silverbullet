# SilverBullet upstream behavior map for Atrium canon transactions

Date: 2026-05-06
Branch: `feat/atrium-canon-transactions`
Fork: `https://github.com/namrop/silverbullet`

## Purpose

This is the first read-only behavior map for adapting SilverBullet into an Atrium-governed editor surface.

The central invariant is:

> SilverBullet-derived UI may propose edits. Atrium Service / Atrium Core Service must own canon write authority.

This map identifies upstream behavior that must be constrained, replaced, or routed through canon transaction proposals before the fork can safely touch Atrium canon.

## Current upstream save/write path

### Editor change path

Observed source:

- `client/codemirror/editor_state.ts`
- `client/content_manager.ts`
- `client/document_editor.ts`
- `client/reducer.ts`

Current behavior summary:

1. CodeMirror document changes mark page state as changed/dirty.
2. The content manager tracks `unsavedChanges`.
3. `ContentManager` uses an autosave loop with a one-second interval.
4. Document-editor iframe changes can call `client.save()`.
5. Navigation also interacts with save logic.

Atrium implication:

- Dirty/editor state is useful.
- Autosave-to-storage is not acceptable as canon behavior.
- The fork needs a mode gate between dirty state and write authority.

Required seam:

```text
editor change
  -> dirty state
  -> explicit user action
  -> projection update OR canon transaction proposal
```

not:

```text
editor change
  -> autosave
  -> local/remote file write
```

## Current service-worker / sync behavior

Observed source:

- `client/service_worker.ts`
- `client/service_worker/sync_engine.ts`
- `client/service_worker/proxy_router.ts`
- `client/spaces/http_space_primitives.ts`
- `client/spaces/datastore_space_primitives.ts`

Current behavior summary:

1. The service worker creates local IndexedDB-backed space primitives.
2. It also creates HTTP space primitives for server access.
3. `SyncEngine` periodically syncs between local and remote surfaces.
4. `ProxyRouter` can write to local primitives first, then attempt immediate sync.
5. Failed immediate sync can leave delayed/offline replay semantics.

Atrium implication:

- Upstream sync is designed for PKM/offline convenience, not governed canon authority.
- Local browser/IndexedDB state cannot silently outrank git-backed Atrium canon.
- Offline/delayed writes must not replay into canon without transaction validation.

Required seam:

```text
local cache/draft
  -> staleness/provenance metadata
  -> explicit transaction proposal
  -> service validation
```

## Current server write behavior

Observed source:

- `server/fs.go`
- `server/disk_space_primitives.go`
- `server/types.go`

Current behavior summary:

1. `HttpSpacePrimitives.writeFile()` sends `PUT /.fs/<path>`.
2. The server file endpoint reads request bytes.
3. Disk primitives ultimately write through `os.WriteFile(localPath, data, 0644)`.
4. Metadata may set mtime, but the write is not an Atrium transaction.

Atrium implication:

- Direct file writes bypass UID/path/provenance/graph/ACL validation.
- `os.WriteFile` is not enough for Atrium atomic writes; future canon writes need temp-write/rename, base-hash validation, transaction log, recompute/review queue, and git commit/rollback semantics owned outside the UI.

Required seam:

```text
HTTP/API write request
  -> Atrium transaction validator
  -> atomic file operation
  -> provenance/log
  -> graph/recompute queue
  -> git commit/ref
```

## Shell and plug capability behavior

Observed source:

- `client/plugos/syscalls/shell.ts`
- `server/server.go`
- `server/shell_endpoint.go`
- `server/shell_backend.go`
- `server/shell.go`

Current behavior summary:

- Shell execution exists when the local shell backend is configured.
- `NewNotSupportedShell()` exists as a denial posture.

Atrium implication:

- Shell must be default-deny in Atrium modes.
- Plugs and shell cannot receive implicit canon write rights.
- Any future capability must be allowlisted, auditable, and mode-specific.

## Direct space write syscalls

Observed source:

- `client/plugos/syscalls/space.ts`

Current behavior summary:

- Upstream write syscalls expose page/document/file write and delete operations to plugs when write syscalls are registered.
- These operations call `client.space.writePage`, `client.space.deletePage`, `client.space.writeDocument`, `client.space.deleteDocument`, and underlying file primitives directly.

Atrium implication:

- In Atrium modes, plug syscalls must not become a side door around disabled autosave/sync.
- Direct write/delete syscalls are now blocked before touching space primitives whenever `atriumMode` is present.
- Omitted `atriumMode` retains upstream SilverBullet behavior.

Required seam:

```text
plug/editor intent
  -> projection draft OR canon transaction proposal
  -> external Atrium service validation
```

not:

```text
plug syscall
  -> direct local/remote space write
```

## Atrium proposal and projection-draft syscalls

Observed source:

- `client/plugos/syscalls/atrium.ts`
- `atrium/proposals.ts`
- `atrium/drafts.ts`

Current behavior summary:

- `atrium.createCurrentPageUpdateProposal` builds a non-committing canon update proposal from the current editor buffer and base page text.
- `atrium.saveCurrentPageProjectionDraft`, `atrium.getCurrentPageProjectionDraft`, and `atrium.deleteCurrentPageProjectionDraft` store/retrieve/delete exact projection drafts in the client datastore under an Atrium-specific key prefix.
- These syscalls do not call SilverBullet space write/delete primitives and do not authorize canon commit.

Atrium implication:

- `canon_transaction` now has a bounded proposal surface that can carry exact source/hash data toward a future Atrium Service endpoint.
- `projection_edit` now has a bounded draft persistence seam separate from canon, useful for preserving work without silent replay into canon.

## Atrium command-palette/menu surface

Observed source:

- `client/atrium_commands.ts`
- `client/client_system.ts`

Current behavior summary:

- Commands are registered directly with the client command hook, not through a plug manifest.
- `Atrium: Save Projection Draft` is registered only when `atriumMode` is `projection_edit` or `canon_transaction`.
- `Atrium: Create Canon Proposal` is registered only when `atriumMode` is `canon_transaction`.
- No Atrium command is exposed when `atriumMode` is omitted or when mode is `inspect_only`.
- Command actions delegate to the bounded Atrium syscalls and inherit their no-canon-write constraints.

Atrium implication:

- The user now has explicit actions for the two safe editor surfaces without re-enabling autosave, service-worker sync, or direct plug space writes.
- UI action availability follows mode policy rather than ambient upstream write semantics.
- Actor binding is still local/browser-session metadata; it is not durable identity proof or Atrium Service authorization.

## Source fidelity / whitespace / visibility risk

Atrium-specific constraint:

- Opening, rendering, indexing, or viewing must not rewrite source bytes.
- Whitespace, visibility characters, frontmatter ordering, or link normalization must not be hidden in the viewing surface.
- If enforcement is needed, it belongs in an explicit hook/service validation path with visible diffs.

Required initial test fixtures:

- Markdown with trailing whitespace.
- Mixed blank lines.
- Frontmatter whose order must remain unchanged.
- Links that must not be normalized.
- Visibility/whitespace examples Luis wants preserved.

## First fork seams to implement

1. Pure transaction schema module: no browser, no server, no file write side effects.
2. Atrium mode model: `inspect_only`, `projection_edit`, `canon_transaction`.
3. Explicit validation that canon transactions cannot pre-authorize commits.
4. Source-fidelity fixture tests before save/sync behavior changes.
5. Autosave gating in Atrium modes only after tests expose current write behavior.
6. Service-worker/sync gating after mode model is wired.
7. Server write replacement only after transaction model and atomic-write semantics are validated.

## Current implementation status

Started in this branch:

- `atrium/transactions.ts` — pure initial transaction schema/validator module.
- `atrium/transactions.test.ts` — Vitest coverage for mode names, commit-denial, SHA-256 shape, and human review requirements.
- `atrium/source_fidelity.ts` / `atrium/source_fidelity.test.ts` — exact UTF-8 byte snapshot/hash helpers and preservation tests for whitespace/frontmatter/link surfaces.
- `atrium/modes.ts` / `atrium/modes.test.ts` — explicit Atrium authority-mode config; all Atrium modes default closed for direct canon writes, service-worker sync, autosave-to-space, and shell.
- `atrium/proposals.ts` / `atrium/proposals.test.ts` — update-proposal adapter that derives base/proposed hashes from exact source snapshots and emits a non-committing canon transaction proposal.
- `atrium/drafts.ts` — projection-draft model for exact draft state separated from canon and marked `mayCommitCanon: false`.
- `client/boot.ts` / `client/types/ui.ts` — optional `?atriumMode=` boot config path; omitted mode preserves upstream behavior.
- `client/content_manager.ts` — direct save-to-space is blocked when an Atrium mode is active.
- `client/service_worker.ts` / `client/service_worker/sync_engine.ts` — service-worker sync can be disabled by Atrium mode; disabled sync rejects all candidates including plugs and no-ops single/space sync requests.
- `client/plugos/syscalls/shell.ts` / `client/plugos/syscalls/shell.test.ts` — shell syscall is blocked before authenticated fetch when an Atrium mode is active; omitted mode preserves upstream behavior.
- `client/plugos/syscalls/space.ts` / `client/plugos/syscalls/space.test.ts` — direct page/document/file write/delete syscalls are blocked before touching primitives in Atrium modes; omitted mode preserves upstream behavior.
- `client/plugos/syscalls/atrium.ts` / `client/plugos/syscalls/atrium.test.ts` — bounded proposal/draft syscalls for current-page Atrium work surfaces without canon writes.
- `client/atrium_commands.ts` / `client/atrium_commands.test.ts` — explicit command-palette/menu actions for saving projection drafts and creating non-committing canon proposals, exposed only in compatible Atrium modes.

Not yet changed:

- server write endpoints;
- server shell backend behavior;
- live Atrium canon;
- git hooks;
- deployments.
