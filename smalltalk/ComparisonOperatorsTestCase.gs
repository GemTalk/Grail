! ------------------- Remove existing behavior from ComparisonOperatorsTestCase
removeallmethods ComparisonOperatorsTestCase
removeallclassmethods ComparisonOperatorsTestCase
! ------------------- Class methods for ComparisonOperatorsTestCase
! ------------------- Instance methods for ComparisonOperatorsTestCase
category: 'other'
method: ComparisonOperatorsTestCase
testComparisonReturnsSingletons
	"Verify that comparison operators return the Python True/False singletons"

	| result |
	"Integer comparisons"
	result := ModuleAst evaluate: '1 < 2'.
	self assert: result == True.
	result := ModuleAst evaluate: '2 < 1'.
	self assert: result == False.

	"String comparisons"
	result := ModuleAst evaluate: '''a'' < ''b'''.
	self assert: result == True.
	result := ModuleAst evaluate: '''b'' < ''a'''.
	self assert: result == False.
	result := ModuleAst evaluate: '''abc'' == ''abc'''.
	self assert: result == True.
	result := ModuleAst evaluate: '''abc'' != ''def'''.
	self assert: result == True.

	"List comparisons"
	result := ModuleAst evaluate: '[1, 2] == [1, 2]'.
	self assert: result == True.
	result := ModuleAst evaluate: '[1, 2] < [1, 3]'.
	self assert: result == True.
	result := ModuleAst evaluate: '[1, 2] in [[1, 2], [3, 4]]'.
	self assert: result == True.

	"Identity comparison with singletons"
	result := ModuleAst evaluate: 'True is True'.
	self assert: result == True.
	result := ModuleAst evaluate: 'False is False'.
	self assert: result == True.
	result := ModuleAst evaluate: 'True is False'.
	self assert: result == False.
	result := ModuleAst evaluate: 'None is None'.
	self assert: result == True.
%
