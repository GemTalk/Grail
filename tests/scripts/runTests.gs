output pushnew runTests.out
! file tests/scripts/runTests.gs
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
"GrailTestResult so that a defect reports its message and stack, not just its
name -- see src/smalltalk/PythonTests/GrailTestResult.gs."
result := GrailTestResult run: PythonTestCase suite.
result hasPassed ifTrue: [
    Transcript show: result printString; cr.
    ExitClientError signal: 'Tests passed!' status: 0.
] ifFalse: [
    Transcript nextPutAll: 'Test defects:'; cr.
    result reportOn: GsFile stdout prefix: ''.
    Transcript show: result printString; cr.
    ExitClientError signal: 'Tests failed!' status: 1.
].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report (e.g. an error escaped SUnit) -- fail loudly instead of exit 0.
exit 1
