! ===============================================================================
! statistics - Python statistics module
! ===============================================================================
! This file implements Python's statistics module for mathematical statistics.
!
! Functions implemented:
! - mean(data) - Arithmetic mean
! - fmean(data, weights) - Fast floating-point mean with optional weights
! - geometric_mean(data) - Geometric mean
! - harmonic_mean(data, weights) - Harmonic mean
! - median(data) - Median (middle value)
! - median_low(data) - Low median
! - median_high(data) - High median
! - median_grouped(data, interval) - Median of grouped data
! - mode(data) - Single mode (most common value)
! - multimode(data) - List of modes
! - quantiles(data, n, method) - Divide data into intervals
! - pstdev(data, mu) - Population standard deviation
! - pvariance(data, mu) - Population variance
! - stdev(data, xbar) - Sample standard deviation
! - variance(data, xbar) - Sample variance
! - covariance(x, y) - Sample covariance
! - correlation(x, y) - Pearson correlation coefficient
! - linear_regression(x, y) - Slope and intercept for linear regression
! ===============================================================================

set compile_env: 2

! ------------------- Class methods for statistics

category: 'Python-Singleton'
classmethod: statistics
new
	"Raise an error: use instance instead of new"
	TypeError ___signal___: 'Use instance instead of new for statistics module'
%

category: 'Python-Singleton'
classmethod: statistics
instance
	"Return the singleton instance of statistics.
	Creates it if it doesn't exist."
	instance == nil ifTrue: [
		instance := self perform: #basicNew env: 0.
		instance perform: #initialize env: 2
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: statistics
clearInstance
	"Clear the singleton instance (useful for testing)"
	instance := nil
%

set compile_env: 0

category: 'Convenience Methods'
classmethod: statistics
___instance___
	"Convenience method: self perform: #instance env: 2"
	^ self perform: #instance env: 2
%

set compile_env: 2

! ------------------- Instance methods for statistics - Initialization

category: 'Python-Initialization'
method: statistics
initialize
	"Initialize all module attributes with their default values"
	self
		initialize_mean;
		initialize_fmean;
		initialize_geometric_mean;
		initialize_harmonic_mean;
		initialize_median;
		initialize_median_low;
		initialize_median_high;
		initialize_median_grouped;
		initialize_mode;
		initialize_multimode;
		initialize_quantiles;
		initialize_pvariance;
		initialize_pstdev;
		initialize_variance;
		initialize_stdev;
		initialize_covariance;
		initialize_correlation;
		initialize_linear_regression;
		yourself
%

category: 'Python-Private'
method: statistics
_toList: data
	"Convert data to a list (OrderedCollection) for processing"
	| result |
	result := OrderedCollection ___new___.
	data ___do___: [:each | result ___add___: each].
	^ result
%

category: 'Python-Private'
method: statistics
_sum: data
	"Sum all elements in data"
	| total |
	total := 0.
	data ___do___: [:each | total := total ___plus___: each].
	^ total
%

category: 'Python-Private'
method: statistics
_len: data
	"Get the length of data"
	^ [data __len__] ___on___: MessageNotUnderstood do: [:ex | data ___size___]
%

category: 'Python-Initialization'
method: statistics
initialize_mean
	"mean(data) -> Return the sample arithmetic mean of data."
	mean := [:positional :keywords |
		| data n total |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'mean requires at least one data point'
		].
		total := self _sum: data.
		total ___divide___: n
	]
%

