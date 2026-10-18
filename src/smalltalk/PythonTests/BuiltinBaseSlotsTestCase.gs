! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinBaseSlotsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinBaseSlotsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinBaseSlotsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinBaseSlotsTestCase
!
! Non-empty __slots__ over a built-in base, by a class statement or by
! type(), is accepted and usable exactly where CPython's is, and a strict one
! leaves instances without a __dict__ (#1693).
!
! Driven by tests/python/builtin_base_slots.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BuiltinBaseSlotsTestCase removeAllMethods.
BuiltinBaseSlotsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinBaseSlotsTestCase
setUp
	(importlib @env1:modules) removeKey: #'builtin_base_slots' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'builtin_base_slots'.
%

category: 'Grail-Setup'
method: BuiltinBaseSlotsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'builtin_base_slots' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: BuiltinBaseSlotsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/builtin_base_slots.py'
%

category: 'Grail-Private'
method: BuiltinBaseSlotsTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: BuiltinBaseSlotsTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 35.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
