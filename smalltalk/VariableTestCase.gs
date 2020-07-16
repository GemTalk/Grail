! ------------------- Remove existing behavior from VariableTestCase
expectvalue /Metaclass3       
doit
VariableTestCase removeAllMethods.
VariableTestCase class removeAllMethods.
%
! ------------------- Class methods for VariableTestCase
set compile_env: 0
category: 'other'
classmethod: VariableTestCase
filename

	^'Variables.py'
%
! ------------------- Instance methods for VariableTestCase
set compile_env: 0
category: 'other'
method: VariableTestCase
testAssign

	| x |
	(self statementsAt: 1) evaluate.			"x = 5"
	x := (self statementsAt: 2) evaluate.	"x"
	self assert: x == 5.
%
category: 'other'
method: VariableTestCase
testFunctionNoArgs

	| y |
	false ifTrue: [^self].
	(self statementsAt: 3) evaluate.			"def foo():"
	y := (self statementsAt: 4) evaluate.	"y = foo()"
	self assert: y == 6.
	y := (self statementsAt: 5) evaluate.	"y"
	self assert: y == 6.
%
category: 'other'
method: VariableTestCase
testFunctionOneArg

	| x |
	false ifTrue: [^self].
	(self statementsAt: 6) evaluate.			"def bar(p):"
	x := (self statementsAt: 7) evaluate.	"y = bar(3)"
	self assert: x == 9.
%
