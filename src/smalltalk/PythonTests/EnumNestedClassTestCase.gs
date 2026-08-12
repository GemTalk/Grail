! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumNestedClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumNestedClassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumNestedClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumNestedClassTestCase
!
! A class DEFINED IN an enum body is not a member (CPython 3.13 -- through 3.12
! it was one, with a DeprecationWarning saying it would stop being one):
!
!     class Outer(Enum):
!         a = 1
!         class Inner(Enum):
!             foo = 10
!
!     Outer.Inner        -- the class itself, not <Outer.Inner: <enum 'Inner'>>
!     list(Outer)        -- [Outer.a], not [Outer.a, Outer.Inner]
!
! Grail made it a member, so ``Outer.Inner.foo'' raised AttributeError and
! ``isinstance(Outer.Inner, type)'' was False -- test_enum
! test_nested_classes_in_enum_are_not_members.
!
! Merely NAMING a class defined elsewhere still makes an ordinary member
! (``class MyTypes(Enum): i = int''), and nothing about the class OBJECT
! separates the two cases -- so CPython's _is_internal_class reads __qualname__,
! which only a nested DEFINITION gets prefixed with its enclosing class.  That
! predicate joins the descriptor test in the one _EnumDict.__setitem__ pass,
! which is where CPython puts it: ``not _is_descriptor(value) and not
! _is_internal_class(...)''.
!
! Drives tests/python/enum_nested_class.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumNestedClassTestCase removeAllMethods.
EnumNestedClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumNestedClassTestCase
setUp
	"Reload tests/python/enum_nested_class.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_nested_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_nested_class.py')
		name: 'enum_nested_class'.
%

category: 'Grail-Private'
method: EnumNestedClassTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - A nested class is not a member'
method: EnumNestedClassTestCase
testTheNameAnswersTheClassItself
	"The defect in one line: Outer.Inner was a member WRAPPING the class, so it
	was not a type and its own members were unreachable through it."

	self assert: (self resultAt: 'is_type').
	self assert: (self resultAt: 'inner_repr') asString equals: '<enum ''Inner''>'.
	self assert: (self resultAt: 'inner_usable') equals: 10.
	self assert: (self resultAt: 'inner_list') asString
		equals: '[<Inner.foo: 10>, <Inner.bar: 11>]'.
%

category: 'Grail-Tests - A nested class is not a member'
method: EnumNestedClassTestCase
testTheOuterEnumDoesNotCountIt
	"Not in iteration, not in __members__, and not reachable by value -- it is
	an ordinary class attribute, so there is no member to find."

	self assert: (self resultAt: 'outer_list') asString
		equals: '[<Outer.a: 1>, <Outer.b: 2>]'.
	self assert: (self resultAt: 'outer_names') asString equals: '[''a'', ''b'']'.
	self assert: (self resultAt: 'not_by_value') asString equals: 'ValueError'.
%

category: 'Grail-Tests - Naming a class is still a member'
method: EnumNestedClassTestCase
testAClassDefinedElsewhereMakesAnOrdinaryMember
	"The case the __qualname__ test exists to keep: ``i = int'' binds a class
	too, and it IS a member whose value is that class."

	self assert: (self resultAt: 'named_is_member') asString
		equals: '[''i'', ''s'', ''f'']'.
	self assert: (self resultAt: 'named_value').
	self assert: (self resultAt: 'int_value').
	self assert: (self resultAt: 'str_value').
%

category: 'Grail-Tests - The decorators still override'
method: EnumNestedClassTestCase
testMemberForcesANestedClassBack
	"@member is precisely the escape hatch CPython's DeprecationWarning pointed
	at, so the pre-3.13 shape is still expressible."

	self assert: (self resultAt: 'forced_is_member').
	self assert: (self resultAt: 'forced_list') asString
		equals: '[<Forced.a: 1>, <Forced.Inner: <enum ''Inner''>>]'.
	self assert: (self resultAt: 'forced_reaches_class') equals: 10.
%

category: 'Grail-Tests - The decorators still override'
method: EnumNestedClassTestCase
testNonmemberIsUnchanged
	"Already excluded, and it stays excluded -- the two rules agree rather than
	fighting."

	self assert: (self resultAt: 'nonmember_is_type').
	self assert: (self resultAt: 'nonmember_list') asString equals: '[<Excluded.a: 1>]'.
%

category: 'Grail-Tests - Every flavour, and deeper nesting'
method: EnumNestedClassTestCase
testIntEnumAndFlag
	"The rule lives in the shared member pass, so a plain helper class nested in
	an IntEnum or a Flag is excluded the same way."

	self assert: (self resultAt: 'int_enum_list') asString equals: '[<Ints.one: 1>]'.
	self assert: (self resultAt: 'int_enum_helper') equals: 3.
	self assert: (self resultAt: 'flag_list') asString equals: '[<Flags.RED: 1>]'.
	self assert: (self resultAt: 'flag_helper_is_type').
%

category: 'Grail-Tests - Every flavour, and deeper nesting'
method: EnumNestedClassTestCase
testAnEnumThatIsItselfNested
	"CPython tests endswith rather than equality because the qualname carries
	the whole chain (Wrapper.Deep.Inner).  Grail's __qualname__ stops at the
	immediately-enclosing class, so it answers Deep.Inner and the EQUALITY
	branch takes it -- a separate gap that does not change the answer here."

	self assert: (self resultAt: 'deep_is_type').
	self assert: (self resultAt: 'deep_list') asString equals: '[<Deep.a: 1>]'.
%
