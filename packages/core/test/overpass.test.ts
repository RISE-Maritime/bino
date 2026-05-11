import { describe, expect, it } from "vitest";
import {
  parseBuildingElements,
  parseSeamarkElements,
  type OverpassElement,
} from "../src/overpass.js";

describe("parseBuildingElements", () => {
  it("parses a building way with levels tag", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 54.3, lon: 10.1 },
      { type: "node", id: 2, lat: 54.3, lon: 10.11 },
      { type: "node", id: 3, lat: 54.31, lon: 10.11 },
      { type: "node", id: 4, lat: 54.31, lon: 10.1 },
      {
        type: "way",
        id: 100,
        nodes: [1, 2, 3, 4, 1],
        tags: { building: "yes", "building:levels": "5" },
      },
    ];
    const buildings = parseBuildingElements(elements);
    expect(buildings).toHaveLength(1);
    expect(buildings[0]!.polygon).toHaveLength(5);
    expect(buildings[0]!.heightM).toBe(15); // 5 × 3m
  });

  it("defaults to 3 levels when tag is absent", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 0, lon: 0 },
      { type: "node", id: 2, lat: 0, lon: 1 },
      { type: "node", id: 3, lat: 1, lon: 1 },
      {
        type: "way",
        id: 100,
        nodes: [1, 2, 3, 1],
        tags: { building: "yes" },
      },
    ];
    const buildings = parseBuildingElements(elements);
    expect(buildings).toHaveLength(1);
    expect(buildings[0]!.heightM).toBe(9); // 3 × 3m
  });

  it("skips ways without building tag", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 0, lon: 0 },
      { type: "node", id: 2, lat: 0, lon: 1 },
      { type: "node", id: 3, lat: 1, lon: 1 },
      {
        type: "way",
        id: 100,
        nodes: [1, 2, 3, 1],
        tags: { highway: "residential" },
      },
    ];
    const buildings = parseBuildingElements(elements);
    expect(buildings).toHaveLength(0);
  });

  it("skips buildings with fewer than 3 points", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 0, lon: 0 },
      { type: "node", id: 2, lat: 0, lon: 1 },
      {
        type: "way",
        id: 100,
        nodes: [1, 2],
        tags: { building: "yes" },
      },
    ];
    const buildings = parseBuildingElements(elements);
    expect(buildings).toHaveLength(0);
  });

  it("skips buildings with missing node references", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 0, lon: 0 },
      {
        type: "way",
        id: 100,
        nodes: [1, 999, 888],
        tags: { building: "yes" },
      },
    ];
    const buildings = parseBuildingElements(elements);
    expect(buildings).toHaveLength(0);
  });
});

describe("parseSeamarkElements", () => {
  it("parses seamark nodes with type tag", () => {
    const elements: OverpassElement[] = [
      {
        type: "node",
        id: 1,
        lat: 54.35,
        lon: 10.15,
        tags: { "seamark:type": "buoy_lateral", "seamark:buoy_lateral:category": "port" },
      },
      {
        type: "node",
        id: 2,
        lat: 54.36,
        lon: 10.16,
        tags: { "seamark:type": "light_minor" },
      },
    ];
    const seamarks = parseSeamarkElements(elements);
    expect(seamarks).toHaveLength(2);
    expect(seamarks[0]!.type).toBe("buoy_lateral");
    expect(seamarks[0]!.lat).toBe(54.35);
    expect(seamarks[1]!.type).toBe("light_minor");
  });

  it("skips nodes without seamark:type", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 0, lon: 0, tags: { name: "something" } },
    ];
    expect(parseSeamarkElements(elements)).toHaveLength(0);
  });

  it("skips way elements", () => {
    const elements: OverpassElement[] = [
      {
        type: "way",
        id: 100,
        nodes: [1, 2],
        tags: { "seamark:type": "separation_zone" },
      },
    ];
    expect(parseSeamarkElements(elements)).toHaveLength(0);
  });
});
