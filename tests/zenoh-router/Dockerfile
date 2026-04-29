# zenoh-bridge-remote-api in a minimal Alpine container.
#
# zenoh-bridge-remote-api = zenohd statically linked with the
# zenoh-plugin-remote-api plugin, providing the WebSocket endpoint
# that @eclipse-zenoh/zenoh-ts connects to.
#
# Pinned to 1.9.0 to match @eclipse-zenoh/zenoh-ts in our deps. Rust
# has no stable ABI; version skew between bridge and client = silent
# protocol mismatch.

FROM alpine:3.20 AS fetcher

ARG ZENOH_TS_VERSION=1.9.0
ARG TARGETARCH=amd64

RUN apk add --no-cache curl unzip

WORKDIR /tmp/dl
RUN curl -fsSL -o bridge.zip \
      "https://github.com/eclipse-zenoh/zenoh-ts/releases/download/${ZENOH_TS_VERSION}/zenoh-ts-${ZENOH_TS_VERSION}-x86_64-unknown-linux-musl-standalone.zip" \
   && unzip bridge.zip \
   && chmod +x zenoh-bridge-remote-api

FROM alpine:3.20

# libgcc provides _Unwind_* symbols the musl-built bridge expects.
RUN apk add --no-cache libgcc

COPY --from=fetcher /tmp/dl/zenoh-bridge-remote-api /usr/local/bin/zenoh-bridge-remote-api

EXPOSE 10000 7447 8000
ENTRYPOINT ["/usr/local/bin/zenoh-bridge-remote-api"]
CMD ["--ws-port", "10000", "--rest-http-port", "8000"]
