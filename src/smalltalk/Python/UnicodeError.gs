! ------------------- Superclass check
run
ValueError ifNil: [self error: 'ValueError is not defined. Check file ordering.'].
%

! ------- UnicodeError
expectvalue /Class
doit
ValueError subclass: 'UnicodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnicodeError category: 'Grail-Exceptions'
%

set compile_env: 1

category: 'Grail-Python Protocol'
method: UnicodeError
___unicodeErrorArg___: anIndex
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
	dies is worse than one that admits it does not know."

	| a |
	a := self args.
	a == nil ifTrue: [^ nil].
	^ (a @env0:size @env0:>= anIndex)
		ifTrue: [a @env0:at: anIndex]
		ifFalse: [nil]
%

category: 'Grail-Python Protocol'
method: UnicodeError
___codePointAt___: anIndex in: anObject
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
%

category: 'Grail-Python Protocol'
method: UnicodeError
___twoHexDigits___: aByte
	"A byte as exactly two lowercase hex digits, which is how CPython
	prints the offending byte in a decode message."

	| hex |
	hex := (aByte @env0:printStringRadix: 16) @env0:asLowercase.
	^ hex @env0:size @env0:< 2 ifTrue: ['0' @env0:, hex] ifFalse: [hex]
%

category: 'Grail-Python Protocol'
method: UnicodeError
___escapeForMessage___: cp
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
%

category: 'Grail-Python Protocol'
method: UnicodeError
encoding
	"The codec name -- args[0].  See ___unicodeErrorArg___:."

	^ self ___unicodeErrorArg___: 1
%

category: 'Grail-Python Protocol'
method: UnicodeError
object
	"The str or bytes being converted -- args[1]."

	^ self ___unicodeErrorArg___: 2
%

category: 'Grail-Python Protocol'
method: UnicodeError
start
	"First index of the offending span -- args[2]."

	^ self ___unicodeErrorArg___: 3
%

category: 'Grail-Python Protocol'
method: UnicodeError
end
	"Index just past the offending span -- args[3]."

	^ self ___unicodeErrorArg___: 4
%

category: 'Grail-Python Protocol'
method: UnicodeError
reason
	"Why the codec could not proceed -- args[4]."

	^ self ___unicodeErrorArg___: 5
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! consults it through an env-0 ``respondsTo:'', so an env-1 definition is
! invisible to the probe and the hook silently does nothing.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: UnicodeError
___pythonValueAttrs___
	"CPython's UnicodeEncodeError / UnicodeDecodeError name their five
	constructor arguments as read-write ATTRIBUTES -- encoding, object,
	start, end, reason -- and stdlib code reads them.  Without this the
	accessors below came back as BoundMethods, so
	``offset + exc.start'' answered ``unsupported operand type(s) for +:
	'SmallInteger' and 'BoundMethod''' -- which is how
	encodings/punycode.py's decoder fails when it tries to re-raise with
	the offsets adjusted.

	Registered on UnicodeError rather than on each subclass because
	UnicodeTranslateError names four of the five in the same way, and a
	subclass that happens not to carry them answers nil rather than
	misreporting.

	Extends the inherited set; BaseException builds a fresh IdentitySet
	per call, so adding to the answer is safe."

	^ super ___pythonValueAttrs___
		add: #'encoding';
		add: #'object';
		add: #'start';
		add: #'end';
		add: #'reason';
		yourself
%

set compile_env: 0
