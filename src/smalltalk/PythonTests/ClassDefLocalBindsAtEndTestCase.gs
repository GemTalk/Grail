! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassDefLocalBindsAtEndTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassDefLocalBindsAtEndTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassDefLocalBindsAtEndTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassDefLocalBindsAtEndTestCase
!
! A class statement in a def binds its local name only once the class is
! complete, so a body, metaclass, __init_subclass__ or decorator that raises
! leaves the name as it was (#1696).  Also: a class-body read of the name sees
! the enclosing binding, and a private-mangled class name in a method compiles.
!
! Driven by tests/python/class_def_local_binds_at_end.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassDefLocalBindsAtEndTestCase removeAllMethods.
ClassDefLocalBindsAtEndTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassDefLocalBindsAtEndTestCase
setUp
	(importlib @env1:modules) removeKey: #'class_def_local_binds_at_end' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_def_local_binds_at_end'.
%

category: 'Grail-Setup'
method: ClassDefLocalBindsAtEndTestCase
tearDown
	(importlib @env1:modules) removeKey: #'class_def_local_binds_at_end' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ClassDefLocalBindsAtEndTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_def_local_binds_at_end.py'
%

category: 'Grail-Private'
method: ClassDefLocalBindsAtEndTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ClassDefLocalBindsAtEndTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 29.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
