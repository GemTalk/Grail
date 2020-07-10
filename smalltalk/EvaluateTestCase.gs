! ------------------- Remove existing behavior from EvaluateTestCase
expectvalue /Metaclass3       
doit
EvaluateTestCase removeAllMethods.
EvaluateTestCase class removeAllMethods.
%
! ------------------- Class methods for EvaluateTestCase
set compile_env: 0
category: 'other'
classmethod: EvaluateTestCase
filename

	^'Evaluate.py'
%
! ------------------- Instance methods for EvaluateTestCase
set compile_env: 0
category: 'other'
method: EvaluateTestCase
testAdd

	| x |
	x := self statementsAt: 1.
	self 
		assert: (x evaluate == 3);
		yourself.
%
