! ===============================================================================
! _random -- the Mersenne Twister core beneath CPython's random.py.
!
! CPython splits ``random'' in two: ``_random'' (C, Modules/_randommodule.c) is
! MT19937 and nothing else -- random(), seed(), getstate(), setstate(),
! getrandbits() -- and ``random.py'' builds every distribution, shuffle, choice
! and sample on top of it, in ``class Random(_random.Random)''.  Implementing
! ``_random'' here lets Grail run CPython's REAL random.py, as _socket does for
! socket.py.
!
! This REPLACED random.gs, a hand-written ``random'' module over GemStone's own
! generator.  It had the module-level functions but no Random class -- so no
! ``random.Random(seed)'', no SystemRandom, no subclassing -- and its sequences
! were GemStone's, so a seed did not reproduce what the same seed gives under
! CPython.  This is CPython's generator, transcribed: the same seed answers the
! same numbers, bit for bit, which is what a program ported with its seeds, or
! a test with recorded expectations, needs.
!
! Arithmetic note: MT19937 is uint32 arithmetic.  Every intermediate here is
! masked back to 32 bits at the point C would have wrapped, OR later --
! xor, add and subtract only ever carry upward, so the low 32 bits of a result
! depend only on the low 32 bits of its operands, and masking once at the end
! of an expression answers what C's per-operation wrap answers.  Products of a
! 32-bit value and a 31-bit constant reach 63 bits, past SmallInteger, during
! seeding only; the per-number path stays within SmallInteger.
! ===============================================================================

set compile_env: 0

! ------------------- Superclass checks
run
NativeModule ifNil: [self error: 'NativeModule is not defined. Check file ordering.'].
%

! ------- PyMersenneTwister: the _random.Random type -------------------------
expectvalue /Class
doit
Object subclass: 'PyMersenneTwister'
  instVarNames: #('mt' 'mti')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyMersenneTwister comment:
'Python ``_random.Random'' -- one MT19937 generator: ``mt'' is the 624-word
state (an Array of SmallIntegers, each < 2^32) and ``mti'' is CPython''s
``index'', the number of words of the current block already used (0..624).

random.py subclasses this, ``class Random(_random.Random)'', and reaches it
through super() for seed(), getstate() and setstate().'
%

expectvalue /Class
doit
PyMersenneTwister category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyMersenneTwister removeAllMethods: 0.
PyMersenneTwister removeAllMethods: 1.
PyMersenneTwister class removeAllMethods: 0.
PyMersenneTwister class removeAllMethods: 1.
%

! ---- MT19937 -----------------------------------------------------------------
! Index translation: C's mt[c] is ``mt at: c + 1''.

category: 'Grail-Mersenne Twister'
method: PyMersenneTwister
___initGenrand: s
	"init_genrand(s)."

	| prev |
	mt := Array new: 624.
	mt at: 1 put: (s bitAnd: 16rFFFFFFFF).
	2 to: 624 do: [:i |
		prev := mt at: i - 1.
		mt at: i put: ((1812433253 * (prev bitXor: (prev bitShift: -30))) + (i - 1)
			bitAnd: 16rFFFFFFFF)].
	mti := 624
%

category: 'Grail-Mersenne Twister'
method: PyMersenneTwister
___initByArray: key
	"init_by_array(key, key_length).  ``i'' and ``j'' keep C's values (i is the
	C index of the word being written, so it lives at ``mt at: i + 1'')."

	| n i j prev |
	self ___initGenrand: 19650218.
	n := key size.
	i := 1.
	j := 0.
	(624 max: n) timesRepeat: [
		prev := mt at: i.
		mt at: i + 1 put: (((mt at: i + 1) bitXor: (prev bitXor: (prev bitShift: -30)) * 1664525)
			+ (key at: j + 1) + j
			bitAnd: 16rFFFFFFFF).
		i := i + 1.
		j := j + 1.
		i >= 624 ifTrue: [mt at: 1 put: (mt at: 624). i := 1].
		j >= n ifTrue: [j := 0]].
	623 timesRepeat: [
		prev := mt at: i.
		mt at: i + 1 put: (((mt at: i + 1) bitXor: (prev bitXor: (prev bitShift: -30)) * 1566083941)
			- i
			bitAnd: 16rFFFFFFFF).
		i := i + 1.
		i >= 624 ifTrue: [mt at: 1 put: (mt at: 624). i := 1]].
	"MSB is 1, assuring a non-zero initial array."
	mt at: 1 put: 16r80000000
%

