import { parseToRef, type Ref } from "@silverbulletmd/silverbullet/lib/ref";
import type { Client } from "../../client.ts";
import type { SysCallMapping } from "../system.ts";
import { shouldAllowDirectSpaceWrites } from "../../../atrium/modes.ts";

import type {
  DocumentMeta,
  FileMeta,
  PageMeta,
} from "@silverbulletmd/silverbullet/type/index";

export function spaceReadSyscalls(client: Client): SysCallMapping {
  return {
    "space.listPages": (): Promise<PageMeta[]> => {
      return client.space.fetchPageList();
    },
    "space.readPage": async (_ctx, name: string): Promise<string> => {
      return (await client.space.readPage(name)).text;
    },
    "space.readPageWithMeta": (
      _ctx,
      name: string,
    ): Promise<{ text: string; meta: PageMeta }> => {
      return client.space.readPage(name);
    },
    "space.readRef": async (_ctx, ref: string | Ref): Promise<string> => {
      if (typeof ref === "string") {
        ref = parseToRef(ref)!;
        if (!ref) {
          throw new Error(`Invalid ref: ${ref}`);
        }
      }
      return (await client.space.readRef(ref)).text;
    },
    "space.pageExists": (_ctx, name: string): boolean => {
      return client.clientSystem.allKnownFiles.has(`${name}.md`);
    },
    "space.getPageMeta": (_ctx, name: string): Promise<PageMeta> => {
      return client.space.getPageMeta(name);
    },
    "space.listPlugs": (): Promise<FileMeta[]> => {
      return client.space.listPlugs();
    },
    "space.listDocuments": async (): Promise<DocumentMeta[]> => {
      return await client.space.fetchDocumentList();
    },
    "space.readDocument": async (_ctx, name: string): Promise<Uint8Array> => {
      return (await client.space.readDocument(name)).data;
    },
    "space.getDocumentMeta": async (
      _ctx,
      name: string,
    ): Promise<DocumentMeta> => {
      return await client.space.getDocumentMeta(name);
    },
    // DEPRECATED, please use document versions instead, left here for backwards compatibility
    "space.listAttachments": async (): Promise<DocumentMeta[]> => {
      return await client.space.fetchDocumentList();
    },
    "space.readAttachment": async (_ctx, name: string): Promise<Uint8Array> => {
      return (await client.space.readDocument(name)).data;
    },
    "space.getAttachmentMeta": async (
      _ctx,
      name: string,
    ): Promise<DocumentMeta> => {
      return await client.space.getDocumentMeta(name);
    },
    // FS
    "space.listFiles": (): Promise<FileMeta[]> => {
      return client.space.spacePrimitives.fetchFileList();
    },
    "space.getFileMeta": (_ctx, name: string): Promise<FileMeta> => {
      return client.space.spacePrimitives.getFileMeta(name);
    },
    "space.readFile": async (_ctx, name: string): Promise<Uint8Array> => {
      return (await client.space.spacePrimitives.readFile(name)).data;
    },
    "space.readFileWithMeta": async (
      _ctx,
      name: string,
    ): Promise<{ data: Uint8Array; meta: FileMeta }> => {
      return await client.space.spacePrimitives.readFile(name);
    },
    "space.fileExists": async (_ctx, name: string): Promise<boolean> => {
      // If a full sync has successfully completed (so we know what files exist)
      // and we have a snapshot, let's use the snapshot
      if (
        client.fullSyncCompleted &&
        !client.eventedSpacePrimitives.isSnapshotEmpty()
      ) {
        return !!client.eventedSpacePrimitives.getSnapshot()[name];
      }
      try {
        await client.space.spacePrimitives.getFileMeta(name);
        // If this returned the file exists
        return true;
      } catch {
        // Assumption: any error means the file does not exist
        return false;
      }
    },
  };
}

export function spaceWriteSyscalls(editor: Client): SysCallMapping {
  const assertDirectSpaceWritesAllowed = () => {
    if (!shouldAllowDirectSpaceWrites(editor.bootConfig.atriumMode)) {
      throw new Error(
        `Direct space writes are disabled in Atrium mode: ${String(editor.bootConfig.atriumMode)}`,
      );
    }
  };

  return {
    "space.writePage": async (
      _ctx,
      name: string,
      text: string,
    ): Promise<PageMeta> => {
      assertDirectSpaceWritesAllowed();
      return editor.space.writePage(name, text);
    },
    "space.deletePage": async (_ctx, name: string) => {
      assertDirectSpaceWritesAllowed();
      console.log("Deleting page");
      await editor.space.deletePage(name);
    },
    "space.writeDocument": async (
      _ctx,
      name: string,
      data: Uint8Array,
    ): Promise<DocumentMeta> => {
      assertDirectSpaceWritesAllowed();
      return editor.space.writeDocument(name, data);
    },
    "space.deleteDocument": async (_ctx, name: string) => {
      assertDirectSpaceWritesAllowed();
      await editor.space.deleteDocument(name);
    },
    "space.writeFile": async (
      _ctx,
      name: string,
      data: Uint8Array,
    ): Promise<FileMeta> => {
      assertDirectSpaceWritesAllowed();
      return editor.space.spacePrimitives.writeFile(name, data);
    },
    "space.deleteFile": async (_ctx, name: string) => {
      assertDirectSpaceWritesAllowed();
      return editor.space.spacePrimitives.deleteFile(name);
    },
  };
}
