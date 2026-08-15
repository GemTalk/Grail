! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- complex class (Python 'complex' type)
expectvalue /Class
doit
object subclass: 'complex'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
complex comment:
'Python complex number type.

Represents complex numbers with real and imaginary parts.
Both parts are stored as Float values internally via dynamic
instance variables (#real, #imag), so ``cpx.real'' from Python
returns the float value directly through ___pyAttrLoad___''s
dynamic-instVar probe (not a BoundMethod), and ``del cpx.real''
truly removes the binding.
'
%

expectvalue /Class
doit
complex category: 'Grail-Numbers'
%

! ===============================================================================
! Python complex Type - Method Implementations
! ===============================================================================
! This file contains method implementations for the Python complex type.
! Complex numbers have a real and imaginary part, both stored as floats.
! ===============================================================================

! ------------------- Remove existing Python methods from complex
expectvalue /Metaclass3
doit
complex removeAllMethods: 1.
complex class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Arithmetic Operators'
method: complex
* aNumber
	"Multiply complex by aNumber."

	^ self @env1:__mul__: aNumber
%

category: 'Grail-Arithmetic Operators'
method: complex
+ aNumber
	"Add aNumber to complex."

	^ self @env1:__add__: aNumber
%

category: 'Grail-Arithmetic Operators'
method: complex
- aNumber
	"Subtract aNumber from complex."

	^ self @env1:__sub__: aNumber
%

category: 'Grail-Arithmetic Operators'
method: complex
/ aNumber
	"Divide complex by aNumber."

	^ self @env1:__truediv__: aNumber
%

category: 'Grail-Arithmetic Operators'
method: complex
= anObject
	"Equality comparison."

	^ self @env1:__eq__: anObject
%

category: 'Grail-Arithmetic Operators'
method: complex
hash
	"Smalltalk hash, paired with ``=`` above.

	Overriding ``=`` without overriding ``hash`` breaks the collection
	invariant ``a = b implies a hash = b hash'': complex inherited Object's
	IDENTITY hash, so two separately-computed equal complex values hashed
	differently and dict -- backed by a GemStone KeyValueDictionary, which
	buckets on this selector -- could not find a key it already held.
	``d[3j] = 'a'; d[3j]'' raised, and ``{0j: 1j} == {0j: 1j}'' was False.
	It showed up as an intermittent failure in test.test_richcmp's
	DictTest.test_dicts, whose dicts are keyed by ``random.randrange(100)*1j''
	-- so whether it fired at all depended on the random draw.

	A ZERO imaginary part must answer the real part's OWN hash, unmasked,
	because __eq__ says ``complex(5) == 5'': an equal Number key has to land
	in the same bucket, and GemStone already agrees across numeric types
	(``5 hash = 5.0 hash'').  Only the genuinely-complex case is folded, where
	no cross-type equality can apply."

	| im |
	im := self @env0:dynamicInstVarAt: #imag.
	(im @env0:= 0) ifTrue: [^ (self @env0:dynamicInstVarAt: #real) @env0:hash].
	^ (((self @env0:dynamicInstVarAt: #real) @env0:hash)
		@env0:bitXor: (im @env0:hash) @env0:* 1000003) @env0:bitAnd: 16r3FFFFFFF
%

category: 'Grail-Arithmetic Support'
method: complex
_coerce: aNumber
	"Coerce aNumber to complex.
	Convert aNumber to a complex number with zero imaginary part.

	An operand that is ALREADY complex is answered unchanged rather than put
	through the two-argument constructor: that is now Python's component form,
	which DeprecationWarns when handed a complex, and this is GemStone's
	internal generality coercion -- no Python call site, nothing to deprecate."

	^ (aNumber isKindOf: complex)
		ifTrue: [aNumber]
		ifFalse: [complex @env1:__new__: aNumber _: 0.0]
%

category: 'Grail-Arithmetic Support'
method: complex
_generality
	"Return generality for complex in numeric hierarchy.
	complex has the HIGHEST generality (90) so other types get coerced to complex.
	Hierarchy: bool(10) < SmallInt(20) < LargeInt(40) < Fraction(70) < Float(85) < complex(90)."

	^ 90
%

category: 'Grail-Arithmetic Operators'
method: complex
abs
	"Return the magnitude of the complex number."

	^ self @env1:__abs__
%

category: 'Grail-Arithmetic Support'
method: complex
isNumber
	"Return true - complex participates in arithmetic as a number."

	^ true
%

category: 'Grail-Arithmetic Operators'
method: complex
negated
	"Negate the complex number."

	^ self @env1:__neg__
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: complex
_new: positional kw: kwargs
	"complex(...) reached through the generic class-call with KEYWORDS or with
	NO argument -- ``complex()'', ``complex(real=4.25)'', ``complex(4.25,
	imag=1.5)''.  Purely positional calls arrive at __new__: / __new__:_:
	directly, by arity.

	Neither shape worked before.  The keyword forms died as an uncatchable
	Smalltalk MessageNotUnderstood (#_new:kw: on the metaclass), and
	``complex()'' fell through to object's allocator with NO real/imag binding
	written at all -- so ``complex().real'' answered the BOUND METHOD ``real''
	rather than 0.0, which is the ``must be real number, not BoundMethod''
	that stopped test_constructor at its first line."

	| n hasKw r i |
	n := positional @env0:size.
	(n @env0:> 2) ifTrue: [
		TypeError ___signal___: ('complex expected at most 2 arguments, got '
			@env0:, n @env0:printString)].
	hasKw := kwargs @env0:notNil and: [kwargs @env0:notEmpty].
	hasKw ifTrue: [
		kwargs @env0:keysDo: [:k |
			| ks |
			ks := k @env0:asString.
			((ks @env0:= 'real') or: [ks @env0:= 'imag']) ifFalse: [
				TypeError ___signal___: ('complex() got an unexpected keyword argument '''
					@env0:, ks @env0:, '''')]]].
	"ONE positional argument and nothing else is CPython's CONVERSION form --
	complex.__doc__ splits the two: ``If a single number is given, convert it
	to a complex number.  If the 'real' or 'imag' arguments are given, create a
	complex number with the specified real and imaginary components.''  The
	difference is observable, so the call shape has to be carried through
	rather than normalised: complex(4.25+0j) is the conversion (and answers
	that very object), while complex(real=4.25+0j) names a component and
	DeprecationWarns for being handed a complex."
	((n @env0:= 1) and: [hasKw @env0:not]) ifTrue: [
		^ self __new__: (positional @env0:at: 1)].
	r := (n @env0:>= 1)
		ifTrue: [
			(hasKw and: [kwargs @env0:includesKey: 'real']) ifTrue: [
				TypeError ___signal___:
					'argument for complex() given by name (''real'') and position (1)'].
			positional @env0:at: 1]
		ifFalse: [hasKw ifTrue: [kwargs @env0:at: 'real' ifAbsent: [0]] ifFalse: [0]].
	i := (n @env0:>= 2)
		ifTrue: [
			(hasKw and: [kwargs @env0:includesKey: 'imag']) ifTrue: [
				TypeError ___signal___:
					'argument for complex() given by name (''imag'') and position (2)'].
			positional @env0:at: 2]
		ifFalse: [hasKw ifTrue: [kwargs @env0:at: 'imag' ifAbsent: [0]] ifFalse: [0]].
	^ self __new__: r _: i
%

category: 'Grail-Initialization'
classmethod: complex
__new__: r
	"complex(x) -- the CONVERSION form: a string is parsed, anything else is
	converted through __complex__, then __float__, then __index__.

	The isBehavior branch keeps the object.__new__(cls) protocol (copy/pickle)
	working; without it the call fell through to the inherited object.__new__:
	(whose argument is a CLASS) and sent #new to the number, so complex(10**23)
	died with 'LargeInteger does not understand #new' (test_fractions
	testBigComplexComparisons)."

	| c f |
	(r @env0:isBehavior) ifTrue: [^ r @env0:new].
	"Only an EXACT complex is answered unchanged.  A SUBCLASS instance used to
	take this branch too, so ``complex(ComplexSubclass(x, y))'' handed back the
	ComplexSubclass -- CPython narrows it (test_constructor_special_numbers
	asserts ``type(z) is complex'').  A subclass falls through to __complex__,
	which complex defines as exactly that narrowing conversion."
	((self @env0:== complex) and: [r @env0:class @env0:== complex]) ifTrue: [^ r].
	"A STRING is parsed, not coerced.  It used to fall through to
	__init__:_:'s ``asFloat'', which answers NaN for anything GemStone cannot
	read as a number -- so complex('(1-6j)') quietly became (nan+0j) and
	complex('') did too, instead of raising ValueError.  A repr round-trip,
	which is how most of test_complex checks itself, could not survive that."
	(r @env0:isKindOf: CharacterCollection) ifTrue: [
		^ self ___parseString___: r].
	(self ___hasDunder___: r named: #'__complex__') ifTrue: [
		c := self ___complexHookOn___: r.
		^ self ___fromParts___: (c @env1:real) _: (c @env1:imag)].
	f := self ___realValueOf___: r.
	f @env0:== nil ifTrue: [
		TypeError ___signal___: ('complex() argument must be a string or a number, not '
			@env0:, (bytes ___pyTypeNameOf___: r))].
	^ self ___fromParts___: f _: 0.0
%

category: 'Grail-Initialization'
classmethod: complex
__new__: r _: i
	"complex(real, imag) -- the COMPONENT form.  Each slot must be a REAL
	number; CPython still accepts a complex in either and combines the two as
	r + i*1j, but DeprecationWarns for it, so complex(0.0, 4.25j) is -4.25+0j.

	Grail sent #asFloat to the complex instead and died as a Smalltalk
	MessageNotUnderstood that no ``except'' could catch, which took
	test_constructor down before its first assertion."

	| rv iv cr ci |
	rv := r ifNil: [0] ifNotNil: [r].
	iv := i ifNil: [0] ifNotNil: [i].
	"``complex.__new__(cls, value)'' spelled out -- a subclass's own __new__
	calling up (test_constructor's complex1).  There the FIRST argument is the
	class and the second is the value, not (real, imag), so hand it to the
	conversion form with the subclass as the receiver.  Without this the class
	itself was read as the real part: ``argument 'real' must be a real number,
	not complex1 class''."
	(rv @env0:isBehavior) ifTrue: [^ rv __new__: iv].
	"Fast path for the internal callers, which pass two plain floats -- the
	component protocol below is only for what arrives from Python."
	((rv @env0:isKindOf: Float) and: [iv @env0:isKindOf: Float]) ifTrue: [
		^ self ___fromParts___: rv _: iv].
	cr := self ___componentOf___: rv named: 'real' viaComplexHook: true.
	ci := self ___componentOf___: iv named: 'imag' viaComplexHook: false.
	"If both slots really were real, cr's and ci's imaginary halves are zero
	and this is just (real, imag); the corrections only bite for the
	deprecated complex-valued slots."
	^ self ___fromParts___: ((cr @env0:at: 1) @env0:- (ci @env0:at: 2))
		_: ((ci @env0:at: 1) @env0:+ (cr @env0:at: 2))
%

category: 'Grail-Initialization'
classmethod: complex
___fromParts___: re _: im
	"A new instance of the RECEIVING class with the two parts stored.

	``self new'' rather than ``self __new__'', because complex's own __new__ is
	the zero-argument CONSTRUCTOR (it answers 0j) and would recurse."

	| instance |
	instance := self @env0:new.
	instance __init__: re _: im.
	^ instance
%

category: 'Grail-Initialization'
classmethod: complex
__new__
	"complex() with no arguments at all, which CPython defines as 0j.

	Grail inherited object's allocator here, which writes NO real/imag binding,
	so ``complex().real'' answered the BOUND METHOD ``real'' -- the ``must be
	real number, not BoundMethod'' that stopped test_constructor at its first
	line.  The zero-argument call does not reach _new:kw: (the generic
	class-call dispatches it straight to this selector), so it has to be
	fixed here."

	^ self ___fromParts___: 0.0 _: 0.0
%

category: 'Grail-Initialization'
classmethod: complex
___hasDunder___: v named: aSymbol
	"True when v's class defines aSymbol as a compiled env-1 method."

	^ (v @env0:class @env0:whichClassIncludesSelector: aSymbol environmentId: 1) @env0:notNil
%

category: 'Grail-Initialization'
classmethod: complex
___warnDeprecated___: aString
	"Issue a DeprecationWarning, by the same route float's __float__ check
	uses -- and silently skip it when the warnings module is not importable,
	because a warning must never be the reason a conversion fails."

	| warningsMod |
	warningsMod := (importlib @env1:modules) @env0:at: #warnings ifAbsent: [nil].
	warningsMod ifNotNil: [warningsMod warn: aString _: DeprecationWarning]
%

category: 'Grail-Initialization'
classmethod: complex
___complexHookOn___: v
	"v.__complex__(), validated as CPython validates it: an exact complex is
	used as is, a strict SUBCLASS is used but deprecated, anything else is a
	TypeError.  An exception raised INSIDE __complex__ propagates untouched
	(test_constructor's evilcomplex)."

	| c |
	c := v __complex__.
	(c @env0:class @env0:== complex) ifTrue: [^ c].
	(c isKindOf: complex) ifTrue: [
		self ___warnDeprecated___: ('__complex__ returned non-complex (type '
			@env0:, (bytes ___pyTypeNameOf___: c)
			@env0:, ').  The ability to return an instance of a strict subclass of '
			@env0:, 'complex is deprecated, and may be removed in a future version '
			@env0:, 'of Python.').
		^ c].
	TypeError ___signal___: ('__complex__ returned non-complex (type '
		@env0:, (bytes ___pyTypeNameOf___: c) @env0:, ')')
%

category: 'Grail-Initialization'
classmethod: complex
___realValueOf___: v
	"v as a float through Python's REAL-number protocol -- __float__, then
	__index__, then a Smalltalk-native number -- or nil when v is none of
	those and the caller must raise.

	Deliberately narrower than float(): a str is NOT accepted, because
	complex('1', 0) is a TypeError about the 'real' argument, not a parse."

	| ix |
	"The varargs spelling first, mirroring float's own probe: a vendored
	Fraction-shaped ``def __float__(self)'' compiles to ___float__:kw:."
	(self ___hasDunder___: v named: #'___float__:kw:') ifTrue: [
		^ float @env1:___coerceFloatResult___: (v ___float__: { } kw: nil) from: '__float__'].
	(self ___hasDunder___: v named: #'__float__') ifTrue: [
		^ float @env1:___coerceFloatResult___: v __float__ from: '__float__'].
	(v @env0:isKindOf: Integer) ifTrue: [
		^ float @env1:___intToFloatChecked___: v].
	(self ___hasDunder___: v named: #'__index__') ifTrue: [
		ix := v __index__.
		(ix @env0:isKindOf: Integer) ifFalse: [
			TypeError ___signal___: ('__index__ returned non-int (type '
				@env0:, (bytes ___pyTypeNameOf___: ix) @env0:, ')')].
		^ float @env1:___intToFloatChecked___: ix].
	(v @env0:isKindOf: Boolean) ifTrue: [^ v ifTrue: [1.0] ifFalse: [0.0]].
	(v @env0:isKindOf: Number) ifTrue: [^ v @env0:asFloat].
	^ nil
%

category: 'Grail-Initialization'
classmethod: complex
___componentOf___: v named: aName viaComplexHook: hookAllowed
	"One real/imag component of the COMPONENT form, as the pair (real, imag).

	A real number contributes (x, 0.0).  A complex contributes both its parts
	and DeprecationWarns -- CPython still combines them, it just no longer
	wants you to.  __complex__ is consulted for the 'real' slot only, which is
	why complex(0, WithComplex(4.25+0j)) is a TypeError while
	complex(WithComplex(4.25+0j), 0) merely warns."

	| f c |
	(v isKindOf: complex) ifTrue: [
		self ___deprecateComplexArg___: aName type: v.
		^ Array @env0:with: (v @env1:real) with: (v @env1:imag)].
	(hookAllowed and: [self ___hasDunder___: v named: #'__complex__']) ifTrue: [
		c := self ___complexHookOn___: v.
		self ___deprecateComplexArg___: aName type: v.
		^ Array @env0:with: (c @env1:real) with: (c @env1:imag)].
	f := self ___realValueOf___: v.
	f @env0:== nil ifTrue: [
		TypeError ___signal___: ('complex() argument ''' @env0:, aName
			@env0:, ''' must be a real number, not '
			@env0:, (bytes ___pyTypeNameOf___: v))].
	^ Array @env0:with: f with: 0.0
%

category: 'Grail-Initialization'
classmethod: complex
___deprecateComplexArg___: aName type: v
	"The DeprecationWarning CPython 3.14 raises for a complex in a real/imag
	slot.  It names the ARGUMENT's type, not the converted complex's, so
	complex(WithComplex(4.25+0j), 0) says ``not WithComplex''."

	self ___warnDeprecated___: ('complex() argument ''' @env0:, aName
		@env0:, ''' must be a real number, not '
		@env0:, (bytes ___pyTypeNameOf___: v))
%

category: 'Grail-Type Conversion'
classmethod: complex
___malformed___
	"The single ValueError complex(str) raises, worded as CPython words it."

	^ ValueError ___signal___: 'complex() arg is a malformed string'
%

category: 'Grail-Type Conversion'
classmethod: complex
___scanComponentIn___: s from: start
	"Index just past the numeric component starting at ``start'', or start
	itself when there is none (a bare ``j'', or a sign followed by ``j'').

	Only DELIMITS the token -- float() does the actual conversion, so the
	underscore rules (PEP 515), the inf/infinity/nan spellings and gradual
	underflow all stay in one implementation instead of being re-derived
	here and drifting from it."

	| i n c |
	n := s @env0:size.
	i := start.
	"An exponent's sign is part of the token; a leading sign is handled by the
	caller, which needs it to tell ``1+2j'' from ``1e+2''."
	[i @env0:<= n] whileTrue: [
		c := s @env0:at: i.
		(c @env0:isDigit or: [c @env0:== $. or: [c @env0:== $_]])
			ifTrue: [i := i @env0:+ 1]
			ifFalse: [
				"e/E starts an exponent only when a digit or sign follows it;
				otherwise it is the leading letter of a word like ``e''."
				((c @env0:== $e or: [c @env0:== $E])
					@env0:and: [i @env0:< n])
					ifTrue: [
						| d |
						d := s @env0:at: i @env0:+ 1.
						((d @env0:isDigit) @env0:or: [d @env0:== $+ or: [d @env0:== $-]])
							ifTrue: [i := i @env0:+ 2]
							ifFalse: [^ i]]
					ifFalse: [^ i]]].
	^ i
%

category: 'Grail-Type Conversion'
classmethod: complex
___scanWordIn___: s from: start
	"Index just past an alphabetic inf/infinity/nan word at ``start'', or
	start when there is none.

	A trailing ``j'' is NOT part of the word: ``nanj'' is the imaginary unit
	suffix applied to nan, and ``infj'' likewise, so the run is given back a
	character when dropping it still leaves a word we recognise."

	| i n word |
	n := s @env0:size.
	i := start.
	[i @env0:<= n and: [(s @env0:at: i) @env0:isLetter]] whileTrue: [i := i @env0:+ 1].
	i @env0:= start ifTrue: [^ start].
	word := (s @env0:copyFrom: start to: i @env0:- 1) @env0:asLowercase.
	((word @env0:= 'inf') @env0:or: [(word @env0:= 'infinity') @env0:or: [word @env0:= 'nan']])
		ifTrue: [^ i].
	((word @env0:endsWith: 'j') @env0:and: [word @env0:size @env0:> 1]) ifTrue: [
		| head |
		head := word @env0:copyFrom: 1 to: word @env0:size @env0:- 1.
		((head @env0:= 'inf') @env0:or: [(head @env0:= 'infinity') @env0:or: [head @env0:= 'nan']])
			ifTrue: [^ i @env0:- 1]].
	^ start
%

category: 'Grail-Type Conversion'
classmethod: complex
___floatFrom___: s sign: signChar
	"float(s) with ``signChar'' applied, where an EMPTY s means 1.0 (the
	magnitude Python lets you omit before j: ``+j'' is 1j).

	The sign goes into the STRING float() reads rather than being applied by
	negating the result, because GemStone's #negated does not flip the sign bit
	of a NaN -- ``0.0/0.0 negated'' answers a POSITIVE NaN, so complex('-nan')
	came back with the wrong sign where float('-nan'), which reads the sign
	itself, gets it right (test_constructor_negative_nans_from_string asserts
	``copysign(1., complex('-nan').real) == -1.'').  The empty-magnitude case
	never reaches float(), so it applies the sign to a literal 1.0, where
	negation is exact."

	| src |
	s @env0:isEmpty ifTrue: [
		^ signChar @env0:== $- ifTrue: [1.0 @env0:negated] ifFalse: [1.0]].
	src := signChar @env0:== $- ifTrue: ['-' @env0:, s] ifFalse: [s].
	"float class>>__new__: is compiled in ENVIRONMENT 1, so this is an env-1
	send.  Catch ValueError ONLY -- restating it in complex()'s wording is the
	whole point, but an earlier version caught every Error, which turned a
	wrong-environment MessageNotUnderstood into ``malformed string'' and made
	every magnitude look unparseable."
	^ [float __new__: src]
		@env0:on: ValueError do: [:ex | self ___malformed___]
%

category: 'Grail-Type Conversion'
classmethod: complex
___isSpaceIn___: s at: i
	"True when s's i'th character is whitespace TO PYTHON.

	CPython's complex(str) skips Py_UNICODE_ISSPACE, a wider set than
	GemStone's Character>>isSeparator (the ASCII separators plus NBSP), so the
	EM SPACE in test_constructor_from_string's
	``complex('\N{EM SPACE}(\N{EN SPACE}1+1j ) ')'' stopped the scan and made
	the whole string malformed.  str already enumerates exactly CPython's set
	for str.isspace(), so ask it rather than restate it here and let the two
	drift."

	^ s ___isPySpaceCodePoint___: (s @env0:at: i) @env0:codePoint
%

category: 'Grail-Type Conversion'
classmethod: complex
___parseString___: aString
	"complex(str) -- CPython's grammar:

	    ws* [ '(' ws* ] <component> [ <signed-component> ] [ ws* ')' ] ws*

	where a component is an optional sign, an optional magnitude and an
	optional 'j'/'J'.  Anything left over, or a NUL anywhere, is a ValueError."

	| s i n gotBracket c sign1 start1 end1 mag1 isImag1 real imag sign2 start2 end2 |
	s := aString @env0:asString.
	"codePoint: -- GemStone's Character class has no #value:."
	(s @env0:includes: (Character @env0:codePoint: 0)) ifTrue: [^ self ___malformed___].
	n := s @env0:size.
	i := 1.
	[i @env0:<= n and: [self ___isSpaceIn___: s at: i]] whileTrue: [i := i @env0:+ 1].
	gotBracket := false.
	(i @env0:<= n and: [(s @env0:at: i) @env0:== $(]) ifTrue: [
		gotBracket := true.
		i := i @env0:+ 1.
		[i @env0:<= n and: [self ___isSpaceIn___: s at: i]] whileTrue: [i := i @env0:+ 1]].
	i @env0:> n ifTrue: [^ self ___malformed___].

	"--- first component ---"
	sign1 := $+.
	c := s @env0:at: i.
	(c @env0:== $+ or: [c @env0:== $-]) ifTrue: [sign1 := c. i := i @env0:+ 1].
	i @env0:> n ifTrue: [^ self ___malformed___].
	start1 := i.
	end1 := self ___scanComponentIn___: s from: i.
	end1 @env0:= start1 ifTrue: [end1 := self ___scanWordIn___: s from: i].
	mag1 := s @env0:copyFrom: start1 to: end1 @env0:- 1.
	i := end1.
	isImag1 := i @env0:<= n and: [(s @env0:at: i) @env0:== $j or: [(s @env0:at: i) @env0:== $J]].
	isImag1 ifTrue: [i := i @env0:+ 1]
		ifFalse: [
			"Only the imaginary part may omit its magnitude."
			mag1 @env0:isEmpty ifTrue: [^ self ___malformed___]].

	isImag1
		ifTrue: [ real := 0.0. imag := self ___floatFrom___: mag1 sign: sign1 ]
		ifFalse: [
			real := self ___floatFrom___: mag1 sign: sign1.
			imag := 0.0.
			"--- optional second component, which must be signed and imaginary ---"
			(i @env0:<= n and: [(s @env0:at: i) @env0:== $+ or: [(s @env0:at: i) @env0:== $-]]) ifTrue: [
				sign2 := s @env0:at: i.
				i := i @env0:+ 1.
				start2 := i.
				end2 := self ___scanComponentIn___: s from: i.
				end2 @env0:= start2 ifTrue: [end2 := self ___scanWordIn___: s from: i].
				i := end2.
				(i @env0:<= n and: [(s @env0:at: i) @env0:== $j or: [(s @env0:at: i) @env0:== $J]])
					ifFalse: [^ self ___malformed___].
				i := i @env0:+ 1.
				imag := self ___floatFrom___: (s @env0:copyFrom: start2 to: end2 @env0:- 1)
					sign: sign2]].

	"--- trailer ---"
	[i @env0:<= n and: [self ___isSpaceIn___: s at: i]] whileTrue: [i := i @env0:+ 1].
	gotBracket ifTrue: [
		(i @env0:<= n and: [(s @env0:at: i) @env0:== $)]) ifFalse: [^ self ___malformed___].
		i := i @env0:+ 1.
		[i @env0:<= n and: [self ___isSpaceIn___: s at: i]] whileTrue: [i := i @env0:+ 1]].
	i @env0:<= n ifTrue: [^ self ___malformed___].
	^ complex @env1:__new__: real _: imag
%

category: 'Grail-Type Conversion'
classmethod: complex
from_number: n
	"complex.from_number(x) -- x as a complex, accepting ONLY numbers.

	It used to be ``self __new__: n _: 0.0'', which assumed n was real: a
	complex argument (``complex.from_number(3.14j)'') reached __init__:_: and
	died sending #asFloat to a complex, as a Smalltalk MessageNotUnderstood
	that no ``except'' could catch.

	Narrower than complex(): from_number rejects what complex() accepts from a
	STRING, and rejects a type that only has __int__ (MyInt in test_complex),
	because it is documented as the number-only constructor.  Order follows
	CPython -- complex, then __complex__, then __float__, then __index__ --
	and the result is narrowed to the RECEIVING class, so
	``ComplexSubclass.from_number(...)'' answers a ComplexSubclass."

	| v |
	v := (n isKindOf: complex)
		ifTrue: [n]
		ifFalse: [
			((n @env0:class @env0:whichClassIncludesSelector: #'__complex__' environmentId: 1) @env0:notNil)
				ifTrue: [n __complex__]
				ifFalse: [
					((n @env0:class @env0:whichClassIncludesSelector: #'__float__' environmentId: 1) @env0:notNil)
						ifTrue: [complex @env1:__new__: (n __float__) _: 0.0]
						ifFalse: [
							((n @env0:class @env0:whichClassIncludesSelector: #'__index__' environmentId: 1) @env0:notNil)
								ifTrue: [complex @env1:__new__: (n __index__) _: 0.0]
								ifFalse: [
									"A Smalltalk-native number (SmallInteger, Float, Fraction)
									carries none of those dunders but is still a number."
									(n @env0:isKindOf: Number)
										ifTrue: [complex @env1:__new__: n _: 0.0]
										ifFalse: [
											TypeError ___signal___:
												('complex.from_number() argument must be a number, not '''
													@env0:, (bytes ___pyTypeNameOf___: n) @env0:, '''')]]]]].
	"CPython answers the SAME object for complex.from_number(c) when c is
	already exactly a complex -- test_from_number asserts the identity."
	((self @env0:== complex) @env0:and: [v @env0:class @env0:== complex])
		ifTrue: [^ v].
	^ self @env1:__new__: (v @env1:real) _: (v @env1:imag)
%

category: 'Grail-Arithmetic Support'
method: complex
___isInf___: aFloat
	"True when aFloat is an IEEE infinity of either sign."

	^ (aFloat @env0:_getKind) @env0:== 3
%

category: 'Grail-Arithmetic Support'
method: complex
___isFinite___: aFloat
	"True when aFloat is neither an infinity nor a NaN."

	^ ((aFloat @env0:_getKind) @env0:~= 3) and: [aFloat @env0:_isNaN @env0:not]
%

category: 'Grail-Arithmetic Support'
method: complex
___copySign___: aMagnitude from: aFloat
	"aMagnitude carrying aFloat's SIGN BIT.

	Reads the bit rather than comparing, because ``< 0'' is false for a NaN of
	either sign and for -0.0, and both of those are exactly the operands the
	C99 recovery rules in ___prod___: have to distinguish.  aMagnitude is
	always a caller-supplied 0.0 or 1.0, never a NaN, so #negated is exact
	here (it is NOT for a NaN -- see ___floatFrom___:sign:)."

	^ (aFloat @env0:signBit) @env0:== 1
		ifTrue: [aMagnitude @env0:abs @env0:negated]
		ifFalse: [aMagnitude @env0:abs]
%

category: 'Grail-Arithmetic Support'
method: complex
___realPartOf___: other
	"``other'' as a float for mixed complex/real arithmetic, or NIL when it is
	not a real number and the caller must fall back.

	Two things a bare ``other asFloat'' got wrong.  (1) GemStone coerces an
	integer too big for a double to an IEEE infinity, where CPython raises:
	``1j + 10**1000'' answered (inf+1j) instead of OverflowError (test_add,
	test_sub, test_mul).  float's own conversion already draws that line.
	(2) A NON-numeric operand reached #asFloat and died as a Smalltalk
	MessageNotUnderstood that no Python ``except'' could catch -- ``1j + None''
	took down the whole session rather than raising TypeError.  Answering nil
	lets the caller run ___binOpFallback___, which gives ``other'' its
	reflected dunder (so ``1j + Fraction(1,2)'' still works through
	Fraction.__radd__) and otherwise raises the TypeError CPython raises."

	(other @env0:isKindOf: Integer) ifTrue: [
		^ float @env1:___intToFloatChecked___: other].
	(other @env0:isKindOf: Boolean) ifTrue: [
		^ other ifTrue: [1.0] ifFalse: [0.0]].
	(other @env0:isKindOf: Number) ifTrue: [^ other @env0:asFloat].
	^ nil
%

category: 'Grail-Arithmetic'
method: complex
__abs__
	"|a+bi|, computed by scaling so that neither square can overflow on its
	own: hypot's |a|*sqrt(1+(b/a)^2) with |a| the larger part.

	The old sqrt(a*a + b*b) overflowed to infinity for perfectly representable
	inputs -- abs(complex(1e200, 1e200)) is 1.41e200, but a*a is already inf.

	C99 (and CPython) give a non-finite part priority over the arithmetic: an
	INFINITE part means infinity even when the other part is a NaN, and a NaN
	with no infinity means NaN.  A genuine overflow of the scaled result --
	abs(complex(DBL_MAX, DBL_MAX)) -- is an OverflowError, not an infinity
	(test_abs)."

	| a b r scaled |
	a := (self real) @env0:abs.
	b := (self imag) @env0:abs.
	(self ___isInf___: a) ifTrue: [^ a].
	(self ___isInf___: b) ifTrue: [^ b].
	(a @env0:_isNaN or: [b @env0:_isNaN]) ifTrue: [^ PlusQuietNaN].
	(a @env0:< b) ifTrue: [ | t | t := a. a := b. b := t].
	(a @env0:= 0.0) ifTrue: [^ 0.0].
	r := b @env0:/ a.
	scaled := a @env0:* ((1.0 @env0:+ (r @env0:* r)) @env0:sqrt).
	(self ___isInf___: scaled) ifTrue: [
		OverflowError ___signal___: 'absolute value too large'].
	^ scaled
%

category: 'Grail-Arithmetic'
method: complex
__add__: other
	"Add two complex numbers or complex and real."

	"A real operand leaves the OTHER component untouched, rather than being
	widened to complex(x, 0.0) and combined.  Widening is what destroys a
	signed zero: -0.0 + 0.0 is +0.0 in IEEE, so ``complex(-0.0, -0.0) +
	(-0.0)'' reported a +0.0 imaginary part where CPython keeps -0.0.

	``isKindOf:'' rather than ``class ==''  so a complex SUBCLASS takes the
	complex branch; under ``class =='' it fell to the real branch and sent
	#asFloat to a complex, a Smalltalk MessageNotUnderstood no ``except''
	could catch."

	| f |
	(other isKindOf: complex) ifTrue: [
		^ complex __new__: ((self real) @env0:+ (other @env1:real))
			_: ((self imag) @env0:+ (other @env1:imag))].
	f := self ___realPartOf___: other.
	f @env0:== nil ifTrue: [
		^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'].
	^ complex __new__: ((self real) @env0:+ f) _: (self imag)
%

category: 'Grail-Type Conversion'
method: complex
__bool__
	"Return True if complex number is non-zero, False otherwise."

	^ ((self real) @env0:~= 0.0)
		or: [(self imag) @env0:~= 0.0]
%

category: 'Grail-Type Conversion'
method: complex
__complex__
	"Return this value as an EXACT complex.

	Self only when self is exactly complex: CPython narrows a subclass here
	(``type(ComplexSubclass(3+4j).__complex__()) is complex''), the same rule
	__pos__ follows, and for the same reason -- the operation yields a complex
	VALUE, and nothing about the subclass survives it."

	^ self ___asExactComplex___
%

category: 'Grail-Type Conversion'
method: complex
___asExactComplex___
	"Self when self is exactly a complex, otherwise a plain complex with the
	same parts.  The one place the subclass-narrowing rule is written down;
	__complex__ and __pos__ both defer to it."

	^ (self @env0:class @env0:== complex)
		ifTrue: [self]
		ifFalse: [complex @env1:__new__: (self @env1:real) _: (self @env1:imag)]
%

category: 'Grail-Comparison'
method: complex
__eq__: other
	"Test equality with another complex number."
	
	| otherReal otherImag |
	(other isKindOf: complex) ifFalse: [
		"CPython: complex(5) == 5 is True -- a real number compares
		equal when the imaginary part is zero."
		((other isKindOf: Number) or: [other isKindOf: Boolean]) ifTrue: [
			"Compare EXACTLY (no asFloat): CPython's int-vs-float real
			comparison is exact, so 10**23 != complex(10**23) -- the
			float real is 1e23, a different integer."
			| o |
			o := (other isKindOf: Boolean)
				ifTrue: [other ifTrue: [1] ifFalse: [0]]
				ifFalse: [other].
			^ ((self imag) @env0:= 0) and: [(self real) @env0:= o]].
		"A non-numeric operand is NOT unequal: CPython's complex.__eq__
		answers NotImplemented so the REFLECTED __eq__ runs -- test_compare's
		``(2+0j) == Cmp(2.0)'' is True because Cmp.__eq__ compares 2.0 to it.
		___cmpEq___ -> ___eqValue___ still ends at identity/False when that
		operand has no __eq__ of its own."
		^ #'___NotImplemented___'].
	otherReal := other real.
	otherImag := other imag.
	^ ((self real) @env0:= otherReal) 
		and: [(self imag) @env0:= otherImag]
%

category: 'Grail-Hashing'
method: complex
__hash__
	"CPython's complex hash, exactly:

	    combined = hash(real) + sys.hash_info.imag * hash(imag)

	computed in unsigned 64-bit and reinterpreted as signed, with -1 mapped to
	-2 (CPython reserves -1 for the error return).  sys.hash_info.imag is
	1000003.  Verified against CPython 3.14 for 0j, 3j, complex(5,0),
	complex(1.5,2.5), complex(-2,3), -1j and complex(1e308,1e308).

	A zero imaginary part contributes nothing, so hash(complex(x, 0)) is
	hash(x) -- which is what makes hash(complex(5)) == hash(5) == hash(5.0)
	hold, matching __eq__.  Float>>__hash__ supplies the per-part values and is
	already CPython-compatible (mod 2**61-1).

	Distinct from the Smalltalk ``hash'' above, which is what dict's
	KeyValueDictionary backing store actually buckets on; this is what Python
	code sees from ``hash(z)''."

	| p m h |
	p := self real __hash__.
	m := self imag __hash__.
	h := p @env0:+ (1000003 @env0:* m).
	"Unsigned 64-bit wraparound, then back to signed -- CPython's Py_uhash_t
	arithmetic cast to Py_hash_t."
	h := h @env0:\\ 18446744073709551616.
	h @env0:>= 9223372036854775808 ifTrue: [
		h := h @env0:- 18446744073709551616].
	h @env0:= -1 ifTrue: [^ -2].
	^ h
%

category: 'Grail-String Representation'
method: complex
__format__: formatSpec
	"CPython's format_complex_internal.  Three cases, and the distinction the
	old stub (``^ self __repr__'') lost is the presentation TYPE:

	  * empty spec        -> str(self), parens and all;
	  * spec with NO type -> str(self) is the BODY, then fill/align/width apply,
	    so ``format(1+2j, '_>8')'' is ``__(1+2j)'' and ``format(0j, '_<4')'' is
	    ``0j__'' (str already drops the +0.0 real part);
	  * spec WITH a type  -> real and imaginary parts are formatted SEPARATELY
	    with that type and NO parens, the imaginary part always carrying a sign,
	    then ``j'' -- ``format(complex(1.2), '.3f')'' is ``1.200+0.000j''.

	The width applies to the WHOLE result, never to the parts, which is why the
	parts are formatted with the type/precision only and padding is applied once
	at the end."

	| b p type parts fill align width body |
	(formatSpec @env0:isNil or: [formatSpec @env0:isEmpty]) ifTrue: [^ self __str__].
	b := builtins instance.
	p := b ___parseFormatSpec___: formatSpec typeName: 'complex'.
	fill := p @env0:at: 1.
	align := p @env0:at: 2.
	width := p @env0:at: 5.
	type := p @env0:at: 8.
	"Two spec features CPython refuses OUTRIGHT for complex, because both
	assume a single signed number to pad around and a complex is a pair.
	Grail accepted them silently -- ``(1.5+0.5j).__format__('010f')'' answered
	an unpadded string and ``'=20''' right-aligned (test_format).  Zero padding
	is reported first because '0' also DEFAULTS the alignment to '=', so the
	other check would otherwise claim it."
	fill @env0:== $0 ifTrue: [
		ValueError ___signal___:
			'Zero padding is not allowed in complex format specifier'].
	align @env0:== $= ifTrue: [
		ValueError ___signal___:
			'''='' alignment flag is not allowed in complex format specifier'].
	type @env0:isNil
		ifTrue: [
			"No presentation type, but a PRECISION still applies: CPython's
			no-type case is format code 'r', which keeps str()'s layout and
			replaces repr's shortest-round-trip digits with that many
			SIGNIFICANT ones -- which is what 'g' does.  Grail dropped the
			precision on the floor, so ``format(1.123-3.123j, '^20.2')'' padded
			the full value instead of rounding it (test_format)."
			(p @env0:at: 7) @env0:isNil
				ifTrue: [body := self __str__ @env0:asString]
				ifFalse: [body := self ___formatStrShapedWith___: p]]
		ifFalse: [
			"Strip fill/align/width for the PART specs -- keep sign/#/grouping/
			precision/type.  The imaginary part is forced to carry its sign."
			parts := b ___formatComplexParts___: self parsed: p.
			body := parts].
	"Complex pads RIGHT-aligned by default, like every other numeric type:
	``format(1.5+3j, '20.2f')'' is '          1.50+3.00j'.  Defaulting to '<'
	(str's rule) put the padding on the wrong side (test_format)."
	align @env0:isNil ifTrue: [align := $>].
	^ (b ___formatPadBody___: body fill: fill align: align width: width signLength: 0)
		@env0:asUnicodeString
%

category: 'Grail-String Representation'
method: complex
___formatStrShapedWith___: p
	"str(self)'s SHAPE -- the bare ``3j'' for a positive-zero real part, the
	parenthesised ``(1.1-3.1j)'' otherwise -- with both parts rounded to the
	spec's precision.  Only reached for a spec that gives a precision and no
	presentation type; see __format__:."

	| b reSpec imSpec |
	b := builtins instance.
	"Fill/align/width are dropped (they describe the whole result and are
	applied once by the caller) and 'g' is supplied as the type."
	reSpec := { Character @env0:space. nil. (p @env0:at: 3). (p @env0:at: 4). 0.
		(p @env0:at: 6). (p @env0:at: 7). $g. (p @env0:at: 9).
		(p @env0:size @env0:>= 10 ifTrue: [p @env0:at: 10] ifFalse: [false]) }.
	"str() omits a POSITIVE-zero real part, and only that one: repr of
	complex(-0.0, 1) keeps it."
	(((self real) @env0:= 0.0) and: [(self real) @env0:signBit @env0:== 0]) ifTrue: [
		^ (b ___formatFloatValue___: (self imag) parsed: reSpec) @env0:asString
			@env0:, 'j'].
	"The imaginary part always shows its sign, as in repr."
	imSpec := reSpec @env0:copy.
	imSpec @env0:at: 3 put: $+.
	^ '(' @env0:, (b ___formatFloatValue___: (self real) parsed: reSpec) @env0:asString
		@env0:, (b ___formatFloatValue___: (self imag) parsed: imSpec) @env0:asString
		@env0:, 'j)'
%

category: 'Grail-Comparison'
method: complex
__ge__: other
	"Complex numbers cannot be ordered."

	^ self ___unorderable___
%

category: 'Grail-Serialization'
method: complex
__getnewargs__
	"Return arguments for pickling/unpickling."

	"A TUPLE, not a bare Array.  ``__getnewargs__'' is read by pickle and
	compared directly in test_getnewargs (``(1+2j).__getnewargs__() ==
	(1.0, 2.0)''), and a Grail Array reports as a Python list -- so the
	value was right and its type was wrong, which reads as a puzzling
	``[1.0, 2.0] != (1.0, 2.0)''."
	"@env0: -- tuple class>>withAll: is compiled in environment 0, and this
	method is in complex.gs's env-1 section, so a bare send looks it up in
	env 1 and answers a MessageNotUnderstood on the metaclass."
	^ tuple @env0:withAll: {self real. self imag}
%

category: 'Grail-Serialization'
method: complex
__getstate__
	"Return state for pickling. Complex numbers have no additional state."

	^ None
%

category: 'Grail-Comparison'
method: complex
__gt__: other
	"Complex numbers cannot be ordered."

	^ self ___unorderable___
%

category: 'Grail-Initialization'
method: complex
__init__: r _: i
	"Initialize a complex number with real and imaginary parts.
	Called after __new__ in Python, or directly from Smalltalk
	constructor.  Phase B+1: stores into dynamic instVars so
	``cpx.real'' / ``cpx.imag'' Python attribute reads find the
	values directly via the ___pyAttrLoad___ dynamic probe."

	"___realPartOf___: rather than a bare #asFloat so that an integer too big
	for a double raises CPython's OverflowError instead of coercing silently to
	an infinity (``complex(10**1000)'' answered (inf+0j)).  It answers nil for
	anything that is not a real number, and those keep the old #asFloat --
	__init__ is reached directly from Smalltalk with values the constructors
	have already vetted, so this is not the place to start rejecting them."

	self @env0:dynamicInstVarAt: #real put: (self ___floatPart___: r).
	self @env0:dynamicInstVarAt: #imag put: (self ___floatPart___: i).
	^ None
%

category: 'Grail-Arithmetic Support'
method: complex
___floatPart___: v
	"v as the float a real/imaginary slot stores -- see __init__:_:."

	| f |
	f := self ___realPartOf___: v.
	^ f @env0:== nil ifTrue: [v @env0:asFloat] ifFalse: [f]
%

category: 'Grail-Comparison'
method: complex
__le__: other
	"Complex numbers cannot be ordered."

	^ self ___unorderable___
%

category: 'Grail-Comparison'
method: complex
__lt__: other
	"Complex numbers cannot be ordered."

	^ self ___unorderable___
%

category: 'Grail-Comparison'
method: complex
___unorderable___
	"complex has no ordering, so every ordering dunder answers NotImplemented
	-- for EVERY operand, including another complex.

	Returning the sentinel rather than raising is what CPython does, and
	test_richcompare checks the difference directly: ``complex.__lt__(1+1j,
	None)'' and ``complex.__lt__(1+1j, 2+2j)'' must both BE NotImplemented,
	while ``operator.lt(1+1j, 2+2j)'' must raise TypeError.  Only the operator
	layer raises; a dunder called by name never does.

	The complex-vs-complex case used to raise here, on the reasoning that two
	complexes would otherwise ping-pong forward<->reflected forever.  They
	cannot: ___cmpFallback___ only retries a BUILT-IN reflected dunder when the
	operand ``isKindOf: Number'', and complex is an object subclass, not a
	GemStone Number -- so a complex operand goes straight to
	___cmpUnorderable___, which builds the same both-types message this used to
	build by hand.  With the raise gone there is nothing left to parameterise,
	so this takes no arguments."

	^ #'___NotImplemented___'
%

category: 'Grail-Arithmetic'
method: complex
__mul__: other
	"(a+bi)(c+di) = (ac-bd) + (ad+bc)i, with the two special cases CPython
	gives it.

	A REAL operand SCALES each component instead of being widened to
	complex(x, 0.0) and put through the full formula.  Widening turns an
	infinite part into a NaN via inf*0: ``complex(inf, 1) * 2'' has imaginary
	part 1*2 + inf*0 = nan under the formula, where CPython answers
	complex(inf, 2) (test_mul's first table).  Scaling also keeps a signed
	zero, the same reason __add__ does not widen.

	``isKindOf:'' rather than ``class =='', so a complex SUBCLASS takes the
	complex branch; under ``class =='' it fell to the real branch and sent
	#asFloat to a complex, a Smalltalk MessageNotUnderstood no ``except''
	could catch."

	| f |
	(other isKindOf: complex) ifTrue: [^ self ___prod___: other].
	f := self ___realPartOf___: other.
	f @env0:== nil ifTrue: [
		^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'].
	^ complex __new__: ((self real) @env0:* f) _: ((self imag) @env0:* f)
%

category: 'Grail-Arithmetic'
method: complex
___prod___: aComplex
	"complex * complex, with C99 Annex G's infinity recovery -- CPython's
	_Py_c_prod, rule for rule.

	The plain formula loses infinities to intermediate NaNs whenever an
	infinite part meets a zero or a NaN part: complex(nan, 1e200) squared is
	mathematically -inf+nanj, but every term comes out nan.  C99 says an
	operand with ANY infinite part is a POINT AT INFINITY whose finite
	direction is what matters, so the recovery replaces each part by its
	direction (+-1 for an infinity, +-0 otherwise), zeroes the other operand's
	NaNs, and multiplies the resulting finite product by infinity.  A pair with
	no infinity anywhere -- complex(nan, nan) squared -- is left as NaN.

	Only entered when BOTH parts came out NaN: that is the sole case the plain
	formula can have got wrong, and it is what CPython tests."

	| ar ai br bi rr ri recalc |
	ar := self real. ai := self imag.
	br := aComplex @env1:real. bi := aComplex @env1:imag.
	rr := ((ar @env0:* br) @env0:- (ai @env0:* bi)).
	ri := ((ar @env0:* bi) @env0:+ (ai @env0:* br)).
	(rr @env0:_isNaN and: [ri @env0:_isNaN]) ifFalse: [
		^ complex __new__: rr _: ri].

	recalc := false.
	"Self is the infinite operand: box it to a unit direction and clear the
	other's NaNs, which C99 treats as unsigned zeros in this context."
	((self ___isInf___: ar) or: [self ___isInf___: ai]) ifTrue: [
		ar := self ___copySign___: ((self ___isInf___: ar) ifTrue: [1.0] ifFalse: [0.0]) from: ar.
		ai := self ___copySign___: ((self ___isInf___: ai) ifTrue: [1.0] ifFalse: [0.0]) from: ai.
		br @env0:_isNaN ifTrue: [br := self ___copySign___: 0.0 from: br].
		bi @env0:_isNaN ifTrue: [bi := self ___copySign___: 0.0 from: bi].
		recalc := true].
	"...and symmetrically when the OTHER operand is the infinite one.  Both
	branches can fire, for infinity times infinity."
	((self ___isInf___: br) or: [self ___isInf___: bi]) ifTrue: [
		br := self ___copySign___: ((self ___isInf___: br) ifTrue: [1.0] ifFalse: [0.0]) from: br.
		bi := self ___copySign___: ((self ___isInf___: bi) ifTrue: [1.0] ifFalse: [0.0]) from: bi.
		ar @env0:_isNaN ifTrue: [ar := self ___copySign___: 0.0 from: ar].
		ai @env0:_isNaN ifTrue: [ai := self ___copySign___: 0.0 from: ai].
		recalc := true].
	"Neither operand HAS an infinite part, but a product term OVERFLOWED to one
	-- complex(nan, 1e200) squared.  The infinity is real; only the NaNs need
	clearing before it is recovered."
	(recalc @env0:not and: [
		(self ___isInf___: (ar @env0:* br)) or: [
		(self ___isInf___: (ai @env0:* bi)) or: [
		(self ___isInf___: (ar @env0:* bi)) or: [
		 self ___isInf___: (ai @env0:* br)]]]]) ifTrue: [
		ar @env0:_isNaN ifTrue: [ar := self ___copySign___: 0.0 from: ar].
		ai @env0:_isNaN ifTrue: [ai := self ___copySign___: 0.0 from: ai].
		br @env0:_isNaN ifTrue: [br := self ___copySign___: 0.0 from: br].
		bi @env0:_isNaN ifTrue: [bi := self ___copySign___: 0.0 from: bi].
		recalc := true].
	recalc ifFalse: [^ complex __new__: rr _: ri].
	^ complex
		__new__: (PlusInfinity @env0:* ((ar @env0:* br) @env0:- (ai @env0:* bi)))
		_: (PlusInfinity @env0:* ((ar @env0:* bi) @env0:+ (ai @env0:* br)))
%

category: 'Grail-Comparison'
method: complex
__ne__: other
	"Test inequality with another complex number.

	__eq__: answers the ___NotImplemented___ sentinel for a non-numeric
	operand (so the reflected __eq__ gets its turn); negating THAT is a
	Symbol DNU that escapes Python try/except, so pass it through and let
	___cmpNe___ -> ___neValue___ run the reflected/identity fallback."

	| r |
	r := self __eq__: other.
	(r @env0:== #'___NotImplemented___') ifTrue: [^ r].
	^ r @env0:not
%

category: 'Grail-Arithmetic'
method: complex
__neg__
	"Negate the complex number."

	^ complex __new__: ((self real) @env0:negated) _: ((self imag) @env0:negated)
%

category: 'Grail-Arithmetic'
method: complex
___unsupportedOperand___: opString with: other reflected: reflected
	"CPython's ``unsupported operand type(s)'' TypeError, with the operand
	type names in SOURCE order (so the reflected form reports int and complex
	that way round, not complex and int)."

	| mine theirs |
	mine := bytes ___pyTypeNameOf___: self.
	theirs := bytes ___pyTypeNameOf___: other.
	^ TypeError ___signal___: ('unsupported operand type(s) for '
		@env0:, opString @env0:, ': '''
		@env0:, (reflected ifTrue: [theirs] ifFalse: [mine]) @env0:, ''' and '''
		@env0:, (reflected ifTrue: [mine] ifFalse: [theirs]) @env0:, '''')
%

! Floor division, modulo and divmod are NOT DEFINED on complex in Python --
! there is no meaningful floor of a complex number, and CPython removed the
! historical implementations in 3.0.  Grail defined none of them either, so
! ``a // b'' fell through to a generic numeric path that DIVIDED: a zero
! divisor then raised ZeroDivisionError where CPython raises TypeError, and a
! non-zero one silently produced an answer for an operation Python does not
! have.  The second is the worse bug -- a wrong answer rather than a wrong
! error -- and test_complex only catches it because ZERO_DIVISION happens to
! use zeros.

category: 'Grail-Arithmetic'
method: complex
__floordiv__: other
	^ self ___unsupportedOperand___: '//' with: other reflected: false
%

category: 'Grail-Arithmetic'
method: complex
__rfloordiv__: other
	^ self ___unsupportedOperand___: '//' with: other reflected: true
%

category: 'Grail-Arithmetic'
method: complex
__mod__: other
	^ self ___unsupportedOperand___: '%' with: other reflected: false
%

category: 'Grail-Arithmetic'
method: complex
__rmod__: other
	^ self ___unsupportedOperand___: '%' with: other reflected: true
%

category: 'Grail-Arithmetic'
method: complex
__divmod__: other
	^ self ___unsupportedOperand___: 'divmod()' with: other reflected: false
%

category: 'Grail-Arithmetic'
method: complex
__rdivmod__: other
	^ self ___unsupportedOperand___: 'divmod()' with: other reflected: true
%

category: 'Grail-Arithmetic'
method: complex
__pos__
	"Unary plus.  Self when self is exactly complex; a plain complex with the
	same parts for a subclass, since ``type(+ComplexSubclass(1, 6)) is
	complex'' in CPython -- unary plus produces a complex VALUE and does not
	preserve the subclass."

	^ self ___asExactComplex___
%

category: 'Grail-Arithmetic'
method: complex
__pow__: other
	"complex ** x, following CPython's complex_pow: an exponent that is a SMALL
	INTEGER (integral, |n| <= 100, no imaginary part -- however it is spelled)
	goes through exact binary exponentiation, everything else through the polar
	form.  Whichever runs, an INFINITE result from finite-looking work is
	CPython's OverflowError rather than an infinity.

	The complex-exponent case used to answer the ___NotImplemented___ SYMBOL,
	which no caller unwrapped -- ``pow(1+1j, 0+0j)'' handed Python the symbol
	itself, and the next arithmetic on it died with ``unsupported operand
	type(s) for -: 'Symbol' and 'SmallDouble'' (test_pow).

	The int/float/complex spellings of the same exponent must produce
	IDENTICAL results, not merely close ones: test_pow_with_small_integer_
	exponents compares str(value**n), str(value**float(n)) and
	str(value**complex(n)).  That is why the small-integer test is on the VALUE
	and not on the type."

	| bre bim |
	(other isKindOf: complex)
		ifTrue: [bre := other @env1:real. bim := other @env1:imag]
		ifFalse: [
			| f |
			f := self ___realPartOf___: other.
			f @env0:== nil ifTrue: [
				"A non-Number that can still produce one -- the vendored
				fractions.Fraction reaches here for ``(1+0j) ** Fraction(1,10)''."
				((other @env0:class @env0:whichClassIncludesSelector: #'__float__' environmentId: 1) @env0:notNil)
					ifTrue: [f := other __float__]
					ifFalse: [^ self ___binOpFallback___: other op: '**' reflected: #'__rpow__:']].
			bre := f. bim := 0.0].
	((bim @env0:= 0.0)
		and: [(self ___isFinite___: bre)
		and: [((bre @env0:fractionPart) @env0:= 0.0)
		and: [(bre @env0:abs) @env0:<= 100.0]]]) ifTrue: [
			^ self ___powInteger___: bre @env0:truncated].
	^ self ___powPolar___: bre _: bim
%

category: 'Grail-Arithmetic'
method: complex
___powInteger___: n
	"self ** n by binary exponentiation (CPython's c_powu / c_powi), with a
	negative n inverting the positive power.

	Binary rather than n-1 repeated multiplications because the rounding has to
	agree with CPython's term for term -- the results are compared as STRINGS
	in test_pow_with_small_integer_exponents."

	| r p mask k |
	(n @env0:< 0) ifTrue: [
		^ (complex __new__: 1.0 _: 0.0) ___quot___: (self ___powInteger___: n @env0:negated)].
	r := complex __new__: 1.0 _: 0.0.
	p := self ___asExactComplex___.
	mask := 1.
	k := n.
	[k @env0:>= mask] whileTrue: [
		((k @env0:bitAnd: mask) @env0:~= 0) ifTrue: [r := r ___prod___: p].
		mask := mask @env0:* 2.
		p := p ___prod___: p].
	^ self ___checkOverflow___: r
%

category: 'Grail-Arithmetic'
method: complex
___powPolar___: bre _: bim
	"self ** (bre + bim*i) through the polar form -- CPython's _Py_c_pow.

	A ZERO base is the only error case: raising it to a negative or complex
	power is CPython's ZeroDivisionError, worded as CPython words it."

	| ar ai vabs len at phase |
	ar := self real. ai := self imag.
	((bre @env0:= 0.0) and: [bim @env0:= 0.0]) ifTrue: [^ complex __new__: 1.0 _: 0.0].
	((ar @env0:= 0.0) and: [ai @env0:= 0.0]) ifTrue: [
		((bim @env0:~= 0.0) or: [bre @env0:< 0.0]) ifTrue: [
			ZeroDivisionError ___signal___: '0.0 to a negative or complex power'].
		^ complex __new__: 0.0 _: 0.0].
	vabs := self __abs__.
	len := vabs @env0:raisedTo: bre.
	at := ai @env0:arcTan2: ar.
	phase := at @env0:* bre.
	(bim @env0:~= 0.0) ifTrue: [
		len := len @env0:/ ((at @env0:* bim) @env0:exp).
		phase := phase @env0:+ (bim @env0:* (vabs @env0:ln))].
	^ self ___checkOverflow___:
		(complex __new__: (len @env0:* (phase @env0:cos)) _: (len @env0:* (phase @env0:sin)))
%

category: 'Grail-Arithmetic'
method: complex
___checkOverflow___: aComplex
	"aComplex, unless a part came out INFINITE -- CPython's _Py_ADJUST_ERANGE2,
	which turns that into OverflowError for exponentiation.  It applies to an
	infinite INPUT too: ``complex(inf, 0) ** 1'' raises in CPython, and
	test_pow_with_small_integer_exponents relies on it doing so."

	((self ___isInf___: (aComplex @env1:real))
		or: [self ___isInf___: (aComplex @env1:imag)]) ifTrue: [
			OverflowError ___signal___: 'complex exponentiation'].
	^ aComplex
%

category: 'Grail-Arithmetic'
method: complex
__radd__: other
	"Right-hand add (commutative, so same as __add__)."

	^ self __add__: other
%

category: 'Grail-String Representation'
method: complex
___formatComponent___: aFloat
	"Format one real/imaginary component the way CPython's complex repr
	does -- unlike plain float repr (which always keeps a trailing '.0',
	e.g. repr(1.0) == '1.0'), complex drops it for whole-number finite
	components: repr(1+0j) == '(1+0j)', not '(1.0+0.0j)'.  Delegate to
	float's own __repr__ for the general/non-finite case (inf/nan
	spellings, exponent formatting, ...) and only strip the trailing
	'.0' when present."

	| str |
	str := aFloat __repr__.
	(str @env0:endsWith: '.0') ifTrue: [
		^ str @env0:copyFrom: 1 to: str @env0:size @env0:- 2].
	^ str
%

category: 'Grail-String Representation'
method: complex
__repr__
	"Return string representation of complex number."

	"SIGNED ZEROS are the whole difficulty here, and the previous version got
	both halves of them wrong.

	CPython omits the real part only when it is POSITIVE zero: repr of
	complex(0, 1) is ``1j'' but of complex(-0.0, 1) is ``(-0+1j)''.  Testing
	``real = 0.0'' cannot tell those apart -- IEEE says -0.0 = 0.0 -- so the
	negative zero silently printed as ``1j''.

	And the imaginary sign came from ``imag >= 0.0'', which is TRUE for -0.0,
	while the magnitude came from ``imag abs'', which answers -0.0 unchanged.
	The two combined to emit BOTH signs: complex(-1, -0.0) printed
	``(-1+-0j)''.

	Both are fixed by asking ___formatComponent___ instead of the arithmetic:
	it delegates to float's own __repr__, which already spells -0.0 as ``-0'',
	so a leading '-' IS the sign bit -- true for -0.0, negatives and -inf
	alike, and correctly absent for nan (CPython prints ``(1+nanj)'')."

	| realStr imagStr |
	realStr := self ___formatComponent___: self real.
	imagStr := self ___formatComponent___: self imag.
	"'0' exactly -- '-0' falls through to the parenthesised form."
	(realStr @env0:= '0') ifTrue: [
		^ (imagStr @env0:, 'j') @env0:asUnicodeString].
	"A negative component already carries its '-', so only a positive one
	needs a separator inserted."
	^ ('(' @env0:, realStr
		@env0:, ((imagStr @env0:beginsWith: '-') ifTrue: [''] ifFalse: ['+'])
		@env0:, imagStr @env0:, 'j)') @env0:asUnicodeString
%

category: 'Grail-Arithmetic'
method: complex
__rmul__: other
	"Right-hand multiply (commutative, so same as __mul__)."

	^ self __mul__: other
%

category: 'Grail-Arithmetic'
method: complex
___phase___
	"Argument (angle) of this complex number = atan2(imag, real)."

	^ (self imag) @env0:asFloat @env0:arcTan2: (self real) @env0:asFloat
%

category: 'Grail-Arithmetic'
method: complex
__rpow__: other
	"x ** complex, where SELF is the EXPONENT (the float/int __pow__ fallback
	lands here, e.g. ``0.1 ** (1+0j)'').

	Delegating to complex ** complex rather than computing base^a * e^(i*b*ln
	base) directly: the closed form needs ln(base), which is a NaN for a
	NEGATIVE base, so ``(-1) ** (0+0j)'' answered (nan+nanj) where CPython
	answers 1 (test_pow)."

	| f |
	(other isKindOf: complex) ifTrue: [^ (other @env1:___asExactComplex___) __pow__: self].
	f := self ___realPartOf___: other.
	f @env0:== nil ifTrue: [^ self ___rbinOpFallback___: other op: '**'].
	^ (complex __new__: f _: 0.0) __pow__: self
%

category: 'Grail-Arithmetic'
method: complex
__rsub__: other
	"Right-hand subtract (other - self)."

	"A real operand leaves the OTHER component untouched, rather than being
	widened to complex(x, 0.0) and combined.  Widening is what destroys a
	signed zero: -0.0 + 0.0 is +0.0 in IEEE, so ``complex(-0.0, -0.0) +
	(-0.0)'' reported a +0.0 imaginary part where CPython keeps -0.0.

	``isKindOf:'' rather than ``class ==''  so a complex SUBCLASS takes the
	complex branch; under ``class =='' it fell to the real branch and sent
	#asFloat to a complex, a Smalltalk MessageNotUnderstood no ``except''
	could catch."

	| f |
	(other isKindOf: complex) ifTrue: [
		^ complex __new__: ((other @env1:real) @env0:- (self real))
			_: ((other @env1:imag) @env0:- (self imag))].
	f := self ___realPartOf___: other.
	f @env0:== nil ifTrue: [
		^ self ___rbinOpFallback___: other op: '-'].
	"Real minus complex NEGATES the imaginary part -- it is not left alone,
	because the complex operand is on the right: 0.0 - complex(0.0, 0.0) has
	a -0.0 imaginary part in CPython."
	^ complex __new__: (f @env0:- (self real))
		_: ((self imag) @env0:negated)
%

category: 'Grail-Arithmetic'
method: complex
__rtruediv__: other
	"x / complex, where SELF is the divisor -- CPython's _Py_rc_quot for a real
	numerator, ___quot___: for a complex one.

	The old body divided by |self|^2 with no scaling, which overflows or
	underflows for perfectly ordinary operands and loses every infinity to a
	NaN; it also sent #asFloat to a non-number and died as an uncatchable
	MessageNotUnderstood."

	| a absR absI ratio denom rr ri br bi |
	(ZeroDivisionError @env0:___isZeroDivisor___: self) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].
	(other isKindOf: complex) ifTrue: [^ (other @env1:___asExactComplex___) ___quot___: self].
	a := self ___realPartOf___: other.
	a @env0:== nil ifTrue: [^ self ___rbinOpFallback___: other op: '/'].
	br := self real. bi := self imag.
	absR := br @env0:abs. absI := bi @env0:abs.
	(absR @env0:>= absI)
		ifTrue: [
			ratio := bi @env0:/ br.
			denom := br @env0:+ (bi @env0:* ratio).
			rr := a @env0:/ denom.
			ri := (a @env0:negated @env0:* ratio) @env0:/ denom]
		ifFalse: [
			(absI @env0:>= absR)
				ifTrue: [
					ratio := br @env0:/ bi.
					denom := (br @env0:* ratio) @env0:+ bi.
					rr := (a @env0:* ratio) @env0:/ denom.
					ri := a @env0:negated @env0:/ denom]
				ifFalse: [rr := PlusQuietNaN. ri := PlusQuietNaN]].
	(rr @env0:_isNaN and: [ri @env0:_isNaN]) ifFalse: [
		^ complex __new__: rr _: ri].
	"Same two recoveries as ___quot___:, with the numerator's imaginary part
	known to be zero."
	((self ___isInf___: a)
		and: [(self ___isFinite___: br) and: [self ___isFinite___: bi]]) ifTrue: [
		| x |
		x := self ___copySign___: 1.0 from: a.
		^ complex
			__new__: (PlusInfinity @env0:* (x @env0:* br))
			_: (PlusInfinity @env0:* (x @env0:* bi) @env0:negated)].
	(((self ___isInf___: br) or: [self ___isInf___: bi])
		and: [self ___isFinite___: a]) ifTrue: [
		| x y |
		x := self ___copySign___: ((self ___isInf___: br) ifTrue: [1.0] ifFalse: [0.0]) from: br.
		y := self ___copySign___: ((self ___isInf___: bi) ifTrue: [1.0] ifFalse: [0.0]) from: bi.
		^ complex
			__new__: (0.0 @env0:* (a @env0:* x))
			_: (0.0 @env0:* (a @env0:* y) @env0:negated)].
	^ complex __new__: rr _: ri
%

category: 'Grail-String Representation'
method: complex
__str__
	"Return string representation (same as __repr__ for complex)."

	^ self __repr__
%

category: 'Grail-Arithmetic'
method: complex
__sub__: other
	"Subtract two complex numbers or complex and real."

	"A real operand leaves the OTHER component untouched, rather than being
	widened to complex(x, 0.0) and combined.  Widening is what destroys a
	signed zero: -0.0 + 0.0 is +0.0 in IEEE, so ``complex(-0.0, -0.0) +
	(-0.0)'' reported a +0.0 imaginary part where CPython keeps -0.0.

	``isKindOf:'' rather than ``class ==''  so a complex SUBCLASS takes the
	complex branch; under ``class =='' it fell to the real branch and sent
	#asFloat to a complex, a Smalltalk MessageNotUnderstood no ``except''
	could catch."

	| f |
	(other isKindOf: complex) ifTrue: [
		^ complex __new__: ((self real) @env0:- (other @env1:real))
			_: ((self imag) @env0:- (other @env1:imag))].
	f := self ___realPartOf___: other.
	f @env0:== nil ifTrue: [
		^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'].
	^ complex __new__: ((self real) @env0:- f) _: (self imag)
%

category: 'Grail-Arithmetic'
method: complex
__truediv__: other
	"complex / x.  The arithmetic lives in ___quot___: (complex divisor) or in
	component-wise scaling (real divisor), both of which follow CPython."

	| f |
	"A zero denominator makes every quotient below NaN rather than an error --
	``(1+2j) / 0'' answered ``(nan-nanj)''.  Checked on the operand as given, so
	both a real zero and ``0j'' are caught, and BEFORE the type dispatch so the
	message does not depend on which side supplied the zero."
	(ZeroDivisionError @env0:___isZeroDivisor___: other) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].
	(other isKindOf: complex) ifTrue: [^ self ___quot___: other].
	f := self ___realPartOf___: other.
	f @env0:== nil ifTrue: [
		^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'].
	"A REAL divisor divides each component, rather than being widened to
	complex(x, 0.0) and put through the full quotient -- widening turns a
	non-finite part into a NaN: ``complex(inf, nan) / 2'' came out (nan, nan)
	where CPython answers complex(inf, nan) (test_truediv)."
	^ complex __new__: ((self real) @env0:/ f) _: ((self imag) @env0:/ f)
%

category: 'Grail-Arithmetic'
method: complex
___quot___: aComplex
	"complex / complex -- CPython's _Py_c_quot: Smith's scaled division, then
	C99 Annex G's recovery of the infinities and zeros it loses.

	Smith scales by the LARGER of |c|,|d| so neither square can overflow; the
	naive (ac+bd)/(c^2+d^2) also loses precision -- (1+0j)/(0.1+0j) gave
	9.999... because 0.1^2 rounds to 0.010000000000000002.

	The recovery is the same idea as ___prod___:'s.  An INFINITE numerator over
	a finite denominator is a point at infinity, so replace the numerator by its
	direction and scale by infinity; an infinite DENOMINATOR under a finite
	numerator drives the quotient to zero, so scale by 0.0 instead -- which is
	how the SIGNS of the zeros come out right ((1+1j)/complex(-INF, INF) is
	complex(0.0, -0.0), not (0.0, 0.0)).  A NaN in the denominator that is not
	an infinity is left alone: complex(0,0)/complex(0,NAN) is (nan, nan)."

	| ar ai br bi absR absI ratio denom rr ri |
	ar := self real. ai := self imag.
	br := aComplex @env1:real. bi := aComplex @env1:imag.
	absR := br @env0:abs. absI := bi @env0:abs.
	(absR @env0:>= absI)
		ifTrue: [
			ratio := bi @env0:/ br.
			denom := br @env0:+ (bi @env0:* ratio).
			rr := (ar @env0:+ (ai @env0:* ratio)) @env0:/ denom.
			ri := (ai @env0:- (ar @env0:* ratio)) @env0:/ denom]
		ifFalse: [
			(absI @env0:>= absR)
				ifTrue: [
					ratio := br @env0:/ bi.
					denom := (br @env0:* ratio) @env0:+ bi.
					rr := ((ar @env0:* ratio) @env0:+ ai) @env0:/ denom.
					ri := ((ai @env0:* ratio) @env0:- ar) @env0:/ denom]
				ifFalse: [
					"Neither comparison held, so a denominator part is a NaN."
					rr := PlusQuietNaN. ri := PlusQuietNaN]].
	(rr @env0:_isNaN and: [ri @env0:_isNaN]) ifFalse: [
		^ complex __new__: rr _: ri].

	(((self ___isInf___: ar) or: [self ___isInf___: ai])
		and: [(self ___isFinite___: br) and: [self ___isFinite___: bi]]) ifTrue: [
		| x y |
		x := self ___copySign___: ((self ___isInf___: ar) ifTrue: [1.0] ifFalse: [0.0]) from: ar.
		y := self ___copySign___: ((self ___isInf___: ai) ifTrue: [1.0] ifFalse: [0.0]) from: ai.
		^ complex
			__new__: (PlusInfinity @env0:* ((x @env0:* br) @env0:+ (y @env0:* bi)))
			_: (PlusInfinity @env0:* ((y @env0:* br) @env0:- (x @env0:* bi)))].
	(((self ___isInf___: br) or: [self ___isInf___: bi])
		and: [(self ___isFinite___: ar) and: [self ___isFinite___: ai]]) ifTrue: [
		| x y |
		x := self ___copySign___: ((self ___isInf___: br) ifTrue: [1.0] ifFalse: [0.0]) from: br.
		y := self ___copySign___: ((self ___isInf___: bi) ifTrue: [1.0] ifFalse: [0.0]) from: bi.
		^ complex
			__new__: (0.0 @env0:* ((ar @env0:* x) @env0:+ (ai @env0:* y)))
			_: (0.0 @env0:* ((ai @env0:* x) @env0:- (ar @env0:* y)))].
	^ complex __new__: rr _: ri
%

category: 'Grail-Numbers'
method: complex
conjugate
	"Return the complex conjugate."

	^ complex __new__: (self real) _: ((self imag) @env0:negated)
%

category: 'Grail-Attribute Access'
method: complex
imag
	"Return the imaginary part of the complex number.  Phase B+1:
	reads from dynamic-instVar storage; symmetrical with the
	``cpx.imag'' Python attribute load path."

	^ self @env0:dynamicInstVarAt: #imag
%

category: 'Grail-Attribute Access'
method: complex
real
	"Return the real part of the complex number.  Phase B+1: reads
	from dynamic-instVar storage; symmetrical with the ``cpx.real''
	Python attribute load path."

	^ self @env0:dynamicInstVarAt: #real
%

set compile_env: 0
