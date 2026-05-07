import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("auth redirect preservation", () => {
  it("submits the auth-page from query parameter with the login request", async () => {
    const authHtml = await readFile("client/html/auth.html", "utf-8");

    expect(authHtml).toContain('const from = params.get("from");');
    expect(authHtml).toContain("params.append('from', from);");
  });

  it("sends unauthenticated client boot through auth with the current path and query", async () => {
    const bootTs = await readFile("client/boot.ts", "utf-8");

    expect(bootTs).toContain("const from = `${location.pathname}${location.search}`;");
    expect(bootTs).toContain("location.href = `.auth?from=${encodeURIComponent(from)}`;");
  });
});
