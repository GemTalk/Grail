#! /bin/bash

# For interactive recompile of C code

export GRAIL_DIR=`pwd`
    echo "Building CPython shim library..."
    make -C "$GRAIL_DIR/src/c/shim" clean all GEMSTONE="$GEMSTONE"
    case "$OSTYPE" in
      linux*)  export SHIM_LIB_PATH="$GRAIL_DIR/src/c/shim/libcpython_ua.so" ;;
      *)       export SHIM_LIB_PATH="$GRAIL_DIR/src/c/shim/libcpython_ua.dylib" ;;  # assume Darwin
    esac
    if [ ! -f "$SHIM_LIB_PATH" ]; then
        echo "Warning: CPython shim library build failed. CPythonShim tests will be skipped."
        export SHIM_LIB_PATH=""
    else
        echo "Building dynamic extension modules..."
        mkdir -p "$GRAIL_DIR/lib"
        make -C "$GRAIL_DIR/src/c/shim" dynmods
    fi

