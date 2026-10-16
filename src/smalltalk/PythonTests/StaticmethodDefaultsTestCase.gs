! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StaticmethodDefaultsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StaticmethodDefaultsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StaticmethodDefaultsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StaticmethodDefaultsTestCase
!
! A @staticmethod's defaults are evaluated once, at def time, and
! __defaults__ / __kwdefaults__ read them (#1575).  They were left out of the
! per-class default store, so the expression ran again on every call that
! omitted the argument and __defaults__ read None.
!
! Driven by tests/python/staticmethod_defaults.py, whose EXPECTED table is
! CPython 3.14's output; the second test runs it by path.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StaticmethodDefaultsTestCase removeAllMethods.
StaticmethodDefaultsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: StaticmethodDefaultsTestCase
setUp
	(importlib @env1:modules) removeKey: #'staticmethod_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'staticmethod_defaults'.
%

category: 'Grail-Setup'
method: StaticmethodDefaultsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'staticmethod_defaults' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: StaticmethodDefaultsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/staticmethod_defaults.py'
%

category: 'Grail-Private'
method: StaticmethodDefaultsTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: StaticmethodDefaultsTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 26.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: StaticmethodDefaultsTestCase
testEveryRowMatchesCPythonWhenRunByPath
	"The same rows from a copy run by runpy.run_path."

	| bad |
	bad := (testModule @env1:___pyAttrLoad___: #mismatches_when_run_by_path)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
