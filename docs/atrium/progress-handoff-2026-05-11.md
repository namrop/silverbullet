# SilverBullet Atrium fork progress handoff

Date: 2026-05-11 14:03 EDT
Repo: `/Users/luisramirez/Code/silverbullet`
Fork remote: `origin=https://github.com/namrop/silverbullet.git`
Upstream remote: `upstream=https://github.com/silverbulletmd/silverbullet.git`
Branch: `feat/atrium-canon-transactions`
Implementation HEAD captured before this handoff doc: `1189e4668d079a41e0c7797603e77b4e0c70f990`
Upstream base: `c33b3edd41ae2960b83cc7f12c4dd87e124267f4`

## Purpose

This handoff captures the implementation progress on the SilverBullet fork before an Atrium-core compaction pass.

The fork is being shaped as a browser/editor/proposal surface for Atrium, not as an Atrium canon authority. The core invariant remains:

> SilverBullet-derived UI may inspect, draft, annotate, and propose. Atrium Service / future Atrium Core Service owns validation, commit authority, atomic writes, transaction logs, recompute queues, git refs, and rollback semantics.

## Current repo state

- Working tree: clean at capture time.
- Local branch: `feat/atrium-canon-transactions`.
- Implementation HEAD at capture equaled fork remote branch head: `1189e4668d079a41e0c7797603e77b4e0c70f990`.
- This handoff document may be committed after that implementation HEAD; treat the SHA above as the implementation boundary being summarized.
- Upstream push URL is disabled: `upstream DISABLED_UPSTREAM_PUSH (push)`.
- Implementation branch delta versus `upstream/main` at capture: 11 commits, 36 files changed, 2891 insertions, 24 deletions.

## Validation at capture time

Environment note:

- Local Node: `v22.18.0`.
- Local npm: `10.9.3`.
- Package engine declares Node `>=24.13.0`, so validation currently passes under a lower-than-declared local Node version. Treat this as an environment caveat, not an ideal runtime state.

Commands run on 2026-05-11:

```bash
npx vitest run \
  atrium/transactions.test.ts \
  atrium/modes.test.ts \
  atrium/source_fidelity.test.ts \
  atrium/proposals.test.ts \
  atrium/callouts.test.ts \
  client/service_worker/sync_engine.test.ts \
  client/plugos/syscalls/shell.test.ts \
  client/plugos/syscalls/space.test.ts \
  client/plugos/syscalls/atrium.test.ts \
  client/atrium_commands.test.ts \
  client/html/auth_redirect.test.ts \
  plug-api/lib/crypto.test.ts

npm run check
npm run build
git diff --check
```

Observed result:

- Targeted Vitest suite: 12 files passed, 37 tests passed.
- TypeScript check: passed.
- Build: passed (`build:plugs` and `build:client`).
- Whitespace check: passed.
- Working tree remained clean after build.

## Commit sequence and progress captured

### `ae5974b` — canon transaction schema scaffold

Added the first pure TypeScript Atrium transaction model and validator.

Implemented:

- `atrium/transactions.ts`
- `atrium/transactions.test.ts`
- initial docs:
  - `docs/atrium/canon-transaction-model-2026-05-06.md`
  - `docs/atrium/upstream-behavior-map-2026-05-06.md`

Key constraints established:

- transaction proposals are review/validation payloads;
- proposals cannot grant themselves commit authority;
- validator requires `commit.allowed === false`;
- hashes must be SHA-256 shaped;
- canon transaction proposals require visible diff and human review flags.

### `0733e74` — direct write gates in Atrium modes

Added explicit Atrium editor modes and source-fidelity helpers.

Implemented:

- `atrium/modes.ts` / `atrium/modes.test.ts`
- `atrium/source_fidelity.ts` / `atrium/source_fidelity.test.ts`
- optional `?atriumMode=inspect_only|projection_edit|canon_transaction` boot config in `client/boot.ts`
- `client/content_manager.ts` guard against direct save-to-space when an Atrium mode is active
- `client/service_worker.ts` and `client/service_worker/sync_engine.ts` disabled-sync path for Atrium modes
- `client/types/ui.ts` additions

Key constraints established:

- omitted `atriumMode` preserves upstream SilverBullet behavior;
- Atrium modes default closed for autosave-to-space, service-worker sync, shell, and direct canon writes;
- exact source snapshots preserve UTF-8 bytes, trailing spaces, tabs, frontmatter ordering, and wiki-link text;
- disabled sync rejects candidates including plug-originated candidates.

### `0dfb9be` — proposal adapter and shell gate

Added the first bounded proposal adapter and blocked shell execution in Atrium modes.

Implemented:

