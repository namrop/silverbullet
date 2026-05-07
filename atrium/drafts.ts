import { createSourceSnapshot } from "./source_fidelity.ts";
import type { AtriumEditorMode } from "./transactions.ts";

export const ATRIUM_PROJECTION_DRAFT_SCHEMA_VERSION =
  "atrium_projection_draft_v0" as const;

export type AtriumProjectionDraftMode = Extract<
  AtriumEditorMode,
  "projection_edit" | "canon_transaction"
>;

export type AtriumProjectionDraftActor = {
  human: string;
  surface: string;
  sessionId: string;
};

export type AtriumProjectionDraft = {
  schema: typeof ATRIUM_PROJECTION_DRAFT_SCHEMA_VERSION;
  draftId: string;
  mode: AtriumProjectionDraftMode;
  actor: AtriumProjectionDraftActor;
  object: {
    pageName: string;
    path: string;
    uid: string | null;
  };
  source: {
    text: string;
    sha256: string;
    byteLength: number;
  };
  policy: {
    separateFromCanon: true;
    mayCommitCanon: false;
    whitespaceVisibilityPolicy: "none";
  };
  timestamps: {
    updatedAt: string;
  };
};

export type CreateProjectionDraftOptions = {
  draftId: string;
  mode: AtriumProjectionDraftMode;
  actor: AtriumProjectionDraftActor;
  pageName: string;
  path: string;
  uid?: string | null;
  sourceText: string;
  updatedAt?: string;
};

export async function createProjectionDraft(
  options: CreateProjectionDraftOptions,
): Promise<AtriumProjectionDraft> {
  const source = await createSourceSnapshot(options.sourceText);

  return {
    schema: ATRIUM_PROJECTION_DRAFT_SCHEMA_VERSION,
    draftId: options.draftId,
    mode: options.mode,
    actor: options.actor,
    object: {
      pageName: options.pageName,
      path: options.path,
      uid: options.uid ?? null,
    },
    source: {
      text: options.sourceText,
      sha256: source.sha256,
      byteLength: source.byteLength,
    },
    policy: {
      separateFromCanon: true,
      mayCommitCanon: false,
      whitespaceVisibilityPolicy: "none",
    },
    timestamps: {
      updatedAt: options.updatedAt ?? new Date().toISOString(),
    },
  };
}

export function projectionDraftKey(path: string): string[] {
  return ["atrium", "projection-drafts", "by-path", path];
}
