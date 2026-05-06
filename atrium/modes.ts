import { ATRIUM_EDITOR_MODES, type AtriumEditorMode } from "./transactions.ts";

export type AtriumModeConfig = {
  mode: AtriumEditorMode;
  mayEditProjection: boolean;
  mayProposeCanonTransaction: boolean;
  mayWriteCanonDirectly: false;
  autosaveToSpace: boolean;
  serviceWorkerSync: boolean;
  shell: boolean;
};

export const ATRIUM_MODE_CONFIGS: Record<AtriumEditorMode, AtriumModeConfig> = {
  inspect_only: {
    mode: "inspect_only",
    mayEditProjection: false,
    mayProposeCanonTransaction: false,
    mayWriteCanonDirectly: false,
    autosaveToSpace: false,
    serviceWorkerSync: false,
    shell: false,
  },
  projection_edit: {
    mode: "projection_edit",
    mayEditProjection: true,
    mayProposeCanonTransaction: false,
    mayWriteCanonDirectly: false,
    autosaveToSpace: false,
    serviceWorkerSync: false,
    shell: false,
  },
  canon_transaction: {
    mode: "canon_transaction",
    mayEditProjection: true,
    mayProposeCanonTransaction: true,
    mayWriteCanonDirectly: false,
    autosaveToSpace: false,
    serviceWorkerSync: false,
    shell: false,
  },
} as const;

export function isAtriumMode(value: unknown): value is AtriumEditorMode {
  return typeof value === "string" && ATRIUM_EDITOR_MODES.includes(value as AtriumEditorMode);
}

export function getAtriumModeConfig(mode: unknown): AtriumModeConfig {
  if (!isAtriumMode(mode)) {
    throw new Error(`Unknown Atrium editor mode: ${String(mode)}`);
  }

  return ATRIUM_MODE_CONFIGS[mode];
}

export function shouldAutosaveToSpace(mode: unknown): boolean {
  if (mode === undefined || mode === null || mode === "") {
    return true;
  }

  return getAtriumModeConfig(mode).autosaveToSpace;
}

export function shouldServiceWorkerSync(mode: unknown): boolean {
  if (mode === undefined || mode === null || mode === "") {
    return true;
  }

  return getAtriumModeConfig(mode).serviceWorkerSync;
}

export function shouldEnableShell(mode: unknown): boolean {
  if (mode === undefined || mode === null || mode === "") {
    return true;
  }

  return getAtriumModeConfig(mode).shell;
}