- `atrium/proposals.ts` / `atrium/proposals.test.ts`
- `client/plugos/syscalls/shell.ts` Atrium mode guard
- `client/plugos/syscalls/shell.test.ts`

Key constraints established:

- update proposals derive base/proposed hashes from exact source snapshots;
- emitted proposals remain non-committing `atrium_editor_write_transaction_v0` payloads;
- `shell.run` is blocked before authenticated fetch when Atrium mode is active;
- omitted mode preserves upstream shell behavior.

### `e106c65` — bounded draft and syscall surfaces

Added projection-draft semantics and Atrium-specific client syscalls.

Implemented:

- `atrium/drafts.ts`
- `client/plugos/syscalls/atrium.ts` / `client/plugos/syscalls/atrium.test.ts`
- `client/plugos/syscalls/space.ts` Atrium mode write/delete guards
- `client/plugos/syscalls/space.test.ts`
- `client/client_system.ts` wiring

Key constraints established:

- projection drafts are stored separately from canon;
- draft records carry exact text/hash/byte metadata;
- draft policy includes `separateFromCanon: true`, `mayCommitCanon: false`, and `whitespaceVisibilityPolicy: "none"`;
- current safe datastore key shape is `["atrium", "projection-drafts", "by-path", currentPath]`;
- direct page/document/file write/delete syscalls are blocked before touching space primitives in Atrium modes;
- omitted mode preserves upstream space-write behavior.

### `69cf9b1` — explicit editor commands

Added command-palette/menu actions for bounded Atrium work.

Implemented:

- `client/atrium_commands.ts` / `client/atrium_commands.test.ts`
- `client/client_system.ts` command registration wiring

Command policy:

- omitted `atriumMode`: no Atrium commands;
- `inspect_only`: no Atrium commands;
- `projection_edit`: `Atrium: Save Projection Draft`;
- `canon_transaction`: `Atrium: Save Projection Draft` and `Atrium: Create Canon Proposal`.

After later work, the command surface also includes `Atrium: Insert Librarian Callout` in `projection_edit` and `canon_transaction`.

### `80e1495` — browser-bundlable source hashing

Repaired source-fidelity hashing so browser-client imports do not pull Node builtins into the client bundle.

Implemented:

- changed `atrium/source_fidelity.ts` away from client-visible Node crypto imports.

Reason:

- a slice can pass tests and typecheck but fail client build if browser-imported Atrium code references `node:crypto`.

### `a22f1ed` — auth redirect preservation through login

Fixed SilverBullet login flow so an unauthenticated visit preserves the intended post-login target, including Atrium query parameters.

Implemented:

- `client/boot.ts` redirects unauthenticated boot to `.auth?from=<current path + query>`;
- `client/html/auth.html` preserves `from` in the form POST body;
- `client/html/auth_redirect.test.ts` added.

Reason:

- local/LAN testing of `?atriumMode=canon_transaction` must survive auth.

### `82e11f9` — login service-worker guard

Fixed insecure-LAN login-page JavaScript failure by guarding service-worker registration.

Implemented:

- `client/html/auth.html` checks `navigator.serviceWorker` before registration;
- auth redirect tests updated.

Reason:

- mobile/insecure LAN HTTP can expose no service-worker surface; unconditional registration can throw before the auth submit handler attaches, causing the browser to show raw JSON instead of following the redirect.

### `c485870` — insecure-LAN hashing fallback

Added SHA-256 support for insecure LAN HTTP contexts where `crypto.subtle` may be unavailable.

Implemented:

- `plug-api/lib/crypto.ts` browser-safe hash fallback;
- `plug-api/lib/crypto.test.ts` coverage;
- `atrium/source_fidelity.ts` uses the browser-bundlable helper.

Reason:

- localhost may hide failures because it is a secure context;
- `http://192.168.x.x` can lack both service workers and Web Crypto subtle crypto;
- short local LAN testing needs a bounded fallback, while standing deployment should prefer HTTPS.

### `ce2cab2` — scoped Neo-Andean theme

Added an Atrium-specific visual theme scoped to Atrium modes.

Implemented:

- `client/styles/atrium.scss`
- `client/styles/main.scss` import
- `client/boot.ts` class/application path
- `client/document_editor.ts` theme propagation support

Constraint:

- theme is scoped to Atrium mode surfaces and should not rewrite source text or change authority semantics.

### `1189e46` — librarian callout command

Added a local/session-scoped human-intent annotation command.

Implemented:

- `atrium/callouts.ts` / `atrium/callouts.test.ts`
- `client/atrium_commands.ts` command integration
- `client/atrium_commands.test.ts` coverage
- docs updated

Command behavior:

