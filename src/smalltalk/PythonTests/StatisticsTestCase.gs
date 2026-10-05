! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StatisticsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StatisticsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StatisticsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StatisticsTestCase - Tests for Python statistics module
! ===============================================================================
! ``statistics'' is CPython's own statistics.py (src/python/stdlib), vendored
! unmodified.  It used to be a hand-written Smalltalk module that these tests
! called directly; that module covered the averages and spreads below and left
! out NormalDist, StatisticsError's place in the module, kde() and the private
! helpers test_statistics exercises (_sum, _exact_ratio, _convert, ...).  The
! tests now go through Python, as user code does, so they check the vendored
! module running on Grail rather than a particular implementation.

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
StatisticsTestCase removeAllMethods: 0.
StatisticsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Support'
method: StatisticsTestCase
statistics: anExpression
	"The value of a Python expression evaluated after ``import statistics''."

	^ self eval: 'import statistics
' , anExpression
%

category: 'Grail-Tests - Support'
method: StatisticsTestCase
assert: aNumber closeTo: expected
	self assert: ((aNumber - expected) abs < 0.00001)
		description: aNumber printString , ' is not close to ' , expected printString
%

category: 'Grail-Tests - Correlation'
method: StatisticsTestCase
testCorrelation
	"statistics.correlation()  Perfect positive correlation."

	self assert: (self statistics: 'statistics.correlation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])') closeTo: 1.0
%

category: 'Grail-Tests - Correlation'
method: StatisticsTestCase
testCorrelationNegative
	"statistics.correlation() with negative correlation  Perfect negative correlation."

	self assert: (self statistics: 'statistics.correlation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])') closeTo: -1.0
%

category: 'Grail-Tests - Correlation'
method: StatisticsTestCase
testCovariance
	"statistics.covariance()  Covariance of x and y=2x is 2 * variance(x) = 2 * 2.5."

	self assert: (self statistics: 'statistics.covariance([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])') closeTo: 5.0
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testFmean
	"statistics.fmean(), the fast floating-point mean"

	self assert: (self statistics: 'statistics.fmean([1, 2, 3, 4, 5])') closeTo: 3.0
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testFmeanWithWeights
	"statistics.fmean() with weights  Weighted mean: (1*1 + 2*2 + 3*3) / (1+2+3) = 14/6."

	self assert: (self statistics: 'statistics.fmean([1, 2, 3], weights=[1, 2, 3])') closeTo: (14 / 6) asFloat
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testGeometricMean
	"statistics.geometric_mean()  (1*2*4*8)^(1/4) = 64^0.25."

	self assert: (self statistics: 'statistics.geometric_mean([1, 2, 4, 8])') closeTo: (64 raisedTo: 0.25)
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testHarmonicMean
	"statistics.harmonic_mean()  3 / (1/1 + 1/2 + 1/4)."

	self assert: (self statistics: 'statistics.harmonic_mean([1, 2, 4])') closeTo: (3 / 1.75)
%

category: 'Grail-Tests - Regression'
method: StatisticsTestCase
testLinearRegressionIntercept
	"statistics.linear_regression() -- the intercept  y = 2x + 1."

	self assert: (self statistics: 'statistics.linear_regression([1, 2, 3, 4, 5], [3, 5, 7, 9, 11]).intercept') closeTo: 1.0
%

