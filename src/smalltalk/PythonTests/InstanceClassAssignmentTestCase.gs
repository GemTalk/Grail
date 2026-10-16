! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InstanceClassAssignmentTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InstanceClassAssignmentTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InstanceClassAssignmentTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InstanceClassAssignmentTestCase
!
! ``obj.__class__ = Other'' refuses as CPython does -- a built-in or
! immutable type, a layout that differs -- and an accepted change keeps the
! instance's attributes (#1574).
!
! Driven by tests/python/instance_class_assignment.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InstanceClassAssignmentTestCase removeAllMethods.
InstanceClassAssignmentTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InstanceClassAssignmentTestCase
setUp
	(importlib @env1:modules) removeKey: #'instance_class_assignment' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'instance_class_assignment'.
%

category: 'Grail-Setup'
method: InstanceClassAssignmentTestCase
tearDown
	(importlib @env1:modules) removeKey: #'instance_class_assignment' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: InstanceClassAssignmentTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/instance_class_assignment.py'
%

category: 'Grail-Private'
method: InstanceClassAssignmentTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: InstanceClassAssignmentTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 28.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
