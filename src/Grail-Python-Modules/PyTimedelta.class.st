Class {
	#name : 'PyTimedelta',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
PyTimedelta class >> ___divideAndRound___: a by: b [
	"CPython's _pydatetime._divide_and_round: divide a by b (both
	EXACT integers -- callers feed it a numerator/denominator pair
	derived from a float's as_integer_ratio(), never the float itself,
	so no binary representation error survives into the rounding
	decision), round-half-to-even.  Ported from the reference impl for
	divmod_near in CPython's Objects/longobject.c."

	| q r doubled greaterThanHalf |
	q := a @env0:// b.
	r := a @env0:\\ b.
	doubled := r @env0:* 2.
	greaterThanHalf := (b @env0:> 0)
		ifTrue: [doubled @env0:> b]
		ifFalse: [doubled @env0:< b].
	(greaterThanHalf @env0:or: [(doubled @env0:= b) @env0:and: [(q @env0:\\ 2) @env0:= 1]])
		ifTrue: [q := q @env0:+ 1].
	^ q

]

{ #category : 'Grail-Private' }
PyTimedelta class >> ___fromDaysSecondsMicros___: d _: s _: us [
	"Build from already-normalized (0 <= s < 86400, 0 <= us < 1e6) fields
	-- unlike ___fromTotalMicros___:, does no re-normalization, since
	_timedelta:kw: already did the CPython-exact float/rounding dance."

	| inst |
	inst := self new.
	inst _days: d _seconds: s _microseconds: us.
	^ inst

]

{ #category : 'Grail-Private' }
PyTimedelta class >> ___fromTotalMicros___: totalMicros [
	"Build a normalized timedelta from total signed microseconds.  Shared
	by every arithmetic operator (__add__/__sub__/__neg__/__mul__/...) as
	well as the constructor path, so the |days| > 999999999 OverflowError
	check belongs here too (test_overflow: timedelta.min - resolution)."

	| inst days secs micros |
	"Normalize so 0 <= micros < 1e6 and 0 <= secs < 86400, with `days`
	carrying the sign (matches CPython's storage)."
	micros := totalMicros \\ 1000000.
	secs := (totalMicros // 1000000) \\ 86400.
	days := totalMicros // 1000000 // 86400.
	(days @env0:abs @env0:> 999999999) ifTrue: [
		^ OverflowError @env1:___signal___:
			'timedelta # of days is too large: ' @env0:, days @env0:printString].
	inst := self new.
	inst _days: days _seconds: secs _microseconds: micros.
	^ inst

]

{ #category : 'Grail-Private' }
PyTimedelta class >> ___multiplier___: unit [
	"Microseconds-per-<unit>.  Accepts either Symbol (Smalltalk-internal
	positional keys) or String (Python kwargs keys — the codegen now
	builds kwargs dicts with String keys to match CPython spec).
	Normalise to Symbol before dispatch."

	| sym |
	sym := unit asSymbol.
	sym = #days ifTrue: [^ 86400000000].
	sym = #seconds ifTrue: [^ 1000000].
	sym = #microseconds ifTrue: [^ 1].
	sym = #milliseconds ifTrue: [^ 1000].
	sym = #minutes ifTrue: [^ 60000000].
	sym = #hours ifTrue: [^ 3600000000].
	sym = #weeks ifTrue: [^ 604800000000].
	^ TypeError @env1:___signal___: 'unsupported timedelta unit: ' , unit asString

]

{ #category : 'Grail-Introspection' }
PyTimedelta class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #days;
		add: #seconds;
		add: #microseconds;
		yourself

]

{ #category : 'Grail-Private' }
PyTimedelta class >> ___roundHalfEven___: x [
	"Python's round(float) on an exact-.5 boundary rounds to the nearest
	EVEN integer; GemStone's kernel Float>>rounded (and float>>__round__,
	which just forwards to it) rounds half AWAY from zero instead -- a
	pre-existing gap in the shared primitive, out of scope to fix
	globally here, so timedelta's constructor (which needs the correct
	rule to match CPython's _pydatetime.timedelta.__new__ exactly --
	test_microsecond_rounding) does its own banker's rounding locally."

	| whole frac |
	whole := x @env0:truncated.
	frac := x @env0:- whole.
	(frac @env0:abs @env0:= 0.5) ifTrue: [
		^ (whole @env0:even)
			ifTrue: [whole]
			ifFalse: [whole @env0:+ frac @env0:sign]].
	^ x @env0:rounded

]

{ #category : 'Grail-Private' }
PyTimedelta >> _days: d _seconds: s _microseconds: us [
	self dynamicInstVarAt: #_days put: (d).
	self dynamicInstVarAt: #_seconds put: (s).
	self dynamicInstVarAt: #_microseconds put: (us).
	^ self

]

{ #category : 'Grail-Hash' }
PyTimedelta >> = other [
	"Smalltalk value-equality + hash so equal timedeltas collapse as
	PyDict/set keys: those bucket non-PythonInstance keys by Smalltalk
	hash and match by Smalltalk =, which default to identity."

	^ (other isKindOf: PyTimedelta)
		and: [(self @env1:___totalMicros___) = (other @env1:___totalMicros___)]

]

{ #category : 'Grail-Hash' }
PyTimedelta >> hash [
	^ (self @env1:___totalMicros___) hash

]
