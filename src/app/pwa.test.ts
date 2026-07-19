import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA configuration", () => {
  it("exposes an installable standalone manifest", () => {
    const data = manifest();

    expect(data.name).toBe("Wanna Dimsum POS");
    expect(data.short_name).toBe("WD POS");
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");
    expect(data.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" }),
      ]),
    );
  });

  it("keeps transactional API responses out of the service worker cache", () => {
    const sw = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

    expect(sw).toContain("isUnsafeRequest");
    expect(sw).toContain('url.pathname.startsWith("/api/")');
    expect(sw).not.toMatch(/cache\.put\(event\.request,\s*response\.clone\(\)\)/);
  });

  it("defines mobile responsive hooks for the role screens", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain(".wd-kasir-shell");
    expect(css).toContain(".wd-kitchen-board");
    expect(css).toContain(".wd-owner-shell");
    expect(css).toContain(".wd-inventory-shell");
  });
});
