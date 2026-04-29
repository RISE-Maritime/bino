import { describe, expect, it } from "vitest";
import { decodePoseMessage } from "../src/pose.js";

describe("decodePoseMessage", () => {
  it("parses a valid wire message into a PoseUpdate", () => {
    const u = decodePoseMessage(
      { position: [1, 2, 3], orientation: [0, 0, 0, 1], time: 0.5 },
      "ego",
    );
    expect(u).not.toBeNull();
    expect(u!.entityId).toBe("ego");
    expect(u!.pose.position).toEqual([1, 2, 3]);
    expect(u!.time).toBe(0.5);
  });

  it("returns null on missing fields", () => {
    expect(decodePoseMessage({ position: [1, 2, 3] }, "ego")).toBeNull();
  });

  it("returns null on wrong-arity vectors", () => {
    expect(
      decodePoseMessage(
        { position: [1, 2], orientation: [0, 0, 0, 1], time: 0 },
        "ego",
      ),
    ).toBeNull();
  });

  it("returns null on non-numeric values", () => {
    expect(
      decodePoseMessage(
        { position: ["a", "b", "c"], orientation: [0, 0, 0, 1], time: 0 },
        "ego",
      ),
    ).toBeNull();
  });
});
