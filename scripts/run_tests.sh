#!/bin/bash

# This script assumes a stone is already running per the stone name defined in .topazini

if [ -z "$GEMSTONE" ]; then
    echo "Error: \$GEMSTONE is not set. Set it to your GemStone installation directory (e.g., /path/to/GemStone64Bit3.7.x-arch.Darwin)."
    exit 1
fi

if [ -d /opt/gemstone/locks ]; then
  if [ -z "$GEMSTONE_GLOBAL_DIR" ]; then
    echo "using /opt/gemstone/locks"
  else
    echo "using GEMSTONE_GLOBAL_DIR = $GEMSTONE_GLOBAL_DIR"
  fi
else
  echo "directory /opt/gemstone/locks does not exist"
  if [ -z "$GEMSTONE_GLOBAL_DIR" ]; then
    echo "Error: \$GEMSTONE_GLOBAL_DIR is not set. Set it to the directory containing your GemStone locks and logs."
    exit 1
  else
    echo "using GEMSTONE_GLOBAL_DIR = $GEMSTONE_GLOBAL_DIR"
  fi
fi

topaz -lq <<EOF
login
level 1
run
| result |
result := PythonTestCase suite run.
result hasPassed ifTrue: [
    Transcript show: result printString.
    ExitClientError signal: 'Tests passed!' status: 0.
] ifFalse: [
    Transcript nextPutAll: 'Test failures:'; cr.
    result failures do: [:each | Transcript tab; show: each; cr.].
    Transcript nextPutAll: 'Test errors:'; cr.
    result errors do: [:each | Transcript tab; show: each; cr.].
    ExitClientError signal: 'Tests failed!' status: 1.
].
%
logout
EOF

# Run embedded CPython tests in a separate session (can't coexist with shim)
topaz -lq <<EOF
login
level 1
run
| result |
[CPythonLibrary libraryPath] on: Error do: [:ex |
    Transcript show: 'CPythonTestCase: skipped (', ex messageText, ')'.
    ExitClientError signal: 'Skipped' status: 0.
].
result := CPythonTestCase suite run.
result hasPassed ifTrue: [
    Transcript show: result printString.
    ExitClientError signal: 'Embedded tests passed!' status: 0.
] ifFalse: [
    Transcript nextPutAll: 'Embedded test failures:'; cr.
    result failures do: [:each | Transcript tab; show: each; cr.].
    Transcript nextPutAll: 'Embedded test errors:'; cr.
    result errors do: [:each | Transcript tab; show: each; cr.].
    ExitClientError signal: 'Embedded tests failed!' status: 1.
].
%
logout
EOF
