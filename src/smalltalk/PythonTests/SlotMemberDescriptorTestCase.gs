! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SlotMemberDescriptorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SlotMemberDescriptorTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SlotMemberDescriptorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SlotMemberDescriptorTestCase
!
! A class's __slots__ name reads as its member descriptor -- K.a is
! K.__dict__['a'] -- and the descriptor's type is named member_descriptor
! (#1694).
!
! Driven by tests/python/slot_member_descriptor.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SlotMemberDescriptorTestCase removeAllMethods.
SlotMemberDescriptorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SlotMemberDescriptorTestCase
setUp
	(importlib @env1:modules) removeKey: #'slot_member_descriptor' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'slot_member_descriptor'.
%

category: 'Grail-Setup'
method: SlotMemberDescriptorTestCase
tearDown
	(importlib @env1:modules) removeKey: #'slot_member_descriptor' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: SlotMemberDescriptorTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/slot_member_descriptor.py'
%

category: 'Grail-Private'
method: SlotMemberDescriptorTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: SlotMemberDescriptorTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 19.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
