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
	"class Perm(IntFlag) members are ints; int() of a bitwise result is
	the combined value (the result itself is a composite member -- see
	testIntFlagCompositeMembers)."

	self assert: (self resultAt: 'perm_read_value') equals: 1.
	self assert: (self resultAt: 'perm_is_int').
	self assert: (self resultAt: 'perm_or') equals: 3.
%

category: 'Grail-Tests'
method: EnumTestCase
testIntFlagCompositeMembers
	"Bitwise | on IntFlag members returns a COMPOSITE MEMBER of the class
	(CPython), not a plain int (which AbstractPyInt's DNU int-forward used
	to produce), with the enum-style repr; results cache, so the same bit
	combination is the identical object; str stays the int (ReprEnum); a
	composite's .name is None."

	self assert: (self resultAt: 'perm_or_is_member').
	self assert: (self resultAt: 'perm_or_repr') equals: '<Perm.READ|WRITE: 3>'.
	self assert: (self resultAt: 'perm_or_str') equals: '3'.
	self assert: (self resultAt: 'perm_or_cached').
	self assert: (self resultAt: 'perm_composite_name_none').
%

category: 'Grail-Tests'
method: EnumTestCase
testIntFlagAndXorResolveNamed
	"& and ^ whose result matches a NAMED member's value resolve to that
	member (identity, not just equality)."

	self assert: (self resultAt: 'perm_and_named').
	self assert: (self resultAt: 'perm_xor_named').
%

category: 'Grail-Tests'
method: EnumTestCase
testIntFlagInvertAndKeep
	"~READ is the positive complement within the named-bit mask (WRITE|EXEC
	= 6, CPython 3.11+); IntFlag's KEEP boundary retains bits no named
	member covers (READ|8 keeps value 9 where a plain Flag would raise)."

	self assert: (self resultAt: 'perm_invert_value') equals: 6.
	self assert: (self resultAt: 'perm_keep_value') equals: 9.
%

category: 'Grail-Tests'
method: EnumTestCase
testIntFlagMemberInComposite
	"``READ in (READ|WRITE)``: membership by bit coverage on a composite."

	self assert: (self resultAt: 'perm_member_in_composite').
%
