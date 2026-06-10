! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumTestCase
!
! Exercises real Enum / IntEnum / IntFlag built by the metaclass hook
! (___pyClassDefined___: -> Enum class member builder): member access,
! int-like behavior, value/name lookup, iteration, identity, and IntFlag
! bitwise.  Drives tests/python/use_enum.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumTestCase removeAllMethods.
EnumTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumTestCase
setUp
	"Reload tests/python/use_enum.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'use_enum' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_enum.py')
		name: 'use_enum'.
%

category: 'Grail-Private'
method: EnumTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests'
method: EnumTestCase
testIntEnumMembers
	"class Color(IntEnum) members are real ints carrying .value/.name."

	self assert: (self resultAt: 'red_value') equals: 1.
	self assert: (self resultAt: 'red_name') equals: 'RED'.
	self assert: (self resultAt: 'red_is_int').
	self assert: (self resultAt: 'red_eq_1').
	self assert: (self resultAt: 'one_eq_red').
	self assert: (self resultAt: 'red_lt_green').
	self assert: (self resultAt: 'red_plus_1') equals: 2.
	self assert: (self resultAt: 'red_repr') equals: '<Color.RED: 1>'.
	self assert: (self resultAt: 'red_identity').
%

category: 'Grail-Tests'
method: EnumTestCase
testIntEnumLookupAndIteration
	"Color(value) value-lookup, Color['NAME'] name-lookup, iteration."

	self assert: (self resultAt: 'lookup_value').
	self assert: (self resultAt: 'lookup_value_repr') equals: '<Color.GREEN: 2>'.
	self assert: (self resultAt: 'lookup_name').
	self assert: (self resultAt: 'member_count') equals: 3.
%

category: 'Grail-Tests'
method: EnumTestCase
testPlainEnumMarkers
	"class State(Enum) members are distinct markers with .name, == /
	!= by identity, name-lookup, iteration, and enum-style repr."

	self assert: (self resultAt: 'state_a_name') equals: 'A'.
	self assert: (self resultAt: 'state_distinct').
	self assert: (self resultAt: 'state_eq').
	self assert: (self resultAt: 'state_ne').
	self assert: (self resultAt: 'state_repr_ok').
	self assert: (self resultAt: 'state_lookup_name').
	self assert: (self resultAt: 'state_count') equals: 3.
%

category: 'Grail-Tests'
method: EnumTestCase
testIntFlag
	"class Perm(IntFlag) members are ints; bitwise | combines (to a
	plain int, sufficient for re-style flag use)."

	self assert: (self resultAt: 'perm_read_value') equals: 1.
	self assert: (self resultAt: 'perm_is_int').
	self assert: (self resultAt: 'perm_or') equals: 3.
%
