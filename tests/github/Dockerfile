# Grail CI base image (GitHub Actions) -- includes the GemStone product.
#
# Bundles the C toolchain, Python 3.14, and the (fixed-version) GemStone
# product, so the `test` job neither downloads nor unzips it per run -- the
# product is a cached image layer.  To move versions,
# bump GS_VERSION (or pass --build-arg / the workflow input) and rerun
# build-ci-image.
#
# The image bundles the GemStone product, which is itself a public download
# from GemTalk -- so the ci-base package may be PUBLIC (free GHCR storage, and
# fork PRs can pull it) or private; the test workflow pulls it either way.
FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

# --- Toolchain + Python 3.14 (embedded-CPython FFI) + CI helpers -------------
# ca-certificates/curl/unzip : fetch + extract the product zip (build time)
# git/tar/gzip/zstd          : actions/checkout + actions/cache in a container job
# psmisc                     : killall (setup-testing-env.sh cleanup)
# build-essential            : make/cc for the CPython shim
# python3.14(+dev)           : embedded-CPython FFI (PyInitConfig, PEP 741)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl unzip git tar gzip zstd psmisc \
      build-essential software-properties-common gnupg \
 && add-apt-repository -y ppa:deadsnakes/ppa \
 && apt-get install -y --no-install-recommends python3.14 python3.14-dev \
 && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.14 1 \
 && update-alternatives --install /usr/bin/python3-config python3-config /usr/bin/python3.14-config 1 \
 && rm -rf /var/lib/apt/lists/*

# --- GemStone product (fixed version, public download) ----------------------
ARG GS_VERSION=3.7.5
RUN base="GemStone64Bit${GS_VERSION}-x86_64.Linux" \
 && curl --fail --show-error --location -o /tmp/gs.zip \
      "https://downloads.gemtalksystems.com/pub/GemStone64/${GS_VERSION}/${base}.zip" \
 && mkdir -p /opt/gemstone \
 && unzip -q /tmp/gs.zip -d /opt/gemstone \
 && mv "/opt/gemstone/${base}" /opt/gemstone/product \
 && rm -f /tmp/gs.zip \
 && test -x /opt/gemstone/product/bin/topaz
ENV GEMSTONE=/opt/gemstone/product
ENV PATH=/opt/gemstone/product/bin:$PATH

# Non-root user for running GemStone.  NetLDI guest mode (-g) is disallowed as
# root, and GitHub container jobs run as root, so ci.yml hands the stone/netldi/
# test work off to this user.  uid/gid 1001 matches the GitHub-hosted runner
# user (tidy ownership of the mounted workspace).  The stone writes its log to
# $GEMSTONE/data, so make that dir writable by non-root.
RUN groupadd -g 1001 ci \
 && useradd -m -u 1001 -g 1001 -s /bin/bash ci \
 && chmod -R a+rwX /opt/gemstone/product/data
