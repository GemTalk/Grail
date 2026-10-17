! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassDictNotWritableTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassDictNotWritableTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassDictNotWritableTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassDictNotWritableTestCase
!
! A class's __dict__ cannot be assigned or deleted, and a built-in class
! refuses a delete with the immutable-type TypeError its store raises (#1699).
!
! Driven by tests/python/class_dict_not_writable.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassDictNotWritableTestCase removeAllMethods.
ClassDictNotWritableTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassDictNotWritableTestCase
setUp
	(importlib @env1:modules) removeKey: #'class_dict_not_writable' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_dict_not_writable'.
%

category: 'Grail-Setup'
method: ClassDictNotWritableTestCase
tearDown
	(importlib @env1:modules) removeKey: #'class_dict_not_writable' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ClassDictNotWritableTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_dict_not_writable.py'
%

category: 'Grail-Private'
method: ClassDictNotWritableTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ClassDictNotWritableTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 15.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
