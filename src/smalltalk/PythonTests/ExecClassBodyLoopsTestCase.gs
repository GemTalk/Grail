! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecClassBodyLoopsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecClassBodyLoopsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecClassBodyLoopsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecClassBodyLoopsTestCase
!
! A class body run by exec() or runpy.run_path reads a name bound by the
! statement it is in -- a loop target, an ``if'' binding (#1683).  It compiled
! the read as an undeclared doit variable, and the Smalltalk CompileError
! ended the process.
!
! Driven by tests/python/exec_class_body_loops.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecClassBodyLoopsTestCase removeAllMethods.
ExecClassBodyLoopsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecClassBodyLoopsTestCase
setUp
	(importlib @env1:modules) removeKey: #'exec_class_body_loops' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'exec_class_body_loops'.
%

category: 'Grail-Setup'
method: ExecClassBodyLoopsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'exec_class_body_loops' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ExecClassBodyLoopsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/exec_class_body_loops.py'
%

category: 'Grail-Private'
method: ExecClassBodyLoopsTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ExecClassBodyLoopsTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 11.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
