! ------------------- Superclass check
run
AbstractPyStr ifNil: [self error: 'AbstractPyStr is not defined. Check file ordering.'].
%

! ------- PyStrSurrogate class definition
expectvalue /Class
doit
AbstractPyStr subclass: 'PyStrSurrogate'
  instVarNames: #( codePoints)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyStrSurrogate comment:
'A Python ``str`` whose code points GemStone cannot hold in a Character.

# The mismatch
CPython''s str is a sequence of CODE POINTS, 0..0x10FFFF, INCLUDING the
surrogate block D800..DFFF.  GemStone''s Character is a Unicode SCALAR
VALUE -- code points minus that block -- so ``Character codePoint:
16rD800'' raises OutOfRange and no CharacterCollection can hold one.
This is not an encoding difference: both systems store a fixed-width
array of code points and encode to UTF-8 only on the way out (CPython
refuses a lone surrogate there too -- ``''\ud800''.encode(''utf-8'')''
raises UnicodeEncodeError, exactly as Grail does).  The difference is
the VALUE SET the character type admits.

CPython needs the surrogate block because of PEP 383 ``surrogateescape'':
bytes from the OS that are not valid UTF-8 -- filenames, argv, environ --
are mapped to U+DC80..U+DCFF so they round-trip.  So these strings are
not exotica; they are what you get when a filename is not UTF-8.

# Why a class rather than a rejection
The literal is usually incidental -- one filename in one test -- but a
tokenizer that refuses it fails the whole MODULE, since Grail compiles
every method body at import.  Five wired CPython modules scored
IMPORTERROR on a single literal each (test_builtin, test_codecs,
test_linecache, test_struct, test_warnings), losing roughly two thousand
unrelated tests between them.

# Where it fits
AbstractPyStr already exists for ``a Python str that is not a
CharacterCollection'' (StrEnum, ``class X(str)''), and Grail''s type
mapping is already many-to-one -- str is Unicode7 AND Unicode16 AND
Unicode32 AND String AND AbstractPyStr, just as int is SmallInteger AND
LargeInteger.  This is one more, and ``type(x).__name__'' answers
``str'' via object >> ___pythonTypeIdentity___.

# What it does NOT inherit
AbstractPyStr gets the whole str surface for free by forwarding every
unknown env-1 message to a real Unicode7 in ``#value''.  That is exactly
what a surrogate string cannot do -- there is no valid Unicode7 to
forward to -- so this class stores an Array of code points and
implements its protocol directly.  doesNotUnderstand: is overridden to
RAISE rather than forward, so an unimplemented str method is a clear
error and never a silently wrong answer against an empty string.

# Storage
``codePoints'' is an OrderedCollection of Integers, one per Python
character.  Fixed-width by construction, so __len__ and __getitem__ are
O(1) -- the same reason CPython (PEP 393) and GemStone both chose a
code-point array over UTF-8.  Compactness does not matter here: these
strings are rare and short.  During tokenization the same object is the
ACCUMULATOR (add: / addCodePoint: / lf); it is immutable from Python.'
%

expectvalue /Class
doit
PyStrSurrogate category: 'Grail-Modules'
%

! ------------------- Remove existing behavior
expectvalue /Metaclass3
doit
PyStrSurrogate removeAllMethods: 0.
PyStrSurrogate removeAllMethods: 1.
PyStrSurrogate class removeAllMethods: 0.
PyStrSurrogate class removeAllMethods: 1.
%

set compile_env: 0

! ------------------- Construction

category: 'Grail-Instantiation'
classmethod: PyStrSurrogate
___fromCodePoints___: aCollection
	"Build from a collection of Integer code points.  The emitted form of a
	surrogate-bearing literal (see ConstantAst >> printSmalltalkOn:) is a
	send of this, because such a literal cannot be written as Smalltalk
	source text.

	DEMOTES to an ordinary string when no code point is actually a
	surrogate, which establishes the invariant the rest of the class rests
	on: a PyStrSurrogate always contains at least one surrogate.  That is
	what makes ``__eq__'' against a CharacterCollection correctly always
	false, and it is not a micro-optimisation -- without it ``t[0]'' on
	``a\\udc80b'' answered a PyStrSurrogate holding just ``a'', which then
	compared UNEQUAL to ``'a''': a silently wrong answer, and exactly the
	hazard a second representation invites.  Indexing, iterating and
	concatenating out of the surrogate all return ordinary strings."

	| inst hasSurrogate str |
	hasSurrogate := aCollection anySatisfy: [:cp |
		cp >= 16rD800 and: [cp <= 16rDFFF]].
	hasSurrogate ifFalse: [
		str := Unicode7 new.
		aCollection do: [:cp | str addCodePoint: cp].
		^ str].
	inst := self basicNew.
	inst ___setCodePoints___: (OrderedCollection withAll: aCollection).
	^ inst
