import { describe, expect, test } from "vitest";
import { createSourceSnapshot } from "../../../atrium/source_fidelity.ts";
import { atriumSyscalls } from "./atrium.ts";

function canonClient() {
  const calls: string[] = [];
  return {
    calls,
    client: {
      bootConfig: { atriumMode: "canon_transaction" },
      currentName: () => "Notes/Page",
      currentPath: () => "Notes/Page.md",
      editorView: {
        state: {
          sliceDoc: () => "proposed text\nwith trailing spaces  \n",
        },
      },
      space: {
        readPage: async (name: string) => {
          calls.push(`readPage:${name}`);
          return { text: "base text\n", meta: { name } };
        },
        writePage: async () => calls.push("writePage"),
        deletePage: async () => calls.push("deletePage"),
        writeDocument: async () => calls.push("writeDocument"),
        deleteDocument: async () => calls.push("deleteDocument"),
        spacePrimitives: {
          writeFile: async () => calls.push("writeFile"),
          deleteFile: async () => calls.push("deleteFile"),
        },
      },
    } as any,
  };
}

function draftClient(mode = "projection_edit") {
  const calls: string[] = [];
  const ds = {
    values: new Map<string, unknown>(),
    async set(key: string[], value: unknown) {
      calls.push(`ds.set:${JSON.stringify(key)}`);
      this.values.set(JSON.stringify(key), value);
    },
    async get(key: string[]) {
      calls.push(`ds.get:${JSON.stringify(key)}`);
      return this.values.get(JSON.stringify(key)) ?? null;
    },
    async delete(key: string[]) {
      calls.push(`ds.delete:${JSON.stringify(key)}`);
      this.values.delete(JSON.stringify(key));
    },
  };
  return {
    calls,
    ds,
    client: {
      bootConfig: { atriumMode: mode },
      currentName: () => "Draft/Page",
      currentPath: () => "Draft/Page.md",
      editorView: {
        state: {
          sliceDoc: () => "draft text\n  visible spacing stays\n",
        },
      },
      space: {
        writePage: async () => calls.push("writePage"),
        deletePage: async () => calls.push("deletePage"),
      },
    } as any,
  };
}

describe("Atrium proposal syscalls", () => {
  test("create a current-page canon update proposal without writing to the space", async () => {
    const { client, calls } = canonClient();
    const syscalls = atriumSyscalls(client);

    const result = await syscalls["atrium.createCurrentPageUpdateProposal"](
      { plug: "test.plug" },
      {
        transactionId: "tx-test-1",
        human: "Luis",
        sessionId: "session-1",
        uid: "uid-1",
      },
    );

    const base = await createSourceSnapshot("base text\n");
    const proposed = await createSourceSnapshot(
      "proposed text\nwith trailing spaces  \n",
    );

    expect(result.proposedSource).toBe(
      "proposed text\nwith trailing spaces  \n",
    );
    expect(result.proposal).toMatchObject({
      transactionId: "tx-test-1",
      operation: "update",
      mode: "canon_transaction",
      actor: {
        human: "Luis",
        surface: "silverbullet-client:test.plug",
        sessionId: "session-1",
      },
      object: {
        uid: "uid-1",
        currentPath: "Notes/Page.md",
        proposedPath: null,
      },
      sourceIntegrity: {
        baseHash: base.sha256,
        proposedHash: proposed.sha256,
        patchHash: null,
      },
      payload: {
        sourceBytesRef: "atrium-editor://proposal/tx-test-1/proposed-source",
        patch: null,
      },
      commit: {
        allowed: false,
        commitRef: null,
      },
    });
    expect(calls).toEqual(["readPage:Notes/Page"]);
  });

  test("reject proposal creation outside canon transaction mode before reading or writing", async () => {
    const calls: string[] = [];
    const client = {
      bootConfig: { atriumMode: "projection_edit" },
      currentName: () => {
        calls.push("currentName");
        return "Page";
      },
      currentPath: () => {
        calls.push("currentPath");
        return "Page.md";
      },
      editorView: { state: { sliceDoc: () => "text" } },
      space: {
        readPage: async () => calls.push("readPage"),
        writePage: async () => calls.push("writePage"),
      },
    } as any;
    const syscalls = atriumSyscalls(client);

    await expect(
      syscalls["atrium.createCurrentPageUpdateProposal"](
        { plug: "test.plug" },
        { transactionId: "tx-test-2", human: "Luis", sessionId: "session-1" },
      ),
    ).rejects.toThrow(
      "Atrium canon transaction proposals are disabled outside canon_transaction mode",
    );
    expect(calls).toEqual([]);
  });

  test("save/get/delete current-page projection drafts through client datastore only", async () => {
    const { client, ds, calls } = draftClient();
    const syscalls = atriumSyscalls(client, ds as any);

    const saved = await syscalls["atrium.saveCurrentPageProjectionDraft"](
      { plug: "draft.plug" },
      {
        draftId: "draft-1",
        human: "Luis",
        sessionId: "session-1",
        uid: "uid-draft",
        updatedAt: "2026-05-06T20:00:00.000Z",
      },
    );

    expect(saved).toMatchObject({
      schema: "atrium_projection_draft_v0",
      draftId: "draft-1",
      mode: "projection_edit",
      actor: {
        human: "Luis",
        surface: "silverbullet-client:draft.plug",
        sessionId: "session-1",
      },
      object: {
        pageName: "Draft/Page",
        path: "Draft/Page.md",
        uid: "uid-draft",
      },
      source: {
        text: "draft text\n  visible spacing stays\n",
        byteLength: 35,
      },
      policy: {
        separateFromCanon: true,
        mayCommitCanon: false,
        whitespaceVisibilityPolicy: "none",
      },
    });

    const loaded = await syscalls["atrium.getCurrentPageProjectionDraft"]({
      plug: "draft.plug",
    });
    expect(loaded).toEqual(saved);

    await syscalls["atrium.deleteCurrentPageProjectionDraft"]({
      plug: "draft.plug",
    });
    expect(
      await syscalls["atrium.getCurrentPageProjectionDraft"]({
        plug: "draft.plug",
      }),
    ).toBeNull();

    expect(calls).toEqual([
      'ds.set:["atrium","projection-drafts","by-path","Draft/Page.md"]',
      'ds.get:["atrium","projection-drafts","by-path","Draft/Page.md"]',
      'ds.delete:["atrium","projection-drafts","by-path","Draft/Page.md"]',
      'ds.get:["atrium","projection-drafts","by-path","Draft/Page.md"]',
    ]);
  });

  test("reject projection drafts outside projection-capable Atrium modes", async () => {
    const { client, ds, calls } = draftClient("inspect_only");
    const syscalls = atriumSyscalls(client, ds as any);

    await expect(
      syscalls["atrium.saveCurrentPageProjectionDraft"](
        { plug: "draft.plug" },
        { draftId: "draft-2", human: "Luis", sessionId: "session-1" },
      ),
    ).rejects.toThrow(
      "Atrium projection drafts are disabled outside projection-capable Atrium modes",
    );
    expect(calls).toEqual([]);
  });
});
