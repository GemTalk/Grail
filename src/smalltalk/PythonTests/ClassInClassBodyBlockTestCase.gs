! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassInClassBodyBlockTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassInClassBodyBlockTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassInClassBodyBlockTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassInClassBodyBlockTestCase
!
! A class nested in a class-body try / for / while / with compiles and is
! bound in the enclosing class (#1696).
!
! Driven by tests/python/class_in_class_body_block.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassInClassBodyBlockTestCase removeAllMethods.
ClassInClassBodyBlockTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassInClassBodyBlockTestCase
setUp
	(importlib @env1:modules) removeKey: #'class_in_class_body_block' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_in_class_body_block'.
%

category: 'Grail-Setup'
method: ClassInClassBodyBlockTestCase
tearDown
	(importlib @env1:modules) removeKey: #'class_in_class_body_block' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ClassInClassBodyBlockTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_in_class_body_block.py'
%

category: 'Grail-Private'
method: ClassInClassBodyBlockTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ClassInClassBodyBlockTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 9.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
