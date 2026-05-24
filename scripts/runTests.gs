output pushnew runTests.out
! file scripts/runTests.gs
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 1
run
| result |
result := PythonTestCase suite run.
result hasPassed ifTrue: [
    Transcript show: result printString; cr.
    ExitClientError signal: 'Tests passed!' status: 0.
] ifFalse: [
    Transcript nextPutAll: 'Test failures:'; cr.
    result failures do: [:each | Transcript tab; show: each; cr.].
    Transcript nextPutAll: 'Test errors:'; cr.
    result errors do: [:each | Transcript tab; show: each; cr.].
    Transcript show: result printString; cr.
    ExitClientError signal: 'Tests failed!' status: 1.
].
%
logout
exit
