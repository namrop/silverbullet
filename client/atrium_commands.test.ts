import { describe, expect, test, vi } from "vitest";
import { CommandHook } from "./plugos/hooks/command.ts";
import { registerAtriumCommands } from "./atrium_commands.ts";

function makeDataStore() {
  const records = new Map<string, unknown>();
  return {
    records,
    set: vi.fn(async (key: string[], value: unknown) => {
      records.set(JSON.stringify(key), value);
    }),
    get: vi.fn(
      async (key: string[]) => records.get(JSON.stringify(key)) ?? null,
    ),
    delete: vi.fn(async (key: string[]) => {
      records.delete(JSON.stringify(key));
    }),
  };
}

function makeClient(atriumMode?: string) {
  const writePage = vi.fn();
  return {
    bootConfig: { atriumMode },
    currentName: () => "Inbox/Test",
    currentPath: () => "Inbox/Test.md",
    editorView: {
      dispatch: vi.fn(),
      state: {
        selection: { main: { from: 17, to: 17 } },
        sliceDoc: (from?: number, to?: number) =>
          from === undefined
            ? "draft source\nnext line"
            : "draft source\nnext line".slice(from, to),
        doc: {
          lineAt: () => ({ from: 14, to: 23, number: 2, text: "next line" }),
        },
      },
    },
    space: {
      readPage: vi.fn(async () => ({ text: "base source\n" })),
      writePage,
    },
    ui: {
      flashNotification: vi.fn(),
    },
  };
}

function registeredCommands(atriumMode?: string) {
  const hook = new CommandHook(false, new Map());
  const client = makeClient(atriumMode);
  const ds = makeDataStore();
  registerAtriumCommands(client as any, ds as any, hook);
  return { commands: hook.buildAllCommands(), client, ds };
}

describe("registerAtriumCommands", () => {
  test("does not expose Atrium commands when Atrium mode is omitted", () => {
    const { commands } = registeredCommands();

    expect(commands.has("Atrium: Save Projection Draft")).toBe(false);
    expect(commands.has("Atrium: Create Canon Proposal")).toBe(false);
  });

  test("does not expose proposal or draft commands in inspect_only mode", () => {
    const { commands } = registeredCommands("inspect_only");

    expect(commands.has("Atrium: Save Projection Draft")).toBe(false);
    expect(commands.has("Atrium: Create Canon Proposal")).toBe(false);
  });

  test("projection_edit mode exposes projection draft and librarian callout commands", async () => {
    const { commands, client, ds } = registeredCommands("projection_edit");

    expect(commands.has("Atrium: Save Projection Draft")).toBe(true);
    expect(commands.has("Atrium: Insert Librarian Callout")).toBe(true);
    expect(commands.has("Atrium: Create Canon Proposal")).toBe(false);

    const result = await commands.get("Atrium: Save Projection Draft")!.run!();

    expect(result.schema).toBe("atrium_projection_draft_v0");
    expect(result.policy.separateFromCanon).toBe(true);
    expect(result.policy.mayCommitCanon).toBe(false);
    expect(ds.set).toHaveBeenCalledOnce();
    expect(client.space.writePage).not.toHaveBeenCalled();
    expect(client.ui.flashNotification).toHaveBeenCalledWith(
      expect.stringContaining("Inbox/Test.md"),
      "info",
    );
  });

  test("canon_transaction mode exposes proposal, draft, and librarian callout commands", async () => {
    const { commands, client, ds } = registeredCommands("canon_transaction");

    expect(commands.has("Atrium: Save Projection Draft")).toBe(true);
    expect(commands.has("Atrium: Create Canon Proposal")).toBe(true);
    expect(commands.has("Atrium: Insert Librarian Callout")).toBe(true);

    const result = await commands.get("Atrium: Create Canon Proposal")!.run!();

    expect(result.proposal.schema).toBe("atrium_editor_write_transaction_v0");
    expect(result.proposal.commit.allowed).toBe(false);
    expect(result.baseSource).toBe("base source\n");
    expect(result.proposedSource).toBe("draft source\nnext line");
    expect(client.space.writePage).not.toHaveBeenCalled();
    expect(ds.set).not.toHaveBeenCalled();
    expect(client.ui.flashNotification).toHaveBeenCalledWith(
      expect.stringContaining("Canon proposal created"),
      "info",
    );
  });

  test("librarian callout command inserts a deterministic markdown callout without saving", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T16:17:18.000Z"));
    vi.stubGlobal(
      "prompt",
      vi.fn(() => "Ask the librarian to reconcile this section."),
    );

    try {
      const { commands, client, ds } = registeredCommands("canon_transaction");

      const result = await commands.get("Atrium: Insert Librarian Callout")!
        .run!();

      expect(result.handle).toBe(
        "atrium-callout-20260508t161718000z-inbox-test-md-l2c4",
      );
      expect(client.editorView.dispatch).toHaveBeenCalledWith({
        changes: {
          from: 17,
          to: 17,
          insert: expect.stringContaining(
            "> [!atrium-librarian]- atrium-callout-20260508t161718000z-inbox-test-md-l2c4",
          ),
        },
        selection: { anchor: expect.any(Number) },
      });
      expect(
        client.editorView.dispatch.mock.calls[0][0].changes.insert,
      ).toContain("> Ask the librarian to reconcile this section.");
      expect(client.space.writePage).not.toHaveBeenCalled();
      expect(ds.set).not.toHaveBeenCalled();
      expect(client.ui.flashNotification).toHaveBeenCalledWith(
        expect.stringContaining("Librarian callout inserted"),
        "info",
      );
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
