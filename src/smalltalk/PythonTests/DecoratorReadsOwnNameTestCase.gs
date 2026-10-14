! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DecoratorReadsOwnNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DecoratorReadsOwnNameTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DecoratorReadsOwnNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DecoratorReadsOwnNameTestCase
!
! A decorator that reads its def's own name -- ``@alias.setter'' after
! ``@property def alias'' inside a function -- is evaluated before the def
! rebinds the name, as in CPython.  Grail evaluated it after, so it read the
! new plain function: beautifulsoup4's _deprecated_alias failed to import.
! See FunctionDefAst >> ___printWithPreEvaluatedDecoratorsOn___:.  The IR arm
! hands such a function to the text emit.
!
! Driven by tests/python/decorator_reads_own_name.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DecoratorReadsOwnNameTestCase removeAllMethods.
DecoratorReadsOwnNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DecoratorReadsOwnNameTestCase
setUp
	(importlib @env1:modules) removeKey: #'decorator_reads_own_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'decorator_reads_own_name'.
%

category: 'Grail-Setup'
method: DecoratorReadsOwnNameTestCase
tearDown
	(importlib @env1:modules) removeKey: #'decorator_reads_own_name' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: DecoratorReadsOwnNameTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/decorator_reads_own_name.py'
%

category: 'Grail-Private'
method: DecoratorReadsOwnNameTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: DecoratorReadsOwnNameTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 9.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

