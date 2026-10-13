! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IntOperandNotIndexTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IntOperandNotIndexTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IntOperandNotIndexTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IntOperandNotIndexTestCase
!
! int's, float's and Decimal's binary operators take a Python INT -- an
! Integer, a bool, an int subclass's instance -- and nothing else; an object
! that merely implements __index__ is refused, as CPython refuses it.  The 45
! probes for an __index__ compiled into the operand's OWN class are now
! object >> ___isPyIntOperand___:.
!
! Driven by tests/python/int_operand_not_index.py, whose EXPECTED table is
! CPython 3.14's output.  One test per operand family, so a failure says which
! half of the rule broke.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IntOperandNotIndexTestCase removeAllMethods.
IntOperandNotIndexTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IntOperandNotIndexTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'int_operand_not_index' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_operand_not_index.py')
		name: 'int_operand_not_index'.
%

category: 'Grail-Setup'
method: IntOperandNotIndexTestCase
tearDown
	(importlib @env1:modules) removeKey: #'int_operand_not_index' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: IntOperandNotIndexTestCase
assertOperandMatchesCPython: aName
	"Every row for operand aName agrees with CPython; the failure lists the
	ones that do not, with both answers."

	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: ((expected @env1:keys) @env1:__len__) > 0.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: { aName } kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: aName , ': ' , (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: IntOperandNotIndexTestCase
testAnIndexOnlyObjectIsNotAnInt
	"``1 + o'' is a TypeError and ``3 == o'' False when o only has __index__,
	defined in the class body or set on it afterwards; indexing still uses it."

	self assertOperandMatchesCPython: 'I'.
	self assertOperandMatchesCPython: 'IB'.
	self assertOperandMatchesCPython: 'CA'
%

category: 'Grail-Tests'
method: IntOperandNotIndexTestCase
testAnIntSubclassIsAnInt
	"``7 & MyInt(3)'', ``1 << MyInt(3)'', ``2 ** MyInt(3)'' == 8 (not 8.0),
	``pow(2, MyInt(2), 5)'', and its number properties as values."

	self assertOperandMatchesCPython: 'A'.
	self assertOperandMatchesCPython: 'B'
%

category: 'Grail-Tests'
method: IntOperandNotIndexTestCase
testEnumMembersAreInts
	"IntEnum and IntFlag members; ``7 & F.X'' is the flag, through
	IntFlag's own __rand__."

	self assertOperandMatchesCPython: 'E'.
	self assertOperandMatchesCPython: 'F'
%

category: 'Grail-Tests'
method: IntOperandNotIndexTestCase
testBoolIsAnInt
	self assertOperandMatchesCPython: 'bool'
%

category: 'Grail-Tests'
method: IntOperandNotIndexTestCase
testASubclassKeepsItsOwnNumberProperty
	"A def, a property or a class attribute named ``numerator''/``real''/...
	in an int subclass wins over int's property; an enum member of that name
	does not (test_enum's test_shadowed_attr)."

	self assertOperandMatchesCPython: 'shadow'
%

category: 'Grail-Tests'
method: IntOperandNotIndexTestCase
testEveryRowIsExpected
	| r expected |
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (r @env1:__len__) = (expected @env1:__len__).
	self assert: (expected @env1:__len__) >= 158
%
