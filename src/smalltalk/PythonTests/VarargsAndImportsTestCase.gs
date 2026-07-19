! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'VarargsAndImportsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
VarargsAndImportsTestCase category: 'SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
VarargsAndImportsTestCase removeAllMethods.
VarargsAndImportsTestCase class removeAllMethods.
%

category: 'Setup'
method: VarargsAndImportsTestCase
setUp
	"Load tests/python/varargs_and_imports.py fresh each test.  Also
	clear the re._constants module cache so the dotted-submodule
	import path exercises a real load."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'varargs_and_imports' ifAbsent: [].
	UserGlobals removeKey: #'py_varargs_and_imports' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/varargs_and_imports.py')
		name: 'varargs_and_imports'.
%

! ===============================================================================
! Tests - *args binding
! ===============================================================================

category: 'Tests - Varargs'
method: VarargsAndImportsTestCase
testStarArgsCollect
	self assert: (testModule @env1:take_args_result) asArray equals: #('a' 'b' 'c').
%

! ===============================================================================
! Tests - **kwargs binding
! ===============================================================================

category: 'Tests - Kwargs'
method: VarargsAndImportsTestCase
testDoubleStarKwargs
	"`take_kwargs(x=1, y=2)` sums the values and returns the sorted
	keys.  Sum is order-independent; sorted keys give deterministic
	comparison without depending on tuple ordering."

	| result keys |
	result := testModule @env1:take_kwargs_result.
	self assert: (result at: 1) equals: 3.
	keys := result at: 2.
	"Grail's kwargs dict stores keys as Symbols (CallAst emits
	`at: #name put: value`), not Strings as CPython does.  This is a
	pre-existing divergence; compare via asString."
	self assert: (keys collect: [:k | k asString]) asArray equals: #('x' 'y').
%

! ===============================================================================
! Tests - mixed positional + *args + **kwargs
! ===============================================================================

category: 'Tests - Varargs'
method: VarargsAndImportsTestCase
testMixedPositionalVarargsKwargs
	"`mixed(1, 2, 3, 4, 5, p=10, q=20)` returns (1, 2, [3, 4, 5], 2)."

	| result |
	result := testModule @env1:mixed_result.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 2) equals: 2.
	self assert: (result at: 3) asArray equals: #(3 4 5).
	self assert: (result at: 4) equals: 2.
%

! ===============================================================================
! Tests - Module-level tuple unpacking
! ===============================================================================

category: 'Tests - Tuple Unpack'
method: VarargsAndImportsTestCase
testTwoTupleUnpack
	self assert: (testModule @env1:ta) equals: 10.
	self assert: (testModule @env1:tb) equals: 20.
%

category: 'Tests - Tuple Unpack'
method: VarargsAndImportsTestCase
testThreeTupleUnpack
	self assert: (testModule @env1:ax) equals: 1.
	self assert: (testModule @env1:ay) equals: 2.
	self assert: (testModule @env1:az) equals: 3.
%

category: 'Tests - Tuple Unpack'
method: VarargsAndImportsTestCase
testTupleUnpackFromReturn
	self assert: (testModule @env1:tv1) equals: 100.
	self assert: (testModule @env1:tv2) equals: 200.
%

category: 'Tests - Tuple Unpack'
method: VarargsAndImportsTestCase
testStarUnpackAtEnd
	"`head, *tail = (1,2,3,4)` — head=1, tail=[2,3,4]."

	self assert: (testModule @env1:star_end_head) equals: 1.
	self assert: (testModule @env1:star_end_tail) asArray equals: #(2 3 4).
%

category: 'Tests - Tuple Unpack'
method: VarargsAndImportsTestCase
testStarUnpackAtStart
	"`*init, last = (1,2,3,4)` — init=[1,2,3], last=4."

	self assert: (testModule @env1:star_start_init) asArray equals: #(1 2 3).
	self assert: (testModule @env1:star_start_last) equals: 4.
%

category: 'Tests - Tuple Unpack'
method: VarargsAndImportsTestCase
testStarUnpackInMiddle
	"`head, *middle, last = (1,2,3,4,5)` — head=1, middle=[2,3,4], last=5."

	self assert: (testModule @env1:star_mid_head) equals: 1.
	self assert: (testModule @env1:star_mid_middle) asArray equals: #(2 3 4).
	self assert: (testModule @env1:star_mid_last) equals: 5.
%

category: 'Tests - Tuple Unpack'
method: VarargsAndImportsTestCase
testStarUnpackEmptyTail
	"`head, *tail = (7,)` — head=7, tail=[] (slice past end of 1-tuple)."

	self assert: (testModule @env1:star_only_one_head) equals: 7.
	self assert: (testModule @env1:star_only_one_tail) asArray equals: #().
%

! ===============================================================================
! Tests - Dotted submodule import
! ===============================================================================

category: 'Tests - Imports'
method: VarargsAndImportsTestCase
testDottedSubmoduleImport
	"`import re._constants` binds the top-level `re`; access the
	submodule via attribute chain.  Smoke-tests parseImport's
	top-level-binding fix."

	self assert: (testModule @env1:LITERAL_via_dotted) equals: 16.
%

! ===============================================================================
! Tests - from X import names (absolute, with fromlist)
! ===============================================================================

category: 'Tests - Imports'
method: VarargsAndImportsTestCase
testFromImportNamesAbsolute
	"`from re._constants import MAGIC, MAXREPEAT` exercises the
	fromlist path in ImportFromAst (without it, ___import__ would
	return the top-level `re` package and `re.MAGIC` would be
	undefined)."

	self assert: (testModule @env1:from_import_magic) equals: 20230612.
	self assert: (testModule @env1:from_import_maxrep) equals: 4294967295.
%
