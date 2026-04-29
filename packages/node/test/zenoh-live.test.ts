import { describe, expect, it } from "vitest";
import { Config, Session } from "@eclipse-zenoh/zenoh-ts";

// Gated on BINO_ZENOH_URL — set to "ws/127.0.0.1:10000" (or wherever
// the test router lives) to exercise the live Zenoh roundtrip.
// Skipped by default so the suite stays green without the router.
//
// Bring the router up:
//   docker compose -f tests/zenoh-router/docker-compose.yml up -d
const url = process.env["BINO_ZENOH_URL"];
const itLive = url ? it : it.skip;

describe("zenoh-ts live roundtrip", () => {
  itLive("opens a session, publishes, and receives the same bytes back", async () => {
    const session = await Session.open(new Config(url!));
    try {
      const key = "bino/test/live-roundtrip";
      const payload = new TextEncoder().encode(`hello-${Date.now()}`);

      const sub = await session.declareSubscriber(key);
      const recv = sub.receiver();
      if (!recv) throw new Error("subscriber returned no receiver");

      await session.put(key, payload);

      const sample = await Promise.race([
        recv.receive(),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timed out waiting for sample")), 3000),
        ),
      ]);
      const bytes = sample.payload().toBytes();
      expect(bytes.length).toBe(payload.length);
      expect(Array.from(bytes)).toEqual(Array.from(payload));

      await sub.undeclare();
    } finally {
      await session.close().catch(() => {});
    }
  });
});
