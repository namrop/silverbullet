import type { Client } from "./client.ts";
import type { DataStore } from "./data/datastore.ts";
import type { CommandHook } from "./plugos/hooks/command.ts";
import { atriumSyscalls } from "./plugos/syscalls/atrium.ts";
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
  }

  if (shouldAllowCanonTransactionProposals(client.bootConfig.atriumMode)) {
    hook.registerCommand({
      name: "Atrium: Create Canon Proposal",
      requireMode: "rw",
      requireEditor: "page",
      menu: {
        location: "file",
        group: "4_atrium",
        order: 2,
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
