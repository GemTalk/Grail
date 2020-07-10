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
"
	| x |
	x := self statementsAt: 2.
	x evaluate.
	self 
		assert: ((x.targets at: 1) evaluate == 5);
		yourself.
"
%
category: 'other'
method: VariableTestCase
testScope
"
	| x def module temp body |
	x := self statementsAt: 3.
	def := x variableAt: 'func'.
	module := x.parent.
	x.body register.
	body := x.body at: 1.
	self 
		assert: (module variableAt: 'insideVar') isNil;
		assert: ((body.targets at: 1) evaluate == 1);
		assert: ((temp := x variableAt: 'insideVar') == 1);
		yourself.
"
%
