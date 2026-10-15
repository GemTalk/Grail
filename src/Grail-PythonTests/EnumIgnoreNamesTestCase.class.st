Class {
	#name : 'EnumIgnoreNamesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumIgnoreNamesTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumIgnoreNamesTestCase >> setUp [
	"Reload tests/python/enum_ignore_names.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_ignore_names' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_ignore_names.py')
		name: 'enum_ignore_names'.

]

{ #category : 'Grail-Tests - Parsing the list' }
EnumIgnoreNamesTestCase >> testAListIsAcceptedAsWellAsAString [
	"CPython's ``list(value)'' branch."

	self assert: (self resultAt: 'list_form') asString equals: '[False, False]'.
	self assert: (self resultAt: 'list_kept') asString equals: '[''KEPT'']'.

]

{ #category : 'Grail-Tests - Mixin enums' }
EnumIgnoreNamesTestCase >> testAMixinEnumHonoursItToo [
	"The case that silently did nothing while the list lived in the EnumDict.
	Neither an int- nor a str-mixin enum has one: its Smalltalk superclass is
	the DATA TYPE, so its metaclass chain never passes Enum and __prepare__
	never runs.  Reading the list back off the class is what covers all four."

	self assert: (self resultAt: 'mixin_int') asString equals: 'False'.
	self assert: (self resultAt: 'mixin_str') asString equals: 'False'.
	self assert: (self resultAt: 'mixin_intenum') asString equals: 'False'.

]

{ #category : 'Grail-Tests - Parsing the list' }
EnumIgnoreNamesTestCase >> testANameAlreadyTakenByAMemberCannotBeIgnored [
	"``_ignore_ cannot specify already set names''.  A member is already built
	by then; un-making it is not on offer."

	self assert: (self resultAt: 'already_set') asString equals: 'ValueError'.

]

{ #category : 'Grail-Tests - The names leave no trace' }
EnumIgnoreNamesTestCase >> testAnIgnoredNameIsNotAnAttributeAndNeitherIsIgnoreItself [
	"CPython pops every ignored key out of the class dict, having appended
	``_ignore_'' to the list it is about to walk.  All three used to be present."

	self assert: (self resultAt: 'ignored_names_absent') asString
		equals: '[False, False, False]'.
	self assert: (self resultAt: 'real_members_survive') asString
		equals: '[''RED'', ''GREEN'']'.

]

{ #category : 'Grail-Tests - Parsing the list' }
EnumIgnoreNamesTestCase >> testCommasSeparate [
	"value.replace(',',' ').split().  Splitting first and stripping commas after
	turned ``'a,b''' into the one name ``ab'', so neither was ignored."

	self assert: (self resultAt: 'comma_separated') asString
		equals: '[False, False, False]'.
	self assert: (self resultAt: 'comma_kept') asString equals: '[''KEPT'']'.

]

{ #category : 'Grail-Tests - The upstream shape' }
EnumIgnoreNamesTestCase >> testMembersAliasOnTheValueTheirNewProduced [
	"``month_1 = 30, 'month''' and ``day_30 = 30, 'day''' are DIFFERENT
	class-body values and the SAME member, because __new__ sets _value_ to 30
	for both.  Grail decided alias-ness from the class-body value, which a user
	__new__ is free to ignore -- so it built two members where CPython has one.
	CPython looks up enum_member._value_, after the member is built."

	self assert: (self resultAt: 'period_aliases') asString equals: '[True, True]'.

]

{ #category : 'Grail-Tests - Known gaps' }
EnumIgnoreNamesTestCase >> testTheMixinsOwnAccessorsDoNotReachTheMemberWhichIsAKnownGap [
	"Recorded, NOT endorsed.  The member IS a timedelta and carries a
	timedelta's state -- three dynamic instVars, which is why re-homing the
	constructed value onto an instance of the enum works at all -- but
	timedelta's ACCESSORS are not reachable from it: ``class Period(timedelta,
	Enum)'' is rooted at Enum on the Smalltalk chain with timedelta merged as a
	secondary base, and that merge does not bring them down.  CPython answers
	1 / 0 / 86400.0.

	Rooting the class at PyTimedelta instead was tried and is the wrong lever:
	it takes the class off the Enum chain, and the 52 date-mixin enum tests that
	rely on ___grailValueMixinFor: building the member's value all break."

	self assert: (self resultAt: 'mixin_accessors_reach_the_member') asString
		equals: '[False, False, False]'.

]

{ #category : 'Grail-Tests - The upstream shape' }
EnumIgnoreNamesTestCase >> testTheScaffoldingBuildsTheMembersAndThenVanishes [
	"test_enum's Period, entire: 97 members written through a namespace by three
	loops, then three attributes reading back names no statement mentions.

	Every layer meets here -- the body has to run in SOURCE ORDER for ``OneDay =
	day_1'' to see the loops (ClassBodySourceOrderTestCase), _ignore_ has to
	keep ``Period'' and ``i'' out, and timedelta.__new__(cls, value) has to
	answer an instance of cls."

	self assert: (self resultAt: 'period_scaffolding_gone') asString
		equals: '[False, False, False]'.
	self assert: (self resultAt: 'period_read_back') asString
		equals: '[True, True, True]'.
	self assert: (self resultAt: 'period_is_timedelta') asString equals: 'True'.
	self assert: (self resultAt: 'period_user_slot') asString equals: '''day'''.

]
