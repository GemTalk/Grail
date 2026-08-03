! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BoolConformanceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BoolConformanceTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
BoolConformanceTestCase comment:
'PEP 285 bool conformance -- one test per gap found by test.test_bool.

Grail maps Python''s bool onto the kernel Boolean, which (unlike CPython''s
bool) is NOT an int subclass, cannot be allocated, and shares its
arity-named constructor selectors with the truth-testing entry point.  These
tests pin the behaviours that close that distance: isinstance/issubclass
widening against int, the inherited int value attributes and classmethods,
the split between ``bool(x)'' truth testing and the ``bool.__new__(bool)''
allocation form, argument checking, refusal to be subclassed, the __bool__ /
__len__ protocol validation, and the deprecation of ``~bool''.

Fixture: tests/python/bool_conformance.py (user classes cannot be
instantiated from a `self eval:` string).'
%

expectvalue /Class
doit
BoolConformanceTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
BoolConformanceTestCase removeAllMethods: 0.
BoolConformanceTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: BoolConformanceTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'bool_conformance' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bool_conformance.py')
		name: 'bool_conformance'.
%

category: 'Grail-Helpers'
method: BoolConformanceTestCase
resultAt: aKey
	"The fixture's RESULTS[aKey] -- either the value, or the 3-tuple
	('raised', ExcName, message) when the recorded call raised."

	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: BoolConformanceTestCase
assert: aKey raised: excName
	"Assert the fixture entry recorded a raise of the named Python
	exception class, and answer its message."

	| r |
	r := self resultAt: aKey.
	self assert: ((r @env1:__getitem__: 0) asString = 'raised')
		description: aKey , ' did not raise (got ' , r printString , ')'.
	self assert: ((r @env1:__getitem__: 1) asString = excName)
		description: aKey , ' raised ' , (r @env1:__getitem__: 1) asString
			, ', expected ' , excName.
	^ (r @env1:__getitem__: 2) asString
%

category: 'Grail-Helpers'
method: BoolConformanceTestCase
assertList: aKey allTrue: expectedSize
	"Assert the fixture entry is a list of exactly `expectedSize` true values."

	| r |
	r := self resultAt: aKey.
	self assert: (r @env1:__len__) equals: expectedSize.
	0 to: expectedSize - 1 do: [:i |
		self assert: (r @env1:__getitem__: i)
			description: aKey , ' element ' , i printString , ' is not true'].
%

category: 'Grail-Tests - int subclass'
method: BoolConformanceTestCase
testIsinstanceBoolIsInt
	"CPython's bool subclasses int, so isinstance(True, int) holds.  Grail's
	Boolean is outside the Integer chain, so builtins>>___isInstanceSingle___:of:
	widens explicitly.  Only that direction: an int is NOT a bool."

	self assert: (self resultAt: 'isinstance_true_int').
	self assert: (self resultAt: 'isinstance_false_int').
	self assert: (self resultAt: 'isinstance_true_bool').
	self deny: (self resultAt: 'isinstance_one_bool').
%

category: 'Grail-Tests - int subclass'
method: BoolConformanceTestCase
testIssubclassBoolIsInt
	"issubclass(bool, int) is True and issubclass(int, bool) is False."

	self assert: (self resultAt: 'issubclass_bool_int').
	self deny: (self resultAt: 'issubclass_int_bool').
%

category: 'Grail-Tests - int subclass'
method: BoolConformanceTestCase
testRealAndImagAreIntValues
	"True.real / .imag are int-valued PROPERTIES, not bound methods -- a
	BoundMethod would poison ``True.real + 1''.  Needs
	bool class>>___pythonValueAttrs___ compiled in ENV 0, since
	___pyAttrLoad___ consults it through an env-0 respondsTo:."

	self assert: (self resultAt: 'true_real') equals: 1.
	self assert: (self resultAt: 'true_imag') equals: 0.
	self assert: (self resultAt: 'false_real') equals: 0.
	self assert: (self resultAt: 'true_real_is_int').
	self assert: (self resultAt: 'true_imag_is_int').
	self assert: (self resultAt: 'true_real_plus_one') equals: 2.
	self assert: (self resultAt: 'true_numerator') equals: 1.
	self assert: (self resultAt: 'true_denominator') equals: 1.
%

