import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LatestWinsNavFuser } from "../src/nav-fuser.js";
import { geodeticToScene } from "../src/frames.js";
import type { Anchor } from "../src/dsl.js";

const anchor: Anchor = { lat: 54.32, lon: 10.14, height: 0 };

/** Bow vector: rotate the body forward axis (+X) by the pose quaternion. */
function bowOf(q: readonly [number, number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(1, 0, 0).applyQuaternion(new THREE.Quaternion(q[0], q[1], q[2], q[3]));
}

describe("LatestWinsNavFuser", () => {
  it("projects location_fix through the anchor into the scene frame", () => {
    const fuser = new LatestWinsNavFuser("ego", anchor);
    const fix = { lat: 54.32 + 100 / 111_320, lon: 10.14, altitude: 2, time: 10 };
    const { update } = fuser.fix(fix);

    expect(update.entityId).toBe("ego");
    expect(update.time).toBe(10);
    const expected = geodeticToScene({ lat: fix.lat, lon: fix.lon, height: fix.altitude }, anchor);
    update.pose.position.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 6));
  });

  it("defaults to heading North (bow −Z) before any heading arrives", () => {
    const fuser = new LatestWinsNavFuser("ego", anchor);
    const { update } = fuser.fix({ lat: 54.32, lon: 10.14, altitude: 0, time: 0 });
    expect(bowOf(update.pose.orientation).z).toBeCloseTo(-1, 6);
  });

  it("composes the latest heading into the pose (latest-wins)", () => {
    const fuser = new LatestWinsNavFuser("ego", anchor);
    fuser.setHeading({ value: 90, time: 0.9 });
    const { update } = fuser.fix({ lat: 54.32, lon: 10.14, altitude: 0, time: 1 });
    expect(bowOf(update.pose.orientation).x).toBeCloseTo(1, 6); // East
  });

  it("reports per-fix skew and tracks the running max", () => {
    const fuser = new LatestWinsNavFuser("ego", anchor);
    fuser.setHeading({ value: 10, time: 0.5 }); // 0.5 s before the fix
    fuser.setRoll({ value: 1, time: 1.8 }); // 0.8 s after the fix
    const { skew_s } = fuser.fix({ lat: 54.32, lon: 10.14, altitude: 0, time: 1.0 });
    expect(skew_s).toBeCloseTo(0.8, 6); // max(0.5, 0.8)
    expect(fuser.maxSkew_s).toBeCloseTo(0.8, 6);

    fuser.setHeading({ value: 10, time: 0 }); // now 2 s stale vs next fix
    fuser.fix({ lat: 54.32, lon: 10.14, altitude: 0, time: 2.0 });
    expect(fuser.maxSkew_s).toBeCloseTo(2.0, 6);
  });

  it("skew is zero when no attitude subjects have arrived", () => {
    const fuser = new LatestWinsNavFuser("ego", anchor);
    expect(fuser.fix({ lat: 54.32, lon: 10.14, altitude: 0, time: 5 }).skew_s).toBe(0);
  });
});
