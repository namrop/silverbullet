import { describe, expect, test } from "vitest";
import { spaceWriteSyscalls } from "./space.ts";

function atriumClient() {
  const calls: string[] = [];
  return {
    calls,
    client: {
      bootConfig: { atriumMode: "canon_transaction" },
      space: {
        writePage: async () => calls.push("writePage"),
        deletePage: async () => calls.push("deletePage"),
        writeDocument: async () => calls.push("writeDocument"),
        deleteDocument: async () => calls.push("deleteDocument"),
        spacePrimitives: {
          writeFile: async () => calls.push("writeFile"),
          deleteFile: async () => calls.push("deleteFile"),
        },
      },
    } as any,
  };
}

describe("space write syscalls in Atrium modes", () => {
  test("block direct page/document/file writes before touching space primitives", async () => {
    const { client, calls } = atriumClient();
    const syscalls = spaceWriteSyscalls(client);

    await expect(
      syscalls["space.writePage"]({}, "Page", "text"),
    ).rejects.toThrow(
      "Direct space writes are disabled in Atrium mode: canon_transaction",
    );
    await expect(syscalls["space.deletePage"]({}, "Page")).rejects.toThrow(
      "Direct space writes are disabled in Atrium mode: canon_transaction",
    );
    await expect(
      syscalls["space.writeDocument"]({}, "doc.pdf", new Uint8Array([1])),
    ).rejects.toThrow(
      "Direct space writes are disabled in Atrium mode: canon_transaction",
    );
    await expect(
      syscalls["space.deleteDocument"]({}, "doc.pdf"),
    ).rejects.toThrow(
      "Direct space writes are disabled in Atrium mode: canon_transaction",
    );
    await expect(
      syscalls["space.writeFile"]({}, "raw.bin", new Uint8Array([2])),
    ).rejects.toThrow(
      "Direct space writes are disabled in Atrium mode: canon_transaction",
    );
    await expect(syscalls["space.deleteFile"]({}, "raw.bin")).rejects.toThrow(
      "Direct space writes are disabled in Atrium mode: canon_transaction",
    );

    expect(calls).toEqual([]);
  });

  test("preserve upstream write behavior when Atrium mode is omitted", async () => {
    const calls: string[] = [];
    const client = {
      bootConfig: {},
      space: {
        writePage: async () => {
          calls.push("writePage");
          return { name: "Page" };
        },
        deletePage: async () => calls.push("deletePage"),
        writeDocument: async () => {
          calls.push("writeDocument");
          return { name: "doc.pdf" };
        },
        deleteDocument: async () => calls.push("deleteDocument"),
        spacePrimitives: {
          writeFile: async () => {
            calls.push("writeFile");
            return { name: "raw.bin" };
          },
          deleteFile: async () => calls.push("deleteFile"),
        },
      },
    } as any;
    const syscalls = spaceWriteSyscalls(client);

    await expect(
      syscalls["space.writePage"]({}, "Page", "text"),
    ).resolves.toEqual({
      name: "Page",
    });
    await syscalls["space.deletePage"]({}, "Page");
    await expect(
      syscalls["space.writeDocument"]({}, "doc.pdf", new Uint8Array([1])),
    ).resolves.toEqual({ name: "doc.pdf" });
    await syscalls["space.deleteDocument"]({}, "doc.pdf");
    await expect(
      syscalls["space.writeFile"]({}, "raw.bin", new Uint8Array([2])),
    ).resolves.toEqual({ name: "raw.bin" });
    await syscalls["space.deleteFile"]({}, "raw.bin");

    expect(calls).toEqual([
      "writePage",
      "deletePage",
      "writeDocument",
      "deleteDocument",
      "writeFile",
      "deleteFile",
    ]);
  });
});
