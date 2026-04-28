output pushnew  runCPythonTests.gs.out
! file scripts/runCPythonTests.gs
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 0
run
| result libPath |
libPath := [CPythonLibrary libraryPath] on: Error do: [:ex |
    Transcript show: 'CPythonTestCase: skipped (', ex messageText, ')'.
    ExitClientError signal: 'Skipped' status: 0.
].
(libPath isNil or: [libPath isEmpty or: [(GsFile existsOnServer: libPath) not]]) ifTrue: [
    Transcript show: 'CPythonTestCase: skipped (library not found at ', libPath printString, ')'.
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
exit
