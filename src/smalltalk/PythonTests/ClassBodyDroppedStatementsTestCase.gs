! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyDroppedStatementsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyDroppedStatementsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyDroppedStatementsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyDroppedStatementsTestCase
!
! Every statement in a class body runs: raise and assert, a match, a type
! alias, and del / import inside an if branch were silently dropped (#1696).
!
! Driven by tests/python/class_body_dropped_statements.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyDroppedStatementsTestCase removeAllMethods.
ClassBodyDroppedStatementsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyDroppedStatementsTestCase
setUp
	(importlib @env1:modules) removeKey: #'class_body_dropped_statements' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_body_dropped_statements'.
%

category: 'Grail-Setup'
method: ClassBodyDroppedStatementsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'class_body_dropped_statements' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ClassBodyDroppedStatementsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_body_dropped_statements.py'
%

category: 'Grail-Private'
method: ClassBodyDroppedStatementsTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ClassBodyDroppedStatementsTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 19.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
