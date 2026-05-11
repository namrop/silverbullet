# Atrium fork documentation index

This directory documents the SilverBullet fork work for Atrium-governed editor/proposal surfaces.

## Current documents

- `upstream-behavior-map-2026-05-06.md` — upstream SilverBullet save/sync/write/shell seams and the constraints needed before SilverBullet can safely front Atrium canon.
- `canon-transaction-model-2026-05-06.md` — current transaction schema, mode model, source-fidelity helpers, proposal/draft/callout surfaces, tests, and next implementation steps.
- `progress-handoff-2026-05-11.md` — compaction handoff for the current fork state: repo provenance, commit sequence, validation evidence, implemented surfaces, explicit non-actions, pitfalls, and resume checklist.

## Authority note

These documents describe the fork/editor/proposal layer. They do not make SilverBullet the Atrium canon authority. Atrium Service / future Atrium Core Service remains responsible for validation, atomic writes, transaction logs, recompute queues, git refs, and rollback semantics.
