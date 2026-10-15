! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DecoratorLocalShadowsGlobalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DecoratorLocalShadowsGlobalTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DecoratorLocalShadowsGlobalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DecoratorLocalShadowsGlobalTestCase
!
! A bare-name decorator naming a local that shadows a module global applies
! the local (#1605).  The single-decorator emit, printDecoratorReceiverOn:deco:
! (chains, class bodies) and the IR emit each routed a bare name through the
! module whenever the module bound it; FunctionDefAst >>
! ___decoratorNameIsModuleGlobal___: now also requires that no enclosing
! function's local -- or, from a nested class, a local beyond it -- shadows it.
!
! Driven by tests/python/decorator_local_shadows_global.py, whose EXPECTED
! table is CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DecoratorLocalShadowsGlobalTestCase removeAllMethods.
DecoratorLocalShadowsGlobalTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DecoratorLocalShadowsGlobalTestCase
setUp
	(importlib @env1:modules) removeKey: #'decorator_local_shadows_global' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'decorator_local_shadows_global'.
%

category: 'Grail-Setup'
method: DecoratorLocalShadowsGlobalTestCase
tearDown
	(importlib @env1:modules) removeKey: #'decorator_local_shadows_global' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: DecoratorLocalShadowsGlobalTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/decorator_local_shadows_global.py'
%

category: 'Grail-Private'
method: DecoratorLocalShadowsGlobalTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: DecoratorLocalShadowsGlobalTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 8.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

