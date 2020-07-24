! ------------------- Remove existing behavior from StatementsTestCase
expectvalue /Metaclass3       
doit
StatementsTestCase removeAllMethods.
StatementsTestCase class removeAllMethods.
%
! ------------------- Class methods for StatementsTestCase
set compile_env: 0
category: 'other'
classmethod: StatementsTestCase
filename

	^'Statements.py'
%
! ------------------- Instance methods for StatementsTestCase
set compile_env: 0
category: 'other'
method: StatementsTestCase
test

	| x |
	statements evaluate.
	x := stdout contents.
	self assert: x = '1,'.
%
