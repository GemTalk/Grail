! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RandomTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RandomTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RandomTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RandomTestCase - Tests for Python random module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
RandomTestCase removeAllMethods: 0.
RandomTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testBetavariate
	"Test random.betavariate(alpha, beta)"

	| r result |
	r := random ___instance___.

	result := r @env1:betavariate: 2 _: 5.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).
	self assert: (result <= 1).  "Beta is always in [0, 1]"
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testBinomialvariate
	"Test random.binomialvariate(n, p)"

	| r result |
	r := random ___instance___.

	result := r @env1:binomialvariate: 10 _: 0.5.
	self assert: (result isKindOf: Integer).
	self assert: (result >= 0).
	self assert: (result <= 10).

	"p=0 should always return 0"
	result := r @env1:binomialvariate: 10 _: 0.
	self assert: result equals: 0.

	"p=1 should always return n"
	result := r @env1:binomialvariate: 10 _: 1.
	self assert: result equals: 10.
%

category: 'Grail-Tests - Sequence'
method: RandomTestCase
testChoice
	"Test random.choice(seq)"

	| r result seq |
	r := random ___instance___.
	seq := #(1 2 3 4 5).

	result := r @env1:choice: seq.
	self assert: (seq includes: result).
%

category: 'Grail-Tests - Sequence'
method: RandomTestCase
testChoiceEmptySequence
	"Test random.choice() on empty sequence raises IndexError"

	| r |
	r := random ___instance___.

	self should: [r @env1:choice: #()] raise: IndexError.
%

category: 'Grail-Tests - Sequence'
method: RandomTestCase
testChoices
	"Test random.choices(population, k=n)"

	| r result |
	r := random ___instance___.

	result := r @env1:_choices: {#(1 2 3)} kw: (KeyValueDictionary new at: 'k' put: 5; yourself).
	self assert: result size equals: 5.
	result do: [:each | self assert: (#(1 2 3) includes: each)].
%

category: 'Grail-Tests - Sequence'
method: RandomTestCase
testChoicesWithWeights
	"Test random.choices() with weights"

	| r result weights |
	r := random ___instance___.
	weights := #(1 0 0).  "Only first element should be chosen"

	result := r @env1:_choices: {#(1 2 3)} kw: (KeyValueDictionary new at: 'weights' put: weights; at: 'k' put: 10; yourself).
	self assert: result size equals: 10.
	result do: [:each | self assert: each equals: 1].
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testExpovariate
	"Test random.expovariate(lambd)"

	| r result |
	r := random ___instance___.

	result := r @env1:expovariate: 1.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).  "Exponential is always non-negative"
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testGammavariate
	"Test random.gammavariate(alpha, beta)"

	| r result |
	r := random ___instance___.

	result := r @env1:gammavariate: 2 _: 1.
	self assert: (result isKindOf: Float).
	self assert: (result > 0).  "Gamma is always positive"
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testGauss
	"Test random.gauss(mu, sigma)"

	| r result |
	r := random ___instance___.

	result := r @env1:gauss: 0 _: 1.
	self assert: (result isKindOf: Float).
	"Gauss can return any value, but very unlikely to be outside -10 to 10 for mu=0, sigma=1"
%

category: 'Grail-Tests - Basic'
method: RandomTestCase
testGetrandbits
	"Test random.getrandbits(k)"

	| r result |
	r := random ___instance___.

	result := r @env1:getrandbits: 8.
	self assert: (result isKindOf: Integer).
	self assert: (result >= 0).
	self assert: (result < 256).

	result := r @env1:getrandbits: 16.
	self assert: (result >= 0).
	self assert: (result < 65536).
%

category: 'Grail-Tests - Edge Cases'
method: RandomTestCase
testGetrandbitsNegative
	"Test random.getrandbits() with negative k raises ValueError"

	| r |
	r := random ___instance___.

	self should: [r @env1:getrandbits: -1] raise: ValueError.
%

category: 'Grail-Tests - Edge Cases'
method: RandomTestCase
testGetrandbitsZero
	"Test random.getrandbits(0) returns 0"

	| r result |
	r := random ___instance___.

	result := r @env1:getrandbits: 0.
	self assert: result equals: 0.
%

category: 'Grail-Tests - State'
method: RandomTestCase
testGetstate
	"Test random.getstate() raises NotImplementedError"

	| r |
	r := random ___instance___.

	self should: [r @env1:getstate] raise: NotImplementedError
%

category: 'Grail-Tests - Singleton'
method: RandomTestCase
testInstance
	"Test that random.___instance___ returns the singleton"

	| r1 r2 |
	r1 := random ___instance___.
	r2 := random ___instance___.

	self assert: r1 == r2.
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testLognormvariate
	"Test random.lognormvariate(mu, sigma)"

	| r result |
	r := random ___instance___.

	result := r @env1:lognormvariate: 0 _: 1.
	self assert: (result isKindOf: Float).
	self assert: (result > 0).  "Log-normal is always positive"
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testNormalvariate
	"Test random.normalvariate(mu, sigma)"

	| r result |
	r := random ___instance___.

	result := r @env1:normalvariate: 0 _: 1.
	self assert: (result isKindOf: Float).
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testParetovariate
	"Test random.paretovariate(alpha)"

	| r result |
	r := random ___instance___.

	result := r @env1:paretovariate: 2.
	self assert: (result isKindOf: Float).
	self assert: (result >= 1).  "Pareto with xm=1 is always >= 1"
%

category: 'Grail-Tests - Basic'
method: RandomTestCase
testRandbytes
	"Test random.randbytes(n)"

	| r result |
	r := random ___instance___.

	result := r @env1:randbytes: 8.
	self assert: (result isKindOf: ByteArray).
	self assert: result size equals: 8.

	result := r @env1:randbytes: 0.
	self assert: result size equals: 0.
%

category: 'Grail-Tests - Edge Cases'
method: RandomTestCase
testRandbytesNegative
	"Test random.randbytes() with negative n raises ValueError"

	| r |
	r := random ___instance___.

	self should: [r @env1:randbytes: -1] raise: ValueError.
%

category: 'Grail-Tests - Edge Cases'
method: RandomTestCase
testRandbytesZero
	"Test random.randbytes(0) returns empty bytes"

	| r result |
	r := random ___instance___.

	result := r @env1:randbytes: 0.
	self assert: (result isKindOf: ByteArray).
	self assert: result size equals: 0.
%

category: 'Grail-Tests - Integer'
method: RandomTestCase
testRandint
	"Test random.randint(a, b)"

	| r result |
	r := random ___instance___.

	"Test basic randint"
	result := r @env1:randint: 1 _: 10.
	self assert: (result isKindOf: Integer).
	self assert: (result >= 1).
	self assert: (result <= 10).

	"Test with negative numbers"
	result := r @env1:randint: -10 _: -1.
	self assert: (result >= -10).
	self assert: (result <= -1).

	"Test single value range"
	result := r @env1:randint: 5 _: 5.
	self assert: result equals: 5.
%

category: 'Grail-Tests - Basic'
method: RandomTestCase
testRandom
	"Test random.random() returns a float in [0, 1)"

	| r result |
	r := random ___instance___.
	result := r @env1:random.

	self assert: (result isKindOf: Float).
	self assert: (result >= 0.0).
	self assert: (result < 1.0).
%

category: 'Grail-Tests - Integer'
method: RandomTestCase
testRandrangeErrors
	"Test random.randrange() error cases"

	| r |
	r := random ___instance___.

	"Empty range should raise ValueError"
	self should: [r @env1:_randrange: {0} kw: nil] raise: ValueError.
	self should: [r @env1:_randrange: {10. 5} kw: nil] raise: ValueError.
	self should: [r @env1:_randrange: {0. 10. -1} kw: nil] raise: ValueError.
%

category: 'Grail-Tests - Integer'
method: RandomTestCase
testRandrangeOneArg
	"Test random.randrange(stop)"

	| r result |
	r := random ___instance___.

	result := r @env1:randrange: 10.
	self assert: (result isKindOf: Integer).
	self assert: (result >= 0).
	self assert: (result < 10).
%

category: 'Grail-Tests - Integer'
method: RandomTestCase
testRandrangeThreeArgs
	"Test random.randrange(start, stop, step)"

	| r result |
	r := random ___instance___.

	"Step of 10: should get 0, 10, 20, ..., 90"
	result := r @env1:randrange: 0 _: 100 _: 10.
	self assert: (result \\ 10) equals: 0.
	self assert: (result >= 0).
	self assert: (result < 100).

	"Step of 2: should get even numbers"
	result := r @env1:randrange: 0 _: 10 _: 2.
	self assert: (result \\ 2) equals: 0.
%

category: 'Grail-Tests - Integer'
method: RandomTestCase
testRandrangeTwoArgs
	"Test random.randrange(start, stop)"

	| r result |
	r := random ___instance___.

	result := r @env1:randrange: 5 _: 15.
	self assert: (result >= 5).
	self assert: (result < 15).
%

category: 'Grail-Tests - Sequence'
method: RandomTestCase
testSample
	"Test random.sample(population, k)"

	| r result |
	r := random ___instance___.

	result := r @env1:sample: #(1 2 3 4 5) _: 3.
	self assert: result size equals: 3.

	"Check all elements are unique"
	self assert: (result asSet size) equals: 3.

	"Check all elements are from the population"
	result do: [:each | self assert: (#(1 2 3 4 5) includes: each)].
%

category: 'Grail-Tests - Sequence'
method: RandomTestCase
testSampleErrors
	"Test random.sample() error cases"

	| r |
	r := random ___instance___.

	"k larger than population should raise ValueError"
	self should: [r @env1:sample: #(1 2 3) _: 5] raise: ValueError.
%

category: 'Grail-Tests - Edge Cases'
method: RandomTestCase
testSampleZero
	"Test random.sample() with k=0 returns empty list"

	| r result |
	r := random ___instance___.

	result := r @env1:sample: #(1 2 3) _: 0.
	self assert: result size equals: 0.
%

category: 'Grail-Tests - Basic'
method: RandomTestCase
testSeed
	"Test random.seed() produces reproducible results"

	| r val1 val2 |
	r := random ___instance___.

	r @env1:seed: 42.
	val1 := r @env1:random.

	r @env1:seed: 42.
	val2 := r @env1:random.

	self assert: val1 equals: val2.
%

category: 'Grail-Tests - Session-Local State'
method: RandomTestCase
testGeneratorIsSessionLocalNotCommitted
	"Regression for commit 3a8f2e9: the RNG must live in SessionTemps, NOT in the
	committed module singleton.  The old code did `self at: #_generator put:`, so
	any session that used random and then committed application data dragged the
	RNG into the repository (write-write conflicts between sessions, committed
	C-backed state).  Assert that after using random the generator is absent from
	the module's persistent slots and held in SessionTemps instead."

	| r |
	r := random ___instance___.
	r @env1:seed: 42.
	r @env1:random.
	"Not parked on the committed module singleton..."
	self assert: (r at: #_generator ifAbsent: [#GrailAbsent]) == #GrailAbsent.
	"...held in this session's SessionTemps instead."
	self assert: (SessionTemps current includesKey: #'___GrailRandomGenerator___').
%

category: 'Grail-Tests - State'
method: RandomTestCase
testSetstate
	"Test random.setstate() raises NotImplementedError"

	| r |
	r := random ___instance___.

	self should: [r @env1:setstate] raise: NotImplementedError
%

category: 'Grail-Tests - Sequence'
method: RandomTestCase
testShuffle
	"Test random.shuffle(x)"

	| r list original |
	r := random ___instance___.
	list := OrderedCollection withAll: #(1 2 3 4 5).
	original := list copy.

	r @env1:shuffle: list.

	"Should have same elements"
	self assert: list size equals: original size.
	self assert: (list asSet) equals: (original asSet).
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testTriangular
	"Test random.triangular(low, high, mode)"

	| r result |
	r := random ___instance___.

	result := r @env1:triangular: 0 _: 10 _: 5.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).
	self assert: (result <= 10).
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testUniform
	"Test random.uniform(a, b)"

	| r result |
	r := random ___instance___.

	result := r @env1:uniform: 0 _: 10.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).
	self assert: (result <= 10).

	"Test with reversed order"
	result := r @env1:uniform: 10 _: 0.
	self assert: (result >= 0).
	self assert: (result <= 10).
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testWeibullvariate
	"Test random.weibullvariate(alpha, beta)"

	| r result |
	r := random ___instance___.

	result := r @env1:weibullvariate: 1 _: 2.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).  "Weibull is always non-negative"
%
