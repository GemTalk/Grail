! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- statistics class (Python 'statistics' module)
expectvalue /Class
doit
module subclass: 'statistics'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
statistics comment:
'Python statistics module.

See https://docs.python.org/3/library/statistics.html
'
%

expectvalue /Class
doit
statistics category: 'Grail-Modules'
%

set compile_env: 1

! ===============================================================================
! Private helpers
! ===============================================================================

category: 'Grail-Private'
method: statistics
_len: data
	^ [data __len__] @env0:on: MessageNotUnderstood do: [:ex | data @env0:size]
%

category: 'Grail-Private'
method: statistics
_sum: data
	| total |
	total := 0.
	data @env0:do: [:each | total := total @env0:+ each].
	^ total
%

category: 'Grail-Private'
method: statistics
_toList: data
	| result |
	result := OrderedCollection ___new___.
	data @env0:do: [:each | result @env0:add: each].
	^ result
%

! ===============================================================================
! Initialization
! ===============================================================================

category: 'Grail-Initialization'
method: statistics
initialize
	"No-op — all methods are real fast-path methods."
%

! ===============================================================================
! 1-arg fast-path callables (no kwargs)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: statistics
mean: data
	| d n |
	d := self _toList: data.
	n := d @env0:size.
	(n == 0) ifTrue: [StatisticsError ___signal___: 'mean requires at least one data point'].
	^ (self _sum: d) @env0:/ n
%

category: 'Grail-Built-in Functions'
method: statistics
median: data
	| d sorted n mid |
	d := self _toList: data.
	n := d @env0:size.
	(n == 0) ifTrue: [StatisticsError ___signal___: 'median requires at least one data point'].
	sorted := d @env0:asSortedCollection.
	mid := (n @env0:+ 1) @env0:// 2.
	^ ((n @env0:\\ 2) == 1)
		ifTrue: [sorted @env0:at: mid]
		ifFalse: [((sorted @env0:at: mid) @env0:+ (sorted @env0:at: (mid @env0:+ 1))) @env0:/ 2.0]
%

category: 'Grail-Built-in Functions'
method: statistics
median_low: data
	| d sorted n mid |
	d := self _toList: data.
	n := d @env0:size.
	(n == 0) ifTrue: [StatisticsError ___signal___: 'median_low requires at least one data point'].
	sorted := d @env0:asSortedCollection.
	mid := (n @env0:+ 1) @env0:// 2.
	^ sorted @env0:at: mid
%