category: 'Grail-Mersenne Twister'
method: PyMersenneTwister
___twist
	"Generate the next 624 words (the ``mti >= N'' block of genrand_uint32)."

	| y |
	1 to: 227 do: [:k |
		y := ((mt at: k) bitAnd: 16r80000000) bitOr: ((mt at: k + 1) bitAnd: 16r7FFFFFFF).
		mt at: k put: (((mt at: k + 397) bitXor: (y bitShift: -1))
			bitXor: ((y bitAnd: 1) == 0 ifTrue: [0] ifFalse: [16r9908B0DF]))].
	228 to: 623 do: [:k |
		y := ((mt at: k) bitAnd: 16r80000000) bitOr: ((mt at: k + 1) bitAnd: 16r7FFFFFFF).
		mt at: k put: (((mt at: k - 227) bitXor: (y bitShift: -1))
			bitXor: ((y bitAnd: 1) == 0 ifTrue: [0] ifFalse: [16r9908B0DF]))].
	y := ((mt at: 624) bitAnd: 16r80000000) bitOr: ((mt at: 1) bitAnd: 16r7FFFFFFF).
	mt at: 624 put: (((mt at: 397) bitXor: (y bitShift: -1))
		bitXor: ((y bitAnd: 1) == 0 ifTrue: [0] ifFalse: [16r9908B0DF])).
	mti := 0
%

category: 'Grail-Mersenne Twister'
method: PyMersenneTwister
___genrandUint32
	"genrand_uint32(): the next tempered 32-bit word."

	| y |
	mt == nil ifTrue: [self ___seedFrom: nil].
	mti >= 624 ifTrue: [self ___twist].
	mti := mti + 1.
	y := mt at: mti.
	y := y bitXor: (y bitShift: -11).
	y := y bitXor: ((y bitShift: 7) bitAnd: 16r9D2C5680).
	y := y bitXor: ((y bitShift: 15) bitAnd: 16rEFC60000).
	^ y bitXor: (y bitShift: -18)
%

category: 'Grail-Mersenne Twister'
method: PyMersenneTwister
___getrandbits: k
	"getrandbits(k) for an int k >= 0: built from 32-bit words least
	significant first; a final partial word keeps its HIGH bits."

	| remaining shift result r |
	k = 0 ifTrue: [^ 0].
	k <= 32 ifTrue: [^ self ___genrandUint32 bitShift: k - 32].
	remaining := k.
	shift := 0.
	result := 0.
	[remaining > 0] whileTrue: [
		r := self ___genrandUint32.
		remaining < 32 ifTrue: [r := r bitShift: remaining - 32].
		result := result bitOr: (r bitShift: shift).
		shift := shift + 32.
		remaining := remaining - 32].
	^ result
%

category: 'Grail-Mersenne Twister'
method: PyMersenneTwister
___randbelow: m
	"_randbelow_with_getrandbits for an int m > 0."

	| k r |
	k := m highBit.
	r := self ___getrandbits: k.
	[r >= m] whileTrue: [r := self ___getrandbits: k].
	^ r
%

category: 'Grail-Mersenne Twister'
method: PyMersenneTwister
___seedFrom: arg
	"random_seed(self, arg).  None draws 624 words of OS entropy; an int
	seeds with its absolute value; anything else with its hash, read as
	unsigned.  The seed is cut into 32-bit words from the right, least
	significant first, and at least one word is used."

	| n h key |
	(arg == nil or: [arg == None]) ifTrue: [^ self ___seedFromEntropy].
	(arg isKindOf: Boolean)
		ifTrue: [n := arg ifTrue: [1] ifFalse: [0]]
		ifFalse: [
			(arg isKindOf: Integer)
				ifTrue: [n := arg abs]
				ifFalse: [
					(arg isKindOf: AbstractPyInt)
						ifTrue: [n := arg value abs]
						ifFalse: [
							h := arg @env1:__hash__.
							n := h < 0 ifTrue: [h + (1 bitShift: 64)] ifFalse: [h]]]].
	key := OrderedCollection new.
	[key add: (n bitAnd: 16rFFFFFFFF).
	 n := n bitShift: -32.
	 n > 0] whileTrue.
	self ___initByArray: key asArray
%

