! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyRebindingOrderTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyRebindingOrderTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyRebindingOrderTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyRebindingOrderTestCase
!
! A class body that assigns a name twice runs each assignment in its place
! (#1677).  Every store of such a name went out together at the last one, so
! ``D = 9; print(D); D = 10'' raised NameError, and a default reading the name
! saw the later value.
!
! Driven by tests/python/class_body_rebinding_order.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyRebindingOrderTestCase removeAllMethods.
ClassBodyRebindingOrderTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyRebindingOrderTestCase
setUp
	(importlib @env1:modules) removeKey: #'class_body_rebinding_order' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_body_rebinding_order'.
%

category: 'Grail-Setup'
method: ClassBodyRebindingOrderTestCase
tearDown
	(importlib @env1:modules) removeKey: #'class_body_rebinding_order' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ClassBodyRebindingOrderTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_body_rebinding_order.py'
%

category: 'Grail-Private'
method: ClassBodyRebindingOrderTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ClassBodyRebindingOrderTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 7.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
