! ------------------- Remove existing behavior from ToolsTestCase
removeAllMethods ToolsTestCase
removeAllClassMethods ToolsTestCase
! ------------------- Class methods for ToolsTestCase
set compile_env: 0
category: 'other'
classmethod: ToolsTestCase
filename

	^nil
%
! ------------------- Instance methods for ToolsTestCase
set compile_env: 0
category: 'other'
method: ToolsTestCase
testVariablesNew

	| myScope |
	myScope := Variables new.
	self assert: (myScope at: #print) notNil.
%
