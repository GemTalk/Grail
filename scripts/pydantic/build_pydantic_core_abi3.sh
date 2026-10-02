#!/bin/bash
# build_pydantic_core_abi3.sh -- build pydantic_core from its sdist against the
# STABLE ABI (pyo3/abi3-py314), with the patch in this directory, and install
# the result into a venv in place of the stock wheel's extension.
#
#   ./scripts/pydantic/build_pydantic_core_abi3.sh <venv> [workdir]
#
# Why (docs/Support_Pydantic.md, Phase 4 option (b)): the stock cp314 wheel
# reads CPython objects by inline struct access -- a str schema segfaults in the
# gem, a float one reads the wrong word.  Under the limited API PyO3 does no
# struct access beyond ob_refcnt/ob_type, so every value goes through a shim
# function.  The patch (cfg-gated, so the tree still builds non-abi3) replaces
# the nine non-limited uses pydantic_core 2.46.5 makes: the datetime field
# accessors, PyFunction, TzInfo extending tzinfo, and two direct reads of
# tp_base / tp_new.
#
# Needs: cargo/rustc (built here with 1.98), network for the sdist and crates
# (or a warm CARGO_HOME), and a Python 3.14 the build config can query.
set -euo pipefail
VENV=${1:?usage: $0 <venv> [workdir]}
WORK=${2:-$(mktemp -d)}
HERE=$(cd "$(dirname "$0")" && pwd)
VER=2.46.5
PY=$VENV/bin/python
SITE=$("$PY" -c 'import sysconfig; print(sysconfig.get_paths()["purelib"])')
DEST=$SITE/pydantic_core

mkdir -p "$WORK"
"$PY" -m pip download -q --no-binary :all: --no-deps "pydantic_core==$VER" -d "$WORK"
tar xzf "$WORK/pydantic_core-$VER.tar.gz" -C "$WORK"
SRC=$WORK/pydantic_core-$VER
(cd "$SRC" && patch -p1 < "$HERE/pydantic_core-$VER-abi3.patch")

# PYO3_BUILD_EXTENSION_MODULE: do not link libpython -- every Py* symbol must
# resolve to the shim at dlopen.  -undefined dynamic_lookup: what maturin
# passes on macOS for an extension module.
(cd "$SRC" && PYO3_BUILD_EXTENSION_MODULE=1 PYO3_PYTHON="$PY" \
    cargo rustc --release --lib --crate-type cdylib --features pyo3/abi3-py314 \
    -- -C link-arg=-undefined -C link-arg=dynamic_lookup)

LIB=$SRC/target/release/lib_pydantic_core.dylib
[ -f "$LIB" ] || LIB=$SRC/target/release/lib_pydantic_core.so
if otool -L "$LIB" 2>/dev/null | grep -qi python; then
    echo "error: $LIB links libpython" >&2; exit 1
fi
rm -f "$DEST"/_pydantic_core.cpython-*.so
cp "$LIB" "$DEST/_pydantic_core.abi3.so"
echo "installed $DEST/_pydantic_core.abi3.so"
