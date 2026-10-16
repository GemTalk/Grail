! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OperandTypeErrorMessagesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OperandTypeErrorMessagesTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OperandTypeErrorMessagesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OperandTypeErrorMessagesTestCase
!
! TypeError messages for unsupported operands read as CPython's (#1688):
! ``** or pow()'', the in-place operator for augmented assignment, and the
! sequence protocol's own wording for str, list and tuple.  ``x = 1; x @= 2''
! raises TypeError instead of ending the process.
!
! Driven by tests/python/operand_typeerror_messages.py, whose EXPECTED table
! is CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OperandTypeErrorMessagesTestCase removeAllMethods.
OperandTypeErrorMessagesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OperandTypeErrorMessagesTestCase
setUp
	(importlib @env1:modules) removeKey: #'operand_typeerror_messages' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'operand_typeerror_messages'.
%

category: 'Grail-Setup'
method: OperandTypeErrorMessagesTestCase
tearDown
	(importlib @env1:modules) removeKey: #'operand_typeerror_messages' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: OperandTypeErrorMessagesTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/operand_typeerror_messages.py'
%

category: 'Grail-Private'
method: OperandTypeErrorMessagesTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: OperandTypeErrorMessagesTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 41.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