- `Atrium: Insert Librarian Callout` is available in `projection_edit` and `canon_transaction` only;
- it prompts for Luis's note and inserts a collapsed Markdown callout into the current editor buffer;
- it does not save, does not persist to client datastore, does not create a proposal, and does not call SilverBullet space write/delete primitives;
- handles are deterministic from timestamp, page path, and editor anchor: `atrium-callout-<timestamp>-<path-slug>-l<line>c<column>`;
- schema marker: `atrium_librarian_callout_v0`;
- status marker: `pending`;
- scope marker: `local`.

Authority boundary:

- command actor metadata is still local/browser-session scoped (`silverbullet-client:atrium-client-command` style surface);
- it is not durable authenticated Atrium actor identity;
- service-backed actor binding belongs in a later Atrium Service integration slice.

## Current implemented surfaces by area

### Pure Atrium model modules

- `atrium/transactions.ts`
- `atrium/modes.ts`
- `atrium/source_fidelity.ts`
- `atrium/proposals.ts`
- `atrium/drafts.ts`
- `atrium/callouts.ts`

### Client authority gates

- `client/boot.ts`
- `client/content_manager.ts`
- `client/service_worker.ts`
- `client/service_worker/sync_engine.ts`
- `client/plugos/syscalls/shell.ts`
- `client/plugos/syscalls/space.ts`

### Bounded Atrium client surfaces

- `client/plugos/syscalls/atrium.ts`
- `client/atrium_commands.ts`

### Auth/LAN support

- `client/html/auth.html`
- `client/html/auth_redirect.test.ts`
- `plug-api/lib/crypto.ts`

### Visual theme

- `client/styles/atrium.scss`
- `client/styles/main.scss`
- `client/document_editor.ts`

### Documentation

- `docs/atrium/upstream-behavior-map-2026-05-06.md`
- `docs/atrium/canon-transaction-model-2026-05-06.md`
- `docs/atrium/progress-handoff-2026-05-11.md`

## Explicit non-actions / not yet changed

The following have not been promoted to implementation authority in this branch:

- no server write endpoint replacement;
- no server-side Atrium transaction validator;
- no server-side atomic write path;
- no Atrium transaction log;
- no graph recompute queue;
- no git commit/ref/rollback integration;
- no live Atrium canon writes;
- no deployment;
- no production HTTPS/auth hardening;
- no durable Atrium actor identity binding;
- no Atrium Service proposal submission endpoint;
- no approval workflow that can transform proposal into commit;
- no git hooks;
- no normalization of Atrium source bytes;
- no claim that the SilverBullet fork is canonical authority.

## Known pitfalls preserved for the next session

- Do not use SilverBullet `SB_READ_ONLY` when testing Atrium editor commands; upstream read-only mode disables edit/command functionality. Use Atrium client gates plus server hardening instead.
- Do not read `.silverbullet.auth.json`; redact credentials if they appear in logs.
- Do not let command registration outrun mode policy.
- Do not let projection drafts use normal SilverBullet space writes.
- Do not let `shell.run` or direct space write/delete syscalls become side doors around the Atrium mode gates.
- Do not treat local browser/session command metadata as authenticated Atrium identity.
- Do not expand insecure-LAN fallbacks into a standing deployment posture without explicit review; HTTPS is the correct long-term answer.
- Avoid broad formatters that rewrite unrelated upstream files.
- Keep implementation repo state separate from Atrium/Forge packet state unless Luis explicitly asks to update the packet.

## Recommended next steps

1. Build a visible proposal/draft review panel showing base/proposed hashes, stale-base status, exact diff metadata, and authority warnings.
2. Add create/delete/move proposal helpers only after update proposal review UX is legible.
3. Design Atrium Service submission as proposal transfer, not canon commit.
4. Add service-backed actor/session binding before treating command actor fields as durable identity.
5. Split durable validation and atomic write semantics toward Atrium Core Service.
6. Re-run validation under Node `>=24.13.0` before treating build/test evidence as fully environment-matched.
7. If compaction needs only Atrium-core material, preserve this handoff as the SilverBullet-fork boundary object and carry forward only the invariants and next-step seams.

## Resume checklist

```bash
cd /Users/luisramirez/Code/silverbullet
git status --short --branch
git remote -v
git log --oneline --decorate -12
node -v
npm -v
npx vitest run atrium/transactions.test.ts atrium/modes.test.ts atrium/source_fidelity.test.ts atrium/proposals.test.ts atrium/callouts.test.ts client/service_worker/sync_engine.test.ts client/plugos/syscalls/shell.test.ts client/plugos/syscalls/space.test.ts client/plugos/syscalls/atrium.test.ts client/atrium_commands.test.ts client/html/auth_redirect.test.ts plug-api/lib/crypto.test.ts
npm run check
npm run build
git diff --check
```
