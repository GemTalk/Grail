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
RandomTestCase category: 'SUnit'
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

category: 'Tests - Distributions'
method: RandomTestCase
testBetavariate
	"Test random.betavariate(alpha, beta)"

	| r result |
	r := random ___instance___.

	result := (r @env1:betavariate) value: {2. 5} value: nil.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).
	self assert: (result <= 1).  "Beta is always in [0, 1]"
%

category: 'Tests - Distributions'
method: RandomTestCase
testBinomialvariate
	"Test random.binomialvariate(n, p)"

	| r result |
	r := random ___instance___.

	result := (r @env1:binomialvariate) value: {10. 0.5} value: nil.
	self assert: (result isKindOf: Integer).
	self assert: (result >= 0).
	self assert: (result <= 10).

	"p=0 should always return 0"
	result := (r @env1:binomialvariate) value: {10. 0} value: nil.
	self assert: result equals: 0.

	"p=1 should always return n"
	result := (r @env1:binomialvariate) value: {10. 1} value: nil.
	self assert: result equals: 10.
%

category: 'Tests - Sequence'
method: RandomTestCase
testChoice
	"Test random.choice(seq)"

	| r result seq |
	r := random ___instance___.
	seq := #(1 2 3 4 5).

	result := (r @env1:choice) value: {seq} value: nil.
	self assert: (seq includes: result).
%

