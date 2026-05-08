export const ATRIUM_LIBRARIAN_CALLOUT_SCHEMA_VERSION =
  "atrium_librarian_callout_v0";

export type AtriumLibrarianCalloutScope = "local" | "page" | "global";
export type AtriumLibrarianCalloutStatus = "pending" | "applied" | "dismissed";

export type AtriumLibrarianCalloutAnchor = {
  path: string;
  line: number;
  column: number;
  createdAt: string | Date;
};

export type AtriumLibrarianCalloutInput = AtriumLibrarianCalloutAnchor & {
  text: string;
  scope?: AtriumLibrarianCalloutScope;
  status?: AtriumLibrarianCalloutStatus;
  collapsed?: boolean;
};

function isoTimestamp(createdAt: string | Date): string {
  return typeof createdAt === "string" ? createdAt : createdAt.toISOString();
}

function handleTimestamp(createdAt: string | Date): string {
  return isoTimestamp(createdAt)
    .replace(/[^0-9a-z]/gi, "")
    .toLowerCase();
}

function slugPath(path: string): string {
  const slug = path
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled";
}

export function makeAtriumLibrarianCalloutHandle(
  anchor: AtriumLibrarianCalloutAnchor,
): string {
  return [
    "atrium-callout",
    handleTimestamp(anchor.createdAt),
    slugPath(anchor.path),
    `l${Math.max(1, anchor.line)}c${Math.max(1, anchor.column)}`,
  ].join("-");
}

function quotedCalloutLines(text: string): string[] {
  const normalized =
    text.trimEnd() || "TODO: describe the requested Atrium update.";
  return normalized.split("\n").map((line) => `> ${line}`);
}

export function formatAtriumLibrarianCallout(
  input: AtriumLibrarianCalloutInput,
): string {
  const createdAt = isoTimestamp(input.createdAt);
  const handle = makeAtriumLibrarianCalloutHandle({
    path: input.path,
    line: input.line,
    column: input.column,
    createdAt,
  });
  const foldMarker = input.collapsed === false ? "+" : "-";
  const scope = input.scope ?? "local";
  const status = input.status ?? "pending";

  return [
    `> [!atrium-librarian]${foldMarker} ${handle}`,
    `> schema: ${ATRIUM_LIBRARIAN_CALLOUT_SCHEMA_VERSION}`,
    `> status: ${status}`,
    `> scope: ${scope}`,
    `> path: \`${input.path}\``,
    `> anchor: line ${Math.max(1, input.line)}, column ${Math.max(1, input.column)}`,
    `> created: ${createdAt}`,
    ">",
    ...quotedCalloutLines(input.text),
    "",
  ].join("\n");
}
