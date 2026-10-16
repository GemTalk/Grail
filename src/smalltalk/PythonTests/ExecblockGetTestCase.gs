! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecblockGetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecblockGetTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecblockGetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecblockGetTestCase
!
! A nested def or a lambda -- an ExecBlock -- binds with __get__, as every
! CPython function does (#1656).  It had no __get__, so ``h.__get__(obj)''
! raised AttributeError; under runpy.run_path even a module-level def is one.
!
! Driven by tests/python/execblock_get.py, whose EXPECTED table is CPython
! 3.14's output; the second test runs it by path.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecblockGetTestCase removeAllMethods.
ExecblockGetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecblockGetTestCase
setUp
	(importlib @env1:modules) removeKey: #'execblock_get' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'execblock_get'.
%

category: 'Grail-Setup'
method: ExecblockGetTestCase
tearDown
	(importlib @env1:modules) removeKey: #'execblock_get' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ExecblockGetTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/execblock_get.py'
%

category: 'Grail-Private'
method: ExecblockGetTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ExecblockGetTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 29.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: ExecblockGetTestCase
testEveryRowMatchesCPythonWhenRunByPath
	"The same rows from a copy run by runpy.run_path, where the fixture's own
	module-level functions are ExecBlocks too."

	| bad |
	bad := (testModule @env1:___pyAttrLoad___: #mismatches_when_run_by_path)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
