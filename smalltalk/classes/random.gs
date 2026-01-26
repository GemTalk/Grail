! ===============================================================================
! random Methods (Python 'random' module)
! ===============================================================================
! This file implements Python's random module for pseudo-random number generation.
! It uses GemStone's Random class as the underlying generator.
!
! See https://docs.python.org/3/library/random.html
! ===============================================================================

! ------------------- Remove existing Python methods from random
expectvalue /Metaclass3
doit
random removeAllMethods: 2.
random class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Instance methods for random - Initialization

category: 'Python-Initialization'
method: random
initialize
	"Initialize all module attributes with their default values"
	self
		initialize_generator;
		initialize_random;
		initialize_seed;
		initialize_getstate;
		initialize_setstate;
		initialize_getrandbits;
		initialize_randbytes;
		initialize_randrange;
		initialize_randint;
		initialize_choice;
		initialize_choices;
		initialize_shuffle;
		initialize_sample;
		initialize_uniform;
		initialize_triangular;
		initialize_gauss;
		initialize_normalvariate;
		initialize_lognormvariate;
		initialize_expovariate;
		initialize_gammavariate;
		initialize_betavariate;
		initialize_paretovariate;
		initialize_weibullvariate;
		initialize_binomialvariate;
		yourself
%

category: 'Python-Initialization'
method: random
initialize_generator
	"Initialize the internal random generator using GemStone's Random class"
	self ___at___: #_generator put: (Random ___new___)
%

category: 'Python-Private'
method: random
_sequenceLength: seq
	"Get the length of a sequence, supporting both Python objects (__len__) and Smalltalk objects (___size___)"
	^ [seq __len__] ___on___: MessageNotUnderstood do: [:ex | seq ___size___]
%

category: 'Python-Initialization'
method: random
initialize_random
	"random() -> x in the interval [0, 1)"
	self ___at___: #random put: [:positional :keywords |
		(self ___at___: #_generator) perform: #float env: 0
	]
%

category: 'Python-Initialization'
method: random
initialize_seed
	"seed(a=None) -> None. Initialize internal state from a seed.
	If a is None, uses system time or OS random source."
	self ___at___: #seed put: [:positional :keywords |
		| a |
		a := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [nil].
		(a == nil or: [a == None]) ifTrue: [
			self ___at___: #_generator put: (Random ___new___)
		] ifFalse: [
			self ___at___: #_generator put: (Random perform: #seed: env: 0 withArguments: {a ___asInteger___})
		].
		None
	]
%

category: 'Python-Initialization'
method: random
initialize_getstate
	"getstate() -> Return internal state; can be passed to setstate() later.
	Note: GemStone's Random doesn't expose internal state, so this is limited."
	self ___at___: #getstate put: [:positional :keywords |
		NotImplementedError ___signal___: 'getstate() is not supported with GemStone''s Random'
	]
%

category: 'Python-Initialization'
method: random
initialize_setstate
	"setstate(state) -> Restore internal state from object returned by getstate()."
	self ___at___: #setstate put: [:positional :keywords |
		NotImplementedError ___signal___: 'setstate() is not supported with GemStone''s Random'
	]
%

category: 'Python-Initialization'
method: random
initialize_getrandbits
	"getrandbits(k) -> Return a non-negative integer with k random bits."
	self ___at___: #getrandbits put: [:positional :keywords |
		| k result bitsNeeded |
		k := positional ___at___: 1.
		(k ___lt___: 0) ifTrue: [
			ValueError ___signal___: 'number of bits must be non-negative'
		].
		(k ___eq___: 0) ifTrue: [ 0 ] ifFalse: [
			"Build random integer by combining 32-bit chunks"
			result := 0.
			bitsNeeded := k.
			[bitsNeeded ___gt___: 0] ___whileTrue___: [
				| chunk bits |
				chunk := (self ___at___: #_generator) perform: #integer env: 0.
				bits := bitsNeeded ___min___: 32.
				result := (result perform: #bitShift: env: 0 withArguments: {bits})
					perform: #bitOr: env: 0 withArguments: {
						chunk perform: #bitAnd: env: 0 withArguments: {(1 perform: #bitShift: env: 0 withArguments: {bits}) ___minus___: 1}
					}.
				bitsNeeded := bitsNeeded ___minus___: 32.
			].
			result
		]
	]
