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
statistics category: 'Modules'
%

set compile_env: 1

! ===============================================================================
! Private helpers
! ===============================================================================

category: 'Python-Private'
method: statistics
_len: data
	^ [data __len__] ___on___: MessageNotUnderstood do: [:ex | data ___size___]
%

category: 'Python-Private'
method: statistics
_sum: data
	| total |
	total := 0.
	data ___do___: [:each | total := total ___plus___: each].
	^ total
%

category: 'Python-Private'
method: statistics
_toList: data
	| result |
	result := OrderedCollection ___new___.
	data ___do___: [:each | result ___add___: each].
	^ result
%

! ===============================================================================
! Initialization
! ===============================================================================

category: 'Python-Initialization'
method: statistics
initialize
	"No-op — all methods are real fast-path methods."
%

! ===============================================================================
! 1-arg fast-path callables (no kwargs)
! ===============================================================================

category: 'Python-Built-in Functions'
method: statistics
mean: data
	| d n |
	d := self _toList: data.
	n := d ___size___.
	(n ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'mean requires at least one data point'].
	^ (self _sum: d) ___divide___: n
%

category: 'Python-Built-in Functions'
method: statistics
median: data
	| d sorted n mid |
	d := self _toList: data.
	n := d ___size___.
	(n ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'median requires at least one data point'].
	sorted := d @env0:asSortedCollection.
	mid := (n ___plus___: 1) ___divideInteger___: 2.
	^ ((n ___modulo___: 2) ___eq___: 1)
		ifTrue: [sorted ___at___: mid]
		ifFalse: [((sorted ___at___: mid) ___plus___: (sorted ___at___: (mid ___plus___: 1))) ___divide___: 2.0]
%

category: 'Python-Built-in Functions'
method: statistics
median_low: data
	| d sorted n mid |
	d := self _toList: data.
	n := d ___size___.
	(n ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'median_low requires at least one data point'].
	sorted := d @env0:asSortedCollection.
	mid := (n ___plus___: 1) ___divideInteger___: 2.
	^ sorted ___at___: mid
%

category: 'Python-Built-in Functions'
method: statistics
median_high: data
	| d sorted n mid |
	d := self _toList: data.
	n := d ___size___.
	(n ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'median_high requires at least one data point'].
	sorted := d @env0:asSortedCollection.
	^ ((n ___modulo___: 2) ___eq___: 1)
		ifTrue: [sorted ___at___: ((n ___plus___: 1) ___divideInteger___: 2)]
		ifFalse: [sorted ___at___: ((n ___divideInteger___: 2) ___plus___: 1)]
%

category: 'Python-Built-in Functions'
method: statistics
mode: data
	| d counts maxCount modeValue |
	d := self _toList: data.
	(d ___size___ ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'mode requires at least one data point'].
	counts := Dictionary ___new___.
	d ___do___: [:each |
		| count |
		count := counts ___at___: each ifAbsent: [0].
		counts ___at___: each put: (count ___plus___: 1)
	].
	maxCount := 0. modeValue := nil.
	counts @env0:keysAndValuesDo: [:k :v |
		(v ___gt___: maxCount) ifTrue: [maxCount := v. modeValue := k]
	].
	^ modeValue
%

category: 'Python-Built-in Functions'
method: statistics
multimode: data
	| d counts maxCount modes |
	d := self _toList: data.
	(d ___size___ ___eq___: 0) ifTrue: [^ list ___new___].
	counts := Dictionary ___new___.
	d ___do___: [:each |
		| count |
		count := counts ___at___: each ifAbsent: [0].
		counts ___at___: each put: (count ___plus___: 1)
	].
	maxCount := 0.
	counts @env0:valuesDo: [:v | (v ___gt___: maxCount) ifTrue: [maxCount := v]].
	modes := list ___new___.
	counts @env0:keysAndValuesDo: [:k :v |
		(v ___eq___: maxCount) ifTrue: [modes ___append___: k]
	].
	^ modes
%

category: 'Python-Built-in Functions'
method: statistics
geometric_mean: data
	| d n logSum |
	d := self _toList: data.
	n := d ___size___.
	(n ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'geometric_mean requires at least one data point'].
	logSum := 0.0.
	d ___do___: [:each |
		| val |
		val := each ___asFloat___.
		(val ___le___: 0) ifTrue: [StatisticsError ___signal___: 'geometric_mean requires strictly positive data'].
		logSum := logSum ___plus___: (val ___ln___)
	].
	^ (logSum ___divide___: n) @env0:exp
