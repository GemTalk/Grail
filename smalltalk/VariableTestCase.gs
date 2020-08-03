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
test
	"test everything with print"

	| x |
	module evaluate.
	x := stdout contents.
	self assert: x = '5 5 6 5 7 7 local nonlocal '.
%
