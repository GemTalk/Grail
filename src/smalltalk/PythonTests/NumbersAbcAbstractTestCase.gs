! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NumbersAbcAbstractTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NumbersAbcAbstractTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NumbersAbcAbstractTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NumbersAbcAbstractTestCase
!
! The numbers ABCs refuse instantiation while abstract methods remain (#1592).
! numbers.Complex(), Real(), Rational(), Integral() and a subclass leaving any
! abstract method unimplemented built objects; CPython raises TypeError naming
! them.  numbers_Number class answers __abstractmethods__ (CPython's sets for
! the ABCs, computed at definition for a subclass) and opts into the
! instantiation check that only ABCMeta classes get.
!
! Driven by tests/python/numbers_abc_abstract.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NumbersAbcAbstractTestCase removeAllMethods.
NumbersAbcAbstractTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NumbersAbcAbstractTestCase
setUp
	(importlib @env1:modules) removeKey: #'numbers_abc_abstract' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'numbers_abc_abstract'.
%

category: 'Grail-Setup'
method: NumbersAbcAbstractTestCase
tearDown
	(importlib @env1:modules) removeKey: #'numbers_abc_abstract' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: NumbersAbcAbstractTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/numbers_abc_abstract.py'
%

category: 'Grail-Private'
method: NumbersAbcAbstractTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: NumbersAbcAbstractTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 21.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: NumbersAbcAbstractTestCase
testEveryRowMatchesCPythonWhenRunByPath
	"The same rows from a copy run by runpy.run_path, not imported: the
	explicit __abstractmethods__ row only shows its bug in that role."

	| bad |
	bad := (testModule @env1:___pyAttrLoad___: #mismatches_when_run_by_path)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
