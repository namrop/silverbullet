import { describe, expect, test } from "vitest";
import {
  bytesToUtf8,
  createSourceSnapshot,
  sourceBytesEqual,
  utf8ToBytes,
} from "./source_fidelity.ts";

const sourceWithPreservedBytes = [
  "---",
  "uid: 019f-example-uid",
  "title: Preserve Me",
  "tags:",
  "  - atrium",
  "  - silverbullet",
  "---",
  "# Heading with trailing spaces  ",
  "",
  "A paragraph with a wiki link [[Exact Target]] and trailing tab\t",
  "",
  "- list item with two trailing spaces  ",
  "",
  "<!-- visibility: keep this comment exactly -->",
  "",
].join("\n");

describe("Atrium source fidelity utilities", () => {
  test("round-trips UTF-8 strings without whitespace/frontmatter/link normalization", () => {
    const bytes = utf8ToBytes(sourceWithPreservedBytes);
    const roundTrip = bytesToUtf8(bytes);

    expect(roundTrip).toEqual(sourceWithPreservedBytes);
    expect(roundTrip).toContain("# Heading with trailing spaces  \n");
    expect(roundTrip).toContain("trailing tab\t\n");
    expect(roundTrip).toContain("[[Exact Target]]");
  });

  test("hashes the exact byte surface rather than a normalized Markdown shape", async () => {
    const original = await createSourceSnapshot(sourceWithPreservedBytes);
    const normalized = await createSourceSnapshot(
      sourceWithPreservedBytes
        .replace("# Heading with trailing spaces  ", "# Heading with trailing spaces")
        .replace("trailing tab\t", "trailing tab")
        .replace("[[Exact Target]]", "[Exact Target](Exact%20Target)"),
    );

    expect(original.sha256).not.toEqual(normalized.sha256);
    expect(original.byteLength).not.toEqual(normalized.byteLength);
  });

  test("detects byte-identical source independently of string object identity", () => {
    const left = utf8ToBytes(sourceWithPreservedBytes);
    const right = utf8ToBytes(`${sourceWithPreservedBytes}`);
    const changed = utf8ToBytes(sourceWithPreservedBytes.trimEnd());

    expect(sourceBytesEqual(left, right)).toEqual(true);
    expect(sourceBytesEqual(left, changed)).toEqual(false);
  });
});
