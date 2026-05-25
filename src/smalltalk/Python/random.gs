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
random category: 'Grail-Modules'
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

category: 'Grail-Private'
method: random
_sequenceLength: seq
	^ [seq __len__] @env0:on: MessageNotUnderstood do: [:ex | seq @env0:size]
%

category: 'Grail-Private'
method: random
_generator
	"Return the internal random generator, re-creating it if needed."
	| gen |
	gen := self @env0:at: #_generator.
	(gen == nil or: [(gen @env0:respondsTo: #isOpen) and: [(gen @env0:isOpen) not]]) ifTrue: [
		gen := Random ___new___.
		self @env0:at: #_generator put: gen.
	].
	^ gen
%

! ===============================================================================
! Initialization
! ===============================================================================

category: 'Grail-Initialization'
method: random
initialize
	"Initialize the internal random generator."
	self @env0:at: #_generator put: (Random ___new___)
%

! ===============================================================================
! 0-arg fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: random
random
	"random() -> float in [0, 1)"
	^ self _generator @env0:float
%

category: 'Grail-Built-in Functions'
method: random
getstate
	"getstate() -> internal state (not supported)."
	^ NotImplementedError ___signal___: 'getstate() is not supported with GemStone''s Random'
%

category: 'Grail-Built-in Functions'
method: random
setstate
	"setstate(state) -> restore state (not supported)."
	^ NotImplementedError ___signal___: 'setstate() is not supported with GemStone''s Random'
%

! ===============================================================================
! 1-arg fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: random
choice: seq
	"choice(seq) -> random element from non-empty sequence."
	| len idx |
	len := self _sequenceLength: seq.
	(len == 0) ifTrue: [IndexError ___signal___: 'Cannot choose from an empty sequence'].
	idx := self _generator @env0:integerBetween: 1 and: len.
	^ seq @env0:at: idx
%

category: 'Grail-Built-in Functions'
method: random
shuffle: x
	"shuffle(x) -> shuffle list x in place; return None."
	| n |
	n := self _sequenceLength: x.
	n @env0:to: 2 by: -1 do: [:i |
		| j temp |
		j := self _generator @env0:integerBetween: 1 and: i.
		temp := x @env0:at: i. x @env0:at: i put: (x @env0:at: j). x @env0:at: j put: temp.
	].
	^ None
%

category: 'Grail-Built-in Functions'
method: random
getrandbits: k
	"getrandbits(k) -> non-negative integer with k random bits."
	| result bitsNeeded |
	(k @env0:< 0) ifTrue: [ValueError ___signal___: 'number of bits must be non-negative'].
	(k @env0:= 0) ifTrue: [^ 0].
	result := 0. bitsNeeded := k.
	[bitsNeeded @env0:> 0] @env0:whileTrue: [
		| chunk bits |
		chunk := self _generator @env0:integer.
		bits := bitsNeeded @env0:min: 32.
		result := (result @env0:bitShift: bits) @env0:bitOr: (chunk @env0:bitAnd: ((1 @env0:bitShift: bits) @env0:- 1)).
		bitsNeeded := bitsNeeded @env0:- 32.
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: random
randbytes: n
	"randbytes(n) -> n random bytes."
	| result |
	(n @env0:< 0) ifTrue: [ValueError ___signal___: 'number of bytes must be non-negative'].
	(n @env0:= 0) ifTrue: [^ bytes ___new___].
	result := ByteArray ___new___: n.
	1 @env0:to: n do: [:i |
		result @env0:at: i put: ((self _generator @env0:integer) @env0:bitAnd: 16rFF)
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: random
paretovariate: alpha
	"paretovariate(alpha) -> random float from Pareto distribution."
	| u |
	u := self _generator @env0:float.
	[u @env0:= 0.0] @env0:whileTrue: [u := self _generator @env0:float].
	^ 1.0 @env0:/ (u @env0:raisedTo: (1.0 @env0:/ alpha))
%

category: 'Grail-Built-in Functions'
method: random
expovariate: lambd
	"expovariate(lambd) -> random float from exponential distribution."
	| u |
	u := self _generator @env0:float.
	[u @env0:= 0.0] @env0:whileTrue: [u := self _generator @env0:float].
	^ (((1.0 @env0:- u) @env0:ln) @env0:negated) @env0:/ lambd
%

! ===============================================================================
! 2-arg fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: random
randint: a _: b
	"randint(a, b) -> random integer in [a, b]."
	^ self _generator @env0:integerBetween: a and: b
%

category: 'Grail-Built-in Functions'
method: random
uniform: a _: b
	"uniform(a, b) -> random float N such that a <= N <= b."
	^ a @env0:+ ((self _generator @env0:float) @env0:* (b @env0:- a))
%

category: 'Grail-Built-in Functions'
method: random
gauss: mu _: sigma
	"gauss(mu, sigma) -> random float from Gaussian distribution."
	| u1 u2 z |
	u1 := self _generator @env0:float. u2 := self _generator @env0:float.
	[u1 @env0:= 0.0] @env0:whileTrue: [u1 := self _generator @env0:float].
	z := ((-2.0 @env0:* (u1 @env0:ln)) @env0:sqrt) @env0:* (((2.0 @env0:* (Float @env0:pi)) @env0:* u2) @env0:cos).
	^ mu @env0:+ (z @env0:* sigma)
%

category: 'Grail-Built-in Functions'
method: random
normalvariate: mu _: sigma
	"normalvariate(mu, sigma) -> same as gauss."
	^ self gauss: mu _: sigma
%

category: 'Grail-Built-in Functions'
method: random
lognormvariate: mu _: sigma
	"lognormvariate(mu, sigma) -> random float from log-normal distribution."
	^ (self gauss: mu _: sigma) @env0:exp
%

category: 'Grail-Built-in Functions'
method: random
betavariate: alpha _: beta
	"betavariate(alpha, beta) -> random float from beta distribution."
	| y |
	y := self gammavariate: alpha _: 1.0.
	(y @env0:= 0) ifTrue: [^ 0.0].
	^ y @env0:/ (y @env0:+ (self gammavariate: beta _: 1.0))
%

category: 'Grail-Built-in Functions'
method: random
gammavariate: alpha _: beta
	"gammavariate(alpha, beta) -> random float from gamma distribution."
	| result |
	(alpha @env0:<= 0) ifTrue: [ValueError ___signal___: 'gammavariate: alpha must be > 0'].
	(beta @env0:<= 0) ifTrue: [ValueError ___signal___: 'gammavariate: beta must be > 0'].
	(alpha @env0:>= 1.0) ifTrue: [
		| d c x v u |
		d := alpha @env0:- (1.0 @env0:/ 3.0).
		c := 1.0 @env0:/ (9.0 @env0:* d) @env0:sqrt.
		result := nil.
		[result == nil] @env0:whileTrue: [
			x := self gauss: 0.0 _: 1.0.
			v := (1.0 @env0:+ (c @env0:* x)) @env0:raisedTo: 3.
			(v @env0:> 0) ifTrue: [
				u := self _generator @env0:float.
				((u @env0:< (1.0 @env0:- ((0.0331 @env0:* (x @env0:* x)) @env0:* (x @env0:* x))))
					or: [(u @env0:ln) @env0:< (((0.5 @env0:* x) @env0:* x) @env0:+ (d @env0:* ((1.0 @env0:- v) @env0:+ (v @env0:ln))))]) ifTrue: [
					result := (d @env0:* v) @env0:* beta.
				].
			].
		].
	] ifFalse: [
		| u g |
		u := self _generator @env0:float.
		[u @env0:= 0.0] @env0:whileTrue: [u := self _generator @env0:float].
		g := self gammavariate: (alpha @env0:+ 1.0) _: 1.0.
		result := (g @env0:* (u @env0:raisedTo: (1.0 @env0:/ alpha))) @env0:* beta.
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: random
weibullvariate: alpha _: beta
	"weibullvariate(alpha, beta) -> random float from Weibull distribution."
	| u |
	u := self _generator @env0:float.
	[u @env0:= 0.0] @env0:whileTrue: [u := self _generator @env0:float].
	^ alpha @env0:* ((((1.0 @env0:- u) @env0:ln) @env0:negated) @env0:raisedTo: (1.0 @env0:/ beta))
%

! ===============================================================================
! 3-arg fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: random
triangular: low _: high _: mode
	"triangular(low, high, mode) -> random float from triangular distribution."
	| u c |
	u := self _generator @env0:float.
	c := (mode @env0:- low) @env0:/ (high @env0:- low).
	(u @env0:< c) ifTrue: [
		^ low @env0:+ (((u @env0:* (high @env0:- low)) @env0:* (mode @env0:- low)) @env0:sqrt)
	].
	^ high @env0:- ((((1.0 @env0:- u) @env0:* (high @env0:- low)) @env0:* (high @env0:- mode)) @env0:sqrt)
%

! ===============================================================================
! Varargs fast-path callables (multiple arities or kwargs)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: random
seed: a
	"seed(a) -> 1-arg fast path."
	^ self _seed: { a } kw: nil
%

category: 'Grail-Built-in Functions'
method: random
_seed: positional kw: kwargs
	"seed(a=None) -> initialize internal state from a seed."
	| a |
	a := (positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: [nil].
	(a == nil or: [a == None]) ifTrue: [
		self @env0:at: #_generator put: (Random ___new___)
	] ifFalse: [
		self @env0:at: #_generator put: (Random @env0:seed: a @env0:asInteger)
	].
	^ None
%

category: 'Grail-Built-in Functions'
method: random
sample: population _: k
	"sample(population, k) -> 2-arg fast path."
	^ self _sample: { population. k } kw: nil
%

category: 'Grail-Built-in Functions'
method: random
_sample: positional kw: kwargs
	"sample(population, k=?) -> k-length list of unique elements."
	| population k n result |
	population := positional @env0:at: 1.
	k := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs notNil and: [kwargs @env0:includesKey: 'k'])
				ifTrue: [kwargs @env0:at: 'k'] ifFalse: [nil]
		].
	k ifNil: [TypeError ___signal___: 'sample() missing required argument: k'].
	n := self _sequenceLength: population.
	(k @env0:< 0) ifTrue: [ValueError ___signal___: 'Sample larger than population or is negative'].
	(k @env0:> n) ifTrue: [ValueError ___signal___: 'Sample larger than population or is negative'].
	result := list ___new___.
	((k @env0:* 3) @env0:<= n) ifTrue: [
		| selected |
		selected := IdentitySet ___new___.
		[selected @env0:size @env0:< k] @env0:whileTrue: [
			| idx |
			idx := self _generator @env0:integerBetween: 1 and: n.
			(selected @env0:includes: idx) ifFalse: [
				selected @env0:add: idx. result @env1:append: (population @env0:at: idx).
			].
		].
	] ifFalse: [
		| pool |
		pool := Array ___new___: n.
		1 @env0:to: n do: [:i | pool @env0:at: i put: (population @env0:at: i)].
		1 @env0:to: k do: [:i |
			| j temp |
			j := self _generator @env0:integerBetween: i and: n.
			temp := pool @env0:at: j. pool @env0:at: j put: (pool @env0:at: i). pool @env0:at: i put: temp.
			result @env1:append: temp.
		].
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: random
_choices: positional kw: kwargs
	"choices(population, weights=None, cum_weights=None, k=1)."
	| population weights cumWeights k result total n |
	population := positional @env0:at: 1.
	n := self _sequenceLength: population.
	(n == 0) ifTrue: [IndexError ___signal___: 'Cannot choose from an empty population'].
	weights := (kwargs notNil and: [kwargs @env0:includesKey: 'weights'])
		ifTrue: [kwargs @env0:at: 'weights'] ifFalse: [nil].
	cumWeights := (kwargs notNil and: [kwargs @env0:includesKey: 'cum_weights'])
		ifTrue: [kwargs @env0:at: 'cum_weights'] ifFalse: [nil].
	k := (kwargs notNil and: [kwargs @env0:includesKey: 'k'])
		ifTrue: [kwargs @env0:at: 'k'] ifFalse: [1].
	(weights notNil and: [cumWeights notNil]) ifTrue: [
		TypeError ___signal___: 'Cannot specify both weights and cum_weights'
	].
	weights notNil ifTrue: [
		total := 0. cumWeights := Array ___new___: n.
		1 @env0:to: n do: [:i |
			total := total @env0:+ (weights @env0:at: i). cumWeights @env0:at: i put: total.
		].
	].
	cumWeights notNil ifTrue: [
		total := cumWeights @env0:at: n.
		(total @env0:<= 0) ifTrue: [ValueError ___signal___: 'Total of weights must be greater than zero'].
		result := list ___new___.
		1 @env0:to: k do: [:unused |
			| r idx |
			r := (self _generator @env0:float) @env0:* total.
			idx := 1.
			[(idx @env0:< n) and: [(cumWeights @env0:at: idx) @env0:<= r]] @env0:whileTrue: [idx := idx @env0:+ 1].
			result @env1:append: (population @env0:at: idx).
		].
	] ifFalse: [
		result := list ___new___.
		1 @env0:to: k do: [:unused |
			| idx |
			idx := self _generator @env0:integerBetween: 1 and: n.
			result @env1:append: (population @env0:at: idx).
		].
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: random
randrange: stop
	"randrange(stop) -> 1-arg fast path."
	^ self _randrange: { stop } kw: nil
%

category: 'Grail-Built-in Functions'
method: random
randrange: start _: stop
	"randrange(start, stop) -> 2-arg fast path."
	^ self _randrange: { start. stop } kw: nil
%

category: 'Grail-Built-in Functions'
method: random
randrange: start _: stop _: step
	"randrange(start, stop, step) -> 3-arg fast path."
	^ self _randrange: { start. stop. step } kw: nil
%

category: 'Grail-Built-in Functions'
method: random
_randrange: positional kw: kwargs
	"randrange(stop) or randrange(start, stop[, step])."
	| start stop step count r |
	(positional @env0:size == 1) ifTrue: [
		start := 0. stop := positional @env0:at: 1. step := 1.
	] ifFalse: [
		start := positional @env0:at: 1. stop := positional @env0:at: 2.
		step := (positional @env0:size @env0:>= 3) ifTrue: [positional @env0:at: 3] ifFalse: [1].
	].
	(step @env0:= 0) ifTrue: [ValueError ___signal___: 'zero step for randrange()'].
	(step @env0:> 0) ifTrue: [
		count := (((stop @env0:- start) @env0:+ step) @env0:- 1) @env0:// step.
	] ifFalse: [
		| diff negStep |
		diff := start @env0:- stop. negStep := step @env0:negated.
		count := ((diff @env0:+ negStep) @env0:- 1) @env0:// negStep.
	].
	(count @env0:<= 0) ifTrue: [ValueError ___signal___: 'empty range for randrange()'].
	r := self _generator @env0:integerBetween: 0 and: (count @env0:- 1).
	^ start @env0:+ (r @env0:* step)
%

category: 'Grail-Built-in Functions'
method: random
binomialvariate: n _: p
	"binomialvariate(n, p) -> 2-arg fast path."
	^ self _binomialvariate: { n. p } kw: nil
%

category: 'Grail-Built-in Functions'
method: random
_binomialvariate: positional kw: kwargs
	"binomialvariate(n=1, p=0.5)."
	| n p successes |
	n := (positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: [1].
	p := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [0.5].
	(n @env0:< 0) ifTrue: [ValueError ___signal___: 'n must be non-negative'].
	((p @env0:< 0) or: [p @env0:> 1]) ifTrue: [ValueError ___signal___: 'p must be in range [0, 1]'].
	successes := 0.
	1 @env0:to: n do: [:unused |
		((self _generator @env0:float) @env0:< p) ifTrue: [successes := successes @env0:+ 1]
	].
	^ successes
%

category: 'Grail-Built-in Functions'
method: random
_triangular: positional kw: kwargs
	"triangular(low=0.0, high=1.0, mode=None) — varargs form."
	| low high mode |
	low := (positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: [0.0].
	high := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [1.0].
	mode := (positional @env0:size @env0:>= 3) ifTrue: [positional @env0:at: 3] ifFalse: [nil].
	(mode == nil or: [mode == None]) ifTrue: [mode := (low @env0:+ high) @env0:/ 2.0].
	^ self triangular: low _: high _: mode
%

category: 'Grail-Built-in Functions'
method: random
_gauss: positional kw: kwargs
	"gauss(mu=0.0, sigma=1.0) — varargs form."
	| mu sigma |
	mu := (positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: [0.0].
	sigma := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [1.0].
	^ self gauss: mu _: sigma
%

category: 'Grail-Built-in Functions'
method: random
_normalvariate: positional kw: kwargs
	"normalvariate(mu=0.0, sigma=1.0) — varargs form."
	| mu sigma |
	mu := (positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: [0.0].
	sigma := (positional @env0:size @env0:>= 2) ifTrue: [positional @env0:at: 2] ifFalse: [1.0].
	^ self gauss: mu _: sigma
%

category: 'Grail-Built-in Functions'
method: random
_expovariate: positional kw: kwargs
	"expovariate(lambd=1.0) — varargs form."
	| lambd |
	lambd := (positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: [1.0].
	^ self expovariate: lambd
%

set compile_env: 0