category: 'Tests - Sequence'
method: RandomTestCase
testChoiceEmptySequence
	"Test random.choice() on empty sequence raises IndexError"

	| r |
	r := random ___instance___.

	self should: [(r @env1:choice) value: {#()} value: nil] raise: IndexError.
%

category: 'Tests - Sequence'
method: RandomTestCase
testChoices
	"Test random.choices(population, k=n)"

	| r result |
	r := random ___instance___.

	result := (r @env1:choices) value: {#(1 2 3)} value: (Dictionary new at: #k put: 5; yourself).
	self assert: result size equals: 5.
	result do: [:each | self assert: (#(1 2 3) includes: each)].
%

category: 'Tests - Sequence'
method: RandomTestCase
testChoicesWithWeights
	"Test random.choices() with weights"

	| r result weights |
	r := random ___instance___.
	weights := #(1 0 0).  "Only first element should be chosen"

	result := (r @env1:choices) value: {#(1 2 3)} value: (Dictionary new at: #weights put: weights; at: #k put: 10; yourself).
	self assert: result size equals: 10.
	result do: [:each | self assert: each equals: 1].
%

category: 'Tests - Distributions'
method: RandomTestCase
testExpovariate
	"Test random.expovariate(lambd)"

	| r result |
	r := random ___instance___.

	result := (r @env1:expovariate) value: {1} value: nil.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).  "Exponential is always non-negative"
%

category: 'Tests - Distributions'
method: RandomTestCase
testGammavariate
	"Test random.gammavariate(alpha, beta)"

	| r result |
	r := random ___instance___.

	result := (r @env1:gammavariate) value: {2. 1} value: nil.
	self assert: (result isKindOf: Float).
	self assert: (result > 0).  "Gamma is always positive"
%

category: 'Tests - Distributions'
method: RandomTestCase
testGauss
	"Test random.gauss(mu, sigma)"

	| r result |
	r := random ___instance___.

	result := (r @env1:gauss) value: {0. 1} value: nil.
	self assert: (result isKindOf: Float).
	"Gauss can return any value, but very unlikely to be outside -10 to 10 for mu=0, sigma=1"
%

category: 'Tests - Basic'
method: RandomTestCase
testGetrandbits
	"Test random.getrandbits(k)"

	| r result |
	r := random ___instance___.

	result := (r @env1:getrandbits) value: {8} value: nil.
	self assert: (result isKindOf: Integer).
	self assert: (result >= 0).
	self assert: (result < 256).

	result := (r @env1:getrandbits) value: {16} value: nil.
	self assert: (result >= 0).
	self assert: (result < 65536).
%

category: 'Tests - Edge Cases'
method: RandomTestCase
testGetrandbitsNegative
	"Test random.getrandbits() with negative k raises ValueError"

	| r |
	r := random ___instance___.

	self should: [(r @env1:getrandbits) value: {-1} value: nil] raise: ValueError.
%

category: 'Tests - Edge Cases'
method: RandomTestCase
testGetrandbitsZero
	"Test random.getrandbits(0) returns 0"

	| r result |
	r := random ___instance___.

	result := (r @env1:getrandbits) value: {0} value: nil.
	self assert: result equals: 0.
%

category: 'Tests - State'
method: RandomTestCase
testGetstate
	"Test random.getstate() raises NotImplementedError"

	| r |
	r := random ___instance___.

	self should: [(r @env1:getstate) value: {} value: nil] raise: NotImplementedError.
%

category: 'Tests - Singleton'
method: RandomTestCase
testInstance
	"Test that random.___instance___ returns the singleton"

	| r1 r2 |
	r1 := random ___instance___.
	r2 := random ___instance___.

	self assert: r1 == r2.
%

category: 'Tests - Distributions'
method: RandomTestCase
testLognormvariate
	"Test random.lognormvariate(mu, sigma)"

	| r result |
	r := random ___instance___.

	result := (r @env1:lognormvariate) value: {0. 1} value: nil.
	self assert: (result isKindOf: Float).
	self assert: (result > 0).  "Log-normal is always positive"
%

category: 'Tests - Distributions'
method: RandomTestCase
testNormalvariate
	"Test random.normalvariate(mu, sigma)"

	| r result |
	r := random ___instance___.

	result := (r @env1:normalvariate) value: {0. 1} value: nil.
	self assert: (result isKindOf: Float).
%

category: 'Tests - Distributions'
method: RandomTestCase
testParetovariate
	"Test random.paretovariate(alpha)"

	| r result |
	r := random ___instance___.

	result := (r @env1:paretovariate) value: {2} value: nil.
	self assert: (result isKindOf: Float).
	self assert: (result >= 1).  "Pareto with xm=1 is always >= 1"
%

category: 'Tests - Basic'
method: RandomTestCase
testRandbytes
	"Test random.randbytes(n)"

	| r result |
	r := random ___instance___.

	result := (r @env1:randbytes) value: {8} value: nil.
	self assert: (result isKindOf: ByteArray).
	self assert: result size equals: 8.

	result := (r @env1:randbytes) value: {0} value: nil.
	self assert: result size equals: 0.
%

category: 'Tests - Edge Cases'
method: RandomTestCase
testRandbytesNegative
	"Test random.randbytes() with negative n raises ValueError"

	| r |
	r := random ___instance___.

	self should: [(r @env1:randbytes) value: {-1} value: nil] raise: ValueError.
%

category: 'Tests - Edge Cases'
method: RandomTestCase
testRandbytesZero
	"Test random.randbytes(0) returns empty bytes"

	| r result |
	r := random ___instance___.

	result := (r @env1:randbytes) value: {0} value: nil.
	self assert: (result isKindOf: ByteArray).
	self assert: result size equals: 0.
%

category: 'Tests - Integer'
method: RandomTestCase
testRandint
	"Test random.randint(a, b)"

	| r result |
	r := random ___instance___.

	"Test basic randint"
	result := (r @env1:randint) value: {1. 10} value: nil.
	self assert: (result isKindOf: Integer).
	self assert: (result >= 1).
	self assert: (result <= 10).

	"Test with negative numbers"
	result := (r @env1:randint) value: {-10. -1} value: nil.
	self assert: (result >= -10).
	self assert: (result <= -1).

	"Test single value range"
	result := (r @env1:randint) value: {5. 5} value: nil.
	self assert: result equals: 5.
%

category: 'Tests - Basic'
method: RandomTestCase
testRandom
	"Test random.random() returns a float in [0, 1)"

	| r result |
	r := random ___instance___.
	result := (r @env1:random) value: {} value: nil.

	self assert: (result isKindOf: Float).
	self assert: (result >= 0.0).
	self assert: (result < 1.0).
%

category: 'Tests - Integer'
method: RandomTestCase
testRandrangeErrors
	"Test random.randrange() error cases"

	| r |
	r := random ___instance___.

	"Empty range should raise ValueError"
	self should: [(r @env1:randrange) value: {0} value: nil] raise: ValueError.
	self should: [(r @env1:randrange) value: {10. 5} value: nil] raise: ValueError.
	self should: [(r @env1:randrange) value: {0. 10. -1} value: nil] raise: ValueError.
%

category: 'Tests - Integer'
method: RandomTestCase
testRandrangeOneArg
	"Test random.randrange(stop)"

	| r result |
	r := random ___instance___.

	result := (r @env1:randrange) value: {10} value: nil.
	self assert: (result isKindOf: Integer).
	self assert: (result >= 0).
	self assert: (result < 10).
%

category: 'Tests - Integer'
method: RandomTestCase
testRandrangeThreeArgs
	"Test random.randrange(start, stop, step)"

	| r result |
	r := random ___instance___.

	"Step of 10: should get 0, 10, 20, ..., 90"
	result := (r @env1:randrange) value: {0. 100. 10} value: nil.
	self assert: (result \\ 10) equals: 0.
	self assert: (result >= 0).
	self assert: (result < 100).

	"Step of 2: should get even numbers"
	result := (r @env1:randrange) value: {0. 10. 2} value: nil.
	self assert: (result \\ 2) equals: 0.
%

category: 'Tests - Integer'
method: RandomTestCase
testRandrangeTwoArgs
	"Test random.randrange(start, stop)"

	| r result |
	r := random ___instance___.

	result := (r @env1:randrange) value: {5. 15} value: nil.
	self assert: (result >= 5).
	self assert: (result < 15).
%

category: 'Tests - Sequence'
method: RandomTestCase
testSample
	"Test random.sample(population, k)"

	| r result |
	r := random ___instance___.

	result := (r @env1:sample) value: {#(1 2 3 4 5). 3} value: nil.
	self assert: result size equals: 3.

	"Check all elements are unique"
	self assert: (result asSet size) equals: 3.

	"Check all elements are from the population"
	result do: [:each | self assert: (#(1 2 3 4 5) includes: each)].
%

category: 'Tests - Sequence'
method: RandomTestCase
testSampleErrors
	"Test random.sample() error cases"

	| r |
	r := random ___instance___.

	"k larger than population should raise ValueError"
	self should: [(r @env1:sample) value: {#(1 2 3). 5} value: nil] raise: ValueError.
%

category: 'Tests - Edge Cases'
method: RandomTestCase
testSampleZero
	"Test random.sample() with k=0 returns empty list"

	| r result |
	r := random ___instance___.

	result := (r @env1:sample) value: {#(1 2 3). 0} value: nil.
	self assert: result size equals: 0.
%

category: 'Tests - Basic'
method: RandomTestCase
testSeed
	"Test random.seed() produces reproducible results"

	| r val1 val2 |
	r := random ___instance___.

	(r @env1:seed) value: {42} value: nil.
	val1 := (r @env1:random) value: {} value: nil.

	(r @env1:seed) value: {42} value: nil.
	val2 := (r @env1:random) value: {} value: nil.

	self assert: val1 equals: val2.
%

category: 'Tests - State'
method: RandomTestCase
testSetstate
	"Test random.setstate() raises NotImplementedError"

	| r |
	r := random ___instance___.

	self should: [(r @env1:setstate) value: {#()} value: nil] raise: NotImplementedError.
%

category: 'Tests - Sequence'
method: RandomTestCase
testShuffle
	"Test random.shuffle(x)"

	| r list original |
	r := random ___instance___.
	list := OrderedCollection withAll: #(1 2 3 4 5).
	original := list copy.

	(r @env1:shuffle) value: {list} value: nil.

	"Should have same elements"
	self assert: list size equals: original size.
	self assert: (list asSet) equals: (original asSet).
%

category: 'Tests - Distributions'
method: RandomTestCase
testTriangular
	"Test random.triangular(low, high, mode)"

	| r result |
	r := random ___instance___.

	result := (r @env1:triangular) value: {0. 10. 5} value: nil.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).
	self assert: (result <= 10).
%

category: 'Tests - Distributions'
method: RandomTestCase
testUniform
	"Test random.uniform(a, b)"

	| r result |
	r := random ___instance___.

	result := (r @env1:uniform) value: {0. 10} value: nil.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).
	self assert: (result <= 10).

	"Test with reversed order"
	result := (r @env1:uniform) value: {10. 0} value: nil.
	self assert: (result >= 0).
	self assert: (result <= 10).
%

category: 'Tests - Distributions'
method: RandomTestCase
testWeibullvariate
	"Test random.weibullvariate(alpha, beta)"

	| r result |
	r := random ___instance___.

	result := (r @env1:weibullvariate) value: {1. 2} value: nil.
	self assert: (result isKindOf: Float).
	self assert: (result >= 0).  "Weibull is always non-negative"
%
