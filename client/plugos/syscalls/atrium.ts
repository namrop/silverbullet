import type { Client } from "../../client.ts";
import type { DataStore } from "../../data/datastore.ts";
import type { SysCallMapping } from "../system.ts";
import {
  shouldAllowCanonTransactionProposals,
  shouldAllowProjectionDrafts,
} from "../../../atrium/modes.ts";
import {
  createProjectionDraft,
  projectionDraftKey,
  type AtriumProjectionDraft,
} from "../../../atrium/drafts.ts";
import {
  createCanonUpdateProposal,
  type AtriumTransactionActor,
} from "../../../atrium/proposals.ts";
import type { AtriumEditorWriteTransaction } from "../../../atrium/transactions.ts";

export type CreateCurrentPageUpdateProposalOptions = {
  transactionId?: string;
  human: string;
  sessionId: string;
  uid?: string | null;
  proposedPath?: string | null;
  sourceBytesRef?: string | null;
};

export type CurrentPageUpdateProposalResult = {
  proposal: AtriumEditorWriteTransaction;
  baseSource: string | null;
  proposedSource: string;
};

export type SaveCurrentPageProjectionDraftOptions = {
  draftId?: string;
  human: string;
  sessionId: string;
  uid?: string | null;
  updatedAt?: string;
};

function createTransactionId(): string {
  return `atrium-${globalThis.crypto.randomUUID()}`;
}

function assertCanonTransactionProposalMode(mode: unknown): void {
  if (!shouldAllowCanonTransactionProposals(mode)) {
    throw new Error(
      "Atrium canon transaction proposals are disabled outside canon_transaction mode",
    );
  }
}

function assertProjectionDraftMode(mode: unknown): void {
  if (!shouldAllowProjectionDrafts(mode)) {
    throw new Error(
      "Atrium projection drafts are disabled outside projection-capable Atrium modes",
    );
  }
}

function requireDraftStore(ds?: DataStore): DataStore {
  if (!ds) {
    throw new Error("Atrium projection draft store is unavailable");
  }
  return ds;
}

export function atriumSyscalls(client: Client, ds?: DataStore): SysCallMapping {
  return {
    "atrium.createCurrentPageUpdateProposal": async (
      ctx,
      options: CreateCurrentPageUpdateProposalOptions,
    ): Promise<CurrentPageUpdateProposalResult> => {
      assertCanonTransactionProposalMode(client.bootConfig.atriumMode);

      const transactionId = options.transactionId ?? createTransactionId();
      const currentName = client.currentName();
      const currentPath = client.currentPath();
      const proposedSource = client.editorView.state.sliceDoc();
      let baseSource: string | null = null;

      try {
        baseSource = (await client.space.readPage(currentName)).text;
      } catch {
        baseSource = null;
      }

      const actor: AtriumTransactionActor = {
        human: options.human,
        surface: `silverbullet-client:${ctx.plug ?? "unknown-plug"}`,
        sessionId: options.sessionId,
      };
      const sourceBytesRef =
        options.sourceBytesRef ??
        `atrium-editor://proposal/${transactionId}/proposed-source`;

      const proposal = await createCanonUpdateProposal({
        transactionId,
        actor,
        uid: options.uid ?? null,
        currentPath,
        proposedPath: options.proposedPath ?? null,
        baseSource,
        proposedSource,
        sourceBytesRef,
      });

      return {
        proposal,
        baseSource,
        proposedSource,
      };
    },
    "atrium.saveCurrentPageProjectionDraft": async (
      ctx,
      options: SaveCurrentPageProjectionDraftOptions,
    ): Promise<AtriumProjectionDraft> => {
      assertProjectionDraftMode(client.bootConfig.atriumMode);
      const store = requireDraftStore(ds);

      const pageName = client.currentName();
      const path = client.currentPath();
      const sourceText = client.editorView.state.sliceDoc();
      const draftId = options.draftId ?? `atrium-draft:${path}`;

      const draft = await createProjectionDraft({
        draftId,
        mode: client.bootConfig.atriumMode as
          | "projection_edit"
          | "canon_transaction",
        actor: {
          human: options.human,
          surface: `silverbullet-client:${ctx.plug ?? "unknown-plug"}`,
          sessionId: options.sessionId,
        },
        pageName,
        path,
        uid: options.uid ?? null,
        sourceText,
        updatedAt: options.updatedAt,
      });

      await store.set(projectionDraftKey(path), draft);
      return draft;
    },
    "atrium.getCurrentPageProjectionDraft":
      async (): Promise<AtriumProjectionDraft | null> => {
        assertProjectionDraftMode(client.bootConfig.atriumMode);
        const store = requireDraftStore(ds);
        return store.get<AtriumProjectionDraft>(
          projectionDraftKey(client.currentPath()),
        );
      },
    "atrium.deleteCurrentPageProjectionDraft": async (): Promise<void> => {
      assertProjectionDraftMode(client.bootConfig.atriumMode);
      const store = requireDraftStore(ds);
      await store.delete(projectionDraftKey(client.currentPath()));
    },
  };
}