category: 'Python-Initialization'
method: statistics
initialize_fmean
	"fmean(data, weights=None) -> Return the fast floating-point arithmetic mean."
	fmean := [:positional :keywords |
		| data weights n total weightSum |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'fmean requires at least one data point'
		].
		weights := (keywords == nil) ifTrue: [nil] ifFalse: [keywords ___at___: #weights ifAbsent: [nil]].
		weights == nil ifTrue: [
			total := 0.0.
			data ___do___: [:each | total := total ___plus___: (each ___asFloat___)].
			total ___divide___: n
		] ifFalse: [
			(weights ___size___ ___ne___: n) ifTrue: [
				ValueError ___signal___: 'weights and data must be the same length'
			].
			total := 0.0.
			weightSum := 0.0.
			1 ___to___: n do: [:i |
				| w d |
				w := (weights ___at___: i) ___asFloat___.
				d := (data ___at___: i) ___asFloat___.
				total := total ___plus___: (w ___times___: d).
				weightSum := weightSum ___plus___: w
			].
			total ___divide___: weightSum
		]
	]
%

category: 'Python-Initialization'
method: statistics
initialize_geometric_mean
	"geometric_mean(data) -> Return the geometric mean of data."
	geometric_mean := [:positional :keywords |
		| data n product logSum |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'geometric_mean requires at least one data point'
		].
		"Use log sum to avoid overflow"
		logSum := 0.0.
		data ___do___: [:each |
			| val |
			val := each ___asFloat___.
			(val ___le___: 0) ifTrue: [
				StatisticsError ___signal___: 'geometric_mean requires strictly positive data'
			].
			logSum := logSum ___plus___: (val ___ln___)
		].
		(logSum ___divide___: n) perform: #exp env: 0
	]
%

category: 'Python-Initialization'
method: statistics
initialize_harmonic_mean
	"harmonic_mean(data, weights=None) -> Return the harmonic mean of data."
	harmonic_mean := [:positional :keywords |
		| data weights n recipSum weightSum |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'harmonic_mean requires at least one data point'
		].
		weights := (keywords == nil) ifTrue: [nil] ifFalse: [keywords ___at___: #weights ifAbsent: [nil]].
		weights == nil ifTrue: [
			recipSum := 0.0.
			data ___do___: [:each |
				| val |
				val := each ___asFloat___.
				(val ___eq___: 0) ifTrue: [ ^ 0.0 ].
				(val ___lt___: 0) ifTrue: [
					StatisticsError ___signal___: 'harmonic_mean does not support negative values'
				].
				recipSum := recipSum ___plus___: (1.0 ___divide___: val)
			].
			n ___divide___: recipSum
		] ifFalse: [
			(weights ___size___ ___ne___: n) ifTrue: [
				ValueError ___signal___: 'weights and data must be the same length'
			].
			recipSum := 0.0.
			weightSum := 0.0.
			1 ___to___: n do: [:i |
				| w val |
				w := (weights ___at___: i) ___asFloat___.
				val := (data ___at___: i) ___asFloat___.
				(val ___eq___: 0) ifTrue: [ ^ 0.0 ].
				(val ___lt___: 0) ifTrue: [
					StatisticsError ___signal___: 'harmonic_mean does not support negative values'
				].
				recipSum := recipSum ___plus___: (w ___divide___: val).
				weightSum := weightSum ___plus___: w
			].
			weightSum ___divide___: recipSum
		]
	]
%

category: 'Python-Initialization'
method: statistics
initialize_median
	"median(data) -> Return the median (middle value) of numeric data."
	median := [:positional :keywords |
		| data sorted n mid |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'median requires at least one data point'
		].
		sorted := data perform: #asSortedCollection env: 0.
		mid := (n ___plus___: 1) ___divideInteger___: 2.
		((n ___modulo___: 2) ___eq___: 1) ifTrue: [
			sorted ___at___: mid
		] ifFalse: [
			((sorted ___at___: mid) ___plus___: (sorted ___at___: (mid ___plus___: 1))) ___divide___: 2.0
		]
	]
%

category: 'Python-Initialization'
method: statistics
initialize_median_low
	"median_low(data) -> Return the low median of numeric data."
	median_low := [:positional :keywords |
		| data sorted n mid |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'median_low requires at least one data point'
		].
		sorted := data perform: #asSortedCollection env: 0.
		mid := (n ___plus___: 1) ___divideInteger___: 2.
		sorted ___at___: mid
	]
