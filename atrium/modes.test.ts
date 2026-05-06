import { describe, expect, test } from "vitest";
import {
  ATRIUM_MODE_CONFIGS,
  getAtriumModeConfig,
  isAtriumMode,
  shouldAutosaveToSpace,
} from "./modes.ts";

describe("Atrium editor mode config", () => {
  test("rejects unknown modes instead of falling through to write authority", () => {
    expect(isAtriumMode("inspect_only")).toEqual(true);
    expect(isAtriumMode("upstream_default")).toEqual(false);
    expect(() => getAtriumModeConfig("upstream_default")).toThrow(
      "Unknown Atrium editor mode: upstream_default",
    );
  });

  test("inspect_only grants no draft, transaction, canon, sync, autosave, or shell authority", () => {
    expect(ATRIUM_MODE_CONFIGS.inspect_only).toMatchObject({
      mayEditProjection: false,
      mayProposeCanonTransaction: false,
      mayWriteCanonDirectly: false,
      autosaveToSpace: false,
      serviceWorkerSync: false,
      shell: false,
    });
  });

  test("projection_edit can save only to projection/draft state, not canon", () => {
    expect(ATRIUM_MODE_CONFIGS.projection_edit).toMatchObject({
      mayEditProjection: true,
      mayProposeCanonTransaction: false,
      mayWriteCanonDirectly: false,
      autosaveToSpace: false,
      serviceWorkerSync: false,
      shell: false,
    });
  });

  test("canon_transaction may propose reviewed transactions without direct writes", () => {
    expect(ATRIUM_MODE_CONFIGS.canon_transaction).toMatchObject({
      mayEditProjection: true,
      mayProposeCanonTransaction: true,
      mayWriteCanonDirectly: false,
      autosaveToSpace: false,
      serviceWorkerSync: false,
      shell: false,
    });
  });

  test("autosave helper defaults closed for Atrium modes and open only outside Atrium mode", () => {
    expect(shouldAutosaveToSpace(undefined)).toEqual(true);
    expect(shouldAutosaveToSpace("inspect_only")).toEqual(false);
    expect(shouldAutosaveToSpace("projection_edit")).toEqual(false);
    expect(shouldAutosaveToSpace("canon_transaction")).toEqual(false);
  });
});
