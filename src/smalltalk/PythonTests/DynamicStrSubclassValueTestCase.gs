! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DynamicStrSubclassValueTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DynamicStrSubclassValueTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DynamicStrSubclassValueTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DynamicStrSubclassValueTestCase
!
! A str subclass built by type() or over a base held in a variable keeps
! its value, and every str subclass takes str's keywords (#1706).
!
! Driven by tests/python/dynamic_str_subclass_value.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DynamicStrSubclassValueTestCase removeAllMethods.
DynamicStrSubclassValueTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DynamicStrSubclassValueTestCase
setUp
	(importlib @env1:modules) removeKey: #'dynamic_str_subclass_value' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'dynamic_str_subclass_value'.
%

category: 'Grail-Setup'
method: DynamicStrSubclassValueTestCase
tearDown
	(importlib @env1:modules) removeKey: #'dynamic_str_subclass_value' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: DynamicStrSubclassValueTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/dynamic_str_subclass_value.py'
%

category: 'Grail-Private'
method: DynamicStrSubclassValueTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: DynamicStrSubclassValueTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 37.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
