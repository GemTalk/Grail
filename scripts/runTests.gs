time
! file scripts/runTests.gs
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
GsFile removeServerFile: 'SUnit.log' ; removeServerFile: 'SUnitDefects.log' .
importlib grailDir: dir .
PythonTestCase suite run printString
%
time

