! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassStatementSlotsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassStatementSlotsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassStatementSlotsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassStatementSlotsTestCase
!
! A class statement checks __slots__ as type() does, and gives the __dict__
! a __slots__ naming it asks for; dir() of a type()-built class lists its own
! __dict__ (#1658).
!
! Driven by tests/python/class_statement_slots.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassStatementSlotsTestCase removeAllMethods.
ClassStatementSlotsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassStatementSlotsTestCase
setUp
	(importlib @env1:modules) removeKey: #'class_statement_slots' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_statement_slots'.
%

category: 'Grail-Setup'
method: ClassStatementSlotsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'class_statement_slots' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ClassStatementSlotsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_statement_slots.py'
%

category: 'Grail-Private'
method: ClassStatementSlotsTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ClassStatementSlotsTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 31.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
