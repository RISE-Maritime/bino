import * as THREE from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import {
  CesiumIonAuthPlugin,
  GoogleCloudAuthPlugin,
  GLTFExtensionsPlugin,
} from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { geodeticToEcef, type Anchor } from "@bino/core";

export interface TilesHandle {
  group: THREE.Group;
  source: string;
  update(): void;
  dispose(): void;
}

// ── Tile source parsing ──────────────────────────────────────────

export type TileSource =
  | { type: "google"; apiKey: string }
  | { type: "cesium-ion"; apiToken: string; assetId: string }
  | { type: "url"; url: string; anchor?: Anchor; geoidOffset?: number };

/**
 * Parse the `?tiles=` URL parameter into a tile source descriptor.
 *
 *   ?tiles=demo             Strasbourg photogrammetry (no auth)
 *   ?tiles=cesium:TOKEN     Cesium OSM Buildings (free account)
 *   ?tiles=google:KEY       Google Photorealistic 3D Tiles
 *   ?tiles=https://...      Direct tileset URL
 */
export function parseTileSource(param: string): TileSource {
  if (param === "demo") {
    return {
      type: "url",
      url: "https://s3.eu-west-2.wasabisys.com/ems-sgct-photomaillage/ODACIT/EMS_PM2022/tileset.json",
      // Strasbourg centre — overrides the scenario anchor so tiles
      // appear at the scene origin rather than 600 km off-screen.
      anchor: { lat: 48.57, lon: 7.71, height: 0 },
      geoidOffset: 47,
    };
  }
  if (param.startsWith("cesium:")) {
    return {
      type: "cesium-ion",
      apiToken: param.slice("cesium:".length),
      assetId: "96188", // Cesium OSM Buildings (global)
    };
  }
  if (param.startsWith("google:")) {
    return { type: "google", apiKey: param.slice("google:".length) };
  }
  if (param.startsWith("http://") || param.startsWith("https://")) {
    return { type: "url", url: param };
  }
  // Bare token → assume Cesium ion (lowest friction default)
  return { type: "cesium-ion", apiToken: param, assetId: "96188" };
}

// ── Tile source labels ───────────────────────────────────────────

const SOURCE_LABELS: Record<TileSource["type"], string> = {
  google: "Google 3D Tiles",
  "cesium-ion": "Cesium ion",
  url: "3D Tiles",
};

function sourceLabel(src: TileSource): string {
  return SOURCE_LABELS[src.type];
}

// ── Shared GLTF plugin ──────────────────────────────────────────

function gltfPlugin(): GLTFExtensionsPlugin {
  return new GLTFExtensionsPlugin({
    metadata: false,
    rtc: true,
    plugins: [],
    dracoLoader: new DRACOLoader().setDecoderPath(
      "https://unpkg.com/three@0.160.1/examples/jsm/libs/draco/gltf/",
    ),
    ktxLoader: null,
    autoDispose: true,
  });
}

// ── Public API ───────────────────────────────────────────────────

export function createTiles(opts: {
  source: TileSource;
  anchor: Anchor;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  geoidOffset?: number;
}): TilesHandle {
  const { source, camera, renderer } = opts;
  const anchor =
    (source.type === "url" && source.anchor) ? source.anchor : opts.anchor;
  const geoidOffset =
    (source.type === "url" && source.geoidOffset != null)
      ? source.geoidOffset
      : (opts.geoidOffset ?? 0);

  let tiles: TilesRenderer;

  switch (source.type) {
    case "google":
      tiles = new TilesRenderer();
      tiles.registerPlugin(
        new GoogleCloudAuthPlugin({
          apiToken: source.apiKey,
          autoRefreshToken: true,
        }),
      );
      break;
    case "cesium-ion":
      tiles = new TilesRenderer();
      tiles.registerPlugin(
        new CesiumIonAuthPlugin({
          apiToken: source.apiToken,
          assetId: source.assetId,
          autoRefreshToken: true,
        }),
      );
      break;
    case "url":
      tiles = new TilesRenderer(source.url);
      break;
  }

  tiles.registerPlugin(gltfPlugin());

  // Streaming tuning — higher errorTarget = coarser LOD = faster loads.
  // Google's plugin defaults to 40; raw tilesets default to 6 which
  // hammers the network for photogrammetry. 30 is a good middle ground.
  if (source.type !== "google") {
    tiles.errorTarget = 30;
  }
  tiles.downloadQueue.maxJobs = 12;
  tiles.parseQueue.maxJobs = 6;

  const transform = ecefToSceneMatrix(anchor);
  transform.decompose(
    tiles.group.position,
    tiles.group.quaternion,
    tiles.group.scale,
  );
  tiles.group.position.y -= geoidOffset;
  tiles.group.updateMatrixWorld(true);

  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  tiles.addEventListener("load-tile-set", () => {
    console.log("[tiles] root tileset loaded, group pos:",
      tiles.group.position.toArray().map((v: number) => v.toFixed(1)),
    );
  });
  tiles.addEventListener("load-model", () => {
    console.log("[tiles] tile model loaded, visible children:", tiles.group.children.length);
  });

  const label = sourceLabel(source);

  return {
    group: tiles.group,
    source: label,
    update() {
      tiles.setCamera(camera);
      tiles.setResolutionFromRenderer(camera, renderer);
      camera.updateMatrixWorld();
      tiles.update();
    },
    dispose() {
      tiles.dispose();
    },
  };
}

// ── ECEF → scene matrix ─────────────────────────────────────────

function ecefToSceneMatrix(anchor: Anchor): THREE.Matrix4 {
  const latRad = (anchor.lat * Math.PI) / 180;
  const lonRad = (anchor.lon * Math.PI) / 180;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const ecef = geodeticToEcef({
    lat: anchor.lat,
    lon: anchor.lon,
    height: anchor.height,
  });

  // Rows of the rotation mapping ECEF → scene (x=E, y=U, z=−N)
  const R00 = -sinLon;
  const R01 = cosLon;
  const R02 = 0;
  const R10 = cosLat * cosLon;
  const R11 = cosLat * sinLon;
  const R12 = sinLat;
  const R20 = sinLat * cosLon;
  const R21 = sinLat * sinLon;
  const R22 = -cosLat;

  const tx = R00 * -ecef.x + R01 * -ecef.y + R02 * -ecef.z;
  const ty = R10 * -ecef.x + R11 * -ecef.y + R12 * -ecef.z;
  const tz = R20 * -ecef.x + R21 * -ecef.y + R22 * -ecef.z;

  return new THREE.Matrix4().set(
    R00, R01, R02, tx,
    R10, R11, R12, ty,
    R20, R21, R22, tz,
    0, 0, 0, 1,
  );
}
