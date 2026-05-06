import { describe, expect, test } from "vitest";
import {
  ATRIUM_EDITOR_MODES,
  ATRIUM_TRANSACTION_SCHEMA_VERSION,
  validateAtriumEditorWriteTransaction,
} from "./transactions.ts";

const sha256 = "a".repeat(64);

const validTransaction = {
  schema: ATRIUM_TRANSACTION_SCHEMA_VERSION,
  transactionId: "tx_20260506_0001",
  operation: "update",
  mode: "canon_transaction",
  actor: {
    human: "Luis",
    surface: "silverbullet_atrium_fork",
    sessionId: "telegram-71",
  },
  object: {
    uid: "019f-example-uid",
    currentPath: "20_digital_architecture/example.md",
    proposedPath: null,
  },
  sourceIntegrity: {
    baseHash: sha256,
    proposedHash: "b".repeat(64),
    patchHash: null,
  },
  payload: {
    sourceBytesRef: "draft://tx_20260506_0001/source.md",
    patch: null,
  },
  validation: {
    frontmatterProfile: "standard",
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

describe("Atrium editor transaction schema", () => {
  test("names the explicit editor modes without granting implicit local authority", () => {
    expect(ATRIUM_EDITOR_MODES).toEqual([
      "inspect_only",
      "projection_edit",
      "canon_transaction",
    ]);
  });

  test("accepts a canon transaction proposal that cannot directly commit", () => {
    const result = validateAtriumEditorWriteTransaction(validTransaction);

    expect(result.valid).toEqual(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects transaction proposals that attempt to pre-authorize commit", () => {
    const result = validateAtriumEditorWriteTransaction({
      ...validTransaction,
      commit: { allowed: true, commitRef: "abc123" },
    });

    expect(result.valid).toEqual(false);
    expect(result.errors).toContain("commit.allowed must remain false until Atrium Service approves the transaction");
  });

  test("requires source hashes to be sha256-shaped when present", () => {
    const result = validateAtriumEditorWriteTransaction({
      ...validTransaction,
      sourceIntegrity: {
        ...validTransaction.sourceIntegrity,
        proposedHash: "not-a-sha",
      },
    });

    expect(result.valid).toEqual(false);
    expect(result.errors).toContain("sourceIntegrity.proposedHash must be a 64-character lowercase hex sha256");
  });

  test("requires human review flags for canon transactions", () => {
    const result = validateAtriumEditorWriteTransaction({
      ...validTransaction,
      review: {
        diffRequired: false,
        humanConfirmationRequired: false,
        dissonanceStatus: "none",
      },
    });

    expect(result.valid).toEqual(false);
    expect(result.errors).toContain("review.diffRequired must be true for canon transactions");
    expect(result.errors).toContain("review.humanConfirmationRequired must be true for canon transactions");
  });
});