%

category: 'Python-Initialization'
method: random
initialize_randbytes
	"randbytes(n) -> Return n random bytes."
	self ___at___: #randbytes put: [:positional :keywords |
		| n result |
		n := positional ___at___: 1.
		(n ___lt___: 0) ifTrue: [
			ValueError ___signal___: 'number of bytes must be non-negative'
		].
		(n ___eq___: 0) ifTrue: [ bytes ___new___ ] ifFalse: [
			"Generate random bytes using the generator"
			result := ByteArray ___new___: n.
			1 ___to___: n do: [:i |
				result ___at___: i put: (((self ___at___: #_generator) perform: #integer env: 0) perform: #bitAnd: env: 0 withArguments: {16rFF})
			].
			result
		]
	]
%

category: 'Python-Initialization'
method: random
initialize_randrange
	"randrange(stop) or randrange(start, stop[, step])
	Return a randomly selected element from range(start, stop, step)."
	self ___at___: #randrange put: [:positional :keywords |
		| start stop step count r result |
		(positional ___size___ ___eq___: 1) ifTrue: [
			"randrange(stop)"
			start := 0.
			stop := positional ___at___: 1.
			step := 1.
		] ifFalse: [
			start := positional ___at___: 1.
			stop := positional ___at___: 2.
			step := (positional ___size___ ___ge___: 3) ifTrue: [positional ___at___: 3] ifFalse: [1].
		].
		(step ___eq___: 0) ifTrue: [
			ValueError ___signal___: 'zero step for randrange()'
		].
		"Calculate number of elements in range"
		(step ___gt___: 0) ifTrue: [
			| diff |
			diff := stop ___minus___: start.
			count := ((diff ___plus___: step) ___minus___: 1) perform: #// env: 0 withArguments: {step}.
		] ifFalse: [
			| diff negStep |
			diff := start ___minus___: stop.
			negStep := step perform: #negated env: 0.
			count := ((diff ___plus___: negStep) ___minus___: 1) perform: #// env: 0 withArguments: {negStep}.
		].
		(count ___le___: 0) ifTrue: [
			ValueError ___signal___: 'empty range for randrange()'
		].
		"Pick a random index and compute the element"
		r := (self ___at___: #_generator) perform: #integerBetween:and: env: 0 withArguments: {0. (count ___minus___: 1)}.
		result := start ___plus___: (r ___times___: step).
		result
	]
%

category: 'Python-Initialization'
method: random
initialize_randint
	"randint(a, b) -> Return random integer in range [a, b], including both end points."
	self ___at___: #randint put: [:positional :keywords |
		| a b |
		a := positional ___at___: 1.
		b := positional ___at___: 2.
		(self ___at___: #_generator) perform: #integerBetween:and: env: 0 withArguments: {a. b}
	]
%

category: 'Python-Initialization'
method: random
initialize_choice
	"choice(seq) -> Return a random element from the non-empty sequence."
	self ___at___: #choice put: [:positional :keywords |
		| seq len idx |
		seq := positional ___at___: 1.
		len := self _sequenceLength: seq.
		(len ___eq___: 0) ifTrue: [
			IndexError ___signal___: 'Cannot choose from an empty sequence'
		].
		idx := (self ___at___: #_generator) perform: #integerBetween:and: env: 0 withArguments: {1. len}.
		seq ___at___: idx
	]
%

category: 'Python-Initialization'
method: random
initialize_choices
	"choices(population, weights=None, *, cum_weights=None, k=1)
	-> Return a k sized list of elements chosen with replacement."
	self ___at___: #choices put: [:positional :keywords |
		| population weights cumWeights k result total n |
		population := positional ___at___: 1.
		n := self _sequenceLength: population.
		(n ___eq___: 0) ifTrue: [
			IndexError ___signal___: 'Cannot choose from an empty population'
		].
		weights := (keywords notNil and: [keywords perform: #includesKey: env: 0 withArguments: {#weights}])
			ifTrue: [keywords ___at___: #weights] ifFalse: [nil].
		cumWeights := (keywords notNil and: [keywords perform: #includesKey: env: 0 withArguments: {#'cum_weights'}])
			ifTrue: [keywords ___at___: #'cum_weights'] ifFalse: [nil].
		k := (keywords notNil and: [keywords perform: #includesKey: env: 0 withArguments: {#k}])
			ifTrue: [keywords ___at___: #k] ifFalse: [1].
		"Cannot specify both weights and cum_weights"
		(weights notNil and: [cumWeights notNil]) ifTrue: [
			TypeError ___signal___: 'Cannot specify both weights and cum_weights'
		].
		"Build cumulative weights if needed"
		weights notNil ifTrue: [
			total := 0.
			cumWeights := Array ___new___: n.
			1 ___to___: n do: [:i |
				total := total ___plus___: (weights ___at___: i).
				cumWeights ___at___: i put: total.
			].
		].
		cumWeights notNil ifTrue: [
			total := cumWeights ___at___: n.
			(total ___le___: 0) ifTrue: [
				ValueError ___signal___: 'Total of weights must be greater than zero'
			].
			"Weighted selection"
			result := list ___new___.
			1 ___to___: k do: [:unused |
				| r idx |
				r := ((self ___at___: #_generator) perform: #float env: 0) ___times___: total.
				idx := 1.
				[(idx ___lt___: n) and: [(cumWeights ___at___: idx) ___le___: r]] ___whileTrue___: [
					idx := idx ___plus___: 1.
				].
				result perform: #append: env: 2 withArguments: {population ___at___: idx}.
			].
		] ifFalse: [
			"Uniform selection"
			result := list ___new___.
			1 ___to___: k do: [:unused |
				| idx |
				idx := (self ___at___: #_generator) perform: #integerBetween:and: env: 0 withArguments: {1. n}.
				result perform: #append: env: 2 withArguments: {population ___at___: idx}.
			].
		].
		result
	]
%


category: 'Python-Initialization'
method: random
initialize_shuffle
	"shuffle(x) -> Shuffle list x in place; return None.
	Uses Fisher-Yates shuffle algorithm."
	self ___at___: #shuffle put: [:positional :keywords |
		| x n |
		x := positional ___at___: 1.
		n := self _sequenceLength: x.
		"Fisher-Yates shuffle"
		n ___to___: 2 by: -1 do: [:i |
			| j temp |
			j := (self ___at___: #_generator) perform: #integerBetween:and: env: 0 withArguments: {1. i}.
			"Swap elements at i and j"
			temp := x ___at___: i.
			x ___at___: i put: (x ___at___: j).
			x ___at___: j put: temp.
		].
		None
	]
%

category: 'Python-Initialization'
method: random
initialize_sample
	"sample(population, k) -> Return k length list of unique elements from population.
	Used for random sampling without replacement."
	self ___at___: #sample put: [:positional :keywords |
		| population k n result pool setsize |
		population := positional ___at___: 1.
		k := (positional ___size___ ___ge___: 2)
			ifTrue: [positional ___at___: 2]
			ifFalse: [
				(keywords notNil and: [keywords perform: #includesKey: env: 0 withArguments: {#k}])
					ifTrue: [keywords ___at___: #k] ifFalse: [nil]
			].
		k ifNil: [
			TypeError ___signal___: 'sample() missing required argument: k'
		].
		n := self _sequenceLength: population.
		(k ___lt___: 0) ifTrue: [
			ValueError ___signal___: 'Sample larger than population or is negative'
		].
		(k ___gt___: n) ifTrue: [
			ValueError ___signal___: 'Sample larger than population or is negative'
		].
		result := list ___new___.
		"For small k relative to n, use selection sampling"
		"For larger k, use pool-based sampling"
		((k ___times___: 3) ___le___: n) ifTrue: [
			"Selection sampling - pick k unique random indices"
			| selected |
			selected := IdentitySet ___new___.
			[selected ___size___ ___lt___: k] ___whileTrue___: [
				| idx |
				idx := (self ___at___: #_generator) perform: #integerBetween:and: env: 0 withArguments: {1. n}.
				(selected perform: #includes: env: 0 withArguments: {idx}) ifFalse: [
					selected perform: #add: env: 0 withArguments: {idx}.
					result perform: #append: env: 2 withArguments: {population ___at___: idx}.
				].
			].
		] ifFalse: [
			"Pool-based sampling"
			pool := Array ___new___: n.
			1 ___to___: n do: [:i | pool ___at___: i put: (population ___at___: i) ].
			1 ___to___: k do: [:i |
				| j temp |
				j := (self ___at___: #_generator) perform: #integerBetween:and: env: 0 withArguments: {i. n}.
				"Swap and add to result"
				temp := pool ___at___: j.
				pool ___at___: j put: (pool ___at___: i).
				pool ___at___: i put: temp.
				result perform: #append: env: 2 withArguments: {temp}.
			].
		].
		result
	]
%


category: 'Python-Initialization'
method: random
initialize_uniform
	"uniform(a, b) -> Return random float N such that a <= N <= b."
	self ___at___: #uniform put: [:positional :keywords |
		| a b |
		a := positional ___at___: 1.
		b := positional ___at___: 2.
		a ___plus___: (((self ___at___: #_generator) perform: #float env: 0) ___times___: (b ___minus___: a))
	]
%

category: 'Python-Initialization'
method: random
initialize_triangular
	"triangular(low=0.0, high=1.0, mode=None) -> Return random float from triangular distribution."
	self ___at___: #triangular put: [:positional :keywords |
		| low high mode u c |
		low := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [0.0].
		high := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [1.0].
		mode := (positional ___size___ ___ge___: 3) ifTrue: [positional ___at___: 3] ifFalse: [nil].
		(mode == nil or: [mode == None]) ifTrue: [
			mode := (low ___plus___: high) perform: #/ env: 0 withArguments: {2.0}
		].
		u := (self ___at___: #_generator) perform: #float env: 0.
		c := (mode ___minus___: low) perform: #/ env: 0 withArguments: {high ___minus___: low}.
		(u ___lt___: c) ifTrue: [
			low ___plus___: (((u ___times___: (high ___minus___: low)) ___times___: (mode ___minus___: low)) ___sqrt___)
		] ifFalse: [
			high ___minus___: ((((1.0 ___minus___: u) ___times___: (high ___minus___: low)) ___times___: (high ___minus___: mode)) ___sqrt___)
		]
	]
%

category: 'Python-Initialization'
method: random
initialize_gauss
	"gauss(mu=0.0, sigma=1.0) -> Return random float from Gaussian distribution.
	Uses Box-Muller transform."
	self ___at___: #gauss put: [:positional :keywords |
		| mu sigma u1 u2 z |
		mu := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [0.0].
		sigma := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [1.0].
		"Box-Muller transform"
		u1 := (self ___at___: #_generator) perform: #float env: 0.
		u2 := (self ___at___: #_generator) perform: #float env: 0.
		"Avoid log(0)"
		[u1 ___eq___: 0.0] ___whileTrue___: [u1 := (self ___at___: #_generator) perform: #float env: 0].
		z := ((-2.0 ___times___: (u1 perform: #ln env: 0)) ___sqrt___)
			___times___: (((2.0 ___times___: (Float perform: #pi env: 0)) ___times___: u2) perform: #cos env: 0).
		mu ___plus___: (z ___times___: sigma)
	]
%

category: 'Python-Initialization'
method: random
initialize_normalvariate
	"normalvariate(mu=0.0, sigma=1.0) -> Return random float from normal distribution.
	Same as gauss() but thread-safe (in Python)."
	self ___at___: #normalvariate put: [:positional :keywords |
		| mu sigma |
		mu := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [0.0].
		sigma := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [1.0].
		"Delegate to gauss implementation"
		(self ___at___: #gauss) value: {mu. sigma} value: nil
	]
%

category: 'Python-Initialization'
method: random
initialize_lognormvariate
	"lognormvariate(mu, sigma) -> Return random float from log-normal distribution."
	self ___at___: #lognormvariate put: [:positional :keywords |
		| mu sigma |
		mu := positional ___at___: 1.
		sigma := positional ___at___: 2.
		((self ___at___: #gauss) value: {mu. sigma} value: nil) perform: #exp env: 0
	]
%

category: 'Python-Initialization'
method: random
initialize_expovariate
	"expovariate(lambd=1.0) -> Return random float from exponential distribution."
	self ___at___: #expovariate put: [:positional :keywords |
		| lambd u |
		lambd := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [1.0].
		u := (self ___at___: #_generator) perform: #float env: 0.
		"Avoid log(0)"
		[u ___eq___: 0.0] ___whileTrue___: [u := (self ___at___: #_generator) perform: #float env: 0].
		(((1.0 ___minus___: u) perform: #ln env: 0) perform: #negated env: 0)
			perform: #/ env: 0 withArguments: {lambd}
	]
%


category: 'Python-Initialization'
method: random
initialize_gammavariate
	"gammavariate(alpha, beta) -> Return random float from gamma distribution.
	Uses Marsaglia and Tsang's method for alpha >= 1."
	self ___at___: #gammavariate put: [:positional :keywords |
		| alpha beta result |
		alpha := positional ___at___: 1.
		beta := positional ___at___: 2.
		(alpha ___le___: 0) ifTrue: [
			ValueError ___signal___: 'gammavariate: alpha must be > 0'
		].
		(beta ___le___: 0) ifTrue: [
			ValueError ___signal___: 'gammavariate: beta must be > 0'
		].
		(alpha ___ge___: 1.0) ifTrue: [
			"Marsaglia and Tsang's method"
			| d c x v u |
			d := alpha ___minus___: (1.0 perform: #/ env: 0 withArguments: {3.0}).
			c := 1.0 perform: #/ env: 0 withArguments: {(9.0 ___times___: d) ___sqrt___}.
			result := nil.
			[result == nil] ___whileTrue___: [
				x := (self ___at___: #gauss) value: {0.0. 1.0} value: nil.
				v := (1.0 ___plus___: (c ___times___: x)) ___raisedTo___: 3.
				(v ___gt___: 0) ifTrue: [
					u := (self ___at___: #_generator) perform: #float env: 0.
					((u ___lt___: (1.0 ___minus___: ((0.0331 ___times___: (x ___times___: x)) ___times___: (x ___times___: x))))
						or: [(u perform: #ln env: 0) ___lt___: (((0.5 ___times___: x) ___times___: x) ___plus___: (d ___times___: ((1.0 ___minus___: v) ___plus___: (v perform: #ln env: 0))))]) ifTrue: [
						result := (d ___times___: v) ___times___: beta.
					].
				].
			].
		] ifFalse: [
			"For alpha < 1, use: gamma(alpha) = gamma(alpha+1) * U^(1/alpha)"
			| u g |
			u := (self ___at___: #_generator) perform: #float env: 0.
			[u ___eq___: 0.0] ___whileTrue___: [u := (self ___at___: #_generator) perform: #float env: 0].
			g := (self ___at___: #gammavariate) value: {alpha ___plus___: 1.0. 1.0} value: nil.
			result := (g ___times___: (u ___raisedTo___: (1.0 perform: #/ env: 0 withArguments: {alpha}))) ___times___: beta.
		].
		result
	]
%

category: 'Python-Initialization'
method: random
initialize_betavariate
	"betavariate(alpha, beta) -> Return random float from beta distribution.
	Returned value is between 0 and 1."
	self ___at___: #betavariate put: [:positional :keywords |
		| alpha beta y |
		alpha := positional ___at___: 1.
		beta := positional ___at___: 2.
		"Beta is computed from two gamma variates"
		y := (self ___at___: #gammavariate) value: {alpha. 1.0} value: nil.
		(y ___eq___: 0) ifTrue: [
			0.0
		] ifFalse: [
			y perform: #/ env: 0 withArguments: {y ___plus___: ((self ___at___: #gammavariate) value: {beta. 1.0} value: nil)}
		]
	]
%

category: 'Python-Initialization'
method: random
initialize_paretovariate
	"paretovariate(alpha) -> Return random float from Pareto distribution."
	self ___at___: #paretovariate put: [:positional :keywords |
		| alpha u |
		alpha := positional ___at___: 1.
		u := (self ___at___: #_generator) perform: #float env: 0.
		[u ___eq___: 0.0] ___whileTrue___: [u := (self ___at___: #_generator) perform: #float env: 0].
		1.0 perform: #/ env: 0 withArguments: {u ___raisedTo___: (1.0 perform: #/ env: 0 withArguments: {alpha})}
	]
%

category: 'Python-Initialization'
method: random
initialize_weibullvariate
	"weibullvariate(alpha, beta) -> Return random float from Weibull distribution."
	self ___at___: #weibullvariate put: [:positional :keywords |
		| alpha beta u |
		alpha := positional ___at___: 1.
		beta := positional ___at___: 2.
		u := (self ___at___: #_generator) perform: #float env: 0.
		[u ___eq___: 0.0] ___whileTrue___: [u := (self ___at___: #_generator) perform: #float env: 0].
		alpha ___times___: ((((1.0 ___minus___: u) perform: #ln env: 0) perform: #negated env: 0) ___raisedTo___: (1.0 perform: #/ env: 0 withArguments: {beta}))
	]
%

category: 'Python-Initialization'
method: random
initialize_binomialvariate
	"binomialvariate(n=1, p=0.5) -> Return number of successes for n trials with probability p."
	self ___at___: #binomialvariate put: [:positional :keywords |
		| n p successes |
		n := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [1].
		p := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [0.5].
		(n ___lt___: 0) ifTrue: [
			ValueError ___signal___: 'n must be non-negative'
		].
		((p ___lt___: 0) or: [p ___gt___: 1]) ifTrue: [
			ValueError ___signal___: 'p must be in range [0, 1]'
		].
		successes := 0.
		1 ___to___: n do: [:unused |
			(((self ___at___: #_generator) perform: #float env: 0) ___lt___: p) ifTrue: [
				successes := successes ___plus___: 1.
			].
		].
		successes
	]
%

! ------------------- Accessor methods for random

category: 'Python-Accessors'
method: random
random
	^ self ___at___: #random
%

category: 'Python-Accessors'
method: random
random: aValue
	self ___at___: #random put: aValue
%

category: 'Python-Accessors'
method: random
seed
	^ self ___at___: #seed
%

category: 'Python-Accessors'
method: random
seed: aValue
	self ___at___: #seed put: aValue
%

category: 'Python-Accessors'
method: random
getstate
	^ self ___at___: #getstate
%

category: 'Python-Accessors'
method: random
getstate: aValue
	self ___at___: #getstate put: aValue
%

category: 'Python-Accessors'
method: random
setstate
	^ self ___at___: #setstate
%

category: 'Python-Accessors'
method: random
setstate: aValue
	self ___at___: #setstate put: aValue
%

category: 'Python-Accessors'
method: random
getrandbits
	^ self ___at___: #getrandbits
%

category: 'Python-Accessors'
method: random
getrandbits: aValue
	self ___at___: #getrandbits put: aValue
%

category: 'Python-Accessors'
method: random
randbytes
	^ self ___at___: #randbytes
%

category: 'Python-Accessors'
method: random
randbytes: aValue
	self ___at___: #randbytes put: aValue
%

category: 'Python-Accessors'
method: random
randrange
	^ self ___at___: #randrange
%

category: 'Python-Accessors'
method: random
randrange: aValue
	self ___at___: #randrange put: aValue
%

category: 'Python-Accessors'
method: random
randint
	^ self ___at___: #randint
%

category: 'Python-Accessors'
method: random
randint: aValue
	self ___at___: #randint put: aValue
%

category: 'Python-Accessors'
method: random
choice
	^ self ___at___: #choice
%

category: 'Python-Accessors'
method: random
choice: aValue
	self ___at___: #choice put: aValue
%

category: 'Python-Accessors'
method: random
choices
	^ self ___at___: #choices
%

category: 'Python-Accessors'
method: random
choices: aValue
	self ___at___: #choices put: aValue
%

category: 'Python-Accessors'
method: random
shuffle
	^ self ___at___: #shuffle
%

category: 'Python-Accessors'
method: random
shuffle: aValue
	self ___at___: #shuffle put: aValue
%

category: 'Python-Accessors'
method: random
sample
	^ self ___at___: #sample
%

category: 'Python-Accessors'
method: random
sample: aValue
	self ___at___: #sample put: aValue
%

category: 'Python-Accessors'
method: random
uniform
	^ self ___at___: #uniform
%

category: 'Python-Accessors'
method: random
uniform: aValue
	self ___at___: #uniform put: aValue
%

category: 'Python-Accessors'
method: random
triangular
	^ self ___at___: #triangular
%

category: 'Python-Accessors'
method: random
triangular: aValue
	self ___at___: #triangular put: aValue
%

category: 'Python-Accessors'
method: random
gauss
	^ self ___at___: #gauss
%

category: 'Python-Accessors'
method: random
gauss: aValue
	self ___at___: #gauss put: aValue
%

category: 'Python-Accessors'
method: random
normalvariate
	^ self ___at___: #normalvariate
%

category: 'Python-Accessors'
method: random
normalvariate: aValue
	self ___at___: #normalvariate put: aValue
%

category: 'Python-Accessors'
method: random
lognormvariate
	^ self ___at___: #lognormvariate
%

category: 'Python-Accessors'
method: random
lognormvariate: aValue
	self ___at___: #lognormvariate put: aValue
%

category: 'Python-Accessors'
method: random
expovariate
	^ self ___at___: #expovariate
%

category: 'Python-Accessors'
method: random
expovariate: aValue
	self ___at___: #expovariate put: aValue
%

category: 'Python-Accessors'
method: random
gammavariate
	^ self ___at___: #gammavariate
%

category: 'Python-Accessors'
method: random
gammavariate: aValue
	self ___at___: #gammavariate put: aValue
%

category: 'Python-Accessors'
method: random
betavariate
	^ self ___at___: #betavariate
%

category: 'Python-Accessors'
method: random
betavariate: aValue
	self ___at___: #betavariate put: aValue
%

category: 'Python-Accessors'
method: random
paretovariate
	^ self ___at___: #paretovariate
%

category: 'Python-Accessors'
method: random
paretovariate: aValue
	self ___at___: #paretovariate put: aValue
%

category: 'Python-Accessors'
method: random
weibullvariate
	^ self ___at___: #weibullvariate
%

category: 'Python-Accessors'
method: random
weibullvariate: aValue
	self ___at___: #weibullvariate put: aValue
%

category: 'Python-Accessors'
method: random
binomialvariate
	^ self ___at___: #binomialvariate
%

category: 'Python-Accessors'
method: random
binomialvariate: aValue
	self ___at___: #binomialvariate put: aValue
%

set compile_env: 0
