! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypingGenericAliasTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypingGenericAliasTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypingGenericAliasTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypingGenericAliasTestCase
!
! ``typing.List`` is NOT ``list'' -- it is a deprecated alias OF it, and the
! difference is observable:
!
!     repr(typing.List)         'typing.List'          not "<class 'list'>"
!     repr(typing.List[int])    'typing.List[int]'     not 'list[int]'
!     typing.List[int] == list[int]                    False
!
! Grail had these names bound to the BUILTIN ITSELF.  That was an improvement on
! what came before (bare name-carrying stubs, which were not types at all, so
! isinstance and ``|'' both failed), but it conflated two objects CPython keeps
! apart -- and test_enum's test_enum_of_generic_aliases is precisely a test that
! they ARE apart: it puts both in one enum and requires two DISTINCT members,
! which holds only if they are unequal and hash apart.
!
! So typing.List is a _SpecialGenericAlias wrapping list as its __origin__, and
! type checks DELEGATE to that origin -- which keeps everything aliasing bought
! (test_isinstance's test_subclass_normal / test_isinstance_with_or_union).
!
! THE HALF THAT NEEDED SMALLTALK is that delegation.  CPython's
! PyObject_IsInstance looks __instancecheck__ up on TYPE(cls) WITHOUT first
! requiring cls to be a type; typing.List is an INSTANCE, so Grail had no path
! to the hook at all -- a non-class classinfo went straight to the old-style
! __bases__ protocol or to the TypeError.  object >> ___nonClassCheckHook___:
! is that path, the exact sibling of ___metaclassCheckHook___: (PR #392) for the
! non-class receiver, and it is restricted to one for the same reason: Grail
! defines __instancecheck__: class-side for some builtins with a
! class-as-receiver convention, which invoking Python-style broke once already.
!
! issubclass is the same story with one extra wrinkle -- CPython never validates
! the FIRST argument before asking the second one's hook, which is what lets
! ``issubclass(typing.List, typing.List | typing.Tuple)'' work with a non-class
! on both sides.
!
! The fixture is self-running (docs/Testing_Guide.md): all eleven checks answer
! True under CPython 3.14 too, so the agreement is machine-checked.
!
! Drives tests/python/typing_generic_aliases.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypingGenericAliasTestCase removeAllMethods.
TypingGenericAliasTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypingGenericAliasTestCase
setUp
	"Reload tests/python/typing_generic_aliases.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'typing_generic_aliases' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/typing_generic_aliases.py')
		name: 'typing_generic_aliases'.
%

category: 'Grail-Private'
method: TypingGenericAliasTestCase
check: aName
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil
%

category: 'Grail-Tests - The alias is its own object'
method: TypingGenericAliasTestCase
testTheAliasPrintsAsItself
	self assert: (self check: #'the_alias_prints_as_itself') equals: true.
%

category: 'Grail-Tests - The alias is its own object'
method: TypingGenericAliasTestCase
testASubscriptedAliasPrintsAsItself
	self assert: (self check: #'a_subscripted_alias_prints_as_itself') equals: true.
%

category: 'Grail-Tests - The alias is its own object'
method: TypingGenericAliasTestCase
testTheBuiltinGenericStillPrintsAsItself
	"Guard rail: ``list[int]'' is untouched, and must stay the other object."

	self assert: (self check: #'the_builtin_generic_still_prints_as_itself') equals: true.
%

category: 'Grail-Tests - The alias is its own object'
method: TypingGenericAliasTestCase
testTheTwoAreDistinct
	"What test_enum_of_generic_aliases turns on -- unequal AND hashing apart,
	or the enum aliases one member onto the other."

	self assert: (self check: #'the_two_are_distinct') equals: true.
%

category: 'Grail-Tests - The alias is its own object'
method: TypingGenericAliasTestCase
testAnEnumCanHoldBoth
	"The test_enum case itself."

	self assert: (self check: #'an_enum_can_hold_both') equals: true.
%

category: 'Grail-Tests - Type checks delegate'
method: TypingGenericAliasTestCase
testIsinstanceDelegatesToTheOrigin
	"Reaches list only through __instancecheck__ on the alias's own class --
	the lookup CPython does on TYPE(cls) whatever cls is."

	self assert: (self check: #'isinstance_delegates_to_the_origin') equals: true.
%

category: 'Grail-Tests - Type checks delegate'
method: TypingGenericAliasTestCase
testIssubclassDelegatesToTheOrigin
	self assert: (self check: #'issubclass_delegates_to_the_origin') equals: true.
%

category: 'Grail-Tests - Type checks delegate'
method: TypingGenericAliasTestCase
testAUnionOfAliasesWorks
	"``|'' on two alias objects cannot make a types.UnionType, so it makes a
	typing one, which has to answer type checks the same way."

	self assert: (self check: #'a_union_of_aliases_works') equals: true.
%

category: 'Grail-Tests - Type checks delegate'
method: TypingGenericAliasTestCase
testIssubclassThroughAUnionWorks
	"The FIRST argument is not a type either, and CPython never validates it
	before asking the second one's hook."

	self assert: (self check: #'issubclass_through_a_union_works') equals: true.
%

category: 'Grail-Tests - Unchanged behaviour'
method: TypingGenericAliasTestCase
testADeprecatedAliasIsNotAConstructor
	"Built with inst=False upstream: it points at the builtin instead."

	self assert: (self check: #'a_deprecated_alias_is_not_a_constructor') equals: true.
%

category: 'Grail-Tests - Unchanged behaviour'
method: TypingGenericAliasTestCase
testOrdinaryTypeChecksAreUnaffected
	"Guard rail.  isinstance is the hottest builtin there is; the new lookup
	fires only for a non-class second argument."

	self assert: (self check: #'ordinary_type_checks_are_unaffected') equals: true.
%
