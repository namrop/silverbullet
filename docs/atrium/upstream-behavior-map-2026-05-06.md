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

Not yet changed:

- autosave behavior;
- service worker sync behavior;
- server write endpoints;
- shell backend behavior;
- live Atrium canon;
- git hooks;
- deployments.
