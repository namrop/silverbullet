import { describe, expect, test } from "vitest";
import { createCanonUpdateProposal } from "./proposals.ts";
import { validateAtriumEditorWriteTransaction } from "./transactions.ts";

const baseSource = "---\nuid: 019f-example-uid\ntitle: Original\n---\nBody with two spaces  \n";
const proposedSource = "---\nuid: 019f-example-uid\ntitle: Original\n---\nBody with two spaces  \nNew line\n";

describe("Atrium transaction proposal builder", () => {
  test("builds a valid canon update proposal from exact source bytes", async () => {
    const proposal = await createCanonUpdateProposal({
      transactionId: "tx_test_001",
      actor: {
        human: "Luis",
        surface: "silverbullet_atrium_fork",
        sessionId: "test-session",
      },
      uid: "019f-example-uid",
      currentPath: "20_digital_architecture/example.md",
      baseSource,
      proposedSource,
      sourceBytesRef: "draft://tx_test_001/source.md",
    });

    expect(validateAtriumEditorWriteTransaction(proposal).valid).toEqual(true);
    expect(proposal.operation).toEqual("update");
    expect(proposal.mode).toEqual("canon_transaction");
    expect(proposal.commit.allowed).toEqual(false);
    expect(proposal.payload.sourceBytesRef).toEqual("draft://tx_test_001/source.md");
    expect(proposal.sourceIntegrity.baseHash).not.toEqual(
      proposal.sourceIntegrity.proposedHash,
    );
  });

  test("does not normalize trailing spaces when hashing proposed source", async () => {
    const exact = await createCanonUpdateProposal({
      transactionId: "tx_test_002",
      actor: {
        human: "Luis",
        surface: "silverbullet_atrium_fork",
        sessionId: "test-session",
      },
      uid: "019f-example-uid",
      currentPath: "20_digital_architecture/example.md",
      baseSource,
      proposedSource,
      sourceBytesRef: "draft://tx_test_002/source.md",
    });
    const trimmed = await createCanonUpdateProposal({
      transactionId: "tx_test_003",
      actor: {
        human: "Luis",
        surface: "silverbullet_atrium_fork",
        sessionId: "test-session",
      },
      uid: "019f-example-uid",
      currentPath: "20_digital_architecture/example.md",
      baseSource,
      proposedSource: proposedSource.replace("two spaces  ", "two spaces"),
      sourceBytesRef: "draft://tx_test_003/source.md",
    });

    expect(exact.sourceIntegrity.proposedHash).not.toEqual(
      trimmed.sourceIntegrity.proposedHash,
    );
  });
});
