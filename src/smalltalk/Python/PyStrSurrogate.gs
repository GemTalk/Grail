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

category: 'Grail-Accessors'
method: PyStrSurrogate
___pyCodePoints___
	"See object >> ___pyCodePoints___.  A COPY: the shared accessor is read by
	scanning loops all over str.gs, and this class's own instances are the
	accumulator PythonTokenizer mutates mid-literal, so handing out the live
	OrderedCollection would let a caller alias a string that is still growing.
	These strings are short by construction, so the copy is not worth
	avoiding."

	^ codePoints asArray
%

category: 'Grail-Accessors'
method: PyStrSurrogate
___pyPlainStr___
	"nil -- and that IS the answer, not a failure.  A PyStrSurrogate always
	contains at least one surrogate (___fromCodePoints___ demotes when it does
	not), and no CharacterCollection can hold one.  See object >>
	___pyPlainStr___."

	^ nil
%

category: 'Grail-Testing'
method: PyStrSurrogate
___isExactPyStr___
	"True -- ``type('\ud800') is str''.  This class is not reachable as the
	allocation class of a user ``class X(str)'' (that is AbstractPyStr's job),
	so no instance can carry a user-written __eq__ / __lt__ / __radd__ and
	str's own binary dunders may settle against it directly.  See
	object >> ___isExactPyStr___."

	^ true
%

! ------------------- Shared code-point algorithms
!
! CLASS SIDE, and used against ordinary strings as much as against surrogate
! ones.  The three operations below are the ones str.gs needs in order to work
! ACROSS Grail's str representations -- compare, search, concatenate -- and
! they are written once here rather than nineteen times behind the guards in
! str.gs.  They take their operands through ___pyCodePoints___, so a receiver
! that is a Unicode7 and an argument that is a PyStrSurrogate meet on equal
! terms.  A nil answer means ``one of these is not a str'', which is what lets
! a caller punt to NotImplemented rather than invent a result.

category: 'Grail-Shared'
classmethod: PyStrSurrogate
___compare___: a with: b
	"Three-way lexicographic comparison of two Python str-likes by CODE POINT
	-- -1, 0 or 1 -- or nil when either operand is not a str.

	Code point order is Python's string order, and it is also the only order
	defined across the two representations: GemStone's ``<'' is an ICU
	collation under enableUnicodeComparisonMode (see
	CharacterCollection >> ___codePointCompare___), and it cannot see a
	PyStrSurrogate at all."

	| ca cb lim x y |
	ca := a ___pyCodePoints___.
	ca == nil ifTrue: [^ nil].
	cb := b ___pyCodePoints___.
	cb == nil ifTrue: [^ nil].
	lim := ca size min: cb size.
	1 to: lim do: [:i |
		x := ca at: i.
		y := cb at: i.
		x < y ifTrue: [^ -1].
		x > y ifTrue: [^ 1]].
	ca size < cb size ifTrue: [^ -1].
	ca size > cb size ifTrue: [^ 1].
	^ 0
%

category: 'Grail-Shared'
classmethod: PyStrSurrogate
___indexOf___: sub in: hay from: start
	"The 1-based index of the first occurrence of str-like ``sub'' in str-like
	``hay'' at or after 1-based ``start'', 0 when absent, or nil when either
	operand is not a str.  An empty needle matches at ``start''.

	Scans by code point for the same reason ___compare___ does, and because
	GemStone's includesString: / findString: are case-INSENSITIVE under
	enableUnicodeComparisonMode."

	| ca cb n m hit |
	ca := hay ___pyCodePoints___.
	ca == nil ifTrue: [^ nil].
	cb := sub ___pyCodePoints___.
	cb == nil ifTrue: [^ nil].
	n := ca size.
	m := cb size.
	m = 0 ifTrue: [^ start min: n + 1].
	start to: n - m + 1 do: [:i |
		hit := true.
		1 to: m do: [:k |
			((ca at: i + k - 1) = (cb at: k)) ifFalse: [hit := false]].
		hit ifTrue: [^ i]].
	^ 0
%

category: 'Grail-Shared'
classmethod: PyStrSurrogate
___concat___: a with: b
	"``a + b'' for two Python str-likes, or nil when either is not a str.

	Answers an ordinary string whenever the result has no surrogate in it --
	___fromCodePoints___ demotes -- so this is safe to reach for without first
	asking which representation the operands were."

	| ca cb |
	ca := a ___pyCodePoints___.
	ca == nil ifTrue: [^ nil].
	cb := b ___pyCodePoints___.
	cb == nil ifTrue: [^ nil].
	^ self ___fromCodePoints___: ca , cb
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
asString
	"Refuse, rather than answer GemStone's Object>>asString.

	``___strValue___'' already refuses, but only the DELEGATING paths consult
	it -- ``asString'' is understood by Object, so it never reached the
	doesNotUnderstand: hook and quietly answered the literal text
	'aPyStrSurrogate'.  ``'%s' % filename'' produced exactly that: not an
	error, an ANSWER, and a wrong one.  A partial surface has to fail loudly
	or it is worse than no surface at all."

	^ self ___strValue___
%

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

	"@env1: -- ___signal___: is a classmethod compiled in ENVIRONMENT 1, and
	this method is in the file's env-0 section, so a bare send answers a
	MessageNotUnderstood on the metaclass and the unsupported-operation
	report becomes an uncatchable Smalltalk error instead of a Python one."
	^ NotImplementedError @env1:___signal___:
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
__bool__
	"A str is truthy when it is non-empty.

	Spelled out rather than left to the doesNotUnderstand: refusal, which is
	how it used to be answered: bool()'s probe (Bool.gs) wraps the __bool__
	send in ``on: MessageNotUnderstood'', and the refusal happened to raise
	one -- because ___unsupported___ could not reach ___signal___: from env 0
	-- so ``bool(s)'' worked by accident, through the __len__ fallback.  Once
	the refusal raised the NotImplementedError it always meant to, the
	accident stopped: ``bool(s)'' escaped as an unsupported operation.  It is
	not unsupported; there was simply nothing here to say so."

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
__format__: formatSpec
	"An EMPTY format spec is str(self), which is self.  That is the whole of
	``'{}'.format(name)'', and it is what difflib's unified_diff does to build
	its ``--- <file>'' header out of a surrogateescape'd filename
	(test_difflib's TestBytes).

	A spec that actually asks for fill/align/width/precision would have to
	measure and slice the string through the shared format engine, which works
	in CharacterCollections; that is refused rather than approximated, like
	the rest of this deliberately partial surface."

	(formatSpec @env0:isNil or: [formatSpec @env0:isEmpty]) ifTrue: [^ self].
	^ self @env0:___unsupported___: '__format__ with a non-empty spec'
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
	"Equal exactly when the CODE POINTS match, which routes through the shared
	comparison so the answer does not depend on which representation the other
	operand happens to use.  In practice a surrogate-free string is never
	equal -- no CharacterCollection can hold a surrogate -- but that is a
	consequence of comparing code points, not a separate rule to maintain.

	A non-str answers False rather than NotImplemented, as CPython's
	str.__eq__ effectively does once the reflected operand has had its turn:
	the operand reaches here only through the generic comparison helpers,
	which have already tried it."

	| c |
	c := PyStrSurrogate @env0:___compare___: self with: other.
	c @env0:== nil ifTrue: [^ false].
	^ c @env0:= 0
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__lt__: other
	"Ordering against any str, in CODE POINT order -- Python's string order.

	Without these four, ``sorted(['a', '\ud800'])'' died: str's __lt__ punted
	to the reflected __gt__ here, this class had none, and doesNotUnderstand:
	raised the unsupported-operation NotImplementedError.  A str that cannot
	be SORTED is not usable as a str, and PEP 383 filenames are sorted all the
	time."

	^ self @env0:___orderAgainst___: other op: '<' code: 1
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__le__: other

	^ self @env0:___orderAgainst___: other op: '<=' code: 2
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__gt__: other

	^ self @env0:___orderAgainst___: other op: '>' code: 3
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__ge__: other

	^ self @env0:___orderAgainst___: other op: '>=' code: 4
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
startswith: prefix
	"str.startswith, including CPython's tuple-of-prefixes form.

	A prefix that is itself surrogate-free is a perfectly ordinary question to
	ask of a surrogate string -- ``name.startswith('/tmp')'' on a
	surrogateescape'd path -- and it used to raise, because the whole str
	surface below the implemented handful fell to the DNU refusal."

	| c |
	(prefix @env0:isKindOf: tuple) ifTrue: [
		1 @env0:to: (prefix @env0:size) do: [:ti |
			(self @env1:startswith: (prefix @env0:at: ti)) ifTrue: [^ true]].
		^ false].
	prefix @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___:
			'startswith first arg must be str or a tuple of str'].
	c := PyStrSurrogate @env0:___indexOf___: prefix in: self from: 1.
	^ c @env0:= 1
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
endswith: suffix
	"str.endswith, including the tuple form -- see startswith:."

	| cps sub n m ok |
	(suffix @env0:isKindOf: tuple) ifTrue: [
		1 @env0:to: (suffix @env0:size) do: [:ti |
			(self @env1:endswith: (suffix @env0:at: ti)) ifTrue: [^ true]].
		^ false].
	suffix @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___:
			'endswith first arg must be str or a tuple of str'].
	cps := self @env0:___pyCodePoints___.
	sub := suffix @env0:___pyCodePoints___.
	n := cps @env0:size.
	m := sub @env0:size.
	m @env0:> n ifTrue: [^ false].
	ok := true.
	1 @env0:to: m do: [:k |
		((cps @env0:at: n @env0:- m @env0:+ k) @env0:= (sub @env0:at: k))
			ifFalse: [ok := false]].
	^ ok
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
__mul__: count
	"``s * n'' -- repetition, which is a pure sequence operation and needs no
	Character at all.  A count of zero or less is the empty string, and
	___fromCodePoints___ demotes that to an ordinary '' as it demotes any
	surrogate-free result."

	| cps n |
	(count @env0:isKindOf: Integer) @env0:ifFalse: [
		^ TypeError ___signal___:
			'can''t multiply sequence by non-int of type ''str'''].
	n := count.
	cps := OrderedCollection @env0:new.
	1 @env0:to: n do: [:i | cps @env0:addAll: codePoints].
	^ PyStrSurrogate @env0:___fromCodePoints___: cps
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
__rmul__: count
	"``n * s'' -- Integer>>__mul__: defers here for a non-numeric operand."

	^ self @env1:__mul__: count
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
	"``other in self'' -- through the shared code-point search, so either
	representation may be the needle."

	| c |
	other @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___:
			'''in <string>'' requires string as left operand'].
	c := PyStrSurrogate @env0:___indexOf___: other in: self from: 1.
	^ c @env0:> 0
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
	what CPython answers.  ``surrogateescape'' undoes PEP 383's byte
	smuggling.  ``strict'' raises.  Other handlers are not implemented rather
	than approximated."

	| e |
	e := errors @env0:asString.
	(e @env0:= 'surrogatepass') ifTrue: [^ self @env0:___wtf8Bytes___].
	(e @env0:= 'surrogateescape') ifTrue: [
		^ self @env0:___surrogateEscapeBytes___: encoding].
	^ UnicodeEncodeError ___signal___:
		(self @env0:___strictEncodeMessage___: encoding)
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
___surrogateEscapeBytes___: encoding
	"The inverse of bytes>>___decodeSurrogateEscape___: -- PEP 383's
	``surrogateescape''.  A code point in U+DC80..U+DCFF is a SMUGGLED BYTE
	and goes back out as that byte; everything else is encoded normally, and
	anything the codec cannot represent is a UnicodeEncodeError.

	Only the DC80..DCFF window escapes.  A surrogate outside it never came
	from a byte -- it was written as a literal -- and CPython refuses it here
	too, which is what keeps the round trip honest rather than merely
	total."

	| enc out max |
	enc := encoding asString asLowercase.
	max := ((enc = 'ascii') or: [enc = 'us-ascii'])
		ifTrue: [127]
		ifFalse: [
			((enc = 'latin-1') or: [(enc = 'latin1') or: [enc = 'iso-8859-1']])
				ifTrue: [255]
				ifFalse: [
					((enc = 'utf-8') or: [enc = 'utf8'])
						ifTrue: [nil]
						ifFalse: [^ LookupError @env1:___signal___:
							('unknown encoding: ' , encoding asString)]]].
	out := ByteArray new.
	codePoints do: [:cp |
		(cp >= 16rDC80 and: [cp <= 16rDCFF])
			ifTrue: [out add: cp - 16rDC00]
			ifFalse: [
				(self ___isSurrogate___: cp)
					ifTrue: [^ UnicodeEncodeError @env1:___signal___:
						(self ___strictEncodeMessage___: encoding)]
					ifFalse: [
						max == nil
							ifTrue: [self ___appendUTF8___: cp to: out]
							ifFalse: [
								cp > max
									ifTrue: [^ UnicodeEncodeError @env1:___signal___:
										('''' , enc , ''' codec can''t encode character')]
									ifFalse: [out add: cp]]]]].
	^ out
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
___appendUTF8___: cp to: aByteArray
	"One code point as UTF-8 bytes.  Split out of ___wtf8Bytes___ so the
	surrogateescape encoder shares the multi-byte arithmetic instead of
	restating it."

	cp < 16r80 ifTrue: [^ aByteArray add: cp].
	cp < 16r800 ifTrue: [
		aByteArray add: (16rC0 bitOr: (cp bitShift: -6)).
		^ aByteArray add: (16r80 bitOr: (cp bitAnd: 16r3F))].
	cp < 16r10000 ifTrue: [
		aByteArray add: (16rE0 bitOr: (cp bitShift: -12)).
		aByteArray add: (16r80 bitOr: ((cp bitShift: -6) bitAnd: 16r3F)).
		^ aByteArray add: (16r80 bitOr: (cp bitAnd: 16r3F))].
	aByteArray add: (16rF0 bitOr: (cp bitShift: -18)).
	aByteArray add: (16r80 bitOr: ((cp bitShift: -12) bitAnd: 16r3F)).
	aByteArray add: (16r80 bitOr: ((cp bitShift: -6) bitAnd: 16r3F)).
	^ aByteArray add: (16r80 bitOr: (cp bitAnd: 16r3F))