category: 'Grail-Tests - int subclass'
method: BoolConformanceTestCase
testInheritedIntMethods
	"bool exposes int's non-property API too."

	self assert: (self resultAt: 'true_bit_length') equals: 1.
	self assert: (self resultAt: 'true_conjugate') equals: 1.
	self assert: ((self resultAt: 'true_as_integer_ratio') @env1:__getitem__: 0) equals: 1.
	self assert: ((self resultAt: 'true_as_integer_ratio') @env1:__getitem__: 1) equals: 1.
%

category: 'Grail-Tests - int subclass'
method: BoolConformanceTestCase
testFromBytes
	"bool.from_bytes narrows int's classmethod result to True/False.  It
	delegates to the 2-arg int.from_bytes, which named a nonexistent
	``from_bytes:byteorder:signed:'' selector and so died in an uncatchable
	env-1 DNU for EVERY caller."

	self deny: (self resultAt: 'bool_from_bytes_zero').
	self assert: (self resultAt: 'bool_from_bytes_nonzero').
	self assert: (self resultAt: 'int_from_bytes_2arg') equals: 256.
%

category: 'Grail-Tests - construction'
method: BoolConformanceTestCase
testBoolNewAllocationForm
	"CPython's ``bool.__new__(cls[, value])'' passes the target class
	first, so bool.__new__(bool) is False, not the truthiness of the
	bool class object."

	self deny: (self resultAt: 'new_bool').
	self assert: (self resultAt: 'new_bool_1').
	self deny: (self resultAt: 'new_bool_0').
	self deny: (self resultAt: 'new_bool_false').
	self assert: (self resultAt: 'new_bool_true').
%

category: 'Grail-Tests - construction'
method: BoolConformanceTestCase
testBoolOfClassIsTrue
	"``bool(cls)'' is ordinary truth testing -- types are always true --
	even though it has the same one-argument shape as the allocation form
	above.  CallAst routes a literal call site to ___truthOf___: so the two
	readings cannot collide; Boolean class>>value:value: does the same for
	the indirect ``f = bool; f(x)'' form."

	self assert: (self resultAt: 'bool_of_bool').
	self assert: (self resultAt: 'bool_of_dict').
	self assert: (self resultAt: 'bool_of_type').
	self assert: (self resultAt: 'bool_indirect_of_dict').
	self deny: (self resultAt: 'bool_indirect_of_zero').
%

category: 'Grail-Tests - construction'
method: BoolConformanceTestCase
testBoolArgumentCount
	"bool() is False; more than one positional is a CATCHABLE TypeError
	(it used to be an uncatchable MNU on the kernel Boolean metaclass,
	which has no env-1 DNU backstop)."

	self deny: (self resultAt: 'bool_no_args').
	self assert: ((self assert: 'bool_two_args' raised: 'TypeError')
		includesString: 'at most 1 argument').
	self assert: ((self assert: 'bool_three_args' raised: 'TypeError')
		includesString: 'at most 1 argument').
%

category: 'Grail-Tests - construction'
method: BoolConformanceTestCase
testBoolRejectsKeywordArguments
	"bool() takes its value positionally only."

	self assert: ((self assert: 'bool_kwarg' raised: 'TypeError')
		includesString: 'keyword argument').
%