%

! ===============================================================================
! 2-arg fast-path callables (no kwargs)
! ===============================================================================

category: 'Python-Built-in Functions'
method: statistics
correlation: x _: y
	| xd yd n xbar ybar sxx syy sxy |
	xd := self _toList: x. yd := self _toList: y.
	n := xd ___size___.
	(n ___lt___: 2) ifTrue: [StatisticsError ___signal___: 'correlation requires at least two data points'].
	(yd ___size___ ___ne___: n) ifTrue: [StatisticsError ___signal___: 'correlation requires that both inputs have same number of data points'].
	xbar := (self _sum: xd) ___divide___: n. ybar := (self _sum: yd) ___divide___: n.
	sxx := 0.0. syy := 0.0. sxy := 0.0.
	1 ___to___: n do: [:i |
		| dx dy |
		dx := (xd ___at___: i) ___minus___: xbar. dy := (yd ___at___: i) ___minus___: ybar.
		sxx := sxx ___plus___: (dx ___times___: dx). syy := syy ___plus___: (dy ___times___: dy). sxy := sxy ___plus___: (dx ___times___: dy)
	].
	((sxx ___eq___: 0) ___or___: [syy ___eq___: 0]) ifTrue: [StatisticsError ___signal___: 'at least one of the inputs is constant'].
	^ sxy ___divide___: ((sxx ___times___: syy) @env0:sqrt)
%

category: 'Python-Built-in Functions'
method: statistics
covariance: x _: y
	| xd yd n xbar ybar total |
	xd := self _toList: x. yd := self _toList: y.
	n := xd ___size___.
	(n ___lt___: 2) ifTrue: [StatisticsError ___signal___: 'covariance requires at least two data points'].
	(yd ___size___ ___ne___: n) ifTrue: [StatisticsError ___signal___: 'covariance requires that both inputs have same number of data points'].
	xbar := (self _sum: xd) ___divide___: n. ybar := (self _sum: yd) ___divide___: n.
	total := 0.0.
	1 ___to___: n do: [:i |
		| dx dy |
		dx := (xd ___at___: i) ___minus___: xbar. dy := (yd ___at___: i) ___minus___: ybar.
		total := total ___plus___: (dx ___times___: dy)
	].
	^ total ___divide___: (n ___minus___: 1)
%

category: 'Python-Built-in Functions'
method: statistics
linear_regression: x _: y
	| xd yd n xbar ybar sxx sxy slope intercept |
	xd := self _toList: x. yd := self _toList: y.
	n := xd ___size___.
	(n ___lt___: 2) ifTrue: [StatisticsError ___signal___: 'linear_regression requires at least two data points'].
	(yd ___size___ ___ne___: n) ifTrue: [StatisticsError ___signal___: 'linear_regression requires that both inputs have same number of data points'].
	xbar := (self _sum: xd) ___divide___: n. ybar := (self _sum: yd) ___divide___: n.
	sxx := 0.0. sxy := 0.0.
	1 ___to___: n do: [:i |
		| dx dy |
		dx := (xd ___at___: i) ___minus___: xbar. dy := (yd ___at___: i) ___minus___: ybar.
		sxx := sxx ___plus___: (dx ___times___: dx). sxy := sxy ___plus___: (dx ___times___: dy)
	].
	(sxx ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'x is constant'].
	slope := sxy ___divide___: sxx.
	intercept := ybar ___minus___: (slope ___times___: xbar).
	^ tuple ___withAll___: {slope. intercept}
%

! ===============================================================================
! Varargs fast-path callables (kwargs-aware)
! ===============================================================================

category: 'Python-Built-in Functions'
method: statistics
fmean: data
	"1-arg fast path — delegates to varargs."
	^ self _fmean: { data } kw: nil
%

