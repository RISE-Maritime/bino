# Zenoh router for tests + manual dev

Spins up a Zenoh router (`zenoh-bridge-remote-api` 1.9.0, the same
binary the eclipse-zenoh org publishes on every `zenoh-ts` release)
inside an Alpine container, exposing the WebSocket endpoint that
`@eclipse-zenoh/zenoh-ts` connects to.

## Bring it up

```bash
docker compose -f tests/zenoh-router/docker-compose.yml up -d
```

Endpoints (all bound to `127.0.0.1` only):

| port  | what                              |
|-------|-----------------------------------|
| 10000 | remote-api WebSocket (zenoh-ts)   |
| 8000  | REST plugin (`curl` for debug)    |
| 7447  | zenoh peer protocol (TCP)         |

Verify:

```bash
docker compose -f tests/zenoh-router/docker-compose.yml ps
curl http://127.0.0.1:8000/@/local | head -c 200
```

## Use it

`@bino/node` CLI:

```bash
bino-node scenarios/v01_smoke.yaml --zenoh ws/127.0.0.1:10000
```

Viewer:

```
http://localhost:5173/?zenoh=ws/127.0.0.1:10000
```

(zenoh-ts accepts `ws/host:port` in canon form *or* the URL-style
`ws://host:port` — both work.)

## Tear it down

```bash
docker compose -f tests/zenoh-router/docker-compose.yml down
```

## Probe / live test

`packages/node/scripts/probe-zenoh.mjs` opens a session, declares a
subscriber, puts a value, asserts it's received, closes everything.
Run it with the router up:

```bash
PATH=/usr/local/share/nvm/versions/node/v22.22.2/bin:$PATH \
  node packages/node/scripts/probe-zenoh.mjs
```

The vitest test `packages/node/test/zenoh-live.test.ts` runs the same
flow gated on `BINO_ZENOH_URL` being set — it skips by default so the
suite stays green without the router. Set the env var locally to
exercise it:

```bash
BINO_ZENOH_URL=ws/127.0.0.1:10000 pnpm -C packages/node test
```

## Version pinning

`zenoh-bridge-remote-api` is pinned to `1.9.0` in `Dockerfile` to match
`@eclipse-zenoh/zenoh-ts@1.9.0` in our deps. Rust has no stable ABI;
version skew between the bridge and the JS client is a silent protocol
mismatch. Bump both together.
