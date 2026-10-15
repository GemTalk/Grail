! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UndefinedDecoratorNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UndefinedDecoratorNameTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
UndefinedDecoratorNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UndefinedDecoratorNameTestCase
!
! A bare-name decorator bound nowhere raises NameError when the def runs
! (#1517).  Inside a function, an undefined name -- or one bound only at run
! time through globals() -- was a Smalltalk COMPILE error for the whole module.
! FunctionDefAst >> ___printDecoratorNameOn___:name: now reads the module's
! globals and builtins at run time for a name nothing static binds
! (___decoratorNameIsUnboundInModule___:); every binding a bare identifier
! reaches keeps it.
!
! Driven by tests/python/undefined_decorator_name.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UndefinedDecoratorNameTestCase removeAllMethods.
UndefinedDecoratorNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: UndefinedDecoratorNameTestCase
setUp
	(importlib @env1:modules) removeKey: #'undefined_decorator_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'undefined_decorator_name'.
%

category: 'Grail-Setup'
method: UndefinedDecoratorNameTestCase
tearDown
	(importlib @env1:modules) removeKey: #'undefined_decorator_name' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: UndefinedDecoratorNameTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/undefined_decorator_name.py'
%

category: 'Grail-Private'
method: UndefinedDecoratorNameTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: UndefinedDecoratorNameTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 14.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