%

category: 'Grail-Instantiation'
classmethod: PyStrSurrogate
___onPrefix___: aCharacterCollection
	"Promote a partially-scanned literal.  PythonTokenizer accumulates into
	a Unicode7 and switches to this class the moment a \\u / \\U escape names
	a surrogate; the characters already scanned come across as code points."

	| inst cps |
	cps := OrderedCollection new.
	aCharacterCollection do: [:c | cps add: c codePoint].
	inst := self basicNew.
	inst ___setCodePoints___: cps.
	^ inst
%

category: 'Grail-Accessors'
method: PyStrSurrogate
___setCodePoints___: anOrderedCollection

	codePoints := anOrderedCollection
%

category: 'Grail-Accessors'
method: PyStrSurrogate
___codePoints___
	"The Integer code points, one per Python character."

	^ codePoints
%

! ------------------- Tokenizer accumulator protocol
!
! PythonTokenizer >> tokenizeString sends add: / addCodePoint: / lf to
! whatever it is accumulating into.  Answering the same three selectors is
! what lets it swap this object in mid-literal without any other change.

category: 'Grail-Tokenizer'
method: PyStrSurrogate
add: aCharacter

	codePoints add: aCharacter codePoint.
	^ aCharacter
%

category: 'Grail-Tokenizer'
method: PyStrSurrogate
addCodePoint: anInteger

	codePoints add: anInteger.
	^ anInteger
%

category: 'Grail-Tokenizer'
method: PyStrSurrogate
lf

	codePoints add: 10.
	^ self
%

category: 'Grail-Tokenizer'
method: PyStrSurrogate
size

	^ codePoints size
%

! ------------------- Smalltalk identity
!
! A surrogate-bearing string is NEVER equal to a CharacterCollection: no
! CharacterCollection can contain a surrogate, so the code-point sequences
! cannot match.  That makes cross-representation equality trivially false
! and removes the usual two-representation hazard -- there is no pair of
! objects that ought to be equal across the split.

category: 'Grail-Comparison'
method: PyStrSurrogate
= other

	(other isKindOf: PyStrSurrogate) ifFalse: [^ false].
	^ codePoints = other ___codePoints___
%

category: 'Grail-Comparison'
method: PyStrSurrogate
hash

	^ codePoints hash
%

category: 'Grail-Printing'
method: PyStrSurrogate
printOn: aStream
	"Smalltalk printString answers the PYTHON repr, so a surrogate string
	appearing in a scoreboard detail or a debugger reads the way the test
	that produced it wrote it."

	aStream nextPutAll: self ___pyRepr___
%

! ------------------- repr

