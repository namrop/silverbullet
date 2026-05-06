import { createSourceSnapshot } from "./source_fidelity.ts";
import {
  ATRIUM_TRANSACTION_SCHEMA_VERSION,
  type AtriumEditorWriteTransaction,
} from "./transactions.ts";

export type AtriumTransactionActor = AtriumEditorWriteTransaction["actor"];

export type CreateCanonUpdateProposalInput = {
  transactionId: string;
  actor: AtriumTransactionActor;
  uid: string | null;
  currentPath: string;
  proposedPath?: string | null;
  baseSource: string | Uint8Array | null;
  proposedSource: string | Uint8Array;
  sourceBytesRef: string;
};

export async function createCanonUpdateProposal(
  input: CreateCanonUpdateProposalInput,
): Promise<AtriumEditorWriteTransaction> {
  const baseSnapshot = input.baseSource === null
    ? null
    : await createSourceSnapshot(input.baseSource);
  const proposedSnapshot = await createSourceSnapshot(input.proposedSource);

  return {
    schema: ATRIUM_TRANSACTION_SCHEMA_VERSION,
    transactionId: input.transactionId,
    operation: "update",
    mode: "canon_transaction",
    actor: input.actor,
    object: {
      uid: input.uid,
      currentPath: input.currentPath,
      proposedPath: input.proposedPath ?? null,
    },
    sourceIntegrity: {
      baseHash: baseSnapshot?.sha256 ?? null,
      proposedHash: proposedSnapshot.sha256,
      patchHash: null,
    },
    payload: {
      sourceBytesRef: input.sourceBytesRef,
      patch: null,
    },
    validation: {
      frontmatterProfile: "pending",
      uidCheck: "pending",
      pathProjectionCheck: "pending",
      aclCheck: "pending",
      graphImpactCheck: "pending",
      whitespaceVisibilityPolicy: "none",
    },
    review: {
      diffRequired: true,
      humanConfirmationRequired: true,
      dissonanceStatus: "none",
    },
    commit: {
      allowed: false,
      commitRef: null,
    },
  };
}
