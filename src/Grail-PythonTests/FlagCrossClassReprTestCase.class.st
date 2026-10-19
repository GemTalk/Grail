Class {
	#name : 'FlagCrossClassReprTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FlagCrossClassReprTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
FlagCrossClassReprTestCase >> setUp [
	"Reload tests/python/flag_cross_class_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'flag_cross_class_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/flag_cross_class_repr.py')
		name: 'flag_cross_class_repr'.

]

{ #category : 'Grail-Tests - Plain Flag operand rule' }
FlagCrossClassReprTestCase >> testAFlagWithADataMixinKeepsAllOfIt [
	"The rule turns on the MEMBER TYPE, not on being an IntFlag: ``class
	MixedIn(int, Flag)'' has one, so an int operand stays legal -- which is the
	tolerance the old code was protecting, kept without the over-acceptance."

	self assert: (self resultAt: 'mixed_in_with_int') asString
		equals: '<MixedIn.X|Y: 3>'.
	self assert: (self resultAt: 'mixed_in_same_class') asString
		equals: '<MixedIn.X|Y: 3>'.

]

{ #category : 'Grail-Tests - Unchanged cases' }
FlagCrossClassReprTestCase >> testALeftoverTheOtherClassCannotNameStaysABareInt [
	"Iron is STRICT and names no bit 16, so there is no member to show and the
	bare int is the answer -- which is also the pre-existing behaviour, so the
	fallback cannot make anything worse than it was."

	self assert: (self resultAt: 'unnameable_leftover') asString
		equals: '<Simple.SINGLE|16: 17>'.

]

{ #category : 'Grail-Tests - Plain Flag operand rule' }
FlagCrossClassReprTestCase >> testAPlainFlagRefusesAForeignOperand [
	"A plain Flag's _member_type_ is object, so CPython's Flag.__or__ takes
	neither of its two admissible branches and answers NotImplemented -- both a
	member of another Flag class and a bare int are TypeError, with the message
	naming both types.

	Grail's ___flagOperand___: accepted any Flag member and any Integer, so both
	quietly answered <PlainA.A|2: 3>.  The tolerance existed because this source
	is COPIED onto MI flag classes, whose members are not Flag-kind; asking
	___grailMemberTypeFor: separates the two without asking about storage."

	self assert: (self resultAt: 'plain_flag_cross_class') asString
		equals: 'TypeError: unsupported operand type(s) for |: ''PlainA'' and ''PlainB'''.
	self assert: (self resultAt: 'plain_flag_with_int') asString
		equals: 'TypeError: unsupported operand type(s) for |: ''PlainA'' and ''int'''.

]

{ #category : 'Grail-Tests - Plain Flag operand rule' }
FlagCrossClassReprTestCase >> testMembershipTakesTheSameRule [
	"``in'' goes through the same operand test, and CPython's message names the
	types in the order it evaluates them -- the contained object FIRST, which is
	the reverse of the binary operators."

	self assert: (self resultAt: 'plain_flag_contains_foreign') asString
		equals: 'TypeError: unsupported operand type(s) for ''in'': ''PlainB'' and ''PlainA'''.
	self assert: (self resultAt: 'plain_flag_contains_int') asString
		equals: 'TypeError: unsupported operand type(s) for ''in'': ''int'' and ''PlainA'''.
	self assert: (self resultAt: 'plain_flag_contains_own') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Unchanged cases' }
FlagCrossClassReprTestCase >> testSameClassCombinationIsUntouched [
	"No foreign operand, so nothing is recorded and the answer is exactly what
	it was: a fully-named composite, and a KEEP leftover as a bare int."

	self assert: (self resultAt: 'same_class') asString
		equals: '<Iron.ONE|TWO: 3>'.
	self assert: (self resultAt: 'same_class_keep_leftover') asString
		equals: '<Simple.SINGLE|4: 5>'.

]

{ #category : 'Grail-Tests - Cross-class leftover' }
FlagCrossClassReprTestCase >> testTheCompositeIsOtherwiseAnOrdinaryMemberOfItsOwnClass [
	"Only the NAMING changes.  The composite is still a Simple, still equal to
	3, and still strs as an int -- IntFlag is a ReprEnum."

	self assert: (self resultAt: 'is_a_simple') equals: true.
	self assert: (self resultAt: 'equals_three') equals: true.
	self assert: (self resultAt: 'str') asString equals: '3'.
	self assert: (self resultAt: 'value_int') equals: 3.

]

{ #category : 'Grail-Tests - Cross-class leftover' }
FlagCrossClassReprTestCase >> testTheLeftoverIsSpelledOutAsAMemberOfTheOtherClass [
	"The assertion test_boundary makes.  Before this, the uncovered bit read as
	the bare int 2 -- ``<Simple.SINGLE|2: 3>''."

	self assert: (self resultAt: 'repr') asString
		equals: '<Simple.SINGLE|<Iron.TWO: 2>: 3>'.
	self assert: (self resultAt: 'name') asString
		equals: 'SINGLE|<Iron.TWO: 2>'.

]

{ #category : 'Grail-Tests - Plain Flag operand rule' }
FlagCrossClassReprTestCase >> testTheOtherTwoOperatorsRefuseItToo [
	"& and ^ take the same rule, and each names its own operator."

	self assert: (self resultAt: 'plain_flag_and') asString
		equals: 'TypeError: unsupported operand type(s) for &: ''PlainA'' and ''PlainB'''.
	self assert: (self resultAt: 'plain_flag_xor') asString
		equals: 'TypeError: unsupported operand type(s) for ^: ''PlainA'' and ''PlainB'''.

]

{ #category : 'Grail-Tests - Cross-class leftover' }
FlagCrossClassReprTestCase >> testTheRenderingClassIsStillTheReceiversOwn [
	"CPython calls cls._numeric_repr_(unknown): the class that chooses the
	SPELLING is the receiver's, and only the ARGUMENT comes from the other
	enum.  So a class with ``_numeric_repr_ = hex'' still gets hex."

	self assert: (self resultAt: 'hexy_cross_class') asString
		equals: '<Hexy.A|0x2: 3>'.

]

{ #category : 'Grail-Tests - Recorded gap' }
FlagCrossClassReprTestCase >> testTheValueItselfIsStillAPlainIntWhichIsAKnownGap [
	"RECORDED DIVERGENCE.  CPython's _value_ for this composite is the Iron
	composite <Iron.ONE|TWO: 3>, so type(_value_).__name__ is 'Iron'.  Grail's
	is a plain Integer: an int-rooted member's value slot doubles as its int
	payload, and some 74 places read it as an Integer.

	Recording the foreign CLASS gives the naming path everything it needs, so
	this is the only observable remainder."

	self assert: (self resultAt: 'value_type') asString equals: 'int'.

]