category: 'Grail-Built-in Functions'
method: statistics
median_high: data
	| d sorted n mid |
	d := self _toList: data.
	n := d @env0:size.
	(n == 0) ifTrue: [StatisticsError ___signal___: 'median_high requires at least one data point'].
	sorted := d @env0:asSortedCollection.
	^ ((n @env0:\\ 2) == 1)
		ifTrue: [sorted @env0:at: ((n @env0:+ 1) @env0:// 2)]
		ifFalse: [sorted @env0:at: ((n @env0:// 2) @env0:+ 1)]
%

category: 'Grail-Built-in Functions'
method: statistics
mode: data
	| d counts maxCount modeValue |
	d := self _toList: data.
	(d @env0:size == 0) ifTrue: [StatisticsError ___signal___: 'mode requires at least one data point'].
	counts := Dictionary ___new___.
	d @env0:do: [:each |
		| count |
		count := counts @env0:at: each ifAbsent: [0].
		counts @env0:at: each put: (count @env0:+ 1)
	].
	maxCount := 0. modeValue := nil.
	counts @env0:keysAndValuesDo: [:k :v |
		(v @env0:> maxCount) ifTrue: [maxCount := v. modeValue := k]
	].
	^ modeValue
%

category: 'Grail-Built-in Functions'
method: statistics
multimode: data
	| d counts maxCount modes |
	d := self _toList: data.
	(d @env0:size == 0) ifTrue: [^ list ___new___].
	counts := Dictionary ___new___.
	d @env0:do: [:each |
		| count |
		count := counts @env0:at: each ifAbsent: [0].
		counts @env0:at: each put: (count @env0:+ 1)
	].
	maxCount := 0.
	counts @env0:valuesDo: [:v | (v @env0:> maxCount) ifTrue: [maxCount := v]].
	modes := list ___new___.
	counts @env0:keysAndValuesDo: [:k :v |
		(v @env0:= maxCount) ifTrue: [modes ___append___: k]
	].
	^ modes
%

category: 'Grail-Built-in Functions'
method: statistics
geometric_mean: data
	| d n logSum |
	d := self _toList: data.
	n := d @env0:size.
	(n == 0) ifTrue: [StatisticsError ___signal___: 'geometric_mean requires at least one data point'].
	logSum := 0.0.
	d @env0:do: [:each |
		| val |
		val := each @env0:asFloat.
		(val @env0:<= 0) ifTrue: [StatisticsError ___signal___: 'geometric_mean requires strictly positive data'].
		logSum := logSum @env0:+ (val @env0:ln)
	].
	^ (logSum @env0:/ n) @env0:exp
%

! ===============================================================================
! 2-arg fast-path callables (no kwargs)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: statistics
correlation: x _: y
	| xd yd n xbar ybar sxx syy sxy |
	xd := self _toList: x. yd := self _toList: y.
	n := xd @env0:size.
	(n @env0:< 2) ifTrue: [StatisticsError ___signal___: 'correlation requires at least two data points'].
	(yd @env0:size @env0:~= n) ifTrue: [StatisticsError ___signal___: 'correlation requires that both inputs have same number of data points'].
	xbar := (self _sum: xd) @env0:/ n. ybar := (self _sum: yd) @env0:/ n.
	sxx := 0.0. syy := 0.0. sxy := 0.0.
	1 @env0:to: n do: [:i |
		| dx dy |
		dx := (xd @env0:at: i) @env0:- xbar. dy := (yd @env0:at: i) @env0:- ybar.
		sxx := sxx @env0:+ (dx @env0:* dx). syy := syy @env0:+ (dy @env0:* dy). sxy := sxy @env0:+ (dx @env0:* dy)
	].
	((sxx @env0:= 0) ___or___: [syy @env0:= 0]) ifTrue: [StatisticsError ___signal___: 'at least one of the inputs is constant'].
	^ sxy @env0:/ ((sxx @env0:* syy) @env0:sqrt)
%

category: 'Grail-Built-in Functions'
method: statistics
covariance: x _: y
	| xd yd n xbar ybar total |
	xd := self _toList: x. yd := self _toList: y.
	n := xd @env0:size.
	(n @env0:< 2) ifTrue: [StatisticsError ___signal___: 'covariance requires at least two data points'].
	(yd @env0:size @env0:~= n) ifTrue: [StatisticsError ___signal___: 'covariance requires that both inputs have same number of data points'].
	xbar := (self _sum: xd) @env0:/ n. ybar := (self _sum: yd) @env0:/ n.
	total := 0.0.
	1 @env0:to: n do: [:i |
		| dx dy |
		dx := (xd @env0:at: i) @env0:- xbar. dy := (yd @env0:at: i) @env0:- ybar.
		total := total @env0:+ (dx @env0:* dy)
	].
	^ total @env0:/ (n @env0:- 1)
%

category: 'Grail-Built-in Functions'
method: statistics
linear_regression: x _: y
	| xd yd n xbar ybar sxx sxy slope intercept |
	xd := self _toList: x. yd := self _toList: y.
	n := xd @env0:size.
	(n @env0:< 2) ifTrue: [StatisticsError ___signal___: 'linear_regression requires at least two data points'].
	(yd @env0:size @env0:~= n) ifTrue: [StatisticsError ___signal___: 'linear_regression requires that both inputs have same number of data points'].
	xbar := (self _sum: xd) @env0:/ n. ybar := (self _sum: yd) @env0:/ n.
	sxx := 0.0. sxy := 0.0.
	1 @env0:to: n do: [:i |
		| dx dy |
		dx := (xd @env0:at: i) @env0:- xbar. dy := (yd @env0:at: i) @env0:- ybar.
		sxx := sxx @env0:+ (dx @env0:* dx). sxy := sxy @env0:+ (dx @env0:* dy)
	].
	(sxx @env0:= 0) ifTrue: [StatisticsError ___signal___: 'x is constant'].
	slope := sxy @env0:/ sxx.
	intercept := ybar @env0:- (slope @env0:* xbar).
	^ tuple @env0:withAll: {slope. intercept}
%

! ===============================================================================
! Varargs fast-path callables (kwargs-aware)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: statistics
fmean: data
	"1-arg fast path — delegates to varargs."
	^ self _fmean: { data } kw: nil
%

category: 'Grail-Built-in Functions'
method: statistics
_fmean: positional kw: kwargs
	"fmean(data, weights=None)"
	| data weights n total weightSum |
	data := self _toList: (positional @env0:at: 1).
	n := data @env0:size.
	(n == 0) ifTrue: [StatisticsError ___signal___: 'fmean requires at least one data point'].
	weights := (kwargs == nil) ifTrue: [nil] ifFalse: [kwargs @env0:at: #weights ifAbsent: [nil]].
	weights == nil ifTrue: [
		total := 0.0.
		data @env0:do: [:each | total := total @env0:+ (each @env0:asFloat)].
		^ total @env0:/ n
	].
	(weights @env0:size @env0:~= n) ifTrue: [ValueError ___signal___: 'weights and data must be the same length'].
	total := 0.0. weightSum := 0.0.
	1 @env0:to: n do: [:i |
		| w d |
		w := (weights @env0:at: i) @env0:asFloat. d := (data @env0:at: i) @env0:asFloat.
		total := total @env0:+ (w @env0:* d). weightSum := weightSum @env0:+ w
	].
	^ total @env0:/ weightSum
%

category: 'Grail-Built-in Functions'
method: statistics
harmonic_mean: data
	"1-arg fast path — delegates to varargs."
	^ self _harmonic_mean: { data } kw: nil
%

category: 'Grail-Built-in Functions'
method: statistics
_harmonic_mean: positional kw: kwargs
	"harmonic_mean(data, weights=None)"
	| data weights n recipSum weightSum |
	data := self _toList: (positional @env0:at: 1).
	n := data @env0:size.
	(n == 0) ifTrue: [StatisticsError ___signal___: 'harmonic_mean requires at least one data point'].
	weights := (kwargs == nil) ifTrue: [nil] ifFalse: [kwargs @env0:at: #weights ifAbsent: [nil]].
	weights == nil ifTrue: [
		recipSum := 0.0.
		data @env0:do: [:each |
			| val |
			val := each @env0:asFloat.
			(val @env0:= 0) ifTrue: [^ 0.0].
			(val @env0:< 0) ifTrue: [StatisticsError ___signal___: 'harmonic_mean does not support negative values'].
			recipSum := recipSum @env0:+ (1.0 @env0:/ val)
		].
		^ n @env0:/ recipSum
	].
	(weights @env0:size @env0:~= n) ifTrue: [ValueError ___signal___: 'weights and data must be the same length'].
	recipSum := 0.0. weightSum := 0.0.
	1 @env0:to: n do: [:i |
		| w val |
		w := (weights @env0:at: i) @env0:asFloat. val := (data @env0:at: i) @env0:asFloat.
		(val @env0:= 0) ifTrue: [^ 0.0].
		(val @env0:< 0) ifTrue: [StatisticsError ___signal___: 'harmonic_mean does not support negative values'].
		recipSum := recipSum @env0:+ (w @env0:/ val). weightSum := weightSum @env0:+ w
	].
	^ weightSum @env0:/ recipSum
%

category: 'Grail-Built-in Functions'
method: statistics
pvariance: data
	"1-arg fast path — delegates to varargs."
	^ self _pvariance: { data } kw: nil
%

category: 'Grail-Built-in Functions'
method: statistics
_pvariance: positional kw: kwargs
	"pvariance(data, mu=None)"
	| data mu n total |
	data := self _toList: (positional @env0:at: 1).
	n := data @env0:size.
	(n @env0:< 1) ifTrue: [StatisticsError ___signal___: 'pvariance requires at least one data point'].
	mu := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(kwargs == nil) ifTrue: [nil] ifFalse: [kwargs @env0:at: #mu ifAbsent: [nil]]].
	mu == nil ifTrue: [mu := (self _sum: data) @env0:/ n].
	total := 0.0.
	data @env0:do: [:each | | diff | diff := each @env0:- mu. total := total @env0:+ (diff @env0:* diff)].
	^ total @env0:/ n
%

category: 'Grail-Built-in Functions'
method: statistics
pstdev: data
	"1-arg fast path. pstdev = sqrt(pvariance)."
	^ (self pvariance: data) @env0:sqrt
%

category: 'Grail-Built-in Functions'
method: statistics
_pstdev: positional kw: kwargs
	"pstdev(data, mu=None) — varargs, delegates to _pvariance:kw:."
	^ (self _pvariance: positional kw: kwargs) @env0:sqrt
%

category: 'Grail-Built-in Functions'
method: statistics
variance: data
	"1-arg fast path — delegates to varargs."
	^ self _variance: { data } kw: nil
%

category: 'Grail-Built-in Functions'
method: statistics
_variance: positional kw: kwargs
	"variance(data, xbar=None)"
	| data xbar n total |
	data := self _toList: (positional @env0:at: 1).
	n := data @env0:size.
	(n @env0:< 2) ifTrue: [StatisticsError ___signal___: 'variance requires at least two data points'].
	xbar := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(kwargs == nil) ifTrue: [nil] ifFalse: [kwargs @env0:at: #xbar ifAbsent: [nil]]].
	xbar == nil ifTrue: [xbar := (self _sum: data) @env0:/ n].
	total := 0.0.
	data @env0:do: [:each | | diff | diff := each @env0:- xbar. total := total @env0:+ (diff @env0:* diff)].
	^ total @env0:/ (n @env0:- 1)
%

category: 'Grail-Built-in Functions'
method: statistics
stdev: data
	"1-arg fast path. stdev = sqrt(variance)."
	^ (self variance: data) @env0:sqrt
%

category: 'Grail-Built-in Functions'
method: statistics
_stdev: positional kw: kwargs
	"stdev(data, xbar=None) — varargs, delegates to _variance:kw:."
	^ (self _variance: positional kw: kwargs) @env0:sqrt
%

category: 'Grail-Built-in Functions'
method: statistics
median_grouped: data
	"1-arg fast path — delegates to varargs with interval=1.0."
	^ self _median_grouped: { data } kw: nil
%

category: 'Grail-Built-in Functions'
method: statistics
_median_grouped: positional kw: kwargs
	"median_grouped(data, interval=1.0)"
	| data interval sorted n mid L cf freq |
	data := self _toList: (positional @env0:at: 1).
	n := data @env0:size.
	(n == 0) ifTrue: [StatisticsError ___signal___: 'median_grouped requires at least one data point'].
	interval := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(kwargs == nil) ifTrue: [1.0] ifFalse: [kwargs @env0:at: #interval ifAbsent: [1.0]]].
	sorted := data @env0:asSortedCollection.
	mid := (n @env0:+ 1) @env0:// 2.
	L := (sorted @env0:at: mid) @env0:- (interval @env0:/ 2.0).
	cf := mid @env0:- 1.
	freq := 1.
	mid @env0:+ 1 @env0:to: n do: [:i |
		((sorted @env0:at: i) @env0:= (sorted @env0:at: mid)) ifTrue: [freq := freq @env0:+ 1]
	].
	^ L @env0:+ ((((n @env0:/ 2.0) @env0:- cf) @env0:/ freq) @env0:* interval)
%

category: 'Grail-Built-in Functions'
method: statistics
quantiles: data
	"1-arg fast path — delegates to varargs with n=4, method='exclusive'."
	^ self _quantiles: { data } kw: nil
%

category: 'Grail-Built-in Functions'
method: statistics
_quantiles: positional kw: kwargs
	"quantiles(data, n=4, method='exclusive')"
	| data n method sorted len result |
	data := self _toList: (positional @env0:at: 1).
	len := data @env0:size.
	(len @env0:< 2) ifTrue: [StatisticsError ___signal___: 'quantiles requires at least two data points'].
	n := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(kwargs == nil) ifTrue: [4] ifFalse: [kwargs @env0:at: #n ifAbsent: [4]]].
	(n @env0:< 1) ifTrue: [StatisticsError ___signal___: 'n must be at least 1'].
	method := (kwargs == nil) ifTrue: ['exclusive'] ifFalse: [kwargs @env0:at: #method ifAbsent: ['exclusive']].
	sorted := (data @env0:asSortedCollection) @env0:asArray.
	result := list ___new___.
	1 @env0:to: (n @env0:- 1) do: [:i |
		| m j g |
		(method @env0:= 'inclusive') ifTrue: [
			m := ((len @env0:- 1) @env0:* i) @env0:/ n.
			j := m @env0:truncated. g := m @env0:- j.
			result @env0:add: (((sorted @env0:at: (j @env0:+ 1)) @env0:* (1 @env0:- g)) @env0:+ ((sorted @env0:at: ((j @env0:+ 2) @env0:min: len)) @env0:* g))
		] ifFalse: [
			m := ((len @env0:+ 1) @env0:* i) @env0:/ n.
			j := m @env0:truncated. g := m @env0:- j.
			(j @env0:< 1) ifTrue: [result @env0:add: (sorted @env0:at: 1)]
				ifFalse: [(j @env0:>= len) ifTrue: [result @env0:add: (sorted @env0:at: len)]
					ifFalse: [result @env0:add: (((sorted @env0:at: j) @env0:* (1 @env0:- g)) @env0:+ ((sorted @env0:at: (j @env0:+ 1)) @env0:* g))]]
		]
	].
	^ result
%

set compile_env: 0
