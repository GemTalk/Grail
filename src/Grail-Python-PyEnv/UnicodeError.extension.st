Extension { #name : 'UnicodeError' }

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
