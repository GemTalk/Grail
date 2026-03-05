#!/bin/bash

if [ ! -f .setenv ]; then
    cp setenv .setenv
fi
source .setenv
if [ ! -f ~/.topazini ]; then
    cp topazini ~/.topazini
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
