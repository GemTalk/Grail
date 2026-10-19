Class {
	#name : 'StrEnumMixinAndNewTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StrEnumMixinAndNewTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
StrEnumMixinAndNewTestCase >> setUp [
	"Reload tests/python/strenum_mixin_and_new.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'strenum_mixin_and_new' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/strenum_mixin_and_new.py')
		name: 'strenum_mixin_and_new'.

]

{ #category : 'Grail-Tests - A mixin in front of StrEnum' }
StrEnumMixinAndNewTestCase >> testAClassBodyStrOverridesTheValueSpelling [
	"A StrEnum is a ReprEnum: it takes str's __str__ (the bare value) UNLESS the
	class body defines one.  This body does, so the mixin's wins -- and
	__format__ follows __str__."

	self assert: (self resultAt: 'dumb_eq') asString equals: 'True'.
	self assert: (self resultAt: 'dumb_str') asString equals: 'don''t do this'.
	self assert: (self resultAt: 'dumb_format') asString equals: 'don''t do this'.

]

{ #category : 'Grail-Tests - StrEnum.__new__' }
StrEnumMixinAndNewTestCase >> testAClassWithItsOwnNewIsNotSecondGuessed [
	"StrEnum.__new__ is the DEFAULT.  A subclass defining one decides its own
	values, and the validation above must not run ahead of it -- ``a = 'x',
	'first''' is two arguments to that __new__, not a bad encoding."

	self assert: (self resultAt: 'own_new') asString equals: 'x/first/second'.

]

{ #category : 'Grail-Tests - StrEnum.__new__' }
StrEnumMixinAndNewTestCase >> testAMemberValueIsTheArgumentListToStr [
	"``three = b'3', 'ascii''' is str(b'3', 'ascii').  Grail stored the value as
	written, so the member's value became the literal string 'atuple'."

	self assert: (self resultAt: 'good') asString equals: '1,2,3,4'.
	self assert: (self resultAt: 'good_repr') asString
		equals: '<GoodStrEnum.three: ''3''>'.

]

{ #category : 'Grail-Tests - A mixin in front of StrEnum' }
StrEnumMixinAndNewTestCase >> testAMixinDoesNotSwallowTheEnum [
	"""``class WithStr(M, StrEnum)'' built NO members: ``WithStr.seven'' answered
	the bare string '7', silently, because the mixin won the storage-base choice
	and the enum metaclass protocol never reached the class.

	The IntEnum spelling is here beside it because it always worked -- by luck,
	not by rule -- and a fix that only moved StrEnum would leave that luck in
	place."""

	self assert: (self resultAt: 'mixin_str') asString
		equals: 'WithStr/<WithStr.seven: ''7''>/True'.
	self assert: (self resultAt: 'mixin_int') asString
		equals: 'WithInt/<WithInt.seven: 7>'.
	self assert: (self resultAt: 'mixin_enum') asString
		equals: 'WithEnum/<WithEnum.seven: ''7''>'.
	self assert: (self resultAt: 'mixin_members') asString equals: '[''seven'']'.

]

{ #category : 'Grail-Tests - A mixin in front of StrEnum' }
StrEnumMixinAndNewTestCase >> testAnEnumDerivedMixinLeavesTheValueSpellingAlone [
	"It defines no __str__, so nothing displaces str's -- including through two
	levels of mixin."

	self assert: (self resultAt: 'hello') asString equals: 'True/8'.
	self assert: (self resultAt: 'goodbye') asString equals: 'True/9'.

]

{ #category : 'Grail-Tests - StrEnum.__new__' }
StrEnumMixinAndNewTestCase >> testEachArgumentHasItsOwnComplaint [
	"""CPython's StrEnum.__new__ checks the value, the encoding and the errors
	argument separately.  Every one of these class bodies used to define quietly.

	``two = 2,'' is a ONE-element tuple, so it is the value that is refused, not
	the encoding -- which is why the tuple and plain spellings give the same
	message."""

	self assert: (self resultAt: 'not_a_string') asString equals: '1 is not a string'.
	self assert: (self resultAt: 'tuple_not_a_string') asString equals: '2 is not a string'.
	self assert: (self resultAt: 'plain_not_a_string') asString equals: '2 is not a string'.
	self assert: (self resultAt: 'bad_errors') asString equals: 'errors must be a string, not 9'.
	"The encoding complaint quotes repr() of what it was handed, so the fixture
	compares against the text built the same way CPython's own test builds it."
	self assert: (self resultAt: 'bad_encoding') asString equals: 'True'.

]

{ #category : 'Grail-Tests - StrEnum.__new__' }
StrEnumMixinAndNewTestCase >> testStrEnumIsNotTheSameThingAsStrEnumSpeltOut [
	"""``class CustomStrEnum(str, Enum)'' is NOT a StrEnum: it gets str's own
	constructor behaviour rather than StrEnum's checks, so a plain int value is
	simply coerced where StrEnum would refuse it.  That distinction is exactly
	what test_strenum and test_custom_strenum draw between two otherwise
	identical class bodies, so the validation must key on StrEnum-nature."""

	self assert: (self resultAt: 'custom_coerces') asString equals: '''1''/Coerced.one'.

]

{ #category : 'Grail-Tests - A mixin in front of StrEnum' }
StrEnumMixinAndNewTestCase >> testTheMembersAreStillStringsAndTheMixinStillContributes [
	"Choosing StrEnum as the storage base is what keeps the members strings; the
	mixin's methods still reach them through the C3 merge."

	self assert: (self resultAt: 'mixin_is_str') asString equals: 'True'.
	self assert: (self resultAt: 'mixin_eq') asString equals: 'True'.
	self assert: (self resultAt: 'mixin_method') asString equals: 'hi'.

]
