! ------------------- Remove existing behavior from StatementsTestCase
removeAllMethods StatementsTestCase
removeAllClassMethods StatementsTestCase
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
	module evaluate.
	x := stdout contents.
	self assert: x = '14610'.
%
