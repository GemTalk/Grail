! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ChainedComparisonTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ChainedComparisonTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ChainedComparisonTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ChainedComparisonTestCase - regression tests for chained-comparison codegen
! (PR #83).
!
! Every test runs through PythonTestCase>>eval:, which evaluates at MODULE
! scope with useTempsForBlock: false -- the exact path that dropped the
! ___t_N helper temp and made a module-level chained comparison fail to
! compile with "undefined symbol ___t_1".  A plain SUnit fixture that ran
! the chain inside a method would NOT have caught it (methods use
! useTemps: true), so these deliberately exercise the top-level form.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ChainedComparisonTestCase removeAllMethods.
ChainedComparisonTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - module scope'
method: ChainedComparisonTestCase
test_module_scope_chain_compiles
	"A chained comparison at module top level must compile and evaluate.
	The helper temp that caches the shared middle operand was undeclared
	before PR #83, so this raised a CompileError rather than returning a
	Boolean."

	self assert: (self eval: 'a = 3
1 <= a <= 6') equals: true.
	self assert: (self eval: 'a = 3
10 <= a <= 20') equals: false.
%

category: 'Grail-Tests - module scope'
method: ChainedComparisonTestCase
test_module_scope_four_way_chain
	"Longer chains cascade correctly (each adjacent pair is AND-ed)."

	self assert: (self eval: 'b, c, d = 2, 3, 4
1 < b < c < d') equals: true.
	self assert: (self eval: 'b, c, d = 2, 3, 4
1 < b < 3 < 2') equals: false.
%

category: 'Grail-Tests - semantics'
method: ChainedComparisonTestCase
test_middle_operand_evaluated_once
	"The shared middle operand is evaluated exactly once (CPython
	semantics), not re-evaluated for each adjacent comparison."

	self assert: (self eval: 'calls = []
def mid():
    calls.append(1)
    return 5
1 < mid() < 10
len(calls)') equals: 1.
%

category: 'Grail-Tests - semantics'
method: ChainedComparisonTestCase
test_short_circuits_on_first_false
	"When the first comparison is false the chain short-circuits and the
	remaining operands are not evaluated."

	self assert: (self eval: 'calls = []
def rhs():
    calls.append(1)
    return 100
10 < 3 < rhs()
len(calls)') equals: 0.
%

category: 'Grail-Tests - in/not-in non-final'
method: ChainedComparisonTestCase
test_in_as_non_final_operator
	"``in'' / ``not in'' used as a NON-final chain operator emitted invalid
	Smalltalk before PR #83 (unbalanced parens + an undefined ___ignore:
	selector).  `x not in [7,8] == False` parses as
	`(x not in [7,8]) and ([7,8] == False)`."

	"3 not in [7,8] -> True;  [7,8] == False -> False;  True and False -> False"
	self assert: (self eval: 'x = 3
x not in [7, 8] == False') equals: false.
	"3 in [2,3] -> True;  [2,3] == False -> False;  True and False -> False"
	self assert: (self eval: 'x = 3
x in [2, 3] == False') equals: false.
%

category: 'Grail-Tests - in/not-in non-final'
method: ChainedComparisonTestCase
test_in_as_middle_operator
	"``in'' as a middle operator reads its element from the shared chain
	temp before the container overwrites it (`a in B < c`).  Sets support
	``<'' as proper-subset, giving a valid trailing comparison."

	"2 in {1,2,3} -> True;  {1,2,3} < {1,2,3,4} -> True (proper subset)"
	self assert: (self eval: '2 in {1, 2, 3} < {1, 2, 3, 4}') equals: true.
	"9 in {1,2,3} -> False -> short-circuits before the subset test"
	self assert: (self eval: '9 in {1, 2, 3} < {1, 2, 3, 4}') equals: false.
%

category: 'Grail-Tests - in/not-in non-final'
method: ChainedComparisonTestCase
test_in_middle_operand_evaluated_once
	"The container operand shared across an ``in'' and the following
	comparison is evaluated exactly once."

	self assert: (self eval: 'calls = []
def C():
    calls.append(1)
    return {1, 2, 3}
2 in C() < {1, 2, 3, 4}
len(calls)') equals: 1.
%
