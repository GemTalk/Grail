! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- random class (Python 'random' module)
expectvalue /Class
doit
module subclass: 'random'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
random comment:
'Python random module.

See https://docs.python.org/3/library/random.html
'
%

expectvalue /Class
doit
random category: 'Modules'
%

! ------------------- Remove existing Python methods from random
expectvalue /Metaclass3
doit
random removeAllMethods: 1.
random class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Private helpers
! ===============================================================================

category: 'Python-Private'
method: random
_sequenceLength: seq
	^ [seq __len__] ___on___: MessageNotUnderstood do: [:ex | seq ___size___]
%

category: 'Python-Private'
method: random
_generator
	"Return the internal random generator, re-creating it if needed."
	| gen |
	gen := self ___at___: #_generator.
	(gen == nil or: [(gen @env0:respondsTo: #isOpen) and: [(gen @env0:isOpen) not]]) ifTrue: [
		gen := Random ___new___.
		self ___at___: #_generator put: gen.
	].
	^ gen
%

! ===============================================================================
! Initialization
! ===============================================================================

category: 'Python-Initialization'
method: random
initialize
	"Initialize the internal random generator."
	self ___at___: #_generator put: (Random ___new___)
%

! ===============================================================================
! 0-arg fast-path callables
! ===============================================================================

category: 'Python-Built-in Functions'
method: random
random
	"random() -> float in [0, 1)"
	^ self _generator @env0:float
%

category: 'Python-Built-in Functions'
method: random
getstate
	"getstate() -> internal state (not supported)."
	^ NotImplementedError ___signal___: 'getstate() is not supported with GemStone''s Random'
%

category: 'Python-Built-in Functions'
method: random
setstate
	"setstate(state) -> restore state (not supported)."
	^ NotImplementedError ___signal___: 'setstate() is not supported with GemStone''s Random'
%

! ===============================================================================
! 1-arg fast-path callables
! ===============================================================================

category: 'Python-Built-in Functions'
method: random
choice: seq
	"choice(seq) -> random element from non-empty sequence."
	| len idx |
	len := self _sequenceLength: seq.
	(len ___eq___: 0) ifTrue: [IndexError ___signal___: 'Cannot choose from an empty sequence'].
	idx := self _generator @env0:integerBetween: 1 and: len.
	^ seq ___at___: idx
%

category: 'Python-Built-in Functions'
method: random
shuffle: x
	"shuffle(x) -> shuffle list x in place; return None."
	| n |
	n := self _sequenceLength: x.
	n ___to___: 2 by: -1 do: [:i |
		| j temp |
		j := self _generator @env0:integerBetween: 1 and: i.
		temp := x ___at___: i. x ___at___: i put: (x ___at___: j). x ___at___: j put: temp.
	].
	^ None
%

category: 'Python-Built-in Functions'
method: random
getrandbits: k
	"getrandbits(k) -> non-negative integer with k random bits."
	| result bitsNeeded |
	(k ___lt___: 0) ifTrue: [ValueError ___signal___: 'number of bits must be non-negative'].
	(k ___eq___: 0) ifTrue: [^ 0].
	result := 0. bitsNeeded := k.
	[bitsNeeded ___gt___: 0] ___whileTrue___: [
		| chunk bits |
		chunk := self _generator @env0:integer.
		bits := bitsNeeded ___min___: 32.
		result := (result @env0:bitShift: bits) @env0:bitOr: (chunk @env0:bitAnd: ((1 @env0:bitShift: bits) ___minus___: 1)).
		bitsNeeded := bitsNeeded ___minus___: 32.
	].
	^ result
%

category: 'Python-Built-in Functions'
method: random
randbytes: n
	"randbytes(n) -> n random bytes."
	| result |
	(n ___lt___: 0) ifTrue: [ValueError ___signal___: 'number of bytes must be non-negative'].
	(n ___eq___: 0) ifTrue: [^ bytes ___new___].
	result := ByteArray ___new___: n.
	1 ___to___: n do: [:i |
		result ___at___: i put: ((self _generator @env0:integer) @env0:bitAnd: 16rFF)
	].
	^ result
%

category: 'Python-Built-in Functions'
method: random
paretovariate: alpha
	"paretovariate(alpha) -> random float from Pareto distribution."
	| u |
	u := self _generator @env0:float.
	[u ___eq___: 0.0] ___whileTrue___: [u := self _generator @env0:float].
	^ 1.0 @env0:/ (u ___raisedTo___: (1.0 @env0:/ alpha))
%

category: 'Python-Built-in Functions'
method: random
expovariate: lambd
	"expovariate(lambd) -> random float from exponential distribution."
	| u |
	u := self _generator @env0:float.
	[u ___eq___: 0.0] ___whileTrue___: [u := self _generator @env0:float].
	^ (((1.0 ___minus___: u) @env0:ln) @env0:negated) @env0:/ lambd
%

! ===============================================================================
! 2-arg fast-path callables
! ===============================================================================

category: 'Python-Built-in Functions'
method: random
randint: a _: b
	"randint(a, b) -> random integer in [a, b]."
	^ self _generator @env0:integerBetween: a and: b
%

category: 'Python-Built-in Functions'
method: random
uniform: a _: b
	"uniform(a, b) -> random float N such that a <= N <= b."
	^ a ___plus___: ((self _generator @env0:float) ___times___: (b ___minus___: a))
%

category: 'Python-Built-in Functions'
method: random
gauss: mu _: sigma
	"gauss(mu, sigma) -> random float from Gaussian distribution."
	| u1 u2 z |
	u1 := self _generator @env0:float. u2 := self _generator @env0:float.
	[u1 ___eq___: 0.0] ___whileTrue___: [u1 := self _generator @env0:float].
	z := ((-2.0 ___times___: (u1 @env0:ln)) ___sqrt___) ___times___: (((2.0 ___times___: (Float @env0:pi)) ___times___: u2) @env0:cos).
	^ mu ___plus___: (z ___times___: sigma)
%

category: 'Python-Built-in Functions'
method: random
normalvariate: mu _: sigma
	"normalvariate(mu, sigma) -> same as gauss."
	^ self gauss: mu _: sigma
%

category: 'Python-Built-in Functions'
method: random
lognormvariate: mu _: sigma
	"lognormvariate(mu, sigma) -> random float from log-normal distribution."
	^ (self gauss: mu _: sigma) @env0:exp
%

category: 'Python-Built-in Functions'
method: random
betavariate: alpha _: beta
	"betavariate(alpha, beta) -> random float from beta distribution."
	| y |
	y := self gammavariate: alpha _: 1.0.
	(y ___eq___: 0) ifTrue: [^ 0.0].
	^ y @env0:/ (y ___plus___: (self gammavariate: beta _: 1.0))
%

category: 'Python-Built-in Functions'
method: random
gammavariate: alpha _: beta
	"gammavariate(alpha, beta) -> random float from gamma distribution."
	| result |
	(alpha ___le___: 0) ifTrue: [ValueError ___signal___: 'gammavariate: alpha must be > 0'].
	(beta ___le___: 0) ifTrue: [ValueError ___signal___: 'gammavariate: beta must be > 0'].
	(alpha ___ge___: 1.0) ifTrue: [
		| d c x v u |
		d := alpha ___minus___: (1.0 @env0:/ 3.0).
		c := 1.0 @env0:/ (9.0 ___times___: d) ___sqrt___.
		result := nil.
		[result == nil] ___whileTrue___: [
			x := self gauss: 0.0 _: 1.0.
			v := (1.0 ___plus___: (c ___times___: x)) ___raisedTo___: 3.
			(v ___gt___: 0) ifTrue: [
				u := self _generator @env0:float.
				((u ___lt___: (1.0 ___minus___: ((0.0331 ___times___: (x ___times___: x)) ___times___: (x ___times___: x))))
					or: [(u @env0:ln) ___lt___: (((0.5 ___times___: x) ___times___: x) ___plus___: (d ___times___: ((1.0 ___minus___: v) ___plus___: (v @env0:ln))))]) ifTrue: [
					result := (d ___times___: v) ___times___: beta.
				].
			].
		].
	] ifFalse: [
		| u g |
		u := self _generator @env0:float.
		[u ___eq___: 0.0] ___whileTrue___: [u := self _generator @env0:float].
		g := self gammavariate: (alpha ___plus___: 1.0) _: 1.0.
		result := (g ___times___: (u ___raisedTo___: (1.0 @env0:/ alpha))) ___times___: beta.
	].
	^ result
%

category: 'Python-Built-in Functions'
method: random
weibullvariate: alpha _: beta
	"weibullvariate(alpha, beta) -> random float from Weibull distribution."
	| u |
	u := self _generator @env0:float.
	[u ___eq___: 0.0] ___whileTrue___: [u := self _generator @env0:float].
	^ alpha ___times___: ((((1.0 ___minus___: u) @env0:ln) @env0:negated) ___raisedTo___: (1.0 @env0:/ beta))
%

! ===============================================================================
! 3-arg fast-path callables
! ===============================================================================

category: 'Python-Built-in Functions'
method: random
triangular: low _: high _: mode
	"triangular(low, high, mode) -> random float from triangular distribution."
	| u c |
	u := self _generator @env0:float.
	c := (mode ___minus___: low) @env0:/ (high ___minus___: low).
	(u ___lt___: c) ifTrue: [
		^ low ___plus___: (((u ___times___: (high ___minus___: low)) ___times___: (mode ___minus___: low)) ___sqrt___)
	].
	^ high ___minus___: ((((1.0 ___minus___: u) ___times___: (high ___minus___: low)) ___times___: (high ___minus___: mode)) ___sqrt___)
%

! ===============================================================================
! Varargs fast-path callables (multiple arities or kwargs)
! ===============================================================================

category: 'Python-Built-in Functions'
method: random
seed: a
	"seed(a) -> 1-arg fast path."
	^ self _seed: { a } kw: nil
%

category: 'Python-Built-in Functions'
method: random
_seed: positional kw: kwargs
	"seed(a=None) -> initialize internal state from a seed."
	| a |
	a := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [nil].
	(a == nil or: [a == None]) ifTrue: [
		self ___at___: #_generator put: (Random ___new___)
	] ifFalse: [
		self ___at___: #_generator put: (Random @env0:seed: a ___asInteger___)
	].
	^ None
%

category: 'Python-Built-in Functions'
method: random
sample: population _: k
	"sample(population, k) -> 2-arg fast path."
	^ self _sample: { population. k } kw: nil
%

category: 'Python-Built-in Functions'
method: random
_sample: positional kw: kwargs
	"sample(population, k=?) -> k-length list of unique elements."
	| population k n result |
	population := positional ___at___: 1.
	k := (positional ___size___ ___ge___: 2)
		ifTrue: [positional ___at___: 2]
		ifFalse: [
			(kwargs notNil and: [kwargs @env0:includesKey: #k])
				ifTrue: [kwargs ___at___: #k] ifFalse: [nil]
		].
	k ifNil: [TypeError ___signal___: 'sample() missing required argument: k'].
	n := self _sequenceLength: population.
	(k ___lt___: 0) ifTrue: [ValueError ___signal___: 'Sample larger than population or is negative'].
	(k ___gt___: n) ifTrue: [ValueError ___signal___: 'Sample larger than population or is negative'].
	result := list ___new___.
	((k ___times___: 3) ___le___: n) ifTrue: [
		| selected |
		selected := IdentitySet ___new___.
		[selected ___size___ ___lt___: k] ___whileTrue___: [
			| idx |
			idx := self _generator @env0:integerBetween: 1 and: n.
			(selected @env0:includes: idx) ifFalse: [
				selected @env0:add: idx. result @env1:append: (population ___at___: idx).
			].
		].
	] ifFalse: [
		| pool |
		pool := Array ___new___: n.
		1 ___to___: n do: [:i | pool ___at___: i put: (population ___at___: i)].
		1 ___to___: k do: [:i |
			| j temp |
			j := self _generator @env0:integerBetween: i and: n.
			temp := pool ___at___: j. pool ___at___: j put: (pool ___at___: i). pool ___at___: i put: temp.
			result @env1:append: temp.
		].
	].
	^ result
%

category: 'Python-Built-in Functions'
method: random
_choices: positional kw: kwargs
	"choices(population, weights=None, cum_weights=None, k=1)."
	| population weights cumWeights k result total n |
	population := positional ___at___: 1.
	n := self _sequenceLength: population.
	(n ___eq___: 0) ifTrue: [IndexError ___signal___: 'Cannot choose from an empty population'].
	weights := (kwargs notNil and: [kwargs @env0:includesKey: #weights])
		ifTrue: [kwargs ___at___: #weights] ifFalse: [nil].
	cumWeights := (kwargs notNil and: [kwargs @env0:includesKey: #'cum_weights'])
		ifTrue: [kwargs ___at___: #'cum_weights'] ifFalse: [nil].
	k := (kwargs notNil and: [kwargs @env0:includesKey: #k])
		ifTrue: [kwargs ___at___: #k] ifFalse: [1].
	(weights notNil and: [cumWeights notNil]) ifTrue: [
		TypeError ___signal___: 'Cannot specify both weights and cum_weights'
	].
	weights notNil ifTrue: [
		total := 0. cumWeights := Array ___new___: n.
		1 ___to___: n do: [:i |
			total := total ___plus___: (weights ___at___: i). cumWeights ___at___: i put: total.
		].
	].
	cumWeights notNil ifTrue: [
		total := cumWeights ___at___: n.
		(total ___le___: 0) ifTrue: [ValueError ___signal___: 'Total of weights must be greater than zero'].
		result := list ___new___.
		1 ___to___: k do: [:unused |
			| r idx |
			r := (self _generator @env0:float) ___times___: total.
			idx := 1.
			[(idx ___lt___: n) and: [(cumWeights ___at___: idx) ___le___: r]] ___whileTrue___: [idx := idx ___plus___: 1].
			result @env1:append: (population ___at___: idx).
		].
	] ifFalse: [
		result := list ___new___.
		1 ___to___: k do: [:unused |
			| idx |
			idx := self _generator @env0:integerBetween: 1 and: n.
			result @env1:append: (population ___at___: idx).
		].
	].
	^ result
%

category: 'Python-Built-in Functions'
method: random
randrange: stop
	"randrange(stop) -> 1-arg fast path."
	^ self _randrange: { stop } kw: nil
%

category: 'Python-Built-in Functions'
method: random
randrange: start _: stop
	"randrange(start, stop) -> 2-arg fast path."
	^ self _randrange: { start. stop } kw: nil
%

category: 'Python-Built-in Functions'
method: random
randrange: start _: stop _: step
	"randrange(start, stop, step) -> 3-arg fast path."
	^ self _randrange: { start. stop. step } kw: nil
%

category: 'Python-Built-in Functions'
method: random
_randrange: positional kw: kwargs
	"randrange(stop) or randrange(start, stop[, step])."
	| start stop step count r |
	(positional ___size___ ___eq___: 1) ifTrue: [
		start := 0. stop := positional ___at___: 1. step := 1.
	] ifFalse: [
		start := positional ___at___: 1. stop := positional ___at___: 2.
		step := (positional ___size___ ___ge___: 3) ifTrue: [positional ___at___: 3] ifFalse: [1].
	].
	(step ___eq___: 0) ifTrue: [ValueError ___signal___: 'zero step for randrange()'].
	(step ___gt___: 0) ifTrue: [
		count := (((stop ___minus___: start) ___plus___: step) ___minus___: 1) @env0:// step.
	] ifFalse: [
		| diff negStep |
		diff := start ___minus___: stop. negStep := step @env0:negated.
		count := ((diff ___plus___: negStep) ___minus___: 1) @env0:// negStep.
	].
	(count ___le___: 0) ifTrue: [ValueError ___signal___: 'empty range for randrange()'].
	r := self _generator @env0:integerBetween: 0 and: (count ___minus___: 1).
	^ start ___plus___: (r ___times___: step)
%

category: 'Python-Built-in Functions'
method: random
binomialvariate: n _: p
	"binomialvariate(n, p) -> 2-arg fast path."
	^ self _binomialvariate: { n. p } kw: nil
%

category: 'Python-Built-in Functions'
method: random
_binomialvariate: positional kw: kwargs
	"binomialvariate(n=1, p=0.5)."
	| n p successes |
	n := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [1].
	p := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [0.5].
	(n ___lt___: 0) ifTrue: [ValueError ___signal___: 'n must be non-negative'].
	((p ___lt___: 0) or: [p ___gt___: 1]) ifTrue: [ValueError ___signal___: 'p must be in range [0, 1]'].
	successes := 0.
	1 ___to___: n do: [:unused |
		((self _generator @env0:float) ___lt___: p) ifTrue: [successes := successes ___plus___: 1]
	].
	^ successes
%

category: 'Python-Built-in Functions'
method: random
_triangular: positional kw: kwargs
	"triangular(low=0.0, high=1.0, mode=None) — varargs form."
	| low high mode |
	low := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [0.0].
	high := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [1.0].
	mode := (positional ___size___ ___ge___: 3) ifTrue: [positional ___at___: 3] ifFalse: [nil].
	(mode == nil or: [mode == None]) ifTrue: [mode := (low ___plus___: high) @env0:/ 2.0].
	^ self triangular: low _: high _: mode
%

category: 'Python-Built-in Functions'
method: random
_gauss: positional kw: kwargs
	"gauss(mu=0.0, sigma=1.0) — varargs form."
	| mu sigma |
	mu := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [0.0].
	sigma := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [1.0].
	^ self gauss: mu _: sigma
%

category: 'Python-Built-in Functions'
method: random
_normalvariate: positional kw: kwargs
	"normalvariate(mu=0.0, sigma=1.0) — varargs form."
	| mu sigma |
	mu := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [0.0].
	sigma := (positional ___size___ ___ge___: 2) ifTrue: [positional ___at___: 2] ifFalse: [1.0].
	^ self gauss: mu _: sigma
%

category: 'Python-Built-in Functions'
method: random
_expovariate: positional kw: kwargs
	"expovariate(lambd=1.0) — varargs form."
	| lambd |
	lambd := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [1.0].
	^ self expovariate: lambd
%

set compile_env: 0