%

category: 'Grail-Comparison'
method: PyStrSurrogate
___orderAgainst___: other op: opName code: which
	"The body of __lt__ / __le__ / __gt__ / __ge__: compare by code point and
	test the three-way result.  ``which'' is 1..4 for < <= > >=.

	One method rather than four bodies because the only thing that differs is
	the final test, and because the TypeError wording for a non-str operand
	has to be identical across all four."

	| c |
	c := PyStrSurrogate ___compare___: self with: other.
	c == nil ifTrue: [
		^ TypeError @env1:___signal___:
			'''' , opName , ''' not supported between instances of ''str'' and '''
				, (other class name asString) , ''''].
	which = 1 ifTrue: [^ c < 0].
	which = 2 ifTrue: [^ c <= 0].
	which = 3 ifTrue: [^ c > 0].
	^ c >= 0
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
___wtf8Bytes___
	"The ``surrogatepass'' encoding: plain UTF-8, except that a surrogate is
	encoded in the three-byte form rather than refused (U+D800 -> ED A0 80).
	Same bytes CPython answers for encode('utf-8', 'surrogatepass')."

	| out |
	out := ByteArray new.
	codePoints do: [:cp | self ___appendUTF8___: cp to: out].
	^ out
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
encodeAsUTF8
	"WTF-8, because there is no other answer a lone surrogate can give.

	The C shim's get_ucs4_for_string fetches a string's content by sending
	this selector -- GemStone's own encoder, used because raw GciFetchBytes_
	bytes are only UTF-8-shaped for 7-bit content.  With no implementation
	here the env-0 send hit Object's doesNotUnderstand: (this class's own
	hook forwards only env 1), so a surrogate str could not cross into C at
	all.

	Strict UTF-8 cannot encode D800..DFFF, so answering the three-byte form
	is the only representation that survives the round trip -- and it is not
	an invention: it is exactly what CPython's own encode('utf-8',
	'surrogatepass') answers, and what ___pyStrEncode___ already hands back
	for that error handler.  The shim's utf8_to_ucs4 decodes the three-byte
	form arithmetically, without a surrogate check, so it reads back as the
	same code point.

	No existing Smalltalk sender reaches this: str.gs's encode path is on
	CharacterCollection, and this class implements its own encode."

	^ self ___wtf8Bytes___
%

category: 'Grail-Python Protocol'
method: PyStrSurrogate
copyFrom: startIndex to: stopIndex
	"Smalltalk slice semantics: 1-based, stop INCLUSIVE.

	Sent in environment 0 by CPythonShim >> PyUnicode_Substring:from:to:,
	which is how _sre hands a matched span back -- so without this, a
	surrogate SUBJECT could be matched against but the match could not be
	read: ``re.findall('[a-z]', 'a\\ud800b')'' died on an env-0 DNU (this
	class's own doesNotUnderstand: hook forwards env 1 only).

	Code points are the one view that slices cleanly here, and
	___fromCodePoints___: applies the class invariant for free: a span with
	no surrogate left in it comes back as an ordinary Unicode7, so slicing
	OUT of a surrogate string narrows exactly as indexing already does."

	^ PyStrSurrogate ___fromCodePoints___:
		(codePoints copyFrom: startIndex to: stopIndex)
%

set compile_env: 0

