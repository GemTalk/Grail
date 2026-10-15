Extension { #name : 'PyMersenneTwister' }

{ #category : 'Grail-Constructors' }
PyMersenneTwister class >> __new__ [
	^ self _new: #() kw: nil

]

{ #category : 'Grail-Constructors' }
PyMersenneTwister class >> __new__: x [
	^ self _new: { x } kw: nil

]

{ #category : 'Grail-Constructors' }
PyMersenneTwister class >> _new: positional kw: kwargs [
	| inst |
	inst := self @env0:new.
	inst ___init__: (positional @env0:ifNil: [#()]) kw: kwargs.
	^ inst

]

{ #category : 'Grail-Constructors' }
PyMersenneTwister >> ___init__: positional kw: kwargs [
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

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> ___pyIndex: x [
	"operator.index(x)."

	(x @env0:isKindOf: Integer) ifTrue: [^ x].
	(x @env0:isKindOf: Boolean) ifTrue: [^ x ifTrue: [1] ifFalse: [0]].
	(x @env0:isKindOf: AbstractPyInt) ifTrue: [^ x @env0:value].
	(x ___respondsTo___: #'__index__') ifTrue: [^ x __index__].
	^ TypeError ___signal___: ('''' @env0:, x ___pyTypeNameForError___
		@env0:, ''' object cannot be interpreted as an integer')

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> ___randrange: start stop: stop step: step [
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

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> __grail_randrange: positional kw: kwargs [
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

]

{ #category : 'Grail-Constructors' }
PyMersenneTwister >> __init__ [
	"random_init with no argument: seed from entropy."

	self @env0:___seedFrom: nil.
	^ None

]

{ #category : 'Grail-Constructors' }
PyMersenneTwister >> __init__: x [
	"random_init(x): seed from x."

	self @env0:___seedFrom: x.
	^ None

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> _grail_choice: seq [
	"Random.choice."

	| n |
	n := seq __len__.
	n @env0:= 0 ifTrue: [
		^ IndexError ___signal___: 'Cannot choose from an empty sequence'].
	^ seq __getitem__: (self @env0:___randbelow: n)

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> _grail_randint: a _: b [
	"Random.randint."

	| ia ib |
	ia := self ___pyIndex: a.
	ib := self ___pyIndex: b.
	(ib @env0:< ia) ifTrue: [
		^ ValueError ___signal___: ('empty range in randint(' @env0:, ia __str__
			@env0:, ', ' @env0:, ib __str__ @env0:, ')')].
	^ ia @env0:+ (self @env0:___randbelow: ib @env0:- ia @env0:+ 1)

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> _grail_randrange: start [
	^ self ___randrange: start stop: nil step: nil

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> _grail_randrange: start _: stop [
	^ self ___randrange: start stop: stop step: nil

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> _grail_randrange: start _: stop _: step [
	^ self ___randrange: start stop: stop step: step

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> _grail_shuffle: x [
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

]

{ #category : 'Grail-Module Fast Paths' }
PyMersenneTwister >> _grail_uniform: a _: b [
	"Random.uniform: a + (b - a) * random()."

	^ a ___binOpAdd___: ((b ___binOpSub___: a) ___binOpMul___: self random)

]

{ #category : 'Grail-Python Methods' }
PyMersenneTwister >> _randbelow: n [
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

]

{ #category : 'Grail-Python Methods' }
PyMersenneTwister >> getrandbits: k [
	"getrandbits(k) -> an int with k random bits -- see ___getrandbits:."

	(k @env0:isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: ('''' @env0:, k ___pyTypeNameForError___
			@env0:, ''' object cannot be interpreted as an integer')].
	(k @env0:< 0) ifTrue: [
		^ ValueError ___signal___: 'number of bits must be non-negative'].
	^ self @env0:___getrandbits: k

]

{ #category : 'Grail-Python Methods' }
PyMersenneTwister >> getstate [
	"getstate() -> the 624 state words and the index, as one 625-tuple."

	mt @env0:isNil ifTrue: [self @env0:___seedFrom: nil].
	^ tuple @env0:withAll: (mt @env0:copyWith: mti)

]

{ #category : 'Grail-Python Methods' }
PyMersenneTwister >> random [
	"random() -> x in the interval [0, 1).  53 bits: the top 27 of one word and
	the top 26 of the next, exactly as random_random computes them -- an
	integer below 2^53 and a power-of-two divisor, so both steps are exact."

	| a b |
	a := self @env0:___genrandUint32 @env0:bitShift: -5.
	b := self @env0:___genrandUint32 @env0:bitShift: -6.
	^ ((a @env0:* 67108864) @env0:+ b) @env0:asFloat @env0:/ 9007199254740992.0

]

{ #category : 'Grail-Python Methods' }
PyMersenneTwister >> seed [
	"seed() -- reseed from OS entropy."

	self @env0:___seedFrom: nil.
	^ None

]

{ #category : 'Grail-Python Methods' }
PyMersenneTwister >> seed: n [
	"seed(n) -- see ___seedFrom:."

	self @env0:___seedFrom: n.
	^ None

]

{ #category : 'Grail-Python Methods' }
PyMersenneTwister >> setstate: state [
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

]
