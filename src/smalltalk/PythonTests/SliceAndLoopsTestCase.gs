! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SliceAndLoopsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SliceAndLoopsTestCase category: 'SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
SliceAndLoopsTestCase removeAllMethods.
SliceAndLoopsTestCase class removeAllMethods.
%

! ===============================================================================
! Setup
! ===============================================================================

category: 'Setup'
method: SliceAndLoopsTestCase
setUp
	"Load tests/python/slice_and_loops.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'slice_and_loops' ifAbsent: [].
	UserGlobals removeKey: #'py_slice_and_loops' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/slice_and_loops.py')
		name: 'slice_and_loops'.
%

! ===============================================================================
! Tests - Slice expressions
! ===============================================================================

category: 'Tests - Slice'
method: SliceAndLoopsTestCase
testSliceBasic
	self assert: (testModule @env1:slice_basic) asArray equals: #(2 3 4).
%

category: 'Tests - Slice'
method: SliceAndLoopsTestCase
testSliceOpenLower
	self assert: (testModule @env1:slice_open_lo) asArray equals: #(1 2 3).
%

category: 'Tests - Slice'
method: SliceAndLoopsTestCase
testSliceOpenUpper
	self assert: (testModule @env1:slice_open_hi) asArray equals: #(3 4 5).
%

category: 'Tests - Slice'
method: SliceAndLoopsTestCase
testSliceNegativeLower
	"xs[-2:] takes the last two."
	self assert: (testModule @env1:slice_neg_lo) asArray equals: #(4 5).
%

category: 'Tests - Slice'
method: SliceAndLoopsTestCase
testSliceNegativeUpper
	"xs[:-1] drops the last."
	self assert: (testModule @env1:slice_neg_hi) asArray equals: #(1 2 3 4).
%

category: 'Tests - Slice'
method: SliceAndLoopsTestCase
testSliceStep
	self assert: (testModule @env1:slice_step) asArray equals: #(1 3 5).
%

category: 'Tests - Slice'
method: SliceAndLoopsTestCase
testSliceReverse
	"xs[::-1] reverses."
	self assert: (testModule @env1:slice_reverse) asArray equals: #(5 4 3 2 1).
%

category: 'Tests - Slice'
method: SliceAndLoopsTestCase
testSliceString
	self assert: (testModule @env1:slice_str) equals: 'ell'.
%

! ===============================================================================
! Tests - slice() class
! ===============================================================================

category: 'Tests - Slice Class'
method: SliceAndLoopsTestCase
testSliceOneArg
	| s |
	s := testModule @env1:s_one.
	self assert: s @env1:start equals: None.
	self assert: s @env1:stop equals: 7.
	self assert: s @env1:step equals: None.
%

category: 'Tests - Slice Class'
method: SliceAndLoopsTestCase
testSliceTwoArg
	| s |
	s := testModule @env1:s_two.
	self assert: s @env1:start equals: 1.
	self assert: s @env1:stop equals: 5.
	self assert: s @env1:step equals: None.
%

category: 'Tests - Slice Class'
method: SliceAndLoopsTestCase
testSliceThreeArg
	| s |
	s := testModule @env1:s_three.
	self assert: s @env1:start equals: 0.
	self assert: s @env1:stop equals: 10.
	self assert: s @env1:step equals: 2.
%

category: 'Tests - Slice Class'
method: SliceAndLoopsTestCase
testSliceIsInstance
	self assert: (testModule @env1:s_isinst) equals: true.
%

category: 'Tests - Slice Class'
method: SliceAndLoopsTestCase
testIntIsNotSlice
	self assert: (testModule @env1:s_notint) equals: false.
%

! ===============================================================================
! Tests - break in for-loop
! ===============================================================================

category: 'Tests - Break'
method: SliceAndLoopsTestCase
testBreakInFor
	"find_first_even returns the first even and exits the loop early."
	self assert: (testModule @env1:find_first_even_result) equals: 2.
%

! ===============================================================================
! Tests - continue in for-loop
! ===============================================================================

category: 'Tests - Continue'
method: SliceAndLoopsTestCase
testContinueInFor
	"evens skips odd elements via continue."
	self assert: (testModule @env1:evens_result) asArray equals: #(2 4).
%

! ===============================================================================
! Tests - break in while-loop
! ===============================================================================

category: 'Tests - Break'
method: SliceAndLoopsTestCase
testBreakInWhile
	"first_n_doubling uses `while True: ... break` to terminate."
	self assert: (testModule @env1:doubling_result) asArray equals: #(1 2 4 8 16 32 64).
%

! ===============================================================================
! Tests - continue in while-loop
! ===============================================================================

category: 'Tests - Continue'
method: SliceAndLoopsTestCase
testContinueInWhile
	"evens_under skips odd `i` values via continue."
	self assert: (testModule @env1:evens_under_result) asArray equals: #(2 4 6 8 10).
%

! ===============================================================================
! Tests - while-else
! ===============================================================================

category: 'Tests - WhileElse'
method: SliceAndLoopsTestCase
testWhileElseCompletes
	"`while-else` block (Python feature).  The else body runs after the
	loop body finishes without break.  Grail's emitted code goes through
	WhileAst's SuiteAst-aware orelse path (regression coverage for
	`SuiteAst does not understand #do:`)."

	self assert: (testModule @env1:while_else_result) asArray equals: #(0 1 2 'done').
