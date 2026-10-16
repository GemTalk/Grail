! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeSlotsWeakrefDictOverBaseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeSlotsWeakrefDictOverBaseTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypeSlotsWeakrefDictOverBaseTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeSlotsWeakrefDictOverBaseTestCase
!
! type(name, bases, {'__slots__': (...)}) accepts '__weakref__' / '__dict__'
! when no base supplies that storage (#1428).  It refused them over every base
! without built-in storage, object included, so attrs -- which rebuilds each
! ``slots=True'' class through type(), adding '__weakref__' -- failed at
! import, as did protobuf's message classes.
!
! Driven by tests/python/type_slots_weakref_dict_over_base.py, whose EXPECTED
! table is CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeSlotsWeakrefDictOverBaseTestCase removeAllMethods.
TypeSlotsWeakrefDictOverBaseTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeSlotsWeakrefDictOverBaseTestCase
setUp
	(importlib @env1:modules) removeKey: #'type_slots_weakref_dict_over_base' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'type_slots_weakref_dict_over_base'.
%

category: 'Grail-Setup'
method: TypeSlotsWeakrefDictOverBaseTestCase
tearDown
	(importlib @env1:modules) removeKey: #'type_slots_weakref_dict_over_base' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: TypeSlotsWeakrefDictOverBaseTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/type_slots_weakref_dict_over_base.py'
%

category: 'Grail-Private'
method: TypeSlotsWeakrefDictOverBaseTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: TypeSlotsWeakrefDictOverBaseTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 25.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

