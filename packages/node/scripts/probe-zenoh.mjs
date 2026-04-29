#!/usr/bin/env node
// Roundtrip probe for the Zenoh router. Assumes docker-compose is up.
// Opens a session, subscribes to a key, puts a value, asserts the
// subscriber receives matching bytes. Exits 0 on success, 1 on
// failure, 2 if the router isn't reachable.

import { Config, Session } from "@eclipse-zenoh/zenoh-ts";

const URL = process.env.BINO_ZENOH_URL ?? "ws/127.0.0.1:10000";
const KEY = "bino/probe/test";
const PAYLOAD = new TextEncoder().encode(JSON.stringify({ ok: true, t: Date.now() }));

let session;
try {
  session = await Session.open(new Config(URL));
} catch (err) {
  console.error(`probe: cannot reach router at ${URL}: ${err.message ?? err}`);
  process.exit(2);
}

try {
  const sub = await session.declareSubscriber(KEY);
  const recv = sub.receiver();

  // put after subscriber is declared so we don't race the routing table.
  await session.put(KEY, PAYLOAD);

  const result = await Promise.race([
    recv.receive(),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 3s")), 3000)),
  ]);

  const bytes = result.payload().toBytes();
  if (bytes.length !== PAYLOAD.length) {
    throw new Error(`length mismatch: got ${bytes.length}, expected ${PAYLOAD.length}`);
  }
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== PAYLOAD[i]) throw new Error(`byte ${i} mismatch`);
  }

  console.log(`probe OK: roundtripped ${bytes.length} bytes through ${URL}`);
  await sub.undeclare();
} finally {
  await session.close().catch(() => {});
}