category: 'Grail-Tests - construction'
method: BoolConformanceTestCase
testBoolCannotBeSubclassed
	"bool is final in CPython.  Grail's Boolean refuses allocation via
	``Boolean class>>new''`s shouldNotImplement -- an uncatchable Smalltalk
	Error -- so both the class statement and int.__new__(bool, ...) are
	turned into the TypeError Python code expects."

	self assert: ((self assert: 'subclass_bool' raised: 'TypeError')
		includesString: 'not an acceptable base type').
	self assert: ((self assert: 'int_new_bool' raised: 'TypeError')
		includesString: 'not safe').
%

category: 'Grail-Tests - __bool__ protocol'
method: BoolConformanceTestCase
testBoolDunderMustReturnBool
	"CPython requires __bool__ to return a REAL bool.  Grail used to hand
	the raw value back, so bool(x) could answer a non-bool and every
	``if x:'' downstream then hit a Smalltalk must-be-boolean error rather
	than a catchable Python one."

	self assert: ((self assert: 'bool_returns_self' raised: 'TypeError')
		includesString: 'should return bool').
	self assert: ((self assert: 'bool_returns_str' raised: 'TypeError')
		includesString: 'should return bool').
	self assert: ((self assert: 'bool_returns_int' raised: 'TypeError')
		includesString: 'should return bool').
%

category: 'Grail-Tests - __bool__ protocol'
method: BoolConformanceTestCase
testBlockedByNoneSentinel
	"``__bool__ = None'' in a class body BLOCKS the protocol -- the object
	is not interpretable as a boolean even when it defines a working
	__len__.  ``__len__ = None'' blocks the length fallback the same way.
	A class-attribute None is invisible to normal dispatch, so
	___truthOf___: probes ___classAttrDunder___ (PythonInstance-gated, to
	keep the hot ``if x:'' path off the class-attr lookup)."

	self assert: ((self assert: 'blocked_bool' raised: 'TypeError')
		includesString: 'cannot be interpreted as a boolean').
	self assert: ((self assert: 'blocked_bool_with_len' raised: 'TypeError')
		includesString: 'cannot be interpreted as a boolean').
	self assert: ((self assert: 'blocked_len' raised: 'TypeError')
		includesString: 'cannot be interpreted as a boolean').
%

category: 'Grail-Tests - __bool__ protocol'
method: BoolConformanceTestCase
testNegativeLengthIsValueError
	"A negative __len__ is a ValueError, not a truthy length.  The working
	__len__ fallback must survive the added validation."

	self assert: ((self assert: 'negative_len' raised: 'ValueError')
		includesString: 'should return >= 0').
	self deny: (self resultAt: 'zero_len').
	self assert: (self resultAt: 'positive_len').
%

category: 'Grail-Tests - __bool__ protocol'
method: BoolConformanceTestCase
testWellBehavedBoolDunderStillWorks
	"The validation must not disturb a conforming __bool__, and ``if x:''
	must keep agreeing with bool(x) -- both route through ___truthOf___:."

	self assert: (self resultAt: 'good_bool_true').
	self deny: (self resultAt: 'good_bool_false').
	self assert: ((self resultAt: 'if_agrees_with_bool') @env1:__getitem__: 0).
	self deny: ((self resultAt: 'if_agrees_with_bool') @env1:__getitem__: 1).
	self deny: ((self resultAt: 'if_agrees_with_bool') @env1:__getitem__: 2).
	self assert: ((self resultAt: 'if_agrees_with_bool') @env1:__getitem__: 3).
%

category: 'Grail-Tests - deprecation'
method: BoolConformanceTestCase
testInvertOnBoolIsDeprecated
	"``~True'' is -2, the bitwise inversion of the underlying int, which is
	almost never what negating a bool was meant to do -- CPython gh-103487
	deprecates it.  The value is unchanged."

	self assert: (self resultAt: 'invert_warns') asString equals: 'warned'.
	self assert: (self resultAt: 'invert_false_value') equals: -1.
%

category: 'Grail-Tests - marshal'
method: BoolConformanceTestCase
testMarshalRoundTripsBools
	"marshal's wire format is explicitly an implementation detail (unlike
	pickle's), so Grail encodes through the bounded pickle format; what
	must hold is the round trip."

	self assert: ((self resultAt: 'marshal_bool') @env1:__getitem__: 0).
	self assert: ((self resultAt: 'marshal_bool') @env1:__getitem__: 1).
%

category: 'Grail-Tests - marshal'
method: BoolConformanceTestCase
testMarshalRoundTripsSupportedValues
	"None / int / float / str / bytes / tuple / list / dict all round-trip."

	self assertList: 'marshal_values' allTrue: 9.
%

category: 'Grail-Tests - marshal'
method: BoolConformanceTestCase
testMarshalRejectsUnsupportedObject
	"marshal accepts only its documented value types -- delegating to
	pickle unchecked would be strictly MORE permissive, since pickle
	serializes arbitrary objects through __reduce__."

	self assert: ((self assert: 'marshal_rejects_object' raised: 'ValueError')
		includesString: 'unmarshallable').
%

category: 'Grail-Tests - str.isspace'
method: BoolConformanceTestCase
testIsspaceCoversUnicodeWhitespace
	"str.isspace() is true for Unicode category Zs and bidi class WS/B/S --
	wider than GemStone's Character>>isSeparator, which stopped at the
	ASCII separators plus NBSP, so U+3000 IDEOGRAPHIC SPACE read as
	non-space."

	self assertList: 'isspace_results' allTrue: 9.
%

category: 'Grail-Tests - str.isspace'
method: BoolConformanceTestCase
testIsspaceNegatives
	"Empty string is False, and a zero-width space is not whitespace."

	| r |
	r := self resultAt: 'isspace_negatives'.
	self assert: (r @env1:__len__) equals: 4.
	0 to: 3 do: [:i |
		self deny: (r @env1:__getitem__: i)
			description: 'isspace_negatives element ' , i printString , ' should be false'].
%
