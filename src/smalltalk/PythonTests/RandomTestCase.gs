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
! ``random'' is CPython's own random.py (src/python/stdlib), vendored
! unmodified, over ``_random'' -- MT19937 transcribed from CPython's
! Modules/_randommodule.c (src/smalltalk/Python/_random_module.gs).  It used to
! be a hand-written Smalltalk module that these tests called directly; that
! module had no Random class and its own generator, so these tests now go
! through Python, and the sequence checks (testSequencesAreCPythons) pin that
! a seed reproduces CPython's numbers exactly.

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
RandomTestCase removeAllMethods: 0.
RandomTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Support'
method: RandomTestCase
random: anExpression
	"The value of a Python expression evaluated after ``import random''."

	^ self eval: 'import random
' , anExpression
%

category: 'Grail-Tests - Support'
method: RandomTestCase
assertTrue: anExpression
	self assert: (self random: anExpression) equals: true
%

category: 'Grail-Tests - Support'
method: RandomTestCase
assertChecks: names
	"Each named fixture function answers True -- it matches CPython."

	| mod |
	importlib @env1:modules removeKey: #'random_cpython_sequences' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/random_cpython_sequences.py')
		name: 'random_cpython_sequences'.
	names do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'random check failed: ' , k]
%

category: 'Grail-Tests - Sequences'
method: RandomTestCase
testSequencesAreCPythons
	"A seed answers CPython's numbers, value for value: int, str, bytes,
	multi-word and negative seeds, and every helper built on the stream.
	Verified against real CPython by running the fixture directly; see
	tests/python/random_cpython_sequences.py."

	self assertChecks: #(
		'an_int_seed_reproduces_cpythons_sequence'
		'getrandbits_and_the_integer_helpers_follow_the_same_stream'
		'a_str_seed_is_hashed_as_cpython_hashes_it'
		'a_bytes_seed_is_hashed_as_cpython_hashes_it'
		'a_seed_wider_than_one_word_uses_every_word'
		'a_negative_seed_is_its_absolute_value'
		'seed_zero_is_cpythons'
		'choice_sample_and_uniform_follow_cpython'
		'shuffle_follows_cpython'
		'gauss_and_normalvariate_follow_cpython'
		'the_module_functions_follow_cpython'
		'the_module_functions_raise_as_cpython_does' )
%

category: 'Grail-Tests - Generators'
method: RandomTestCase
testGeneratorObjects
	"random.Random instances, their state, SystemRandom, and subclassing --
	none of which the Smalltalk module had."

	self assertChecks: #(
		'getstate_and_setstate_round_trip'
		'a_generator_is_independent_of_the_module'
		'random_is_in_the_unit_interval'
		'system_random_draws_and_refuses_state'
		'a_subclass_can_supply_its_own_random'
		'getrandbits_refuses_a_negative_count'
		'setstate_validates_the_state' )
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testContinuousVariatesStayInTheirSupport
	self assertTrue: 'all(0 <= random.betavariate(2, 5) <= 1 for _ in range(50))'.
	self assertTrue: 'all(random.expovariate(1) >= 0 for _ in range(50))'.
	self assertTrue: 'all(random.gammavariate(2, 1) > 0 for _ in range(50))'.
	self assertTrue: 'all(random.lognormvariate(0, 1) > 0 for _ in range(50))'.
	self assertTrue: 'all(random.paretovariate(2) >= 1 for _ in range(50))'.
	self assertTrue: 'all(1 <= random.triangular(1, 3) <= 3 for _ in range(50))'.
	self assertTrue: 'all(type(f(0, 1)) is float for f in (random.gauss, random.normalvariate, random.weibullvariate))'
%

category: 'Grail-Tests - Distributions'
method: RandomTestCase
testBinomialvariate
	self assertTrue: 'all(0 <= random.binomialvariate(10, 0.5) <= 10 for _ in range(50))'.
	self assert: (self random: 'random.binomialvariate(10, 0)') equals: 0.
	self assert: (self random: 'random.binomialvariate(10, 1)') equals: 10
%

category: 'Grail-Tests - Integers'
method: RandomTestCase
testRandintAndRandrange
	self assertTrue: 'all(1 <= random.randint(1, 10) <= 10 for _ in range(50))'.
	self assertTrue: 'all(-10 <= random.randint(-10, -1) <= -1 for _ in range(50))'.
	self assert: (self random: 'random.randint(5, 5)') equals: 5.
	self assertTrue: 'all(0 <= random.randrange(10) < 10 for _ in range(50))'.
	self assertTrue: 'all(5 <= random.randrange(5, 15) < 15 for _ in range(50))'.
	self assertTrue: 'all(random.randrange(0, 100, 10) % 10 == 0 for _ in range(50))'
%

category: 'Grail-Tests - Integers'
method: RandomTestCase
testRandrangeErrors
	self should: [self random: 'random.randrange(0)'] raise: ValueError.
	self should: [self random: 'random.randrange(10, 5)'] raise: ValueError.
	self should: [self random: 'random.randrange(0, 10, 0)'] raise: ValueError
%

category: 'Grail-Tests - Integers'
method: RandomTestCase
testGetrandbits
	self assertTrue: 'all(0 <= random.getrandbits(8) < 256 for _ in range(50))'.
	self assertTrue: 'all(0 <= random.getrandbits(100) < 2 ** 100 for _ in range(50))'.
	self assert: (self random: 'random.getrandbits(0)') equals: 0.
	self should: [self random: 'random.getrandbits(-1)'] raise: ValueError
%

category: 'Grail-Tests - Bytes'
method: RandomTestCase
testRandbytes
	self assertTrue: 'type(random.randbytes(8)) is bytes and len(random.randbytes(8)) == 8'.
	self assertTrue: 'random.randbytes(0) == b'''''.
	self should: [self random: 'random.randbytes(-1)'] raise: ValueError
%

category: 'Grail-Tests - Sequences'
method: RandomTestCase
testChoiceChoicesSampleShuffle
	self assertTrue: 'all(random.choice([10, 20, 30]) in (10, 20, 30) for _ in range(50))'.
	self should: [self random: 'random.choice([])'] raise: IndexError.
	self assertTrue: 'len(random.choices([1, 2, 3], k=5)) == 5'.
	self assertTrue: 'random.choices([1, 2, 3], weights=[1, 0, 0], k=10) == [1] * 10'.
	self assertTrue: 'len(set(random.sample(range(5), 3))) == 3'.
	self should: [self random: 'random.sample([1, 2, 3], 5)'] raise: ValueError.
	self assertTrue: 'x = list(range(10))
random.shuffle(x)
sorted(x) == list(range(10))'
%

category: 'Grail-Tests - Module'
method: RandomTestCase
testModuleFunctionsAreFirstClass
	"``from random import random'' binds the bound method, not a float."

	self assertTrue: 'from random import random as r
callable(r) and 0.0 <= r() < 1.0'
%