category: 'Grail-Tests - Regression'
method: StatisticsTestCase
testLinearRegressionSlope
	"statistics.linear_regression() -- the slope  y = 2x + 1."

	self assert: (self statistics: 'statistics.linear_regression([1, 2, 3, 4, 5], [3, 5, 7, 9, 11]).slope') closeTo: 2.0
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testMean
	"statistics.mean() with simple data"

	self assert: (self statistics: 'statistics.mean([1, 2, 3, 4])') closeTo: 2.5
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testMeanAndMedianAnswerInTheDatasType
	"statistics.mean and the medians answer in the data's own type, and over
	Decimals and Fractions answer at all.

	They added and compared with env-0 sends.  Over a Decimal or a Fraction
	the add reached GemStone's Number generality coercion and the sort reached
	env-0 #<=, and either miss was a MessageNotUnderstood that ended the
	session; over ints, mean([1, 2]) answered a Smalltalk Fraction where
	CPython answers 1.5.  The last four checks are the guard: ints and floats
	otherwise matched CPython and must go on doing so.

	Verified against real CPython by running the fixture directly; see
	tests/python/statistics_in_the_datas_type.py."

	| mod |
	importlib @env1:modules removeKey: #'statistics_in_the_datas_type' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/statistics_in_the_datas_type.py')
		name: 'statistics_in_the_datas_type'.
	#( 'the_mean_of_decimals_is_a_decimal'
	   'the_mean_of_decimals_that_do_not_divide_is_to_context_precision'
	   'the_mean_of_fractions_is_a_fraction'
	   'the_median_of_an_odd_count_of_decimals_is_the_middle_one'
	   'the_median_of_an_even_count_of_decimals_is_a_decimal'
	   'the_median_of_fractions_is_a_fraction'
	   'median_low_and_high_of_decimals_are_the_decimals'
	   'the_mean_of_ints_that_do_not_divide_is_a_float'
	   'the_mean_of_ints_that_divide_is_an_int'
	   'the_mean_of_floats_is_a_float'
	   'the_median_of_ints_is_an_int_or_a_float' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'statistics type check failed: ' , k].
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testMeanEmpty
	"statistics.mean() of no data raises StatisticsError, which is a
	ValueError -- and the module's own class, not a built-in."

	self should: [self statistics: 'statistics.mean([])'] raise: ValueError.
	self assert: (self statistics: 'try:
    statistics.mean([])
except statistics.StatisticsError as e:
    r = type(e).__module__
r') equals: 'statistics'
%

category: 'Grail-Tests - Median'
method: StatisticsTestCase
testMedianEven
	"statistics.median() with an even count"

	self assert: (self statistics: 'statistics.median([1, 2, 3, 4])') closeTo: 2.5
%

category: 'Grail-Tests - Median'
method: StatisticsTestCase
testMedianHigh
	"statistics.median_high()"

	self assert: (self statistics: 'statistics.median_high([1, 2, 3, 4])') equals: 3
%

category: 'Grail-Tests - Median'
method: StatisticsTestCase
testMedianLow
	"statistics.median_low()"

	self assert: (self statistics: 'statistics.median_low([1, 2, 3, 4])') equals: 2
%

category: 'Grail-Tests - Median'
method: StatisticsTestCase
testMedianOdd
	"statistics.median() with an odd count"

	self assert: (self statistics: 'statistics.median([1, 3, 5, 7, 9])') equals: 5
%

category: 'Grail-Tests - Accelerator'
method: StatisticsTestCase
testPurePythonCopyWithoutTheAccelerator
	"import_fresh_module('statistics', blocked=['_statistics']) builds a copy of
	the module that does not use the C shim's _normal_dist_inv_cdf, as
	test_statistics' py_statistics expects -- and a copy whose own code works.

	Grail's helper used to ignore blocked= and answer the ordinary module, whose
	_normal_dist_inv_cdf IS the shim's.  The first copy it built then lost its
	module singleton at _end_fresh_import, so a method reading a module global
	minted a THIRD module: py.NormalDist(0, 1) == py.NormalDist(0, 1) was False."

	self assert: (self statistics: 'from test.support import import_helper
py = import_helper.import_fresh_module(''statistics'', blocked=[''_statistics''])
''%s %s %s %s'' % (py is statistics,
    py._normal_dist_inv_cdf.__module__,
    statistics._normal_dist_inv_cdf.__module__,
    py.NormalDist(0, 1) == py.NormalDist(0, 1))')
		equals: 'False statistics _statistics True'
%

category: 'Grail-Tests - Spread'
method: StatisticsTestCase
testPstdev
	"statistics.pstdev()"

	self assert: (self statistics: 'statistics.pstdev([2, 4, 4, 4, 5, 5, 7, 9])') closeTo: 2.0
%

category: 'Grail-Tests - Spread'
method: StatisticsTestCase
testPvariance
	"statistics.pvariance()"

	self assert: (self statistics: 'statistics.pvariance([2, 4, 4, 4, 5, 5, 7, 9])') closeTo: 4.0
%

category: 'Grail-Tests - Quantiles'
method: StatisticsTestCase
testQuantiles
	"statistics.quantiles() -- quartiles by default, so three cut points"

	self assert: (self statistics: 'len(statistics.quantiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))') equals: 3
%

category: 'Grail-Tests - Spread'
method: StatisticsTestCase
testStdev
	"statistics.stdev()"

	self assert: (self statistics: 'statistics.stdev([2, 4, 4, 4, 5, 5, 7, 9])') closeTo: 4.571428571428571 sqrt
%

category: 'Grail-Tests - Spread'
method: StatisticsTestCase
testVariance
	"statistics.variance()"

	self assert: (self statistics: 'statistics.variance([2, 4, 4, 4, 5, 5, 7, 9])') closeTo: 4.571428571428571
%