category: 'Grail-Printing'
method: PyStrSurrogate
___pyRepr___
	"CPython's repr: printable characters verbatim, a surrogate as \\udXXX.
	``repr(''a\\udc80b'')'' is ``''a\\udc80b'''' -- lower-case hex, four digits."

	| ws |
	ws := WriteStream on: Unicode7 new.
	ws nextPut: $'.
	codePoints do: [:cp |
		(self ___isSurrogate___: cp)
			ifTrue: [
				ws nextPutAll: '\u'.
				ws nextPutAll: (self ___hex4___: cp)]
			ifFalse: [
				cp = 39 ifTrue: [ws nextPutAll: '\''']
				ifFalse: [cp = 92 ifTrue: [ws nextPutAll: '\\']
				ifFalse: [ws nextPut: (Character codePoint: cp)]]]].
	ws nextPut: $'.
	^ ws contents
%

category: 'Grail-Printing'
method: PyStrSurrogate
___hex4___: anInteger
	"Four lower-case hex digits, zero padded."

	| ws s |
	ws := WriteStream on: Unicode7 new.
	anInteger printOn: ws base: 16.
	"printOn:base: emits a ``16r'' radix prefix -- strip it."
	s := ws contents copyFrom: 4 to: ws contents size.
	s := s asLowercase.
	[s size < 4] whileTrue: [s := '0' , s].
	^ s
%

category: 'Grail-Testing'
method: PyStrSurrogate
___isSurrogate___: aCodePoint

	^ aCodePoint >= 16rD800 and: [aCodePoint <= 16rDFFF]
%

! ------------------- Refuse to pretend to be a plain string

category: 'Grail-Accessors'
method: PyStrSurrogate
___strValue___
	"AbstractPyStr delegates the whole str surface through here.  This class
	cannot: the value it holds is precisely the thing no CharacterCollection
	can represent.  Raising keeps an unimplemented operation LOUD -- the
	inherited version would answer an empty Unicode7 for a nil #value slot
	and every delegated method would then quietly compute on ''''."

	^ self ___unsupported___: 'coerced to a Smalltalk string'
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
doesNotUnderstand: aSelector args: anArray envId: envId
	"AbstractPyStr forwards unknown env-1 messages to its wrapped Unicode7.
	There is none here, so forwarding would compute against an empty string
	and answer a confident wrong result.  Raise instead: the str surface
	this class implements is deliberately partial, and what it does not
	implement must say so."

	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId].
	^ self ___unsupported___: aSelector asString
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
___unsupported___: what

	^ NotImplementedError ___signal___:
		'str containing lone surrogates does not support ' , what asString
			, ' in Grail (GemStone Characters cannot hold code points D800-DFFF)'
%

set compile_env: 1

