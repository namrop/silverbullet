import { describe, expect, test } from "vitest";
import { SyncEngine } from "./sync_engine.ts";
import { MemoryKvPrimitives } from "../data/memory_kv_primitives.ts";
import { DataStoreSpacePrimitives } from "../spaces/datastore_space_primitives.ts";

function createEngine(): SyncEngine {
  const kv = new MemoryKvPrimitives();
  const local = new DataStoreSpacePrimitives(new MemoryKvPrimitives());
  const remote = new DataStoreSpacePrimitives(new MemoryKvPrimitives());
  return new SyncEngine(kv, local, remote as any);
}

describe("SyncEngine disabled mode", () => {
  test("disabled sync config rejects all candidates including plugs", () => {
    const engine = createEngine();

    engine.setSyncConfig({ disabled: true });

    expect(engine.isSyncCandidate("index.md")).toEqual(false);
    expect(engine.isSyncCandidate("plug.plug.js")).toEqual(false);
  });
});
