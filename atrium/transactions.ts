export const ATRIUM_TRANSACTION_SCHEMA_VERSION =
  "atrium_editor_write_transaction_v0" as const;

export const ATRIUM_EDITOR_MODES = [
  "inspect_only",
  "projection_edit",
  "canon_transaction",
] as const;

export type AtriumEditorMode = (typeof ATRIUM_EDITOR_MODES)[number];

export const ATRIUM_OPERATIONS = [
  "create",
  "update",
  "delete",
  "move",
  "metadata_update",
] as const;

export const ATRIUM_VALIDATION_STATES = ["pending", "pass", "fail"] as const;

export const ATRIUM_WHITESPACE_VISIBILITY_POLICIES = [
  "none",
  "hook_required",
  "explicit_cleanup_requested",
] as const;

export const ATRIUM_DISSONANCE_STATUSES = [
  "none",
  "conflict",
  "stale",
  "ambiguous_uid",
  "blocked",
] as const;

export type AtriumOperation = (typeof ATRIUM_OPERATIONS)[number];
export type AtriumValidationState = (typeof ATRIUM_VALIDATION_STATES)[number];
export type AtriumWhitespaceVisibilityPolicy =
  (typeof ATRIUM_WHITESPACE_VISIBILITY_POLICIES)[number];
export type AtriumDissonanceStatus =
  (typeof ATRIUM_DISSONANCE_STATUSES)[number];

export type AtriumEditorWriteTransaction = {
  schema: typeof ATRIUM_TRANSACTION_SCHEMA_VERSION;
  transactionId: string;
  operation: AtriumOperation;
  mode: "canon_transaction";
  actor: {
    human: string;
    surface: string;
    sessionId: string;
  };
  object: {
    uid: string | null;
    currentPath: string;
    proposedPath: string | null;
  };
  sourceIntegrity: {
    baseHash: string | null;
    proposedHash: string;
    patchHash: string | null;
  };
  payload: {
    sourceBytesRef: string | null;
    patch: string | null;
  };
  validation: {
    frontmatterProfile: string;
    uidCheck: AtriumValidationState;
    pathProjectionCheck: AtriumValidationState;
    aclCheck: AtriumValidationState;
    graphImpactCheck: AtriumValidationState;
    whitespaceVisibilityPolicy: AtriumWhitespaceVisibilityPolicy;
  };
  review: {
    diffRequired: boolean;
    humanConfirmationRequired: boolean;
    dissonanceStatus: AtriumDissonanceStatus;
  };
  commit: {
    allowed: false;
    commitRef: string | null;
  };
};

export type AtriumTransactionValidationResult = {
  valid: boolean;
  errors: string[];
};

const SHA256_RE = /^[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectString(
  errors: string[],
  value: unknown,
  field: string,
): value is string {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${field} must be a non-empty string`);
    return false;
  }
  return true;
}

function expectNullableString(
  errors: string[],
  value: unknown,
  field: string,
): value is string | null {
  if (value === null) {
    return true;
  }
  return expectString(errors, value, field);
}

function expectOneOf<T extends readonly string[]>(
  errors: string[],
  value: unknown,
  field: string,
  allowed: T,
): value is T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${field} must be one of ${allowed.join(", ")}`);
    return false;
  }
  return true;
}

function expectSha256(
  errors: string[],
  value: unknown,
  field: string,
  nullable = false,
): void {
  if (nullable && value === null) {
    return;
  }
  if (typeof value !== "string" || !SHA256_RE.test(value)) {
    errors.push(`${field} must be a 64-character lowercase hex sha256`);
  }
}

export function validateAtriumEditorWriteTransaction(
  value: unknown,
): AtriumTransactionValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["transaction must be an object"] };
  }

  if (value.schema !== ATRIUM_TRANSACTION_SCHEMA_VERSION) {
    errors.push(`schema must be ${ATRIUM_TRANSACTION_SCHEMA_VERSION}`);
  }
  expectString(errors, value.transactionId, "transactionId");
  expectOneOf(errors, value.operation, "operation", ATRIUM_OPERATIONS);
  if (value.mode !== "canon_transaction") {
    errors.push("mode must be canon_transaction for write transactions");
  }

  if (isRecord(value.actor)) {
    expectString(errors, value.actor.human, "actor.human");
    expectString(errors, value.actor.surface, "actor.surface");
    expectString(errors, value.actor.sessionId, "actor.sessionId");
  } else {
    errors.push("actor must be an object");
  }

  if (isRecord(value.object)) {
    expectNullableString(errors, value.object.uid, "object.uid");
    expectString(errors, value.object.currentPath, "object.currentPath");
    expectNullableString(errors, value.object.proposedPath, "object.proposedPath");
  } else {
    errors.push("object must be an object");
  }

  if (isRecord(value.sourceIntegrity)) {
    expectSha256(errors, value.sourceIntegrity.baseHash, "sourceIntegrity.baseHash", true);
    expectSha256(errors, value.sourceIntegrity.proposedHash, "sourceIntegrity.proposedHash");
    expectSha256(errors, value.sourceIntegrity.patchHash, "sourceIntegrity.patchHash", true);
  } else {
    errors.push("sourceIntegrity must be an object");
  }

  if (isRecord(value.payload)) {
    expectNullableString(errors, value.payload.sourceBytesRef, "payload.sourceBytesRef");
    expectNullableString(errors, value.payload.patch, "payload.patch");
    if (value.payload.sourceBytesRef === null && value.payload.patch === null) {
      errors.push("payload.sourceBytesRef or payload.patch must be present");
    }
  } else {
    errors.push("payload must be an object");
  }

  if (isRecord(value.validation)) {
    expectString(errors, value.validation.frontmatterProfile, "validation.frontmatterProfile");
    expectOneOf(errors, value.validation.uidCheck, "validation.uidCheck", ATRIUM_VALIDATION_STATES);
    expectOneOf(
      errors,
      value.validation.pathProjectionCheck,
      "validation.pathProjectionCheck",
      ATRIUM_VALIDATION_STATES,
    );
    expectOneOf(errors, value.validation.aclCheck, "validation.aclCheck", ATRIUM_VALIDATION_STATES);
    expectOneOf(
      errors,
      value.validation.graphImpactCheck,
      "validation.graphImpactCheck",
      ATRIUM_VALIDATION_STATES,
    );
    expectOneOf(
      errors,
      value.validation.whitespaceVisibilityPolicy,
      "validation.whitespaceVisibilityPolicy",
      ATRIUM_WHITESPACE_VISIBILITY_POLICIES,
    );
  } else {
    errors.push("validation must be an object");
  }

  if (isRecord(value.review)) {
    if (value.review.diffRequired !== true) {
      errors.push("review.diffRequired must be true for canon transactions");
    }
    if (value.review.humanConfirmationRequired !== true) {
      errors.push(
        "review.humanConfirmationRequired must be true for canon transactions",
      );
    }
    expectOneOf(
      errors,
      value.review.dissonanceStatus,
      "review.dissonanceStatus",
      ATRIUM_DISSONANCE_STATUSES,
    );
  } else {
    errors.push("review must be an object");
  }

  if (isRecord(value.commit)) {
    if (value.commit.allowed !== false) {
      errors.push(
        "commit.allowed must remain false until Atrium Service approves the transaction",
      );
    }
    expectNullableString(errors, value.commit.commitRef, "commit.commitRef");
  } else {
    errors.push("commit must be an object");
  }

  return { valid: errors.length === 0, errors };
}