! ------------------- Python str protocol
!
! Implemented rather than delegated.  Deliberately partial: what the five
! blocked modules actually exercise, plus what any str must answer to be
! usable as a value at all (len / index / compare / hash / repr / iterate).

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__len__

	^ codePoints @env0:size
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
___isTruthy___

	^ codePoints @env0:size @env0:> 0
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__str__
	"CPython: ``str(s) is s'' for an exact str."

	^ self
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__repr__

	^ self @env0:___pyRepr___
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__hash__

	^ codePoints @env0:hash
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__eq__: other
	"Never equal to a surrogate-free string -- no CharacterCollection can
	hold a surrogate, so the code-point sequences cannot match."

	(other @env0:isKindOf: PyStrSurrogate)
		ifTrue: [^ codePoints @env0:= (other @env0:___codePoints___)].
	^ false
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__ne__: other

	^ (self @env1:__eq__: other) @env0:not
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__getitem__: index
	"Integer index answers a one-character str: a PyStrSurrogate when that
	character IS a surrogate, an ordinary string otherwise -- the demotion
	happens in ___fromCodePoints___:, so ``t[0] == 'a''' is true."

	| n i |
	n := codePoints @env0:size.
	(index @env0:isKindOf: Integer) @env0:ifFalse: [
		^ self @env0:___unsupported___: 'slicing'].
	i := index @env0:< 0 ifTrue: [index @env0:+ n] ifFalse: [index].
	(i @env0:< 0 @env0:or: [i @env0:>= n]) ifTrue: [
		^ IndexError ___signal___: 'string index out of range'].
	^ PyStrSurrogate @env0:___fromCodePoints___:
		(Array @env0:with: (codePoints @env0:at: i @env0:+ 1))
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__iter__

	| items |
	items := OrderedCollection @env0:new.
	1 @env0:to: codePoints @env0:size do: [:i |
		items @env0:add: (PyStrSurrogate @env0:___fromCodePoints___:
			(Array @env0:with: (codePoints @env0:at: i)))].
	^ items @env1:__iter__
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__add__: other
	"Concatenation with either representation answers a PyStrSurrogate --
	the result still contains the surrogate, so it still cannot be a
	CharacterCollection."

	| cps |
	cps := OrderedCollection @env0:withAll: codePoints.
	(other @env0:isKindOf: PyStrSurrogate)
		ifTrue: [cps @env0:addAll: (other @env0:___codePoints___)]
		ifFalse: [
			(other @env0:isKindOf: CharacterCollection) @env0:ifFalse: [
				^ TypeError ___signal___:
					'can only concatenate str to str'].
			other @env0:do: [:c | cps @env0:add: c @env0:codePoint]].
	^ PyStrSurrogate @env0:___fromCodePoints___: cps
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__radd__: other
	"``'x' + surrogateStr'' -- CharacterCollection>>__add__: cannot build
	the result, so it defers here."

	| cps |
	cps := OrderedCollection @env0:new.
	(other @env0:isKindOf: CharacterCollection) @env0:ifFalse: [
		^ TypeError ___signal___: 'can only concatenate str to str'].
	other @env0:do: [:c | cps @env0:add: c @env0:codePoint].
	cps @env0:addAll: codePoints.
	^ PyStrSurrogate @env0:___fromCodePoints___: cps
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__contains__: other

	| sub n m |
	sub := (other @env0:isKindOf: PyStrSurrogate)
		ifTrue: [other @env0:___codePoints___]
		ifFalse: [ | c |
			c := OrderedCollection @env0:new.
			other @env0:do: [:ch | c @env0:add: ch @env0:codePoint].
			c].
	n := codePoints @env0:size. m := sub @env0:size.
	m @env0:= 0 ifTrue: [^ true].
	0 @env0:to: n @env0:- m do: [:off | | hit |
		hit := true.
		1 @env0:to: m do: [:k |
			(codePoints @env0:at: off @env0:+ k) @env0:= (sub @env0:at: k)
				ifFalse: [hit := false]].
		hit ifTrue: [^ true]].
	^ false
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
encode
	"Default utf-8 / strict -- always a UnicodeEncodeError here, because a
	lone surrogate is exactly what strict UTF-8 refuses.  CPython raises the
	same error for the same reason; this is one of the few places the two
	systems already agreed."

	^ self @env1:encode: 'utf-8' _: 'strict'
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
encode: encoding

	^ self @env1:encode: encoding _: 'strict'
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
encode: encoding _: errors
	"``surrogatepass'' emits the WTF-8 form (U+D800 -> ED A0 80), which is
	what CPython answers.  ``strict'' raises.  Other handlers are not
	implemented rather than approximated."

	(errors @env0:asString @env0:= 'surrogatepass') ifFalse: [
		^ UnicodeEncodeError ___signal___:
			(self @env0:___strictEncodeMessage___: encoding)].
	^ self @env0:___wtf8Bytes___
%

set compile_env: 0

category: 'Grail-Python Protocol'
method: PyStrSurrogate
___strictEncodeMessage___: encoding
	"CPython's wording for the strict-codec refusal."

	^ '''' , encoding asString ,
		''' codec can''t encode character in position 0: surrogates not allowed'
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
___wtf8Bytes___
	"The ``surrogatepass'' encoding: plain UTF-8, except that a surrogate is
	encoded in the three-byte form rather than refused (U+D800 -> ED A0 80).
	Same bytes CPython answers for encode('utf-8', 'surrogatepass')."

	| bytes |
	bytes := ByteArray new.
	codePoints do: [:cp |
		cp < 16r80
			ifTrue: [bytes add: cp]
			ifFalse: [cp < 16r800
				ifTrue: [
					bytes add: (16rC0 bitOr: (cp bitShift: -6)).
					bytes add: (16r80 bitOr: (cp bitAnd: 16r3F))]
				ifFalse: [cp < 16r10000
					ifTrue: [
						bytes add: (16rE0 bitOr: (cp bitShift: -12)).
						bytes add: (16r80 bitOr: ((cp bitShift: -6) bitAnd: 16r3F)).
						bytes add: (16r80 bitOr: (cp bitAnd: 16r3F))]
					ifFalse: [
						bytes add: (16rF0 bitOr: (cp bitShift: -18)).
						bytes add: (16r80 bitOr: ((cp bitShift: -12) bitAnd: 16r3F)).
						bytes add: (16r80 bitOr: ((cp bitShift: -6) bitAnd: 16r3F)).
						bytes add: (16r80 bitOr: (cp bitAnd: 16r3F))]]]].
	^ bytes
%

set compile_env: 0

