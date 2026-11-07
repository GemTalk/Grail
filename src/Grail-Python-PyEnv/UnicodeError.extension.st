Extension { #name : 'UnicodeError' }

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___allocateForNew: someArguments kw: keywords [
	"CPython's BaseException_new, for an explicit ``UnicodeEncodeError.__new__(cls,
	...)'' (BaseException class >> ___excStaticNew:kw:): the arguments are kept
	unchecked, since only __init__ parses them, so ``klass.__new__(klass)''
	builds an instance (test_exceptions test_unicode_errors_no_object)."

	| instance |

	instance := self ___new___.
	instance @env0:___newArgs___: someArguments.
	^ instance

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___argumentCountMessageFor: anArity given: aCount [
	^ 'function takes exactly ' @env0:, anArity @env0:printString @env0:, ' arguments ('
		@env0:, aCount @env0:printString @env0:, ' given)'

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___bytesLikeMessageFor: anObject [
	^ 'a bytes-like object is required, not ''' @env0:, (bytes ___pyTypeNameOf___: anObject) @env0:asString @env0:, ''''

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___check___: someArguments count: anArity [

	someArguments @env0:size @env0:= anArity ifFalse: [
		^ TypeError ___signal___: (self ___argumentCountMessageFor: anArity given: someArguments @env0:size)]

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___checkBytesLike___: anObject [
	"anObject as UnicodeDecodeError_init takes its object: anything with the
	buffer protocol, which ___normalizedObject___: then copies into bytes."

	((anObject @env0:isKindOf: ByteArray) or: [anObject @env0:isKindOf: memoryview]) ifFalse: [
		^ TypeError ___signal___: (self ___bytesLikeMessageFor: anObject)]

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___checkConstructorArguments___: someArguments [
	"UnicodeError itself takes any arguments, as BaseException does."

	^ self

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___checkPosition___: anObject [
	"anObject as PyArg_ParseTuple's ``n'' takes it: what __index__ answers, in
	a Py_ssize_t."

	| position |

	position := anObject ___asIndex___.
	(position @env0:between: -9223372036854775808 and: 9223372036854775807) ifFalse: [
		^ OverflowError ___signal___: self ___positionTooLargeMessage]

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___checkStr___: someArguments at: anIndex [
	"The argument at anIndex as PyArg_ParseTuple's ``U'' takes it: a str."

	| argument |

	argument := someArguments @env0:at: anIndex.
	argument @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: (self ___strMessageFor: argument at: anIndex)]

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___classForArgs___: positional [
	"The class built for these arguments, once the class's own __init__ would
	take them.  CPython's UnicodeEncodeError, UnicodeDecodeError and
	UnicodeTranslateError parse their arguments in tp_init
	(Objects/exceptions.c), so a subclass with an __init__ of its own is
	not checked here."

	self ___initializesAsBuiltIn___ ifTrue: [
		self ___checkConstructorArguments___: (positional @env0:isNil ifTrue: [#()] ifFalse: [positional])].
	^ super ___classForArgs___: positional

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___definesInit___ [
	"Whether the receiver's own Python methods include an __init__, of any
	arity."

	^ (self @env0:methodDictForEnv: 1) @env0:keys @env0:anySatisfy: [:selector |
		(selector @env0:beginsWith: '__init__') or: [selector @env0:= #'___init__:kw:']]

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___initializesAsBuiltIn___ [
	"Whether the __init__ the receiver's instances run is the built-in one: no
	class a class statement or type() made, from the receiver up to the
	built-in exceptions, defines its own.  BaseException class >>
	___hasUserInit___ cannot say it: Grail's Exception defines __init__ too."

	| class |

	class := self.
	[class ___grailIsPythonClass___] whileTrue: [
		class ___definesInit___ ifTrue: [^ false].
		class := class @env0:superclass].
	^ true

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___namesAClassOfMine___: anObject [
	"Whether anObject is the receiver or one of its subclasses."

	^ (anObject @env0:isKindOf: Behavior)
		and: [anObject == self or: [anObject @env0:inheritsFrom: self]]

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___positionTooLargeMessage [
	^ 'Python int too large to convert to C ssize_t'

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> ___strMessageFor: anObject at: anIndex [
	^ 'argument ' @env0:, anIndex @env0:printString @env0:, ' must be str, not '
		@env0:, (TypeError @env0:___badArgumentNameOf___: anObject)

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> __new__ [
	"``UnicodeEncodeError()'': built as any other count of arguments is, so
	they are checked -- see ___classForArgs___:."

	^ self _new: #() kw: nil

]

{ #category : 'Grail-Initialization' }
UnicodeError class >> __new__: anArgument [
	"``UnicodeEncodeError(x)'': built as any other count of arguments is, so
	it is checked -- see ___classForArgs___:.  Unless x is the receiver or a
	subclass of it: ``E ___new___: E'', Grail's own way to allocate one from
	Smalltalk, arrives as this same send, and keeps building one unchecked."

	(self ___namesAClassOfMine___: anArgument) ifTrue: [^ super __new__: anArgument].
	^ self _new: { anArgument } kw: nil

]

{ #category : 'Grail-Python Attribute Access' }
UnicodeError >> ___args___: anArray [
	"Normalise args as BaseException does, then keep each constructor argument
	as its ATTRIBUTE, as CPython's slots keep it: assigning ``exc.end'' changes
	what __str__ reports, and ``del exc.object'' leaves it unset, neither of
	which args can do.  Only for a construction with the full set; the raises
	that pass a bare message carry no fields, and their accessors answer nil.

	The fields are dynamic instVars, the slot a Python store writes too."

	| names |
	super ___args___: anArray.
	names := self @env0:___fieldNames___.
	(anArray @env0:notNil and: [anArray @env0:size @env0:= names @env0:size]) ifFalse: [^ self].
	names @env0:doWithIndex: [:each :index |
		self @env0:dynamicInstVarAt: each put: (each == #'object'
			ifTrue: [self @env0:___normalizedObject___: (anArray @env0:at: index)]
			ifFalse: [anArray @env0:at: index])]

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___checkedObjectOf___: aKindName where: aBlock [
	"The object, read again after the str() calls that precede it, which can
	run Python that changes or deletes it (Objects/exceptions.c:2987-3003,
	check_unicode_error_attribute): unset, or not aKindName, is a TypeError
	where Grail went on to index whatever was there (test_exceptions
	test_unicode_error_evil_str_set_none_object and _del_self_object)."

	| object |
	object := self ___field___: #'object'.
	object == nil ifTrue: [
		^ TypeError ___signal___: 'UnicodeError ''object'' attribute is not set'].
	(aBlock value: object) ifFalse: [
		^ TypeError ___signal___: 'UnicodeError ''object'' attribute must be a ' @env0:, aKindName].
	^ object

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___codePointAt___: anIndex in: anObject [
	"The code point at a ZERO-BASED index of the offending object.

	A PyStrSurrogate is not a CharacterCollection -- it is the
	representation for a string holding a lone surrogate, which a GemStone
	string cannot -- so it is asked for its code points rather than
	indexed as a string.  Both cases reach here: an encode error names the
	character it could not encode, and a smuggled surrogate is exactly the
	kind of character a codec refuses."

	(anObject @env0:isKindOf: PyStrSurrogate)
		ifTrue: [^ (anObject @env0:___codePoints___) @env0:at: anIndex @env0:+ 1].
	^ (anObject @env0:at: anIndex @env0:+ 1) @env0:codePoint

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___escapeForMessage___: cp [
	"One code point as the Python escape CPython prints in these messages:
	\\xNN below U+0100, \\uNNNN below U+10000, \\UNNNNNNNN above.  Always
	escaped, even for a printable character -- CPython does not print the
	character itself here."

	| hex width ws |
	width := cp @env0:< 16r100
		ifTrue: [2]
		ifFalse: [cp @env0:< 16r10000 ifTrue: [4] ifFalse: [8]].
	hex := (cp @env0:printStringRadix: 16) @env0:asLowercase.
	[hex @env0:size @env0:< width] @env0:whileTrue: [hex := '0' @env0:, hex].
	ws := WriteStream @env0:on: String @env0:new.
	ws @env0:nextPut: $\.
	ws @env0:nextPut: (width @env0:= 2
		ifTrue: [$x]
		ifFalse: [width @env0:= 4 ifTrue: [$u] ifFalse: [$U]]).
	ws @env0:nextPutAll: hex.
	^ ws @env0:contents

]

{ #category : 'Grail-Python Attribute Access' }
UnicodeError >> ___field___: aName [
	"The attribute ___args___: stored under aName, or nil when there is none."

	^ self @env0:dynamicInstVarAt: aName

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___hasFields___ [
	"Was this built from the full constructor arguments?  The raises that pass
	a bare message were not, and their str is the message."

	^ self args @env0:size @env0:= self @env0:___fieldNames___ @env0:size

]

{ #category : 'Grail-Initialization' }
UnicodeError >> ___init__: positional kw: kwargs [
	"CPython's UnicodeEncodeError, UnicodeDecodeError and UnicodeTranslateError
	parse their arguments in tp_init (Objects/exceptions.c), however it is
	reached: building a subclass, or ``UnicodeEncodeError.__init__(self, ...)''
	called explicitly.  Keywords are refused first, as BaseException_init
	refuses them."

	((kwargs @env0:notNil) and: [kwargs @env0:notEmpty]) ifFalse: [
		self @env0:class ___checkConstructorArguments___:
			(positional @env0:isNil ifTrue: [#()] ifFalse: [positional @env0:asArray])].
	^ super ___init__: positional kw: kwargs

]

{ #category : 'Grail-Python Attribute Access' }
UnicodeError >> ___memberRead___: aName [
	"What reading a field answers: the attribute, or -- once it is unset, by
	del or because this class has no such field (UnicodeTranslateError's
	encoding) -- None, as an empty CPython slot reads.  nil only for a raise
	that passed a bare message, which carries no fields at all and whose
	callers (ByteArray's decode policies) ask for nil."

	^ (self ___field___: aName) ifNil: [self ___hasFields___ ifTrue: [None] ifFalse: [nil]]

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___namesOneItemOf___: anObject [
	"Do start and end bracket exactly one item of the object, both in range?
	Only then does a message name the item; otherwise it gives the range as
	start and end hold it, whatever they are.  Grail asked only end - start =
	1, so a start of -1 indexed before the object and died uncatchably
	(test_exceptions test_unicode_error_str_does_not_crash)."

	| first last size |
	first := self ___field___: #'start'.
	last := self ___field___: #'end'.
	size := anObject @env1:__len__.
	^ (first @env0:>= 0 and: [first @env0:< size])
		and: [(last @env0:>= 0 and: [last @env0:<= size])
		and: [last @env0:= (first @env0:+ 1)]]

]

{ #category : 'Grail-Python Attribute Access' }
UnicodeError >> ___pyAttrDelete___: aName [
	"``del exc.object'' -- and encoding and reason -- leaves the field UNSET,
	as clearing CPython's object slot does: a read then answers None, but
	__str__ reports it unset (test_exceptions
	test_unicode_error_evil_str_del_self_object), where BaseException's
	member rule stored None, which __str__ took for an object that is not a
	string."

	(#('encoding' 'object' 'reason') @env0:includes: aName @env0:asString) ifFalse: [
		^ super ___pyAttrDelete___: aName].
	self @env0:removeDynamicInstVar: aName @env0:asSymbol.
	^ None

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___rangeText___ [
	"``position 1-4'' -- start and end - 1, unclamped, as CPython prints them."

	^ 'position ' @env0:, (self ___field___: #'start') @env0:printString
		@env0:, '-' @env0:, ((self ___field___: #'end') @env0:- 1) @env0:printString

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___strOf___: aName [
	"str() of a field, which may have been assigned something other than a
	str -- ``exc.reason = 0x345345345345345345'' reports the number."

	^ ((self ___field___: aName) @env1:__str__) @env0:asString

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___twoHexDigits___: aByte [
	"A byte as exactly two lowercase hex digits, which is how CPython
	prints the offending byte in a decode message."

	| hex |
	hex := (aByte @env0:printStringRadix: 16) @env0:asLowercase.
	^ hex @env0:size @env0:< 2 ifTrue: ['0' @env0:, hex] ifFalse: [hex]

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> ___unicodeErrorArg___: anIndex [
	"One of the five positional arguments CPython's UnicodeEncodeError /
	UnicodeDecodeError name.  Both are constructed as
	``cls(encoding, object, start, end, reason)'', and CPython exposes each
	as a READ-WRITE attribute; Grail kept them in ``args'' and named none of
	them, so a handler that reads ``exc.start'' -- which is how CPython's own
	stdlib is written -- got AttributeError.

	encodings/punycode.py is the example that forced it: its decoder catches
	the error the inner ascii decode raises and re-raises with the offsets
	adjusted, reading .start, .end and .reason to do it.  Nothing about
	punycode; every error handler in the language works this way.

	Answers nil rather than raising when args is short, because these are
	also raised with fewer arguments in a few places and an accessor that
	dies is worse than one that admits it does not know.

	No longer read: the accessors answer the attributes ___args___: stores,
	which assignment and del act on.  Kept only because an env-1 method cannot
	be removed (#1727)."

	| a |
	a := self args.
	a == nil ifTrue: [^ nil].
	^ (a @env0:size @env0:>= anIndex)
		ifTrue: [a @env0:at: anIndex]
		ifFalse: [nil]

]

{ #category : 'Grail-Initialization' }
UnicodeError >> __init__ [
	"``UnicodeEncodeError.__init__(self)'' -- see ___init__:kw:."

	^ self ___init__: #() kw: nil

]

{ #category : 'Grail-Initialization' }
UnicodeError >> __init__: anArgument [
	"``UnicodeEncodeError.__init__(self, x)'' -- see ___init__:kw:.  nil is the
	no-argument sentinel, as for BaseException >> __init__:."

	^ self ___init__: (anArgument @env0:isNil ifTrue: [#()] ifFalse: [{ anArgument }]) kw: nil

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> encoding [
	"The codec name.  The attribute the constructor stored (___args___:),
	which an assignment replaces and a del clears (___memberRead___:)."

	^ self ___memberRead___: #'encoding'

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> end [
	"Index just past the offending span.  The attribute the constructor stored (___args___:),
	which an assignment replaces and a del clears (___memberRead___:)."

	^ self ___memberRead___: #'end'

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> object [
	"The str or bytes being converted.  The attribute the constructor stored (___args___:),
	which an assignment replaces and a del clears (___memberRead___:)."

	^ self ___memberRead___: #'object'

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> reason [
	"Why the codec could not proceed.  The attribute the constructor stored (___args___:),
	which an assignment replaces and a del clears (___memberRead___:)."

	^ self ___memberRead___: #'reason'

]

{ #category : 'Grail-Python Protocol' }
UnicodeError >> start [
	"First index of the offending span.  The attribute the constructor stored (___args___:),
	which an assignment replaces and a del clears (___memberRead___:)."

	^ self ___memberRead___: #'start'

]
