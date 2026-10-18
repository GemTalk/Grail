! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeDictGetsetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeDictGetsetTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypeDictGetsetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeDictGetsetTestCase
!
! type.__dict__['__dict__'] is CPython's getset_descriptor, whose __get__
! takes the owner as optional -- the one-argument read wrapt's pure-Python
! fallback makes -- and which refuses a write (#1428).
!
! Driven by tests/python/type_dict_getset.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeDictGetsetTestCase removeAllMethods.
TypeDictGetsetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeDictGetsetTestCase
setUp
	(importlib @env1:modules) removeKey: #'type_dict_getset' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'type_dict_getset'.
%

category: 'Grail-Setup'
method: TypeDictGetsetTestCase
tearDown
	(importlib @env1:modules) removeKey: #'type_dict_getset' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: TypeDictGetsetTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/type_dict_getset.py'
%

category: 'Grail-Private'
method: TypeDictGetsetTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: TypeDictGetsetTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 14.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
