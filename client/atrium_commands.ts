import type { Client } from "./client.ts";
import type { DataStore } from "./data/datastore.ts";
import type { CommandHook } from "./plugos/hooks/command.ts";
import { atriumSyscalls } from "./plugos/syscalls/atrium.ts";
import {
  formatAtriumLibrarianCallout,
  makeAtriumLibrarianCalloutHandle,
} from "../atrium/callouts.ts";
import {
  shouldAllowCanonTransactionProposals,
  shouldAllowProjectionDrafts,
} from "../atrium/modes.ts";

const ATRIUM_COMMAND_PLUG_CONTEXT = "atrium-client-command";
const ATRIUM_COMMAND_ACTOR_HUMAN = "local-operator";
const ATRIUM_COMMAND_SESSION_STORAGE_KEY =
  "silverbullet.atrium.commandSessionId";

function randomId(): string {
  return globalThis.crypto.randomUUID();
}

export function atriumCommandSessionId(): string {
  try {
    const existing = globalThis.sessionStorage?.getItem(
      ATRIUM_COMMAND_SESSION_STORAGE_KEY,
    );
    if (existing) {
      return existing;
    }

    const created = `silverbullet-client-command:${randomId()}`;
    globalThis.sessionStorage?.setItem(
      ATRIUM_COMMAND_SESSION_STORAGE_KEY,
      created,
    );
    return created;
  } catch {
    return `silverbullet-client-command:${randomId()}`;
  }
}

function promptForLibrarianCalloutText(): string | null {
  const value = globalThis.prompt?.(
    "Atrium librarian callout note. This will be inserted as a pending markdown callout in the current editor buffer; it will not save or commit canon.",
    "",
  );

  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function insertionBoundary(
  source: string,
  position: number,
): { prefix: string; suffix: string } {
  const before = source.slice(0, position);
  const after = source.slice(position);
  return {
    prefix:
      before.endsWith("\n\n") || before.length === 0
        ? ""
        : before.endsWith("\n")
          ? "\n"
          : "\n\n",
    suffix: after.startsWith("\n") || after.length === 0 ? "" : "\n",
  };
}

function insertLibrarianCallout(client: Client, text: string) {
  const view = client.editorView;
  const selection = view.state.selection.main;
  const insertAt = selection.to;
  const line = view.state.doc.lineAt(selection.from);
  const column = selection.from - line.from + 1;
  const createdAt = new Date().toISOString();
  const anchor = {
    path: client.currentPath(),
    line: line.number,
    column,
    createdAt,
  };
  const handle = makeAtriumLibrarianCalloutHandle(anchor);
  const callout = formatAtriumLibrarianCallout({
    ...anchor,
    text,
  });
  const source = view.state.sliceDoc();
  const boundary = insertionBoundary(source, insertAt);
  const insert = `${boundary.prefix}${callout}${boundary.suffix}`;

  view.dispatch({
    changes: { from: insertAt, to: insertAt, insert },
    selection: { anchor: insertAt + insert.length },
  });
  view.focus?.();

  return {
    handle,
    inserted: insert,
  };
}

export function registerAtriumCommands(
  client: Client,
  ds: DataStore,
  hook: CommandHook,
): void {
  const syscalls = atriumSyscalls(client, ds);
  const syscallContext = { plug: ATRIUM_COMMAND_PLUG_CONTEXT };

  if (shouldAllowProjectionDrafts(client.bootConfig.atriumMode)) {
    hook.registerCommand({
      name: "Atrium: Save Projection Draft",
      requireMode: "rw",
      requireEditor: "page",
      menu: {
        location: "file",
        group: "4_atrium",
        order: 1,
        label: "Atrium: Save Projection Draft",
      },
      run: async () => {
        const draft = await syscalls["atrium.saveCurrentPageProjectionDraft"](
          syscallContext,
          {
            human: ATRIUM_COMMAND_ACTOR_HUMAN,
            sessionId: atriumCommandSessionId(),
          },
        );
        client.ui.flashNotification(
          `Projection draft saved for ${draft.object.path}`,
          "info",
        );
        return draft;
      },
    });

    hook.registerCommand({
      name: "Atrium: Insert Librarian Callout",
      requireMode: "rw",
      requireEditor: "page",
      menu: {
        location: "file",
        group: "4_atrium",
        order: 2,
        label: "Atrium: Insert Librarian Callout",
      },
      run: async () => {
        const text = promptForLibrarianCalloutText();
        if (!text) {
          client.ui.flashNotification("Librarian callout cancelled", "info");
          return null;
        }

        const result = insertLibrarianCallout(client, text);
        client.ui.flashNotification(
          `Librarian callout inserted: ${result.handle}`,
          "info",
        );
        return result;
      },
    });
  }

  if (shouldAllowCanonTransactionProposals(client.bootConfig.atriumMode)) {
    hook.registerCommand({
      name: "Atrium: Create Canon Proposal",
      requireMode: "rw",
      requireEditor: "page",
      menu: {
        location: "file",
        group: "4_atrium",
        order: 3,
        label: "Atrium: Create Canon Proposal",
      },
      run: async () => {
        const result = await syscalls["atrium.createCurrentPageUpdateProposal"](
          syscallContext,
          {
            human: ATRIUM_COMMAND_ACTOR_HUMAN,
            sessionId: atriumCommandSessionId(),
          },
        );
        client.ui.flashNotification(
          `Canon proposal created: ${result.proposal.transactionId}`,
          "info",
        );
        return result;
      },
    });
  }
}
