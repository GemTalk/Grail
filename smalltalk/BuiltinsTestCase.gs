! ------------------- Remove existing behavior from BuiltinsTestCase
expectvalue /Metaclass3       
doit
BuiltinsTestCase removeAllMethods.
BuiltinsTestCase class removeAllMethods.
%
! ------------------- Class methods for BuiltinsTestCase
set compile_env: 0
category: 'other'
classmethod: BuiltinsTestCase
filename

	^'Builtins.py'
%
! ------------------- Instance methods for BuiltinsTestCase
set compile_env: 0
category: 'other'
method: BuiltinsTestCase
testAbs

	| x |
	x := (self statementsAt: 1) evaluate.			"abs(-1)"
	self assert: x == 1.
%
category: 'other'
method: BuiltinsTestCase
testPrint

	(self statementsAt: 2) evaluate.			"print('hello', 'world', sep = ',')"
	self assert: stdout contents = ('hello,world' , Character lf asString).
%
