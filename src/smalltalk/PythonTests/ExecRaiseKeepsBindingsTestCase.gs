! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecRaiseKeepsBindingsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecRaiseKeepsBindingsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecRaiseKeepsBindingsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecRaiseKeepsBindingsTestCase
!
! exec() that raises still leaves in its dict what the code bound before
! the exception, as CPython's write-as-you-go exec does (#1695).
!
! Driven by tests/python/exec_raise_keeps_bindings.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecRaiseKeepsBindingsTestCase removeAllMethods.
ExecRaiseKeepsBindingsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecRaiseKeepsBindingsTestCase
setUp
	(importlib @env1:modules) removeKey: #'exec_raise_keeps_bindings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'exec_raise_keeps_bindings'.
%

category: 'Grail-Setup'
method: ExecRaiseKeepsBindingsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'exec_raise_keeps_bindings' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ExecRaiseKeepsBindingsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/exec_raise_keeps_bindings.py'
%

category: 'Grail-Private'
method: ExecRaiseKeepsBindingsTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ExecRaiseKeepsBindingsTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 13.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
