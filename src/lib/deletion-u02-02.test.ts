import { describe, it, expect } from "vitest";
import { deactivateProduct, deactivateCategory } from "@/lib/catalog";

describe("Phase U02-02: Deletion of Menu & Category", () => {
  it("exports deactivateProduct and deactivateCategory data functions", () => {
    expect(typeof deactivateProduct).toBe("function");
    expect(typeof deactivateCategory).toBe("function");
  });
});
