Class {
	#name : 'TypingGenericAliasTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypingGenericAliasTestCase >> check: aName [
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil

]

{ #category : 'Grail-Setup' }
TypingGenericAliasTestCase >> setUp [
	"Reload tests/python/typing_generic_aliases.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'typing_generic_aliases' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/typing_generic_aliases.py')
		name: 'typing_generic_aliases'.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
TypingGenericAliasTestCase >> testADeprecatedAliasIsNotAConstructor [
	"Built with inst=False upstream: it points at the builtin instead."

	self assert: (self check: #'a_deprecated_alias_is_not_a_constructor') equals: true.

]

{ #category : 'Grail-Tests - ABC aliases as type checks' }
TypingGenericAliasTestCase >> testAnAbcAliasIsAnIsinstanceTarget [
	"The urllib3 line itself."

	self assert: (self check: #'an_abc_alias_is_an_isinstance_target') equals: true.

]

{ #category : 'Grail-Tests - ABC aliases as type checks' }
TypingGenericAliasTestCase >> testAnAbcAliasIsAnIssubclassTarget [
	self assert: (self check: #'an_abc_alias_is_an_issubclass_target') equals: true.

]

{ #category : 'Grail-Tests - ABC aliases as type checks' }
TypingGenericAliasTestCase >> testAnAbcAliasIsStillABaseClass [
	"Guard rail for PR #726.  Subscripting no longer answers the alias itself,
	so BOTH spellings are checked -- the subscripted one is what urllib3 writes."

	self assert: (self check: #'an_abc_alias_is_still_a_base_class') equals: true.

]

{ #category : 'Grail-Tests - The alias is its own object' }
TypingGenericAliasTestCase >> testAnEnumCanHoldBoth [
	"The test_enum case itself."

	self assert: (self check: #'an_enum_can_hold_both') equals: true.

]

{ #category : 'Grail-Tests - ABC aliases as type checks' }
TypingGenericAliasTestCase >> testASubscriptedAbcAliasIsRefused [
	"CPython refuses a subscripted generic in a type check, in those words.
	Grail refused it before too, but only because the alias was not a type at
	all -- so the refusal had to be made deliberate as the delegation landed."

	self assert: (self check: #'a_subscripted_abc_alias_is_refused') equals: true.

]

{ #category : 'Grail-Tests - The alias is its own object' }
TypingGenericAliasTestCase >> testASubscriptedAliasPrintsAsItself [
	self assert: (self check: #'a_subscripted_alias_prints_as_itself') equals: true.

]

{ #category : 'Grail-Tests - ABC aliases as type checks' }
TypingGenericAliasTestCase >> testASubscriptedCallableAliasIsRefusedToo [
	self assert: (self check: #'a_subscripted_callable_alias_is_refused_too') equals: true.

]

{ #category : 'Grail-Tests - Type checks delegate' }
TypingGenericAliasTestCase >> testAUnionOfAliasesWorks [
	"``|'' on two alias objects cannot make a types.UnionType, so it makes a
	typing one, which has to answer type checks the same way."

	self assert: (self check: #'a_union_of_aliases_works') equals: true.

]

{ #category : 'Grail-Tests - ABC aliases as type checks' }
TypingGenericAliasTestCase >> testEveryAbcAliasAgreesWithItsOrigin [
	"The whole surface at once, against collections.abc, so a name added to the
	alias list is covered without a new check."

	self assert: (self check: #'every_abc_alias_agrees_with_its_origin') equals: true.

]

{ #category : 'Grail-Tests - Type checks delegate' }
TypingGenericAliasTestCase >> testIsinstanceDelegatesToTheOrigin [
	"Reaches list only through __instancecheck__ on the alias's own class --
	the lookup CPython does on TYPE(cls) whatever cls is."

	self assert: (self check: #'isinstance_delegates_to_the_origin') equals: true.

]

{ #category : 'Grail-Tests - Type checks delegate' }
TypingGenericAliasTestCase >> testIssubclassDelegatesToTheOrigin [
	self assert: (self check: #'issubclass_delegates_to_the_origin') equals: true.

]

{ #category : 'Grail-Tests - Type checks delegate' }
TypingGenericAliasTestCase >> testIssubclassThroughAUnionWorks [
	"The FIRST argument is not a type either, and CPython never validates it
	before asking the second one's hook."

	self assert: (self check: #'issubclass_through_a_union_works') equals: true.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
TypingGenericAliasTestCase >> testOrdinaryTypeChecksAreUnaffected [
	"Guard rail.  isinstance is the hottest builtin there is; the new lookup
	fires only for a non-class second argument."

	self assert: (self check: #'ordinary_type_checks_are_unaffected') equals: true.

]

{ #category : 'Grail-Tests - The alias is its own object' }
TypingGenericAliasTestCase >> testTheAliasPrintsAsItself [
	self assert: (self check: #'the_alias_prints_as_itself') equals: true.

]

{ #category : 'Grail-Tests - The alias is its own object' }
TypingGenericAliasTestCase >> testTheBuiltinGenericStillPrintsAsItself [
	"Guard rail: ``list[int]'' is untouched, and must stay the other object."

	self assert: (self check: #'the_builtin_generic_still_prints_as_itself') equals: true.

]

{ #category : 'Grail-Tests - ABC aliases as type checks' }
TypingGenericAliasTestCase >> testTheDelegationCanAnswerFalse [
	"NEGATIVE CONTROL.  A hook that answered True unconditionally passes every
	check above and is worthless; these are the cases where the origin says NO."

	self assert: (self check: #'the_delegation_can_answer_false') equals: true.

]

{ #category : 'Grail-Tests - The alias is its own object' }
TypingGenericAliasTestCase >> testTheTwoAreDistinct [
	"What test_enum_of_generic_aliases turns on -- unequal AND hashing apart,
	or the enum aliases one member onto the other."

	self assert: (self check: #'the_two_are_distinct') equals: true.

]
