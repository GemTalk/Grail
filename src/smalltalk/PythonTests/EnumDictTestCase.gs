! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumDictTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumDictTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumDictTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumDictTestCase
!
! enum.EnumDict -- public in CPython since 3.13 -- is the mapping an enum class
! body is built in.  It tracks member names in declaration order and REFUSES to
! let one be reused:
!
!     enumdict = EnumDict()
!     enumdict['a'] = 1
!     enumdict['a'] = 'other value'      -- TypeError
!
! Grail bound ``enum.EnumDict'' to plain ``dict'', which accepts everything.
!
! __setitem__ follows CPython's branches IN CPython's order, because the order
! decides which complaint a name gets: a reserved sunder is a ValueError, a
! reused member name a TypeError, and a dunder or supported sunder passes
! through without becoming a member at all.
!
! Only the MutableMapping interface is overridden, which CPython's own test pins
! deliberately -- ``enumdict |= {...}'' goes through dict.__ior__ and succeeds,
! overwriting the value __setitem__ refused.  __ior__ and update are therefore
! NOT overridden here; that is the documented behaviour, not an omission.
!
! Drives tests/python/enum_dict.py.  test_enum
! TestEnumDict.test_enum_dict_standalone.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumDictTestCase removeAllMethods.
EnumDictTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumDictTestCase
setUp
	"Reload tests/python/enum_dict.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_dict' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_dict.py')
		name: 'enum_dict'.
%

category: 'Grail-Private'
method: EnumDictTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - A member name cannot be reused'
method: EnumDictTestCase
testTheDuplicateIsRefused
	"The whole point of the class, and what ``dict'' could not do."

	self assert: (self resultAt: 'stored') equals: 1.
	self assert: (self resultAt: 'type') asString equals: 'EnumDict'.
	self assert: (self resultAt: 'duplicate') asString equals: '''a'' already defined as 1'.
%

category: 'Grail-Tests - A member name cannot be reused'
method: EnumDictTestCase
testAMemberCannotBecomeADescriptorEither
	"However the second binding is spelled, the name is taken."

	self assert: (self resultAt: 'member_then_descriptor') asString
		equals: '''one'' already defined as 1'.
%

category: 'Grail-Tests - A member name cannot be reused'
method: EnumDictTestCase
testTheMutableMappingInterfaceIsTheOnlyOneOverridden
	"CPython's own test pins this: |= goes through dict.__ior__ and overwrites
	the value __setitem__ just refused."

	self assert: (self resultAt: 'after_ior') asString equals: 'other value'.
%

category: 'Grail-Tests - What is tracked'
method: EnumDictTestCase
testMembersAndValuesInDeclarationOrder
	"A descriptor between them is skipped, so the two lists stay in step."

	self assert: (self resultAt: 'member_order') asString equals: '[''one'', ''two'', ''three'']'.
	self assert: (self resultAt: 'values_order') asString equals: '[1, 2, 3]'.
	self assert: (self resultAt: 'members') asString equals: '[''a'']'.
	self assert: (self resultAt: 'last_values') asString equals: '[1]'.
	self assert: (self resultAt: 'cls_name') asString equals: 'None'.
%

category: 'Grail-Tests - Sunder and dunder names'
method: EnumDictTestCase
testAReservedSunderIsRefused
	"Same message the enum class body gives, and for the same reason."

	self assert: (self resultAt: 'bad_sunder') asString
		equals: '_sunder_ names, such as ''_a_sunder_'', are reserved for future Enum use'.
%

category: 'Grail-Tests - Sunder and dunder names'
method: EnumDictTestCase
testSupportedSunderAndDunderNamesAreNotMembers
	"They are stored, and they stay out of _member_names."

	self assert: (self resultAt: 'ok_sunder') asString equals: 'x y;[]'.
	self assert: (self resultAt: 'dunder') asString equals: 'docs;[]'.
%

category: 'Grail-Tests - Sunder and dunder names'
method: EnumDictTestCase
testOrderDunderIsStoredUnderItsModernName
	"CPython renames __order__ to _order_ on the way in, so the old spelling is
	not left in the mapping."

	self assert: (self resultAt: 'order_rename') asString equals: 'a b;False'.
%

category: 'Grail-Tests - Merge operators'
method: EnumDictTestCase
testInPlaceOrKeepsTheClass
	"``d |= other'' mutates in place, so the object stays an EnumDict and its
	member tracking survives.

	THIS TEST ASSERTED 'dict' -- the opposite -- and was right to, as a record
	of a real divergence.  The cause was not EnumDict's: AugAssignAst emitted
	the bare BINARY operator for a module-scope target, so ``|='' never
	reached __ior__ at all and EVERY mutable type at module scope was replaced
	rather than mutated.  Fixing that closed this with nothing here to change.
	See AugmentedAssignmentTestCase, and note that a recorded gap is worth
	re-measuring when anything underneath it moves."

	self assert: (self resultAt: 'ior_keeps_the_class') asString equals: 'EnumDict'.
%
