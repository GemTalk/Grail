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

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
StatisticsTestCase removeAllMethods: 0.
StatisticsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Correlation'
method: StatisticsTestCase
testCorrelation
	"Test statistics.correlation()"

	| s result |
	s := statistics ___instance___.
	result := s @env1:correlation: {1. 2. 3. 4. 5} _: {2. 4. 6. 8. 10}.

	"Perfect positive correlation"
	self assert: (((result - 1.0) abs) < 0.00001).
%

category: 'Grail-Tests - Correlation'
method: StatisticsTestCase
testCorrelationNegative
	"Test statistics.correlation() with negative correlation"

	| s result |
	s := statistics ___instance___.
	result := s @env1:correlation: {1. 2. 3. 4. 5} _: {10. 8. 6. 4. 2}.

	"Perfect negative correlation"
	self assert: (((result - -1.0) abs) < 0.00001).
%

category: 'Grail-Tests - Correlation'
method: StatisticsTestCase
testCovariance
	"Test statistics.covariance()"

	| s result |
	s := statistics ___instance___.
	result := s @env1:covariance: {1. 2. 3. 4. 5} _: {2. 4. 6. 8. 10}.

	"Covariance of x and y=2x should be 2 * variance(x) = 2 * 2.5 = 5.0"
	self assert: (((result - 5.0) abs) < 0.00001).
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testFmean
	"Test statistics.fmean() fast floating-point mean"

	| s result |
	s := statistics ___instance___.
	result := s @env1:fmean: {1. 2. 3. 4. 5}.

	self assert: (((result - 3.0) abs) < 0.00001).
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testFmeanWithWeights
	"Test statistics.fmean() with weights"

	| s result expected |
	s := statistics ___instance___.
	result := s @env1:_fmean: {{1. 2. 3}} kw: (KeyValueDictionary new at: 'weights' put: {1. 2. 3}; yourself).

	"Weighted mean: (1*1 + 2*2 + 3*3) / (1+2+3) = 14/6 = 2.333..."
	expected := (14/6) asFloat.
	self assert: (((result - expected) abs) < 0.00001).
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testGeometricMean
	"Test statistics.geometric_mean()"

	| s result expected |
	s := statistics ___instance___.
	result := s @env1:geometric_mean: {1. 2. 4. 8}.

	"Geometric mean of 1,2,4,8 = (1*2*4*8)^(1/4) = 64^0.25 = 2.828..."
	expected := 64 raisedTo: 0.25.
	self assert: (((result - expected) abs) < 0.00001).
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testHarmonicMean
	"Test statistics.harmonic_mean()"

	| s result expected |
	s := statistics ___instance___.
	result := s @env1:harmonic_mean: {1. 2. 4}.

	"Harmonic mean: 3 / (1/1 + 1/2 + 1/4) = 3 / 1.75 = 1.714..."
	expected := 3 / 1.75.
	self assert: (((result - expected) abs) < 0.00001).
%

category: 'Grail-Tests - Regression'
method: StatisticsTestCase
testLinearRegression
	"Test statistics.linear_regression()"

	| s result slope intercept |
	s := statistics ___instance___.
	result := s @env1:linear_regression: {1. 2. 3. 4. 5} _: {3. 5. 7. 9. 11}.

	"y = 2x + 1, so slope=2, intercept=1"
	slope := result at: 1.
	intercept := result at: 2.
	self assert: (((slope - 2.0) abs) < 0.00001).
	self assert: (((intercept - 1.0) abs) < 0.00001).
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testMean
	"Test statistics.mean() with simple data"

	| s result |
	s := statistics ___instance___.
	result := s @env1:mean: {1. 2. 3. 4. 5}.

	self assert: result equals: 3.
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testMeanEmpty
	"Test statistics.mean() raises error for empty data"

	| s |
	s := statistics ___instance___.

	self should: [
		s @env1:mean: {}.
	] raise: StatisticsError.
%

category: 'Grail-Tests - Mean'
method: StatisticsTestCase
testMeanFloat
	"Test statistics.mean() returns correct float"

	| s result |
	s := statistics ___instance___.
	result := s @env1:mean: {1. 2. 3. 4}.

	self assert: (((result - 2.5) abs) < 0.00001).
%

category: 'Grail-Tests - Median'
method: StatisticsTestCase
testMedianEven
	"Test statistics.median() with even number of elements"

	| s result |
	s := statistics ___instance___.
	result := s @env1:median: {1. 2. 3. 4}.

	self assert: (((result - 2.5) abs) < 0.00001).
%

category: 'Grail-Tests - Median'
method: StatisticsTestCase
testMedianHigh
	"Test statistics.median_high()"

	| s result |
	s := statistics ___instance___.
	result := s @env1:median_high: {1. 2. 3. 4}.

	self assert: result equals: 3.
%

category: 'Grail-Tests - Median'
method: StatisticsTestCase
testMedianLow
	"Test statistics.median_low()"

	| s result |
	s := statistics ___instance___.
	result := s @env1:median_low: {1. 2. 3. 4}.

	self assert: result equals: 2.
%

category: 'Grail-Tests - Median'
method: StatisticsTestCase
testMedianOdd
	"Test statistics.median() with odd number of elements"

	| s result |
	s := statistics ___instance___.
	result := s @env1:median: {1. 3. 5. 7. 9}.

	self assert: result equals: 5.
%

category: 'Grail-Tests - Variance'
method: StatisticsTestCase
testPstdev
	"Test statistics.pstdev() population standard deviation"

	| s result |
	s := statistics ___instance___.
	result := s @env1:pstdev: {2. 4. 4. 4. 5. 5. 7. 9}.

	"Population stdev = sqrt(4.0) = 2.0"
	self assert: (((result - 2.0) abs) < 0.00001).
%

category: 'Grail-Tests - Variance'
method: StatisticsTestCase
testPvariance
	"Test statistics.pvariance() population variance"

	| s result |
	s := statistics ___instance___.
	result := s @env1:pvariance: {2. 4. 4. 4. 5. 5. 7. 9}.

	"Population variance = 4.0"
	self assert: (((result - 4.0) abs) < 0.00001).
%

category: 'Grail-Tests - Quantiles'
method: StatisticsTestCase
testQuantiles
	"Test statistics.quantiles() default quartiles"

	| s result |
	s := statistics ___instance___.
	result := s @env1:quantiles: {1. 2. 3. 4. 5. 6. 7. 8. 9. 10}.

	"Default n=4 gives quartiles (3 cut points)"
	self assert: result size equals: 3.
%

category: 'Grail-Tests - Variance'
method: StatisticsTestCase
testStdev
	"Test statistics.stdev() sample standard deviation"

	| s result expected |
	s := statistics ___instance___.
	result := s @env1:stdev: {2. 4. 4. 4. 5. 5. 7. 9}.

	"Sample stdev = sqrt(4.571...) = 2.138..."
	expected := 4.571428571428571 sqrt.
	self assert: (((result - expected) abs) < 0.00001).
%

category: 'Grail-Tests - Variance'
method: StatisticsTestCase
testVariance
	"Test statistics.variance() sample variance"

	| s result expected |
	s := statistics ___instance___.
	result := s @env1:variance: {2. 4. 4. 4. 5. 5. 7. 9}.

	"Sample variance of 2,4,4,4,5,5,7,9 = 4.571..."
	expected := 4.571428571428571.
	self assert: (((result - expected) abs) < 0.00001).
%
