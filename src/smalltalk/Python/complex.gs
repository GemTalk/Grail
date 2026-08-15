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
	Convert aNumber to a complex number with zero imaginary part."

	^ complex @env1:__new__: aNumber _: 0.0
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
__new__: r
	"complex(x) -- the one-arg form.  Without this, the call fell
	through to the inherited object.__new__: (whose argument is a
	CLASS) and sent #new to the number: complex(10**23) died with
	'LargeInteger does not understand #new' (test_fractions
	testBigComplexComparisons).  The isBehavior branch keeps the
	object.__new__(cls) protocol (copy/pickle) working."

	(r @env0:isBehavior) ifTrue: [^ r @env0:new].
	(r isKindOf: complex) ifTrue: [^ r].
	"A STRING is parsed, not coerced.  It used to fall through to
	__init__:_:'s ``asFloat'', which answers NaN for anything GemStone cannot
	read as a number -- so complex('(1-6j)') quietly became (nan+0j) and
	complex('') did too, instead of raising ValueError.  A repr round-trip,
	which is how most of test_complex checks itself, could not survive that."
	(r @env0:isKindOf: CharacterCollection) ifTrue: [
		^ self ___parseString___: r].
	"CPython's complex(x) protocol tries x.__complex__() first.  A non-numeric
	object (a user class registered as numbers.Complex, e.g. test_fractions'
	Rect) is converted through it; int/float/str have no __complex__ so they
	fall through to the real-part path below."
	((r @env0:class @env0:whichClassIncludesSelector: #'__complex__' environmentId: 1) @env0:notNil) ifTrue: [
		| c |
		c := r __complex__.
		(c isKindOf: complex) ifFalse: [
			TypeError ___signal___: '__complex__ returned non-complex (type '
				@env0:, (c @env0:class @env0:name @env0:asString) @env0:, ')'].
		^ c].
	^ complex __new__: r _: 0.0
%

category: 'Grail-Initialization'
classmethod: complex
__new__: r _: i
	"Create a new complex number with given real and imaginary parts.
	In Python: complex(real, imag) or complex.__new__(complex, real, imag)"

	| realVal imagVal instance |
	"Default values"
	realVal := r ifNil: [0.0] ifNotNil: [r].
	imagVal := i ifNil: [0.0] ifNotNil: [i].

	instance := self __new__.
	instance __init__: realVal _: imagVal.
	^ instance
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

	The sign is applied by NEGATION rather than by handing float() a signed
	string so that -nan keeps its sign bit: float('-nan') answers a NaN whose
	sign GemStone does not preserve, and test_complex asserts
	``copysign(1., complex('-nan').real) == -1.''."

	| mag |
	mag := s @env0:isEmpty
		ifTrue: [1.0]
		ifFalse: [
			"float class>>__new__: is compiled in ENVIRONMENT 1, so this is an
			env-1 send.  Catch ValueError ONLY -- restating it in complex()'s
			wording is the whole point, but an earlier version caught every
			Error, which turned a wrong-environment MessageNotUnderstood into
			``malformed string'' and made every magnitude look unparseable."
			[float __new__: s]
				@env0:on: ValueError do: [:ex | self ___malformed___]].
	^ signChar @env0:== $- ifTrue: [mag @env0:negated] ifFalse: [mag]
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
	[i @env0:<= n and: [(s @env0:at: i) @env0:isSeparator]] whileTrue: [i := i @env0:+ 1].
	gotBracket := false.
	(i @env0:<= n and: [(s @env0:at: i) @env0:== $(]) ifTrue: [
		gotBracket := true.
		i := i @env0:+ 1.
		[i @env0:<= n and: [(s @env0:at: i) @env0:isSeparator]] whileTrue: [i := i @env0:+ 1]].
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
	[i @env0:<= n and: [(s @env0:at: i) @env0:isSeparator]] whileTrue: [i := i @env0:+ 1].
	gotBracket ifTrue: [
		(i @env0:<= n and: [(s @env0:at: i) @env0:== $)]) ifFalse: [^ self ___malformed___].
		i := i @env0:+ 1.
		[i @env0:<= n and: [(s @env0:at: i) @env0:isSeparator]] whileTrue: [i := i @env0:+ 1]].
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

category: 'Grail-Arithmetic'
method: complex
__abs__
	"Return the magnitude (absolute value) of the complex number.
	|a+bi| = sqrt(a² + b²)"

	| realSquared imagSquared sumSquares magnitude |
	realSquared := (self real) @env0:* (self real).
	imagSquared := (self imag) @env0:* (self imag).
	sumSquares := realSquared @env0:+ imagSquared.
	magnitude := sumSquares @env0:sqrt.
	^ magnitude
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

	(other isKindOf: complex) ifTrue: [
		^ complex __new__: ((self real) @env0:+ (other @env1:real))
			_: ((self imag) @env0:+ (other @env1:imag))].
	^ complex __new__: ((self real) @env0:+ (other @env0:asFloat)) _: (self imag)
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
	type @env0:isNil
		ifTrue: [body := self __str__ @env0:asString]
		ifFalse: [
			"Strip fill/align/width for the PART specs -- keep sign/#/grouping/
			precision/type.  The imaginary part is forced to carry its sign."
			parts := b ___formatComplexParts___: self parsed: p.
			body := parts].
	align @env0:isNil ifTrue: [align := $<].
	^ (b ___formatPadBody___: body fill: fill align: align width: width signLength: 0)
		@env0:asUnicodeString
%

category: 'Grail-Comparison'
method: complex
__ge__: other
	"Complex numbers cannot be ordered."

	^ self ___unorderable___: other op: '>=' reflected: #'__le__:'
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

	^ self ___unorderable___: other op: '>' reflected: #'__lt__:'
%

category: 'Grail-Initialization'
method: complex
__init__: r _: i
	"Initialize a complex number with real and imaginary parts.
	Called after __new__ in Python, or directly from Smalltalk
	constructor.  Phase B+1: stores into dynamic instVars so
	``cpx.real'' / ``cpx.imag'' Python attribute reads find the
	values directly via the ___pyAttrLoad___ dynamic probe."

	self @env0:dynamicInstVarAt: #real put: r @env0:asFloat.
	self @env0:dynamicInstVarAt: #imag put: i @env0:asFloat.
	^ None
%

category: 'Grail-Comparison'
method: complex
__le__: other
	"Complex numbers cannot be ordered."

	^ self ___unorderable___: other op: '<=' reflected: #'__ge__:'
%

category: 'Grail-Comparison'
method: complex
__lt__: other
	"Complex numbers cannot be ordered."

	^ self ___unorderable___: other op: '<' reflected: #'__gt__:'
%

category: 'Grail-Comparison'
method: complex
___unorderable___: other op: opString reflected: refSelector
	"complex has no ordering: CPython's complex.__lt__ & co. answer
	NotImplemented, the operator layer then tries the reflected dunder and
	finally raises TypeError naming BOTH operand types.

	Two reasons this is not a bare raise.  (1) The old env-0
	``TypeError signal: ...'' produced a Python TypeError whose str() was
	EMPTY, so ``assertRaisesRegex(TypeError, 'not supported')'' failed even
	though the type was right (test_compare.test_numbers); ___signal___: is
	the raise that carries the message into Python.  (2) A non-complex operand
	deserves its reflected dunder -- ___cmpFallback___ runs it and builds the
	both-types message.  A COMPLEX operand cannot go there: both sides define
	the dunder and both escalate, so forward<->reflected would ping-pong."

	(other isKindOf: complex) ifFalse: [
		^ self ___cmpFallback___: other op: opString reflected: refSelector].
	TypeError ___signal___: ('''' @env0:, opString @env0:,
		''' not supported between instances of ''complex'' and ''complex''')
%

category: 'Grail-Arithmetic'
method: complex
__mul__: other
	"Multiply two complex numbers or complex and real.
	(a+bi)(c+di) = (ac-bd) + (ad+bc)i"

	| otherReal otherImag newReal newImag ac bd ad bc |
	(other @env0:class) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other @env0:asFloat.
			otherImag := 0.0.
		].

	ac := (self real) @env0:* otherReal.
	bd := (self imag) @env0:* otherImag.
	ad := (self real) @env0:* otherImag.
	bc := (self imag) @env0:* otherReal.

	newReal := ac @env0:- (bd).
	newImag := ad @env0:+ bc.

	^ complex __new__: newReal _: newImag
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
	"Raise complex number to a power.  Integer exponents use exact repeated
	multiplication; a REAL non-integer exponent (float / Fraction, e.g.
	``(1+0j) ** Fraction(1,10)'') uses the polar form
	r^w * (cos + i*sin)(w*theta) -- previously ``other asInteger'' truncated a
	fraction (or DNU'd) and returned the wrong value / crashed."

	| result n mag angle w rmag rang |
	(other @env0:isKindOf: Integer) ifFalse: [
		(other @env0:isKindOf: complex) ifTrue: [^ #'___NotImplemented___'].
		w := other __float__.
		mag := self __abs__.
		angle := self ___phase___.
		rmag := mag @env0:raisedTo: w.
		rang := w @env0:* angle.
		^ complex __new__: (rmag @env0:* (rang @env0:cos)) _: (rmag @env0:* (rang @env0:sin))].

	n := other.

	"Handle special cases"
	n == 0 ifTrue: [^ complex __new__: 1.0 _: 0.0].
	n == 1 ifTrue: [^ self].

	"Positive powers: multiply self n times"
	(n @env0:> 0) ifTrue: [
		result := self.
		((n @env0:- 1) @env0:timesRepeat: [
			result := result __mul__: self.
		]).
		^ result
	].

	"Negative powers: 1 / (self ** -n)"
	result := complex __new__: 1.0 _: 0.0.
	^ result __truediv__: (self __pow__: (n @env0:negated))
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
	"Right-hand power ``other ** self'' where self is the complex EXPONENT and
	``other'' a real base (the float/int __pow__ fallback lands here, e.g.
	``0.1 ** (1+0j)'').  base**(a+bi) = base^a * (cos + i*sin)(b*ln(base))."

	| a b base lnBase mag theta |
	a := self real.
	b := self imag.
	base := other @env0:asFloat.
	lnBase := base @env0:ln.
	mag := base @env0:raisedTo: a.
	theta := b @env0:* lnBase.
	^ complex __new__: (mag @env0:* (theta @env0:cos)) _: (mag @env0:* (theta @env0:sin))
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

	(other isKindOf: complex) ifTrue: [
		^ complex __new__: ((other @env1:real) @env0:- (self real))
			_: ((other @env1:imag) @env0:- (self imag))].
	"Real minus complex NEGATES the imaginary part -- it is not left alone,
	because the complex operand is on the right: 0.0 - complex(0.0, 0.0) has
	a -0.0 imaginary part in CPython."
	^ complex __new__: ((other @env0:asFloat) @env0:- (self real))
		_: ((self imag) @env0:negated)
%

category: 'Grail-Arithmetic'
method: complex
__rtruediv__: other
	"Right-hand divide (other / self)."

	| otherReal otherImag denom ac bd bc ad newReal newImag |
	"Reverse form: other / self, so SELF is the divisor -- ``1 / 0j''."
	(ZeroDivisionError @env0:___isZeroDivisor___: self) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].
	(other @env0:class) == complex
		ifTrue: [
			otherReal := other real.
			otherImag := other imag.
		]
		ifFalse: [
			otherReal := other @env0:asFloat.
			otherImag := 0.0.
		].

	"Calculate denominator: a² + b² (self's magnitude squared)"
	denom := ((self real) @env0:* (self real))
		@env0:+ ((self imag) @env0:* (self imag)).

	"Calculate numerator components for other / self"
	ac := otherReal @env0:* (self real).
	bd := otherImag @env0:* (self imag).
	bc := otherImag @env0:* (self real).
	ad := otherReal @env0:* (self imag).

	newReal := (ac @env0:+ bd)
		@env0:/ denom.
	newImag := (bc @env0:- (ad))
		@env0:/ denom.

	^ complex __new__: newReal _: newImag
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

	(other isKindOf: complex) ifTrue: [
		^ complex __new__: ((self real) @env0:- (other @env1:real))
			_: ((self imag) @env0:- (other @env1:imag))].
	^ complex __new__: ((self real) @env0:- (other @env0:asFloat)) _: (self imag)
%

category: 'Grail-Arithmetic'
method: complex
__truediv__: other
	"Divide (a+bi)/(c+di) using Smith's algorithm (scale by the larger of
	|c|,|d|) for numerical stability, matching CPython.  The naive
	(ac+bd)/(c²+d²) loses precision -- e.g. (1+0j)/(0.1+0j) gave 9.999...
	instead of 10.0 because 0.1² rounds to 0.010000000000000002."

	| c d a b newReal newImag r den |
	"A zero denominator makes every quotient below NaN rather than an error --
	``(1+2j) / 0'' answered ``(nan-nanj)''.  Checked on the operand as given, so
	both a real zero and ``0j'' are caught."
	(ZeroDivisionError @env0:___isZeroDivisor___: other) ifTrue: [
		ZeroDivisionError ___signal___: 'division by zero'].
	(other @env0:class) == complex
		ifTrue: [c := other real. d := other imag]
		ifFalse: [c := other @env0:asFloat. d := 0.0].
	a := self real.
	b := self imag.
	((c @env0:abs) @env0:>= (d @env0:abs))
		ifTrue: [
			r := d @env0:/ c.
			den := c @env0:+ (d @env0:* r).
			newReal := (a @env0:+ (b @env0:* r)) @env0:/ den.
			newImag := (b @env0:- (a @env0:* r)) @env0:/ den]
		ifFalse: [
			r := c @env0:/ d.
			den := (c @env0:* r) @env0:+ d.
			newReal := ((a @env0:* r) @env0:+ b) @env0:/ den.
			newImag := ((b @env0:* r) @env0:- a) @env0:/ den].
	^ complex __new__: newReal _: newImag
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