category: 'Python-Built-in Functions'
method: statistics
_fmean: positional kw: kwargs
	"fmean(data, weights=None)"
	| data weights n total weightSum |
	data := self _toList: (positional ___at___: 1).
	n := data ___size___.
	(n ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'fmean requires at least one data point'].
	weights := (kwargs == nil) ifTrue: [nil] ifFalse: [kwargs ___at___: #weights ifAbsent: [nil]].
	weights == nil ifTrue: [
		total := 0.0.
		data ___do___: [:each | total := total ___plus___: (each ___asFloat___)].
		^ total ___divide___: n
	].
	(weights ___size___ ___ne___: n) ifTrue: [ValueError ___signal___: 'weights and data must be the same length'].
	total := 0.0. weightSum := 0.0.
	1 ___to___: n do: [:i |
		| w d |
		w := (weights ___at___: i) ___asFloat___. d := (data ___at___: i) ___asFloat___.
		total := total ___plus___: (w ___times___: d). weightSum := weightSum ___plus___: w
	].
	^ total ___divide___: weightSum
%

category: 'Python-Built-in Functions'
method: statistics
harmonic_mean: data
	"1-arg fast path — delegates to varargs."
	^ self _harmonic_mean: { data } kw: nil
%

category: 'Python-Built-in Functions'
method: statistics
_harmonic_mean: positional kw: kwargs
	"harmonic_mean(data, weights=None)"
	| data weights n recipSum weightSum |
	data := self _toList: (positional ___at___: 1).
	n := data ___size___.
	(n ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'harmonic_mean requires at least one data point'].
	weights := (kwargs == nil) ifTrue: [nil] ifFalse: [kwargs ___at___: #weights ifAbsent: [nil]].
	weights == nil ifTrue: [
		recipSum := 0.0.
		data ___do___: [:each |
			| val |
			val := each ___asFloat___.
			(val ___eq___: 0) ifTrue: [^ 0.0].
			(val ___lt___: 0) ifTrue: [StatisticsError ___signal___: 'harmonic_mean does not support negative values'].
			recipSum := recipSum ___plus___: (1.0 ___divide___: val)
		].
		^ n ___divide___: recipSum
	].
	(weights ___size___ ___ne___: n) ifTrue: [ValueError ___signal___: 'weights and data must be the same length'].
	recipSum := 0.0. weightSum := 0.0.
	1 ___to___: n do: [:i |
		| w val |
		w := (weights ___at___: i) ___asFloat___. val := (data ___at___: i) ___asFloat___.
		(val ___eq___: 0) ifTrue: [^ 0.0].
		(val ___lt___: 0) ifTrue: [StatisticsError ___signal___: 'harmonic_mean does not support negative values'].
		recipSum := recipSum ___plus___: (w ___divide___: val). weightSum := weightSum ___plus___: w
	].
	^ weightSum ___divide___: recipSum
%

category: 'Python-Built-in Functions'
method: statistics
pvariance: data
	"1-arg fast path — delegates to varargs."
	^ self _pvariance: { data } kw: nil
%

category: 'Python-Built-in Functions'
method: statistics
_pvariance: positional kw: kwargs
	"pvariance(data, mu=None)"
	| data mu n total |
	data := self _toList: (positional ___at___: 1).
	n := data ___size___.
	(n ___lt___: 1) ifTrue: [StatisticsError ___signal___: 'pvariance requires at least one data point'].
	mu := (positional ___size___ ___ge___: 2)
		ifTrue: [positional ___at___: 2]
		ifFalse: [(kwargs == nil) ifTrue: [nil] ifFalse: [kwargs ___at___: #mu ifAbsent: [nil]]].
	mu == nil ifTrue: [mu := (self _sum: data) ___divide___: n].
	total := 0.0.
	data ___do___: [:each | | diff | diff := each ___minus___: mu. total := total ___plus___: (diff ___times___: diff)].
	^ total ___divide___: n
%

category: 'Python-Built-in Functions'
method: statistics
pstdev: data
	"1-arg fast path. pstdev = sqrt(pvariance)."
	^ (self pvariance: data) @env0:sqrt
%

category: 'Python-Built-in Functions'
method: statistics
_pstdev: positional kw: kwargs
	"pstdev(data, mu=None) — varargs, delegates to _pvariance:kw:."
	^ (self _pvariance: positional kw: kwargs) @env0:sqrt
%

category: 'Python-Built-in Functions'
method: statistics
variance: data
	"1-arg fast path — delegates to varargs."
	^ self _variance: { data } kw: nil
%

category: 'Python-Built-in Functions'
method: statistics
_variance: positional kw: kwargs
	"variance(data, xbar=None)"
	| data xbar n total |
	data := self _toList: (positional ___at___: 1).
	n := data ___size___.
	(n ___lt___: 2) ifTrue: [StatisticsError ___signal___: 'variance requires at least two data points'].
	xbar := (positional ___size___ ___ge___: 2)
		ifTrue: [positional ___at___: 2]
		ifFalse: [(kwargs == nil) ifTrue: [nil] ifFalse: [kwargs ___at___: #xbar ifAbsent: [nil]]].
	xbar == nil ifTrue: [xbar := (self _sum: data) ___divide___: n].
	total := 0.0.
	data ___do___: [:each | | diff | diff := each ___minus___: xbar. total := total ___plus___: (diff ___times___: diff)].
	^ total ___divide___: (n ___minus___: 1)
%

category: 'Python-Built-in Functions'
method: statistics
stdev: data
	"1-arg fast path. stdev = sqrt(variance)."
	^ (self variance: data) @env0:sqrt
%

category: 'Python-Built-in Functions'
method: statistics
_stdev: positional kw: kwargs
	"stdev(data, xbar=None) — varargs, delegates to _variance:kw:."
	^ (self _variance: positional kw: kwargs) @env0:sqrt
%

category: 'Python-Built-in Functions'
method: statistics
median_grouped: data
	"1-arg fast path — delegates to varargs with interval=1.0."
	^ self _median_grouped: { data } kw: nil
%

category: 'Python-Built-in Functions'
method: statistics
_median_grouped: positional kw: kwargs
	"median_grouped(data, interval=1.0)"
	| data interval sorted n mid L cf freq |
	data := self _toList: (positional ___at___: 1).
	n := data ___size___.
	(n ___eq___: 0) ifTrue: [StatisticsError ___signal___: 'median_grouped requires at least one data point'].
	interval := (positional ___size___ ___ge___: 2)
		ifTrue: [positional ___at___: 2]
		ifFalse: [(kwargs == nil) ifTrue: [1.0] ifFalse: [kwargs ___at___: #interval ifAbsent: [1.0]]].
	sorted := data @env0:asSortedCollection.
	mid := (n ___plus___: 1) ___divideInteger___: 2.
	L := (sorted ___at___: mid) ___minus___: (interval ___divide___: 2.0).
	cf := mid ___minus___: 1.
	freq := 1.
	mid ___plus___: 1 ___to___: n do: [:i |
		((sorted ___at___: i) ___eq___: (sorted ___at___: mid)) ifTrue: [freq := freq ___plus___: 1]
	].
	^ L ___plus___: ((((n ___divide___: 2.0) ___minus___: cf) ___divide___: freq) ___times___: interval)
%

category: 'Python-Built-in Functions'
method: statistics
quantiles: data
	"1-arg fast path — delegates to varargs with n=4, method='exclusive'."
	^ self _quantiles: { data } kw: nil
%

category: 'Python-Built-in Functions'
method: statistics
_quantiles: positional kw: kwargs
	"quantiles(data, n=4, method='exclusive')"
	| data n method sorted len result |
	data := self _toList: (positional ___at___: 1).
	len := data ___size___.
	(len ___lt___: 2) ifTrue: [StatisticsError ___signal___: 'quantiles requires at least two data points'].
	n := (positional ___size___ ___ge___: 2)
		ifTrue: [positional ___at___: 2]
		ifFalse: [(kwargs == nil) ifTrue: [4] ifFalse: [kwargs ___at___: #n ifAbsent: [4]]].
	(n ___lt___: 1) ifTrue: [StatisticsError ___signal___: 'n must be at least 1'].
	method := (kwargs == nil) ifTrue: ['exclusive'] ifFalse: [kwargs ___at___: #method ifAbsent: ['exclusive']].
	sorted := (data @env0:asSortedCollection) @env0:asArray.
	result := list ___new___.
	1 ___to___: (n ___minus___: 1) do: [:i |
		| m j g |
		(method ___eq___: 'inclusive') ifTrue: [
			m := ((len ___minus___: 1) ___times___: i) ___divide___: n.
			j := m @env0:truncated. g := m ___minus___: j.
			result ___add___: (((sorted ___at___: (j ___plus___: 1)) ___times___: (1 ___minus___: g)) ___plus___: ((sorted ___at___: ((j ___plus___: 2) ___min___: len)) ___times___: g))
		] ifFalse: [
			m := ((len ___plus___: 1) ___times___: i) ___divide___: n.
			j := m @env0:truncated. g := m ___minus___: j.
			(j ___lt___: 1) ifTrue: [result ___add___: (sorted ___at___: 1)]
				ifFalse: [(j ___ge___: len) ifTrue: [result ___add___: (sorted ___at___: len)]
					ifFalse: [result ___add___: (((sorted ___at___: j) ___times___: (1 ___minus___: g)) ___plus___: ((sorted ___at___: (j ___plus___: 1)) ___times___: g))]]
		]
	].
	^ result
%

set compile_env: 0
