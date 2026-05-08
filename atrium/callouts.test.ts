import { describe, expect, test } from "vitest";
import {
  ATRIUM_LIBRARIAN_CALLOUT_SCHEMA_VERSION,
  formatAtriumLibrarianCallout,
  makeAtriumLibrarianCalloutHandle,
} from "./callouts.ts";

describe("Atrium librarian callouts", () => {
  test("creates deterministic handles from timestamp, path, and anchor", () => {
    expect(
      makeAtriumLibrarianCalloutHandle({
        createdAt: "2026-05-08T16:17:18.000Z",
        path: "20_digital_architecture/atrium_service/Plan.md",
        line: 42,
        column: 7,
      }),
    ).toBe(
      "atrium-callout-20260508t161718000z-20-digital-architecture-atrium-service-plan-md-l42c7",
    );
  });

  test("formats a collapsed markdown callout as a pending librarian prompt", () => {
    const callout = formatAtriumLibrarianCallout({
      createdAt: "2026-05-08T16:17:18.000Z",
      path: "Inbox/Test.md",
      line: 3,
      column: 5,
      text: "Move this into the Atrium Service packet.\nPreserve my wording.",
    });

    expect(callout).toContain(
      "> [!atrium-librarian]- atrium-callout-20260508t161718000z-inbox-test-md-l3c5",
    );
    expect(callout).toContain(
      `> schema: ${ATRIUM_LIBRARIAN_CALLOUT_SCHEMA_VERSION}`,
    );
    expect(callout).toContain("> status: pending");
    expect(callout).toContain("> scope: local");
    expect(callout).toContain("> path: `Inbox/Test.md`");
    expect(callout).toContain("> anchor: line 3, column 5");
    expect(callout).toContain("> created: 2026-05-08T16:17:18.000Z");
    expect(callout).toContain("> Move this into the Atrium Service packet.");
    expect(callout).toContain("> Preserve my wording.");
    expect(callout.endsWith("\n")).toBe(true);
  });
});
