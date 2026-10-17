! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassGetattrOnClassMissTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassGetattrOnClassMissTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassGetattrOnClassMissTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassGetattrOnClassMissTestCase
!
! A class attribute read that misses falls back to the metaclass's
! __getattr__, as type.__getattribute__ does (#1702).
!
! Driven by tests/python/metaclass_getattr_on_class_miss.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassGetattrOnClassMissTestCase removeAllMethods.
MetaclassGetattrOnClassMissTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassGetattrOnClassMissTestCase
setUp
	(importlib @env1:modules) removeKey: #'metaclass_getattr_on_class_miss' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'metaclass_getattr_on_class_miss'.
%

category: 'Grail-Setup'
method: MetaclassGetattrOnClassMissTestCase
tearDown
	(importlib @env1:modules) removeKey: #'metaclass_getattr_on_class_miss' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: MetaclassGetattrOnClassMissTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/metaclass_getattr_on_class_miss.py'
%

category: 'Grail-Private'
method: MetaclassGetattrOnClassMissTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: MetaclassGetattrOnClassMissTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 14.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
