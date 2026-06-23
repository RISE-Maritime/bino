// Fuse keelson's decomposed navigation subjects into a single PoseUpdate.
//
// A real maritime feed publishes location_fix, heading_true_north_deg,
// pitch_deg and roll_deg as separate, independently-timestamped streams at
// different rates. keelson explicitly leaves correlating them to the consumer
// "by timestamp" and specifies no alignment policy (protocol-spec §2.2.1), so
// the policy is ours to choose. See ADR-002.
//
// This module is a swappable seam: `NavFuser` is the interface; `LatestWinsNavFuser`
// is the v1 policy. A future interpolate-to-fix-time policy implements the same
// interface without touching the subscriber or the pose path.

import type { Anchor } from "./dsl.js";
import type { PoseUpdate } from "./pose.js";
import { geodeticToScene, navToSceneQuaternion } from "./frames.js";
import type { DecodedLocationFix, DecodedTimestampedFloat } from "./keelson.js";

export interface FusedPose {
  update: PoseUpdate;
  /** Largest |t_fix − t_subject| among the attitude subjects fused into this
   *  pose (seconds). The staleness latest-wins silently accepts — surfaced so
   *  it is observable rather than hidden. */
  skew_s: number;
}

export interface NavFuser {
  setHeading(s: DecodedTimestampedFloat): void;
  setPitch(s: DecodedTimestampedFloat): void;
  setRoll(s: DecodedTimestampedFloat): void;
  /** A new location_fix is the pose trigger: returns the fused pose. */
  fix(f: DecodedLocationFix): FusedPose;
  /** Largest skew observed across all fixes so far (seconds). */
  readonly maxSkew_s: number;
}

/**
 * Latest-value-wins fusion. Position is the trigger: every `location_fix`
 * produces a pose, composed with the most recent heading/pitch/roll seen so
 * far (each defaulting to 0 until its first sample — heading 0 = bow North,
 * level trim). This matches the only in-repo keelson consumer example and is
 * adequate for AIS-rate traffic; the cost is staleness skew, which is tracked.
 */
export class LatestWinsNavFuser implements NavFuser {
  private heading?: DecodedTimestampedFloat;
  private pitch?: DecodedTimestampedFloat;
  private roll?: DecodedTimestampedFloat;
  private _maxSkew = 0;

  constructor(
    private readonly entityId: string,
    private readonly anchor: Anchor,
    /** When false (default), the vessel sits at the waterline (anchor height)
     *  and the noisy GPS antenna altitude is ignored — correct for a surface
     *  vessel that floats. When true, the raw location_fix altitude drives the
     *  vessel's vertical position. */
    private readonly useFixAltitude = false,
  ) {}

  setHeading(s: DecodedTimestampedFloat): void {
    this.heading = s;
  }
  setPitch(s: DecodedTimestampedFloat): void {
    this.pitch = s;
  }
  setRoll(s: DecodedTimestampedFloat): void {
    this.roll = s;
  }

  fix(f: DecodedLocationFix): FusedPose {
    const height = this.useFixAltitude ? f.altitude : this.anchor.height;
    const position = geodeticToScene({ lat: f.lat, lon: f.lon, height }, this.anchor);
    const orientation = navToSceneQuaternion(
      this.heading?.value ?? 0,
      this.pitch?.value ?? 0,
      this.roll?.value ?? 0,
    );

    let skew = 0;
    for (const s of [this.heading, this.pitch, this.roll]) {
      if (s) skew = Math.max(skew, Math.abs(f.time - s.time));
    }
    this._maxSkew = Math.max(this._maxSkew, skew);

    return {
      update: { entityId: this.entityId, pose: { position, orientation }, time: f.time },
      skew_s: skew,
    };
  }

  get maxSkew_s(): number {
    return this._maxSkew;
  }
}
