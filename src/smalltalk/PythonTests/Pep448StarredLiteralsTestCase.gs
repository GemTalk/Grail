! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for Pep448StarredLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'Pep448StarredLiteralsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
Pep448StarredLiteralsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! Pep448StarredLiteralsTestCase
!
! PEP 448 ``(a, *b, c)'' / ``[a, *b]'' / ``{a, *b}'' splat unpacking
! inside literals.  Pre-fix, TupleAst's splat-path emitted Smalltalk
! source with one unbalanced ``('' — every such literal compiled to
! syntactically invalid Smalltalk.  Werkzeug.datastructures.headers'
! __eq__ hit this via ``return item[0].lower(), *item[1:]''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
Pep448StarredLiteralsTestCase removeAllMethods.
Pep448StarredLiteralsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: Pep448StarredLiteralsTestCase
setUp
	"Load tests/python/pep448_starred_literals.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pep448_starred_literals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pep448_starred_literals.py')
		name: 'pep448_starred_literals'.
%

category: 'Grail-Tests'
method: Pep448StarredLiteralsTestCase
testTupleLeadingSplat
	"``(*[1, 2, 3], 99)'' → (1, 2, 3, 99)."

	| result |
	result := testModule @env1:tuple_with_leading_splat.
	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 4) equals: 99
%

category: 'Grail-Tests'
method: Pep448StarredLiteralsTestCase
testTupleTrailingSplat
	"``(0, *[1, 2, 3])'' → (0, 1, 2, 3)."

	| result |
	result := testModule @env1:tuple_with_trailing_splat.
	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 0.
	self assert: (result at: 4) equals: 3
%

category: 'Grail-Tests'
method: Pep448StarredLiteralsTestCase
testTupleMiddleSplat
	"``(0, *[1, 2, 3], 99)'' → (0, 1, 2, 3, 99)."

	| result |
	result := testModule @env1:tuple_with_middle_splat.
	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 0.
	self assert: (result at: 3) equals: 2.
	self assert: (result at: 5) equals: 99
%

category: 'Grail-Tests'
method: Pep448StarredLiteralsTestCase
testTupleTwoSplats
	"``(*a, *a)'' → a concatenated with itself."

	| result |
	result := testModule @env1:tuple_two_splats.
	self assert: result size equals: 6.
	self assert: (result at: 4) equals: 1
%

category: 'Grail-Tests'
method: Pep448StarredLiteralsTestCase
testTupleAssignmentTarget
	"Splat inside a tuple literal assigned to a local."

	| result |
	result := testModule @env1:tuple_assignment_target.
	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 0
%

category: 'Grail-Tests'
method: Pep448StarredLiteralsTestCase
testEmptyTupleWithSplat
	"Splat of an empty iterable contributes nothing."

	| result |
	result := testModule @env1:empty_tuple_with_splat.
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 2) equals: 2
%