%

category: 'Python-Initialization'
method: statistics
initialize_median_high
	"median_high(data) -> Return the high median of numeric data."
	median_high := [:positional :keywords |
		| data sorted n mid |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'median_high requires at least one data point'
		].
		sorted := data perform: #asSortedCollection env: 0.
		((n ___modulo___: 2) ___eq___: 1) ifTrue: [
			mid := (n ___plus___: 1) ___divideInteger___: 2.
			sorted ___at___: mid
		] ifFalse: [
			mid := (n ___divideInteger___: 2) ___plus___: 1.
			sorted ___at___: mid
		]
	]
%

category: 'Python-Initialization'
method: statistics
initialize_median_grouped
	"median_grouped(data, interval=1.0) -> Return the median of grouped data."
	median_grouped := [:positional :keywords |
		| data interval sorted n mid cf L freq |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'median_grouped requires at least one data point'
		].
		interval := (positional ___size___ ___ge___: 2)
			ifTrue: [positional ___at___: 2]
			ifFalse: [(keywords == nil) ifTrue: [1.0] ifFalse: [keywords ___at___: #interval ifAbsent: [1.0]]].
		sorted := data perform: #asSortedCollection env: 0.
		mid := (n ___plus___: 1) ___divideInteger___: 2.
		L := (sorted ___at___: mid) ___minus___: (interval ___divide___: 2.0).
		"Count frequency of median class and cumulative frequency below"
		cf := mid ___minus___: 1.
		freq := 1.
		mid ___plus___: 1 ___to___: n do: [:i |
			((sorted ___at___: i) ___eq___: (sorted ___at___: mid)) ifTrue: [freq := freq ___plus___: 1]
		].
		L ___plus___: ((((n ___divide___: 2.0) ___minus___: cf) ___divide___: freq) ___times___: interval)
	]
%

category: 'Python-Initialization'
method: statistics
initialize_mode
	"mode(data) -> Return the single most common data point."
	mode := [:positional :keywords |
		| data counts maxCount modeValue |
		data := self _toList: (positional ___at___: 1).
		(data ___size___ ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'mode requires at least one data point'
		].
		counts := Dictionary ___new___.
		data ___do___: [:each |
			| count |
			count := counts ___at___: each ifAbsent: [0].
			counts ___at___: each put: (count ___plus___: 1)
		].
		maxCount := 0.
		modeValue := nil.
		counts perform: #keysAndValuesDo: env: 0 withArguments: {[:k :v |
			(v ___gt___: maxCount) ifTrue: [
				maxCount := v.
				modeValue := k
			]
		]}.
		modeValue
	]
%

category: 'Python-Initialization'
method: statistics
initialize_multimode
	"multimode(data) -> Return a list of the most frequently occurring values."
	multimode := [:positional :keywords |
		| data counts maxCount modes |
		data := self _toList: (positional ___at___: 1).
		(data ___size___ ___eq___: 0) ifTrue: [
			^ list ___new___
		].
		counts := Dictionary ___new___.
		data ___do___: [:each |
			| count |
			count := counts ___at___: each ifAbsent: [0].
			counts ___at___: each put: (count ___plus___: 1)
		].
		maxCount := 0.
		counts perform: #valuesDo: env: 0 withArguments: {[:v |
			(v ___gt___: maxCount) ifTrue: [maxCount := v]
		]}.
		modes := list ___new___.
		counts perform: #keysAndValuesDo: env: 0 withArguments: {[:k :v |
			(v ___eq___: maxCount) ifTrue: [modes ___append___: k]
		]}.
		modes
	]
%

