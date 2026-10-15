! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SlotWrapperGetBindsImplementationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SlotWrapperGetBindsImplementationTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SlotWrapperGetBindsImplementationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SlotWrapperGetBindsImplementationTestCase
!
! Binding a callable with __get__ keeps the implementation it was read from
! (#1418).  ``object.__setattr__.__get__(obj)'' re-sent __setattr__ to obj and
! ran its override, which is how attrs initialises a frozen class -- so every
! attrs class raised on its own __init__.  A module function bound with
! __get__ looked for a method of its name on the instance, and a bound method
! or classmethod re-bound itself instead of answering itself.
!
! Driven by tests/python/slot_wrapper_get_binds_implementation.py, whose
! EXPECTED table is CPython 3.14's output.  The fixture runs both imported
! and as __main__, the role ./grail gives it.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SlotWrapperGetBindsImplementationTestCase removeAllMethods.
SlotWrapperGetBindsImplementationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SlotWrapperGetBindsImplementationTestCase
setUp
	(importlib @env1:modules) removeKey: #'slot_wrapper_get_binds_implementation' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'slot_wrapper_get_binds_implementation'.
%

category: 'Grail-Setup'
method: SlotWrapperGetBindsImplementationTestCase
tearDown
	(importlib @env1:modules) removeKey: #'slot_wrapper_get_binds_implementation' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: SlotWrapperGetBindsImplementationTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/slot_wrapper_get_binds_implementation.py'
%

category: 'Grail-Private'
method: SlotWrapperGetBindsImplementationTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: SlotWrapperGetBindsImplementationTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 18.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

