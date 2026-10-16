! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PropertyBeatsStoredValueTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PropertyBeatsStoredValueTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PropertyBeatsStoredValueTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PropertyBeatsStoredValueTestCase
!
! A @property outranks an instance value of the same name (#1660): CPython's
! property is a data descriptor, setter or not.  Grail answered a stored value
! first, so ImportError's stored ``name'' beat a subclass property --
! importlib.metadata's PackageNotFoundError read ``found for None''.
!
! Driven by tests/python/property_beats_stored_value.py, whose EXPECTED table
! is CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PropertyBeatsStoredValueTestCase removeAllMethods.
PropertyBeatsStoredValueTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PropertyBeatsStoredValueTestCase
setUp
	(importlib @env1:modules) removeKey: #'property_beats_stored_value' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'property_beats_stored_value'.
%

category: 'Grail-Setup'
method: PropertyBeatsStoredValueTestCase
tearDown
	(importlib @env1:modules) removeKey: #'property_beats_stored_value' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: PropertyBeatsStoredValueTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/property_beats_stored_value.py'
%

category: 'Grail-Private'
method: PropertyBeatsStoredValueTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: PropertyBeatsStoredValueTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 18.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

