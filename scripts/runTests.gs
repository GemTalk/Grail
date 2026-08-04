time
! file scripts/runTests.gs
run
GsFile removeServerFile: 'SUnit.log' ; removeServerFile: 'SUnitDefects.log' .
PythonTestCase suite run printString
%
time

