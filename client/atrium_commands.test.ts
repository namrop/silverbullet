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
      state: {
        sliceDoc: () => "draft source\n",
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

  test("projection_edit mode exposes only the projection draft command", async () => {
    const { commands, client, ds } = registeredCommands("projection_edit");

    expect(commands.has("Atrium: Save Projection Draft")).toBe(true);
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

  test("canon_transaction mode exposes proposal and draft commands", async () => {
    const { commands, client, ds } = registeredCommands("canon_transaction");

    expect(commands.has("Atrium: Save Projection Draft")).toBe(true);
    expect(commands.has("Atrium: Create Canon Proposal")).toBe(true);

    const result = await commands.get("Atrium: Create Canon Proposal")!.run!();

    expect(result.proposal.schema).toBe("atrium_editor_write_transaction_v0");
    expect(result.proposal.commit.allowed).toBe(false);
    expect(result.baseSource).toBe("base source\n");
    expect(result.proposedSource).toBe("draft source\n");
    expect(client.space.writePage).not.toHaveBeenCalled();
    expect(ds.set).not.toHaveBeenCalled();
    expect(client.ui.flashNotification).toHaveBeenCalledWith(
      expect.stringContaining("Canon proposal created"),
      "info",
    );
  });
});