category: 'Python-Initialization'
method: statistics
initialize_quantiles
	"quantiles(data, n=4, method='exclusive') -> Divide data into n intervals."
	quantiles := [:positional :keywords |
		| data n method sorted len result |
		data := self _toList: (positional ___at___: 1).
		len := data ___size___.
		(len ___lt___: 2) ifTrue: [
			StatisticsError ___signal___: 'quantiles requires at least two data points'
		].
		n := (positional ___size___ ___ge___: 2)
			ifTrue: [positional ___at___: 2]
			ifFalse: [(keywords == nil) ifTrue: [4] ifFalse: [keywords ___at___: #n ifAbsent: [4]]].
		(n ___lt___: 1) ifTrue: [
			StatisticsError ___signal___: 'n must be at least 1'
		].
		method := (keywords == nil) ifTrue: ['exclusive'] ifFalse: [keywords ___at___: #method ifAbsent: ['exclusive']].
		sorted := (data perform: #asSortedCollection env: 0) perform: #asArray env: 0.
		result := list ___new___.
		1 ___to___: (n ___minus___: 1) do: [:i |
			| m j g |
			(method ___eq___: 'inclusive') ifTrue: [
				m := ((len ___minus___: 1) ___times___: i) ___divide___: n.
				j := m perform: #truncated env: 0.
				g := m ___minus___: j.
				result ___add___: (((sorted ___at___: (j ___plus___: 1)) ___times___: (1 ___minus___: g)) ___plus___: ((sorted ___at___: ((j ___plus___: 2) ___min___: len)) ___times___: g))
			] ifFalse: [
				m := ((len ___plus___: 1) ___times___: i) ___divide___: n.
				j := m perform: #truncated env: 0.
				g := m ___minus___: j.
				(j ___lt___: 1) ifTrue: [
					result ___add___: (sorted ___at___: 1)
				] ifFalse: [
					(j ___ge___: len) ifTrue: [
						result ___add___: (sorted ___at___: len)
					] ifFalse: [
						result ___add___: (((sorted ___at___: j) ___times___: (1 ___minus___: g)) ___plus___: ((sorted ___at___: (j ___plus___: 1)) ___times___: g))
					]
				]
			]
		].
		result
	]
%

category: 'Python-Initialization'
method: statistics
initialize_pvariance
	"pvariance(data, mu=None) -> Return the population variance of data."
	pvariance := [:positional :keywords |
		| data mu n total |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___lt___: 1) ifTrue: [
			StatisticsError ___signal___: 'pvariance requires at least one data point'
		].
		mu := (positional ___size___ ___ge___: 2)
			ifTrue: [positional ___at___: 2]
			ifFalse: [(keywords == nil) ifTrue: [nil] ifFalse: [keywords ___at___: #mu ifAbsent: [nil]]].
		mu == nil ifTrue: [
			mu := (self _sum: data) ___divide___: n
		].
		total := 0.0.
		data ___do___: [:each |
			| diff |
			diff := each ___minus___: mu.
			total := total ___plus___: (diff ___times___: diff)
		].
		total ___divide___: n
	]
%

category: 'Python-Initialization'
method: statistics
initialize_pstdev
	"pstdev(data, mu=None) -> Return the population standard deviation of data."
	pstdev := [:positional :keywords |
		| var |
		var := pvariance value: positional value: keywords.
		var perform: #sqrt env: 0
	]
%

category: 'Python-Initialization'
method: statistics
initialize_variance
	"variance(data, xbar=None) -> Return the sample variance of data."
	variance := [:positional :keywords |
		| data xbar n total |
		data := self _toList: (positional ___at___: 1).
		n := data ___size___.
		(n ___lt___: 2) ifTrue: [
			StatisticsError ___signal___: 'variance requires at least two data points'
		].
		xbar := (positional ___size___ ___ge___: 2)
			ifTrue: [positional ___at___: 2]
			ifFalse: [(keywords == nil) ifTrue: [nil] ifFalse: [keywords ___at___: #xbar ifAbsent: [nil]]].
		xbar == nil ifTrue: [
			xbar := (self _sum: data) ___divide___: n
		].
		total := 0.0.
		data ___do___: [:each |
			| diff |
			diff := each ___minus___: xbar.
			total := total ___plus___: (diff ___times___: diff)
		].
		total ___divide___: (n ___minus___: 1)
	]
%

category: 'Python-Initialization'
method: statistics
initialize_stdev
	"stdev(data, xbar=None) -> Return the sample standard deviation of data."
	stdev := [:positional :keywords |
		| var |
		var := variance value: positional value: keywords.
		var perform: #sqrt env: 0
	]
%

category: 'Python-Initialization'
method: statistics
initialize_covariance
	"covariance(x, y) -> Return the sample covariance of two inputs."
	covariance := [:positional :keywords |
		| x y n xbar ybar total |
		x := self _toList: (positional ___at___: 1).
		y := self _toList: (positional ___at___: 2).
		n := x ___size___.
		(n ___lt___: 2) ifTrue: [
			StatisticsError ___signal___: 'covariance requires at least two data points'
		].
		(y ___size___ ___ne___: n) ifTrue: [
			StatisticsError ___signal___: 'covariance requires that both inputs have same number of data points'
		].
		xbar := (self _sum: x) ___divide___: n.
		ybar := (self _sum: y) ___divide___: n.
		total := 0.0.
		1 ___to___: n do: [:i |
			| dx dy |
			dx := (x ___at___: i) ___minus___: xbar.
			dy := (y ___at___: i) ___minus___: ybar.
			total := total ___plus___: (dx ___times___: dy)
		].
		total ___divide___: (n ___minus___: 1)
	]
%

category: 'Python-Initialization'
method: statistics
initialize_correlation
	"correlation(x, y) -> Return the Pearson correlation coefficient for two inputs."
	correlation := [:positional :keywords |
		| x y n xbar ybar sxx syy sxy |
		x := self _toList: (positional ___at___: 1).
		y := self _toList: (positional ___at___: 2).
		n := x ___size___.
		(n ___lt___: 2) ifTrue: [
			StatisticsError ___signal___: 'correlation requires at least two data points'
		].
		(y ___size___ ___ne___: n) ifTrue: [
			StatisticsError ___signal___: 'correlation requires that both inputs have same number of data points'
		].
		xbar := (self _sum: x) ___divide___: n.
		ybar := (self _sum: y) ___divide___: n.
		sxx := 0.0.
		syy := 0.0.
		sxy := 0.0.
		1 ___to___: n do: [:i |
			| dx dy |
			dx := (x ___at___: i) ___minus___: xbar.
			dy := (y ___at___: i) ___minus___: ybar.
			sxx := sxx ___plus___: (dx ___times___: dx).
			syy := syy ___plus___: (dy ___times___: dy).
			sxy := sxy ___plus___: (dx ___times___: dy)
		].
		((sxx ___eq___: 0) ___or___: [syy ___eq___: 0]) ifTrue: [
			StatisticsError ___signal___: 'at least one of the inputs is constant'
		].
		sxy ___divide___: ((sxx ___times___: syy) perform: #sqrt env: 0)
	]
%

category: 'Python-Initialization'
method: statistics
initialize_linear_regression
	"linear_regression(x, y) -> Return the slope and intercept of simple linear regression."
	linear_regression := [:positional :keywords |
		| x y n xbar ybar sxx sxy slope intercept result |
		x := self _toList: (positional ___at___: 1).
		y := self _toList: (positional ___at___: 2).
		n := x ___size___.
		(n ___lt___: 2) ifTrue: [
			StatisticsError ___signal___: 'linear_regression requires at least two data points'
		].
		(y ___size___ ___ne___: n) ifTrue: [
			StatisticsError ___signal___: 'linear_regression requires that both inputs have same number of data points'
		].
		xbar := (self _sum: x) ___divide___: n.
		ybar := (self _sum: y) ___divide___: n.
		sxx := 0.0.
		sxy := 0.0.
		1 ___to___: n do: [:i |
			| dx dy |
			dx := (x ___at___: i) ___minus___: xbar.
			dy := (y ___at___: i) ___minus___: ybar.
			sxx := sxx ___plus___: (dx ___times___: dx).
			sxy := sxy ___plus___: (dx ___times___: dy)
		].
		(sxx ___eq___: 0) ifTrue: [
			StatisticsError ___signal___: 'x is constant'
		].
		slope := sxy ___divide___: sxx.
		intercept := ybar ___minus___: (slope ___times___: xbar).
		"Return a named tuple-like object (using a simple tuple for now)"
		result := tuple ___withAll___: {slope. intercept}.
		result
	]
%

category: 'Python-Accessors'
method: statistics
mean
	^ mean
%

category: 'Python-Accessors'
method: statistics
mean: aValue
	mean := aValue
%

category: 'Python-Accessors'
method: statistics
fmean
	^ fmean
%

category: 'Python-Accessors'
method: statistics
fmean: aValue
	fmean := aValue
%

category: 'Python-Accessors'
method: statistics
geometric_mean
	^ geometric_mean
%

category: 'Python-Accessors'
method: statistics
geometric_mean: aValue
	geometric_mean := aValue
%

category: 'Python-Accessors'
method: statistics
harmonic_mean
	^ harmonic_mean
%

category: 'Python-Accessors'
method: statistics
harmonic_mean: aValue
	harmonic_mean := aValue
%

category: 'Python-Accessors'
method: statistics
median
	^ median
%

category: 'Python-Accessors'
method: statistics
median: aValue
	median := aValue
%

category: 'Python-Accessors'
method: statistics
median_low
	^ median_low
%

category: 'Python-Accessors'
method: statistics
median_low: aValue
	median_low := aValue
%

category: 'Python-Accessors'
method: statistics
median_high
	^ median_high
%

category: 'Python-Accessors'
method: statistics
median_high: aValue
	median_high := aValue
%

category: 'Python-Accessors'
method: statistics
median_grouped
	^ median_grouped
%

category: 'Python-Accessors'
method: statistics
median_grouped: aValue
	median_grouped := aValue
%

category: 'Python-Accessors'
method: statistics
mode
	^ mode
%

category: 'Python-Accessors'
method: statistics
mode: aValue
	mode := aValue
%

category: 'Python-Accessors'
method: statistics
multimode
	^ multimode
%

category: 'Python-Accessors'
method: statistics
multimode: aValue
	multimode := aValue
%

category: 'Python-Accessors'
method: statistics
quantiles
	^ quantiles
%

category: 'Python-Accessors'
method: statistics
quantiles: aValue
	quantiles := aValue
%

category: 'Python-Accessors'
method: statistics
pstdev
	^ pstdev
%

category: 'Python-Accessors'
method: statistics
pstdev: aValue
	pstdev := aValue
%

category: 'Python-Accessors'
method: statistics
pvariance
	^ pvariance
%

category: 'Python-Accessors'
method: statistics
pvariance: aValue
	pvariance := aValue
%

category: 'Python-Accessors'
method: statistics
stdev
	^ stdev
%

category: 'Python-Accessors'
method: statistics
stdev: aValue
	stdev := aValue
%

category: 'Python-Accessors'
method: statistics
variance
	^ variance
%

category: 'Python-Accessors'
method: statistics
variance: aValue
	variance := aValue
%

category: 'Python-Accessors'
method: statistics
covariance
	^ covariance
%

category: 'Python-Accessors'
method: statistics
covariance: aValue
	covariance := aValue
%

category: 'Python-Accessors'
method: statistics
correlation
	^ correlation
%

category: 'Python-Accessors'
method: statistics
correlation: aValue
	correlation := aValue
%

category: 'Python-Accessors'
method: statistics
linear_regression
	^ linear_regression
%

category: 'Python-Accessors'
method: statistics
linear_regression: aValue
	linear_regression := aValue
%

set compile_env: 0