category: 'Grail-Mersenne Twister'
method: PyMersenneTwister
___seedFromEntropy
	"random_seed_urandom(): init_by_array over 624 words from the OS CSPRNG
	(HostRandom, which secrets draws from too).  Kept per session like
	secrets' generator, because HostRandom holds an open OS resource."

	| temps gen key |
	temps := SessionTemps current.
	gen := temps at: #'___GrailRandomEntropy___' otherwise: nil.
	(gen == nil or: [(gen respondsTo: #isOpen) and: [gen isOpen not]]) ifTrue: [
		gen := HostRandom new.
		temps at: #'___GrailRandomEntropy___' put: gen].
	key := Array new: 624.
	1 to: 624 do: [:i | key at: i put: (gen integerBetween: 0 and: 16rFFFFFFFF)].
	self ___initByArray: key
%

! ---- Python protocol ----------------------------------------------------------

set compile_env: 1

category: 'Grail-Constructors'
classmethod: PyMersenneTwister
_new: positional kw: kwargs
	| inst |
	inst := self @env0:new.
	inst ___init__: (positional @env0:ifNil: [#()]) kw: kwargs.
	^ inst
%

category: 'Grail-Constructors'
classmethod: PyMersenneTwister
__new__
	^ self _new: #() kw: nil
%

category: 'Grail-Constructors'
classmethod: PyMersenneTwister
__new__: x
	^ self _new: { x } kw: nil
%

category: 'Grail-Constructors'
method: PyMersenneTwister
__init__
	"random_init with no argument: seed from entropy."

	self @env0:___seedFrom: nil.
	^ None
%

category: 'Grail-Constructors'
method: PyMersenneTwister
__init__: x
	"random_init(x): seed from x."

	self @env0:___seedFrom: x.
	^ None
%

category: 'Grail-Constructors'
method: PyMersenneTwister
___init__: positional kw: kwargs
	"random_init(*args, **kwargs) -- CPython refuses keywords on the exact
	type and more than one argument on any."

	(kwargs @env0:notNil and: [kwargs @env0:isEmpty @env0:not]) ifTrue: [
		^ TypeError ___signal___: 'Random() takes no keyword arguments'].
	(positional @env0:size @env0:> 1) ifTrue: [
		^ TypeError ___signal___: 'Random() requires 0 or 1 argument'].
	self @env0:___seedFrom: (positional @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [positional @env0:at: 1]).
	^ None
%

category: 'Grail-Python Methods'
method: PyMersenneTwister
random
	"random() -> x in the interval [0, 1).  53 bits: the top 27 of one word and
	the top 26 of the next, exactly as random_random computes them -- an
	integer below 2^53 and a power-of-two divisor, so both steps are exact."

	| a b |
	a := self @env0:___genrandUint32 @env0:bitShift: -5.
	b := self @env0:___genrandUint32 @env0:bitShift: -6.
	^ ((a @env0:* 67108864) @env0:+ b) @env0:asFloat @env0:/ 9007199254740992.0
%

category: 'Grail-Python Methods'
method: PyMersenneTwister
seed
	"seed() -- reseed from OS entropy."

	self @env0:___seedFrom: nil.
	^ None
%

category: 'Grail-Python Methods'
method: PyMersenneTwister
seed: n
	"seed(n) -- see ___seedFrom:."

	self @env0:___seedFrom: n.
	^ None
%

category: 'Grail-Python Methods'
method: PyMersenneTwister
getrandbits: k
	"getrandbits(k) -> an int with k random bits -- see ___getrandbits:."

	(k @env0:isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: ('''' @env0:, k ___pyTypeNameForError___
			@env0:, ''' object cannot be interpreted as an integer')].
	(k @env0:< 0) ifTrue: [
		^ ValueError ___signal___: 'number of bits must be non-negative'].
	^ self @env0:___getrandbits: k
%

category: 'Grail-Python Methods'
method: PyMersenneTwister
_randbelow: n
	"_randbelow(n) -> a random int in [0, n), for n > 0: random.py's
	_randbelow_with_getrandbits, step for step -- k = n.bit_length(), draw k
	bits, draw again while the draw is >= n -- so it answers the same numbers.

	random.py's Random inherits THIS one rather than assigning its Python
	method (a GRAIL edit there; a subclass that overrides getrandbits() or
	random() still gets a Python version from __init_subclass__).  It is the
	inner loop of randrange, randint, choice and shuffle, and as five
	Python-level calls per draw it made randrange ~25us: test_set's
	mutating-set tests make hundreds of thousands of randrange calls and ran
	past the suite's 600s budget.

	n <= 0 raises ValueError where CPython's would loop forever (0) or answer
	nothing sensible (negative); randrange never passes one."

	| m |
	m := (n @env0:isKindOf: Integer) ifTrue: [n] ifFalse: [n __index__].
	(m @env0:<= 0) ifTrue: [
		^ ValueError ___signal___: '_randbelow() requires a positive bound'].
	^ self @env0:___randbelow: m
%

category: 'Grail-Python Methods'
method: PyMersenneTwister
getstate
	"getstate() -> the 624 state words and the index, as one 625-tuple."

	mt @env0:isNil ifTrue: [self @env0:___seedFrom: nil].
	^ tuple @env0:withAll: (mt @env0:copyWith: mti)
%

category: 'Grail-Python Methods'
method: PyMersenneTwister
setstate: state
	"setstate(state) -- restore what getstate() answered.  Validated as
	random_setstate validates it, and nothing is changed unless all of it is
	valid."

	| words index e |
	(state @env0:isKindOf: tuple) ifFalse: [
		^ TypeError ___signal___: 'state vector must be a tuple'].
	(state @env0:size @env0:= 625) ifFalse: [
		^ ValueError ___signal___: 'state vector is the wrong size'].
	words := Array @env0:new: 624.
	1 @env0:to: 624 do: [:i |
		e := state @env0:at: i.
		(e @env0:isKindOf: Integer) ifFalse: [
			^ TypeError ___signal___: ('''' @env0:, e ___pyTypeNameForError___
				@env0:, ''' object cannot be interpreted as an integer')].
		(e @env0:< 0) ifTrue: [
			^ OverflowError ___signal___: 'can''t convert negative int to unsigned'].
		(e @env0:>= (1 @env0:bitShift: 64)) ifTrue: [
			^ OverflowError ___signal___: 'Python int too large to convert to C unsigned long'].
		words @env0:at: i put: (e @env0:bitAnd: 16rFFFFFFFF)].
	index := state @env0:at: 625.
	(index @env0:isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: ('''' @env0:, index ___pyTypeNameForError___
			@env0:, ''' object cannot be interpreted as an integer')].
	(index @env0:< 0 @env0:or: [index @env0:> 624]) ifTrue: [
		^ ValueError ___signal___: 'invalid state'].
	mt := words.
	mti := index.
	^ None
%

! ---- Module-level fast paths --------------------------------------------------
! random.py binds its module functions to methods of ``_inst'', which is always
! an EXACT Random -- never a subclass -- so for it randrange & co. can run the
! same code natively.  Each _grail_* method below is the random.py method of the
! same name transcribed step for step, errors included, over the same
! _randbelow, so the numbers are unchanged.  Instances and subclasses keep
! random.py's Python methods; only the module-level names are rebound (a GRAIL
! edit at the bottom of random.py).
!
! WHY.  In Grail a Python method calling a method its class INHERITS from a
! native base -- ``self._randbelow(n)'' in randrange -- takes the generic
! attribute-load-and-call path (~4us), and randrange is five such calls deep.
! It cost ~9.5us against the Smalltalk random module's 1.65us, and test_set
! (hundreds of thousands of randrange calls) went 122s -> 478s.

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
___pyIndex: x
	"operator.index(x)."

	(x @env0:isKindOf: Integer) ifTrue: [^ x].
	(x @env0:isKindOf: Boolean) ifTrue: [^ x ifTrue: [1] ifFalse: [0]].
	(x @env0:isKindOf: AbstractPyInt) ifTrue: [^ x @env0:value].
	(x ___respondsTo___: #'__index__') ifTrue: [^ x __index__].
	^ TypeError ___signal___: ('''' @env0:, x ___pyTypeNameForError___
		@env0:, ''' object cannot be interpreted as an integer')
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
___randrange: start stop: stop step: step
	"Random.randrange; nil means the argument was not given."

	| istart istop width istep n |
	istart := self ___pyIndex: start.
	(stop == nil or: [stop == None]) ifTrue: [
		(step ~~ nil and: [((step @env0:isKindOf: Integer) and: [step @env0:= 1]) not])
			ifTrue: [^ TypeError ___signal___: 'Missing a non-None stop argument'].
		(istart @env0:> 0) ifTrue: [^ self @env0:___randbelow: istart].
		^ ValueError ___signal___: 'empty range for randrange()'].
	istop := self ___pyIndex: stop.
	width := istop @env0:- istart.
	istep := step == nil ifTrue: [1] ifFalse: [self ___pyIndex: step].
	istep @env0:= 1 ifTrue: [
		(width @env0:> 0) ifTrue: [^ istart @env0:+ (self @env0:___randbelow: width)].
		^ ValueError ___signal___: ('empty range in randrange(' @env0:, start __str__
			@env0:, ', ' @env0:, stop __str__ @env0:, ')')].
	(istep @env0:> 0)
		ifTrue: [n := (width @env0:+ istep @env0:- 1) @env0:// istep]
		ifFalse: [
			(istep @env0:< 0)
				ifTrue: [n := (width @env0:+ istep @env0:+ 1) @env0:// istep]
				ifFalse: [^ ValueError ___signal___: 'zero step for randrange()']].
	(n @env0:<= 0) ifTrue: [
		^ ValueError ___signal___: ('empty range in randrange(' @env0:, start __str__
			@env0:, ', ' @env0:, stop __str__ @env0:, ', ' @env0:, step __str__ @env0:, ')')].
	^ istart @env0:+ (istep @env0:* (self @env0:___randbelow: n))
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
_grail_randrange: start
	^ self ___randrange: start stop: nil step: nil
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
_grail_randrange: start _: stop
	^ self ___randrange: start stop: stop step: nil
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
_grail_randrange: start _: stop _: step
	^ self ___randrange: start stop: stop step: step
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
__grail_randrange: positional kw: kwargs
	"randrange(start, stop=None, step=1) with keywords."

	| args start stop step |
	args := Array @env0:new: 3.
	1 @env0:to: (positional @env0:size @env0:min: 3) do: [:i |
		args @env0:at: i put: (positional @env0:at: i)].
	(positional @env0:size @env0:> 3) ifTrue: [
		^ TypeError ___signal___: ('Random.randrange() takes from 2 to 4 positional arguments but '
			@env0:, (positional @env0:size @env0:+ 1) @env0:printString @env0:, ' were given')].
	kwargs @env0:ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | i |
			i := #('start' 'stop' 'step') @env0:indexOf: k @env0:asString.
			i @env0:= 0 ifTrue: [
				^ TypeError ___signal___: ('Random.randrange() got an unexpected keyword argument '''
					@env0:, k @env0:asString @env0:, '''')].
			args @env0:at: i put: v]].
	start := args @env0:at: 1.
	start == nil ifTrue: [
		^ TypeError ___signal___: 'Random.randrange() missing 1 required positional argument: ''start'''].
	stop := args @env0:at: 2.
	step := args @env0:at: 3.
	^ self ___randrange: start stop: stop step: step
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
_grail_randint: a _: b
	"Random.randint."

	| ia ib |
	ia := self ___pyIndex: a.
	ib := self ___pyIndex: b.
	(ib @env0:< ia) ifTrue: [
		^ ValueError ___signal___: ('empty range in randint(' @env0:, ia __str__
			@env0:, ', ' @env0:, ib __str__ @env0:, ')')].
	^ ia @env0:+ (self @env0:___randbelow: ib @env0:- ia @env0:+ 1)
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
_grail_choice: seq
	"Random.choice."

	| n |
	n := seq __len__.
	n @env0:= 0 ifTrue: [
		^ IndexError ___signal___: 'Cannot choose from an empty sequence'].
	^ seq __getitem__: (self @env0:___randbelow: n)
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
_grail_shuffle: x
	"Random.shuffle: for i in reversed(range(1, len(x))), swap x[i] with
	x[randbelow(i + 1)] -- reading x[j] then x[i], storing x[i] then x[j], as
	the tuple assignment does."

	| j xj xi |
	(x __len__) @env0:- 1 @env0:to: 1 by: -1 do: [:i |
		j := self @env0:___randbelow: i @env0:+ 1.
		xj := x __getitem__: j.
		xi := x __getitem__: i.
		x __setitem__: i _: xj.
		x __setitem__: j _: xi].
	^ None
%

category: 'Grail-Module Fast Paths'
method: PyMersenneTwister
_grail_uniform: a _: b
	"Random.uniform: a + (b - a) * random()."

	^ a ___binOpAdd___: ((b ___binOpSub___: a) ___binOpMul___: self random)
%

! ------- the _random module ----------------------------------------------------

set compile_env: 0

expectvalue /Class
doit
NativeModule subclass: '_random'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_random comment:
'Python ``_random'' -- the Mersenne Twister core (PyMersenneTwister, published
as ``_random.Random'') that CPython''s random.py subclasses.'
%

expectvalue /Class
doit
_random category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
_random removeAllMethods: 0.
_random removeAllMethods: 1.
_random class removeAllMethods: 0.
_random class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: _random
initialize
	self @env0:at: #Random put: PyMersenneTwister
%

set compile_env: 0