%

! ===============================================================================
! Tests - `_` throwaway name
! ===============================================================================

category: 'Tests - Underscore'
method: SliceAndLoopsTestCase
testUnderscoreTarget
	"`for _ in seq` should not break the codegen (`_` alone isn't a valid Smalltalk
	identifier; the parser renames it to ___unused___)."
	self assert: (testModule @env1:count_iter_result) equals: 4.
%

category: 'Tests - Underscore'
method: SliceAndLoopsTestCase
testUnderscoreParameter
	"`def f(_, x):` parameter rename — discard_first ignores its first arg."
	self assert: (testModule @env1:discard_first_result) equals: 42.
%

category: 'Tests - Loop else'
method: SliceAndLoopsTestCase
testWhileElseRunsOnNaturalExit
	"Python while-else: the else body runs when the loop drains
	without break."

	| result |
	result := self eval: 'log = []
i = 0
while i < 2:
    log.append(i)
    i = i + 1
else:
    log.append("else")
log'.
	self assert: (result @env1:__len__) equals: 3.
	self assert: (result @env1:__getitem__: 2) equals: 'else'
%

category: 'Tests - Loop else'
method: SliceAndLoopsTestCase
testWhileElseSkippedOnBreak
	"Python while-else: a break from the body skips the else clause
	(regresses WhileAst emitting the else inside the PythonBreak-
	protected block, matching ForAst)."

	| result |
	result := self eval: 'log = []
i = 0
while i < 5:
    if i == 1:
        break
    log.append(i)
    i = i + 1
else:
    log.append("else")
log'.
	self assert: (result @env1:__len__) equals: 1.
	self assert: (result @env1:__getitem__: 0) equals: 0
%

category: 'Tests - Loop else'
method: SliceAndLoopsTestCase
testForElseSkippedOnBreak
	"Python for-else: break skips the else; natural drain runs it."

	| result |
	result := self eval: 'log = []
for i in [1, 2, 3]:
    if i == 2:
        break
else:
    log.append("else-a")
for j in [1]:
    pass
else:
    log.append("else-b")
log'.
	self assert: (result @env1:__len__) equals: 1.
	self assert: (result @env1:__getitem__: 0) equals: 'else-b'
%

category: 'Grail-Tests - Slice Hashing'
method: SliceAndLoopsTestCase
testSliceEqualityComparesComponents
	"__eq__ compiles in env 1, so a bare ``self start = other start'' was an
	ENV-1 ``='' send to the component, and SmallInteger has no env-1 ``='':
	every slice comparison died with the UNCATCHABLE ``env-1 #'=' not
	understood by SmallInteger''.  It took out test_slice's test_cmp,
	test_deepcopy and test_setslice_without_getslice outright."

	self assert: (self eval: 'slice(1, 2, 3) == slice(1, 2, 3)') equals: true.
	self assert: (self eval: 'slice(1, 2, 3) == slice(1, 2, 4)') equals: false.
	self assert: (self eval: 'slice(5) != slice(6)') equals: true.
	self assert: (self eval: 'slice(1, 2, 3) != (1, 2, 3)') equals: true.
	self assert: (self eval: 'slice(1, 2, 3) != None') equals: true.
	"Non-int components go through Python equality, not Smalltalk ``=''."
	self assert: (self eval: 'slice("a", "b", "c") == slice("a", "b", "c")')
		equals: true
%

category: 'Grail-Tests - Slice Hashing'
method: SliceAndLoopsTestCase
testSliceHashIsValueBased
	"CPython made slices hashable in 3.12 (gh-101264).  Grail defined __eq__
	without __hash__, so slices kept object's IDENTITY hash and test_slice's
	``assertEqual(hash(slice(5)), slice(5).__hash__())'' -- which builds TWO
	slice objects -- read as ``8915172 != 8915169'', consecutive identity
	hashes."

	self assert: (self eval: 'hash(slice(5)) == slice(5).__hash__()') equals: true.
	self assert: (self eval: 'hash(slice(1, 2)) == slice(1, 2).__hash__()')
		equals: true.
	self assert: (self eval: 'hash(slice(1, 2, 3)) == hash(slice(1, 2, 3))')
		equals: true.
	"Consistent with __eq__ in the direction that matters for collections."
	self assert: (self eval: 'len({slice(1, 2), slice(1, 2)})') equals: 1.
	self assert: (self eval: 'd = {}; d[slice(1, 2)] = "v"; d[slice(1, 2)]')
		equals: 'v'
%

category: 'Grail-Tests - Slice Hashing'
method: SliceAndLoopsTestCase
testSliceWithUnhashableComponentRaises
	"Sending __hash__ to each component is what propagates CPython's TypeError
	for an unhashable member, rather than needing a separate check.  Note this
	is NOT inherited from tuple hashing -- ``hash((1, 2, []))'' still wrongly
	SUCCEEDS in Grail, which is why slice hashes its components directly."

	self should: [self eval: 'hash(slice(1, 2, []))'] raise: TypeError.
	self should: [self eval: 'hash(slice(4, {}))'] raise: TypeError
%
