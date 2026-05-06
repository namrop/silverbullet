import { describe, expect, test } from "vitest";
import { shellSyscalls } from "./shell.ts";

describe("shell syscalls in Atrium modes", () => {
  test("block shell.run before authenticated fetch when an Atrium mode is active", async () => {
    let fetchCalls = 0;
    const client = {
      bootConfig: { atriumMode: "canon_transaction" },
      httpSpacePrimitives: {
        url: "http://localhost/.fs",
        authenticatedFetch: () => {
          fetchCalls++;
          throw new Error("should not fetch");
        },
      },
    } as any;

    await expect(
      shellSyscalls(client)["shell.run"]({}, "echo", ["unsafe"]),
    ).rejects.toThrow("Shell execution is disabled in Atrium mode: canon_transaction");
    expect(fetchCalls).toEqual(0);
  });

  test("preserve upstream shell behavior when Atrium mode is omitted", async () => {
    const client = {
      bootConfig: {},
      httpSpacePrimitives: {
        url: "http://localhost/.fs",
        authenticatedFetch: async () =>
          new Response(JSON.stringify({ code: 0, stdout: "ok", stderr: "" })),
      },
    } as any;

    await expect(
      shellSyscalls(client)["shell.run"]({}, "echo", ["ok"]),
    ).resolves.toEqual({ code: 0, stdout: "ok", stderr: "" });
  });
});
