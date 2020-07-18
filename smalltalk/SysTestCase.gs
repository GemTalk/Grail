! ------------------- Remove existing behavior from SysTestCase
expectvalue /Metaclass3       
doit
SysTestCase removeAllMethods.
SysTestCase class removeAllMethods.
%
! ------------------- Class methods for SysTestCase
set compile_env: 0
category: 'other'
classmethod: SysTestCase
filename

	^'Sys.py'
%
! ------------------- Instance methods for SysTestCase
set compile_env: 0
category: 'other'
method: SysTestCase
test_byteorder

	| x |
	x := (self statementsAt: 1) evaluate.			"import sys"
	x := (self statementsAt: 2) evaluate.			"sys.byteorder"
	self assert: x = 'little'.
%
