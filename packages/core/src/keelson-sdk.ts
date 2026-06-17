// Single choke point for everything we pull out of @rise-maritime/keelson-js.
//
// The SDK's public entry (dist/index.js) re-exports the key-construction and
// envelope helpers, but NOT: the `Envelope` message class (needed to serialize
// an envelope to bytes — `encloseFromTypeName` hands back an object with no
// public encoder), the `PackedElementField_NumericType` enum, or the generated
// payload TS types. Those live in `dist/` submodules that aren't part of the
// advertised surface.
//
// Reaching into `dist/` is fragile across version bumps, so we confine every
// such import to this file: one place to audit when the pinned version changes.
// The dependency is pinned to an EXACT version in package.json for this reason —
// do not loosen it to a caret range without re-checking these paths.
//
// Prefer the `payloads/index.*` barrels over the deepest per-message paths;
// they move less often than individual message files.

export {
  construct_pubSub_key,
  enclose,
  uncover,
  encodePayloadFromTypeName,
  decodePayloadFromTypeName,
} from "@rise-maritime/keelson-js";

export { Envelope } from "@rise-maritime/keelson-js/dist/Envelope.js";

export { PackedElementField_NumericType } from "@rise-maritime/keelson-js/dist/payloads/index.foxglove.js";

export type {
  FrameTransform,
  RawImage,
  PointCloud,
} from "@rise-maritime/keelson-js/dist/payloads/index.foxglove.js";

export type {
  RadarSweep,
  RadarSpoke,
} from "@rise-maritime/keelson-js/dist/payloads/index.keelson.js";
