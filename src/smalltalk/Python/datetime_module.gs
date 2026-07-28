! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ===============================================================================
! IsoCalendarDate - Python `datetime.date.isocalendar()`'s return type: a
! tuple subclass with named year/week/weekday field access.  test_isocalendar
! checks both plain-tuple equality/unpacking AND ``t.year``-style attribute
! access; test_isocalendar_pickling checks that pickling round-trips to a
! PLAIN tuple (CPython's own deliberate behavior -- IsoCalendarDate.__reduce__
! returns (tuple, (tuple(self),))).
! ===============================================================================

expectvalue /Class
doit
tuple subclass: 'IsoCalendarDate'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
IsoCalendarDate category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
IsoCalendarDate removeAllMethods: 0.
IsoCalendarDate removeAllMethods: 1.
IsoCalendarDate class removeAllMethods: 0.
IsoCalendarDate class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: IsoCalendarDate
___pythonValueAttrs___
	"Register year/week/weekday as auto-invoked DATA attributes (like
	PyDate's own year/month/day) rather than plain callables -- without
	this, ``t.year'' resolves to a bound method object instead of the
	int value (test_isocalendar)."

	^ IdentitySet new
		add: #year;
		add: #week;
		add: #weekday;
		yourself
%

set compile_env: 1

category: 'Grail-Accessors'
method: IsoCalendarDate
year
	^ self @env0:at: 1
%

category: 'Grail-Accessors'
method: IsoCalendarDate
week
	^ self @env0:at: 2
%

category: 'Grail-Accessors'
method: IsoCalendarDate
weekday
	^ self @env0:at: 3
%

category: 'Grail-Conversion'
method: IsoCalendarDate
__repr__
	^ 'IsoCalendarDate(year=' @env0:, (self @env0:at: 1) @env0:printString
		@env0:, ', week=' @env0:, (self @env0:at: 2) @env0:printString
		@env0:, ', weekday=' @env0:, (self @env0:at: 3) @env0:printString
		@env0:, ')'
%

category: 'Grail-Pickling'
method: IsoCalendarDate
__reduce__
	"CPython: pickling an IsoCalendarDate deliberately loses the type,
	round-tripping to a plain tuple (test_isocalendar_pickling).  Returns
	(tuple, (plain_tuple_copy_of_self,)) -- unpickling calls
	tuple(plain_tuple_copy_of_self), reconstructing a bare tuple."

	| plain |
	plain := tuple @env0:withAll: self.
	^ tuple @env0:withAll: { tuple. (tuple @env0:withAll: { plain }) }
%

set compile_env: 0

! ===============================================================================
! PyTimedelta - Python `datetime.timedelta`
! Stored as normalized (days, seconds, microseconds) per CPython:
!   0 <= microseconds < 1_000_000
!   0 <= seconds < 86_400
!   days can be negative
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'PyTimedelta'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyTimedelta category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyTimedelta removeAllMethods: 0.
PyTimedelta removeAllMethods: 1.
PyTimedelta class removeAllMethods: 0.
PyTimedelta class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: PyTimedelta
___pythonValueAttrs___
	^ IdentitySet new
		add: #days;
		add: #seconds;
		add: #microseconds;
		yourself
%

category: 'Grail-Private'
classmethod: PyTimedelta
___fromTotalMicros___: totalMicros
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
%

category: 'Grail-Private'
classmethod: PyTimedelta
___roundHalfEven___: x
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
%

category: 'Grail-Private'
classmethod: PyTimedelta
___divideAndRound___: a by: b
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
%

category: 'Grail-Private'
method: PyTimedelta
_days: d _seconds: s _microseconds: us
	self dynamicInstVarAt: #_days put: (d).
	self dynamicInstVarAt: #_seconds put: (s).
	self dynamicInstVarAt: #_microseconds put: (us).
	^ self
%

category: 'Grail-Private'
classmethod: PyTimedelta
___fromDaysSecondsMicros___: d _: s _: us
	"Build from already-normalized (0 <= s < 86400, 0 <= us < 1e6) fields
	-- unlike ___fromTotalMicros___:, does no re-normalization, since
	_timedelta:kw: already did the CPython-exact float/rounding dance."

	| inst |
	inst := self new.
	inst _days: d _seconds: s _microseconds: us.
	^ inst
%

set compile_env: 1

category: 'Grail-Callable'
classmethod: PyTimedelta
value: positional value: kwargs
	"Class-side callable - forward every arity + kwargs into the
	varargs assembler.  Bypasses Object class >> value:value: which
	would dispatch by __new__ arity (no 7-arg __new__ defined)."

	^ self _timedelta: positional kw: kwargs
%

category: 'Grail-Initialization'
classmethod: PyTimedelta
_timedelta: positional kw: kwargs
	"Varargs constructor accepting any combination of named time units:
	days, seconds, microseconds, milliseconds, minutes, hours, weeks.

	Ported from CPython's _pydatetime.timedelta.__new__ verbatim
	(including its float-precision-preserving modf/divmod accumulation
	order and its use of banker's rounding at the end) rather than the
	previous single 'multiply every unit into a total microsecond count,
	then truncate' approach -- that lost precision + used the wrong
	rounding rule for float components landing exactly on a .5 boundary
	(test_microsecond_rounding: e.g. milliseconds=0.5/1000 must round to
	microseconds=0, not 1 -- round-half-to-even, not truncation)."

	| names vals d s us dayfrac daysecondsfrac daysecondswhole
	  secondsfrac secWhole usdouble days seconds microseconds |
	names := #(#days #seconds #microseconds #milliseconds #minutes #hours #weeks).
	vals := Array @env0:new: 7.
	1 @env0:to: 7 do: [:i | vals @env0:at: i put: 0].
	positional @env0:doWithIndex: [:val :i |
		(val @env0:isKindOf: Number) ifFalse: [
			TypeError ___signal___: 'unsupported type for timedelta '
				@env0:, (names @env0:at: i) @env0:asString
				@env0:, ' component: ' @env0:, val @env0:class __name__].
		vals @env0:at: i put: val].
	kwargs @env0:isNil ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v | | sym idx |
			sym := k @env0:asSymbol.
			idx := names @env0:indexOf: sym.
			(v @env0:isKindOf: Number) ifFalse: [
				TypeError ___signal___: 'unsupported type for timedelta '
					@env0:, sym @env0:asString
					@env0:, ' component: ' @env0:, v @env0:class __name__].
			vals @env0:at: idx put: v]].

	days := (vals @env0:at: 1) @env0:+ ((vals @env0:at: 7) @env0:* 7).
	seconds := (vals @env0:at: 2)
		@env0:+ ((vals @env0:at: 5) @env0:* 60)
		@env0:+ ((vals @env0:at: 6) @env0:* 3600).
	microseconds := (vals @env0:at: 3) @env0:+ ((vals @env0:at: 4) @env0:* 1000).

	(days @env0:isKindOf: Float) ifTrue: [
		| d0 |
		d0 := days @env0:truncated.
		dayfrac := days @env0:- d0.
		daysecondswhole := (dayfrac @env0:* 86400.0) @env0:truncated.
		daysecondsfrac := (dayfrac @env0:* 86400.0) @env0:- daysecondswhole.
		s := daysecondswhole.
		d := d0
	] ifFalse: [
		daysecondsfrac := 0.0.
		d := days.
		s := 0
	].

	(seconds @env0:isKindOf: Float) ifTrue: [
		secWhole := seconds @env0:truncated.
		secondsfrac := (seconds @env0:- secWhole) @env0:+ daysecondsfrac.
		seconds := secWhole
	] ifFalse: [
		secondsfrac := daysecondsfrac
	].

	"days, seconds = divmod(seconds, 86400)"
	d := d @env0:+ (seconds @env0:// 86400).
	s := s @env0:+ (seconds @env0:\\ 86400).

	usdouble := secondsfrac @env0:* 1000000.0.

	(microseconds @env0:isKindOf: Float) ifTrue: [
		| rounded secs2 |
		rounded := self @env0:___roundHalfEven___: microseconds @env0:+ usdouble.
		secs2 := rounded @env0:// 1000000.
		microseconds := rounded @env0:\\ 1000000.
		d := d @env0:+ (secs2 @env0:// 86400).
		s := s @env0:+ (secs2 @env0:\\ 86400)
	] ifFalse: [
		| micrTrunc secs2 |
		micrTrunc := microseconds @env0:truncated.
		secs2 := micrTrunc @env0:// 1000000.
		microseconds := micrTrunc @env0:\\ 1000000.
		d := d @env0:+ (secs2 @env0:// 86400).
		s := s @env0:+ (secs2 @env0:\\ 86400).
		microseconds := self @env0:___roundHalfEven___: microseconds @env0:+ usdouble
	].

	"Final carry: microseconds/seconds might have overflowed their range."
	s := s @env0:+ (microseconds @env0:// 1000000).
	us := microseconds @env0:\\ 1000000.
	d := d @env0:+ (s @env0:// 86400).
	s := s @env0:\\ 86400.

	(d @env0:abs @env0:> 999999999) ifTrue: [
		OverflowError ___signal___:
			'timedelta # of days is too large: ' @env0:, d @env0:printString].

	^ self @env0:___fromDaysSecondsMicros___: d _: s _: us
%

category: 'Grail-Instantiation'
method: PyTimedelta
___new__: positional kw: kwargs
	"Python-level `timedelta.__new__(cls, ...)`, reached via
	object >> ___allocateInstance___:kw: when a PYTHON SUBCLASS of
	timedelta is instantiated (``class A(timedelta): ...``).  Direct
	construction (``timedelta(...)``) instead goes through the class-side
	Grail-Callable ``value:value:`` above -- but ClassDefAst synthesizes a
	FRESH ``value:value:`` on every Python-defined subclass (see
	Object.gs's ``value:value:`` comment), which shadows timedelta's own
	and routes through the allocate-then-__init__ protocol instead.
	Without this method, a subclass instance's _days/_seconds/_microseconds
	stay nil (test_repr_subclass, test_subclass_timedelta).  Called
	non-virtually with the actual class as receiver (self=cls), so this
	simply forwards to the same varargs assembler used by value:value:.

	EXCEPT: a mixed-in Enum (``class E(timedelta, Enum): def __new__
	(cls, v): return super().__new__(cls, v)'') reaches this SAME
	selector via super()'s MRO walk (Enum's classmethod of the same
	name lives further down the registered MRO, past timedelta) --
	Grail's super() picks the nearest class defining the selector by
	position, unlike CPython's EnumType, which installs its own
	__new__ directly onto the mixed-in class so it's found FIRST
	regardless of mixin order.  Defer to Enum's guard (test_enum's
	test_bad_new_super) whenever this class is a mid-construction enum
	member, rather than actually allocating a timedelta -- keeps the
	fix local instead of touching Enum's class-creation machinery."

	(Enum ___grailBuildingSet @env0:includes: self) ifTrue: [
		^ TypeError @env1:___signal___:
			'do not use `super().__new__; call the appropriate __new__ directly'].
	^ self _timedelta: positional kw: kwargs
%

set compile_env: 0

category: 'Grail-Private'
classmethod: PyTimedelta
___multiplier___: unit
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
%

category: 'Grail-Hash'
method: PyTimedelta
= other
	"Smalltalk value-equality + hash so equal timedeltas collapse as
	PyDict/set keys: those bucket non-PythonInstance keys by Smalltalk
	hash and match by Smalltalk =, which default to identity."

	^ (other isKindOf: PyTimedelta)
		and: [(self @env1:___totalMicros___) = (other @env1:___totalMicros___)]
%

category: 'Grail-Hash'
method: PyTimedelta
hash
	^ (self @env1:___totalMicros___) hash
%

set compile_env: 1

category: 'Grail-Accessors'
method: PyTimedelta
days
	^ (self @env0:dynamicInstVarAt: #_days)
%

category: 'Grail-Accessors'
method: PyTimedelta
seconds
	^ (self @env0:dynamicInstVarAt: #_seconds)
%

category: 'Grail-Accessors'
method: PyTimedelta
microseconds
	^ (self @env0:dynamicInstVarAt: #_microseconds)
%

category: 'Grail-Accessors'
method: PyTimedelta
total_seconds
	"Float total over all stored fields.  Matches CPython's exact
	implementation: combine everything into ONE integer microsecond
	count first, then do a SINGLE float division at the very end --
	two separate float operations (int part asFloat, PLUS a separately-
	computed microseconds/1e6 float) accumulates binary representation
	error that a single division avoids (test_total_seconds:
	timedelta(microseconds=-1).total_seconds() must be exactly -1e-06,
	not -1.0000000000287557e-06)."

	^ (((self @env0:dynamicInstVarAt: #_days) @env0:* 86400 @env0:+ (self @env0:dynamicInstVarAt: #_seconds))
		@env0:* 1000000 @env0:+ (self @env0:dynamicInstVarAt: #_microseconds))
		@env0:/ 1000000.0
%

category: 'Grail-Accessors'
method: PyTimedelta
___totalMicros___
	"Internal: signed total microseconds."

	^ ((self @env0:dynamicInstVarAt: #_days) @env0:* 86400000000) @env0:+ ((self @env0:dynamicInstVarAt: #_seconds) @env0:* 1000000) @env0:+ (self @env0:dynamicInstVarAt: #_microseconds)
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__add__: other
	"NotImplemented (not a direct TypeError) for a non-timedelta, so the
	reflected op runs: timedelta + date/datetime dispatches to the
	date/datetime __radd__."

	(other isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self ___totalMicros___ @env0:+ other ___totalMicros___)
	].
	^ #'___NotImplemented___'
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__sub__: other
	(other isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self ___totalMicros___ @env0:- other ___totalMicros___)
	].
	^ TypeError ___signal___: 'unsupported operand for -'
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__neg__
	^ PyTimedelta @env0:___fromTotalMicros___: self ___totalMicros___ @env0:negated
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__mul__: scale
	"Int scale: exact, `totalMicros * scale` has no fraction to round.
	Float scale: CPython ports the float to its EXACT integer ratio
	(as_integer_ratio -- a power-of-2 denominator, no representation
	error) and does the multiply/round in that exact integer domain
	(_pydatetime.timedelta.__mul__ + _divide_and_round) -- naive
	float multiplication here would reintroduce the same binary
	representation error CPython's approach specifically avoids
	(test_computations' Issue #23521 cases, e.g. seconds=1 * 0.123456
	must land on EXACTLY 123456 microseconds)."

	| ratio a b usec |
	(scale isKindOf: Number) ifFalse: [^ #'___NotImplemented___'].
	(scale @env0:isKindOf: Float) ifFalse: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self ___totalMicros___ @env0:* scale) @env0:truncated].
	ratio := scale as_integer_ratio.
	a := ratio @env0:at: 1.
	b := ratio @env0:at: 2.
	usec := self ___totalMicros___.
	^ PyTimedelta @env0:___fromTotalMicros___:
		(PyTimedelta @env0:___divideAndRound___: usec @env0:* a by: b)
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__pos__
	"Unary plus returns self (CPython)."

	^ self
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__truediv__: other
	"td / td -> float; td / int -> td (exact _divide_and_round, matching
	CPython -- NOT naive float division + rounded, which reintroduces
	binary representation error); td / float -> td, via the float's
	EXACT integer ratio (as_integer_ratio) same as __mul__ above.
	Zero divisor -> ZeroDivisionError."

	| usec |
	(other isKindOf: PyTimedelta) ifTrue: [
		other ___totalMicros___ @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
		^ (self ___totalMicros___ @env0:/ other ___totalMicros___) @env0:asFloat].
	(other isKindOf: Number) ifFalse: [^ #'___NotImplemented___'].
	other @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
	usec := self ___totalMicros___.
	(other @env0:isKindOf: Float) ifTrue: [
		| ratio a b |
		ratio := other as_integer_ratio.
		a := ratio @env0:at: 1.
		b := ratio @env0:at: 2.
		^ PyTimedelta @env0:___fromTotalMicros___:
			(PyTimedelta @env0:___divideAndRound___: b @env0:* usec by: a)].
	^ PyTimedelta @env0:___fromTotalMicros___:
		(PyTimedelta @env0:___divideAndRound___: usec by: other)
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__floordiv__: other
	"td // td -> int; td // int -> td.  A float divisor is NOT accepted
	(matches CPython: timedelta.__floordiv__ only handles (int,
	timedelta), unlike __truediv__/__mul__).  Zero divisor ->
	ZeroDivisionError."

	(other isKindOf: PyTimedelta) ifTrue: [
		other ___totalMicros___ @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
		^ self ___totalMicros___ @env0:// other ___totalMicros___].
	((other isKindOf: Number) and: [(other isKindOf: Float) not]) ifFalse: [^ #'___NotImplemented___'].
	other @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
	^ PyTimedelta @env0:___fromTotalMicros___: (self ___totalMicros___ @env0:// other)
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__mod__: other
	"td % td -> td (only a timedelta divisor is valid).  Zero -> ZeroDivisionError."

	(other isKindOf: PyTimedelta) ifFalse: [^ #'___NotImplemented___'].
	other ___totalMicros___ @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
	^ PyTimedelta @env0:___fromTotalMicros___:
		(self ___totalMicros___ @env0:\\ other ___totalMicros___)
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__radd__: other
	"other + self (addition commutes for timedeltas)."

	^ self __add__: other
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__rsub__: other
	"other - self."

	(other isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(other ___totalMicros___ @env0:- self ___totalMicros___)].
	^ TypeError ___signal___: 'unsupported operand for -'
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__rmul__: scale
	"scale * self (multiplication commutes)."

	^ self __mul__: scale
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__abs__
	self ___totalMicros___ @env0:< 0 ifTrue: [
		^ self __neg__
	].
	^ self
%

category: 'Grail-Equality'
method: PyTimedelta
__eq__: other
	"NotImplemented (not false) for a non-timedelta, so the reflected
	comparison runs (e.g. ALWAYS_EQ == timedelta is True)."

	(other isKindOf: PyTimedelta) ifFalse: [^ #'___NotImplemented___'].
	^ self ___totalMicros___ @env0:= other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__lt__: other
	(other isKindOf: PyTimedelta) ifFalse: [^ #'___NotImplemented___'].
	^ self ___totalMicros___ @env0:< other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__hash__
	^ self ___totalMicros___ @env0:hash
%

category: 'Grail-Pickle'
method: PyTimedelta
__reduce__
	"(class, (days, seconds, microseconds))."

	^ tuple @env0:withAll: {
		(self @env0:class).
		(tuple @env0:withAll: {
			(self @env0:dynamicInstVarAt: #_days).
			(self @env0:dynamicInstVarAt: #_seconds).
			(self @env0:dynamicInstVarAt: #_microseconds) }) }
%

category: 'Grail-Class Attrs'
classmethod: PyTimedelta
__module__
	^ 'datetime'
%

category: 'Grail-Introspection'
classmethod: PyTimedelta
__qualname__
	"Only PyTimedelta ITSELF is 'timedelta' -- a Python subclass
	(``class SubclassTimeDelta(timedelta):``) must see its own name here
	(test_repr_subclass), so fall back to the generic object-level
	__qualname__ (self name asString) for anything else."

	^ self @env0:== PyTimedelta
		ifTrue: ['timedelta']
		ifFalse: [super __qualname__]
%

category: 'Grail-Introspection'
classmethod: PyTimedelta
__name__
	"CPython name is 'timedelta', not the Smalltalk class name -- but only
	for PyTimedelta itself; see __qualname__ above."

	^ self @env0:== PyTimedelta
		ifTrue: ['timedelta']
		ifFalse: [super __name__]
%

category: 'Grail-Conversion'
method: PyTimedelta
__str__
	"Roughly CPython's repr: e.g. '1 day, 3:04:05.000006'."

	| days secs us stream hh mm ss usStr |
	"Format from the normalized fields: days is signed, 0<=seconds<86400,
	0<=microseconds<1e6.  A negative delta shows a negative day count with
	a POSITIVE time-of-day (e.g. timedelta(-1) -> '-1 day, 0:00:00')."
	days := self @env0:dynamicInstVarAt: #_days.
	secs := self @env0:dynamicInstVarAt: #_seconds.
	us := self @env0:dynamicInstVarAt: #_microseconds.
	hh := secs @env0:// 3600.
	mm := (secs @env0:\\ 3600) @env0:// 60.
	ss := secs @env0:\\ 60.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	days @env0:~= 0 ifTrue: [
		stream @env0:nextPutAll: days @env0:printString.
		stream @env0:nextPutAll: ((days @env0:abs @env0:= 1) ifTrue: [' day, '] ifFalse: [' days, '])
	].
	stream @env0:nextPutAll: hh @env0:printString.
	stream @env0:nextPut: $:.
	mm @env0:< 10 ifTrue: [stream @env0:nextPut: $0].
	stream @env0:nextPutAll: mm @env0:printString.
	stream @env0:nextPut: $:.
	ss @env0:< 10 ifTrue: [stream @env0:nextPut: $0].
	stream @env0:nextPutAll: ss @env0:printString.
	us @env0:~= 0 ifTrue: [
		stream @env0:nextPut: $..
		usStr := us @env0:printString.
		[usStr @env0:size @env0:< 6] @env0:whileTrue: [usStr := '0' @env0:, usStr].
		stream @env0:nextPutAll: usStr
	].
	^ stream @env0:contents
%

category: 'Grail-Equality'
method: PyTimedelta
__le__: other
	(other isKindOf: PyTimedelta) ifFalse: [^ #'___NotImplemented___'].
	^ self ___totalMicros___ @env0:<= other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__gt__: other
	(other isKindOf: PyTimedelta) ifFalse: [^ #'___NotImplemented___'].
	^ self ___totalMicros___ @env0:> other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__ge__: other
	(other isKindOf: PyTimedelta) ifFalse: [^ #'___NotImplemented___'].
	^ self ___totalMicros___ @env0:>= other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__ne__: other
	| eq |
	eq := self __eq__: other.
	(eq @env0:== #'___NotImplemented___') ifTrue: [^ eq].
	^ eq @env0:not
%

category: 'Grail-Conversion'
method: PyTimedelta
__bool__
	"False iff the delta is exactly zero (CPython)."

	^ self ___totalMicros___ @env0:~= 0
%

category: 'Grail-Conversion'
method: PyTimedelta
__repr__
	"CPython repr: 'datetime.timedelta(days=1, seconds=2, microseconds=3)',
	omitting zero components; 'datetime.timedelta(0)' when all zero.  Bare
	subclass names (gh-107773): only the real datetime module's own
	timedelta gets the 'datetime.' prefix -- a Python subclass's
	synthesized __module__ is its own defining module, so it prints bare
	(see test_repr_subclass)."

	| d s us stream any prefix |
	d := self @env0:dynamicInstVarAt: #_days.
	s := self @env0:dynamicInstVarAt: #_seconds.
	us := self @env0:dynamicInstVarAt: #_microseconds.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	prefix := (self @env0:class __module__) @env0:= 'datetime'
		ifTrue: ['datetime.']
		ifFalse: [''].
	stream @env0:nextPutAll: prefix.
	stream @env0:nextPutAll: (self @env0:class __qualname__).
	stream @env0:nextPut: $(.
	any := false.
	d @env0:~= 0 ifTrue: [
		stream @env0:nextPutAll: 'days='.
		stream @env0:nextPutAll: d @env0:printString.
		any := true].
	s @env0:~= 0 ifTrue: [
		any ifTrue: [stream @env0:nextPutAll: ', '].
		stream @env0:nextPutAll: 'seconds='.
		stream @env0:nextPutAll: s @env0:printString.
		any := true].
	us @env0:~= 0 ifTrue: [
		any ifTrue: [stream @env0:nextPutAll: ', '].
		stream @env0:nextPutAll: 'microseconds='.
		stream @env0:nextPutAll: us @env0:printString.
		any := true].
	any ifFalse: [stream @env0:nextPutAll: '0'].
	stream @env0:nextPut: $).
	^ stream @env0:contents
%

category: 'Grail-Class Attrs'
classmethod: PyTimedelta
resolution
	"timedelta.resolution == timedelta(microseconds=1)."

	^ PyTimedelta @env0:___fromTotalMicros___: 1
%

category: 'Grail-Class Attrs'
classmethod: PyTimedelta
min
	"timedelta.min == timedelta(-999999999)."

	^ PyTimedelta @env0:___fromTotalMicros___:
		(-999999999 @env0:* 86400 @env0:* 1000000)
%

category: 'Grail-Class Attrs'
classmethod: PyTimedelta
max
	"timedelta.max == timedelta(days=999999999, hours=23, minutes=59,
	seconds=59, microseconds=999999)."

	^ PyTimedelta @env0:___fromTotalMicros___:
		((999999999 @env0:* 86400 @env0:+ 86399) @env0:* 1000000 @env0:+ 999999)
%

! ===============================================================================
! PyTimezone - Python `datetime.timezone`.  Stored as a PyTimedelta offset
! plus optional name.  `timezone.utc` is the canonical UTC singleton.
! ===============================================================================

set compile_env: 0

! PyTzinfo — Python's abstract ``datetime.tzinfo'' base.  Exists so
! user code can subclass it (django.utils.timezone imports tzinfo) and
! so ``isinstance(x, tzinfo)'' holds for timezone instances.
expectvalue /Class
doit
Object subclass: 'PyTzinfo'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyTzinfo category: 'Grail-Modules'
%

expectvalue /Class
doit
PyTzinfo subclass: 'PyTimezone'
  instVarNames: #()
  classVars: #( '_utc' )
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyTimezone category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyTimezone removeAllMethods: 0.
PyTimezone removeAllMethods: 1.
PyTimezone class removeAllMethods: 0.
PyTimezone class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: PyTimezone
___pythonValueAttrs___
	^ IdentitySet new
		add: #utc;
		yourself
%

category: 'Grail-Private'
method: PyTimezone
_offset: tdelta _name: nameOrNil
	self dynamicInstVarAt: #_offset put: (tdelta).
	self dynamicInstVarAt: #_name put: (nameOrNil).
	^ self
%

set compile_env: 1

category: 'Grail-Class Attrs'
classmethod: PyTimezone
utc
	"timezone.utc - canonical singleton for UTC.  SESSION-LOCAL
	(SessionTemps): the old lazy write to the ``_utc'' classVar dirtied
	the committed PyTimezone class in every fresh session (multi-user
	commit conflicts).  Identity is only compared within a session
	(tz is timezone.utc); datetimes deliberately committed by an
	application carry their own offset data.  The classVar declaration
	remains but is unused."

	| tz |
	tz := SessionTemps @env0:current @env0:at: #GrailTimezoneUtc otherwise: nil.
	tz @env0:isNil ifTrue: [
		tz := self @env0:new
			@env0:_offset: (PyTimedelta @env0:___fromTotalMicros___: 0) _name: 'UTC'.
		SessionTemps @env0:current @env0:at: #GrailTimezoneUtc put: tz
	].
	^ tz
%

category: 'Grail-Initialization'
classmethod: PyTimezone
__new__: tdelta
	"timezone(offset) constructor.  A zero offset with no name returns the
	canonical utc singleton (CPython interns timezone(timedelta(0)) as utc)."

	(tdelta @env0:isKindOf: PyTimedelta) ifFalse: [
		^ TypeError ___signal___: 'offset must be a timedelta'].
	(tdelta ___totalMicros___ @env0:= 0) ifTrue: [^ PyTimezone utc].
	(tdelta ___totalMicros___) @env0:abs @env0:> 86399999999 ifTrue: [
		^ ValueError ___signal___:
			'offset must be a timedelta strictly between -timedelta(hours=24) and timedelta(hours=24).'].
	^ self @env0:new @env0:_offset: tdelta _name: nil
%

category: 'Grail-Initialization'
classmethod: PyTimezone
__new__: tdelta _: aName
	"timezone(offset, name) constructor."

	(tdelta @env0:isKindOf: PyTimedelta) ifFalse: [
		^ TypeError ___signal___: 'offset must be a timedelta'].
	(aName @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'name must be a string'].
	(tdelta ___totalMicros___) @env0:abs @env0:> 86399999999 ifTrue: [
		^ ValueError ___signal___:
			'offset must be a timedelta strictly between -timedelta(hours=24) and timedelta(hours=24).'].
	^ self @env0:new @env0:_offset: tdelta _name: aName
%

category: 'Grail-Initialization'
classmethod: PyTimezone
__new__: tdelta _: aName _: extra
	"timezone() takes at most 2 arguments -- a 3rd is a TypeError
	(test_constructor: ``timezone(ZERO, 'ABC', 'extra')'').  Without this,
	object class >> value:value:'s arity-dispatch builds the selector
	__new__:_:_: and performs it directly with NO such-selector guard,
	which would otherwise crash with an uncaught MessageNotUnderstood
	instead of a catchable TypeError."

	^ TypeError ___signal___: 'timezone() takes at most 2 arguments'
%

category: 'Grail-Accessors'
method: PyTimezone
utcoffset: dt
	"Return the configured offset (independent of `dt`) -- but `dt` must
	still be None or a datetime instance (test_utcoffset: a bare string/
	int argument is a TypeError, matching CPython's argument check even
	though the offset itself doesn't depend on dt's value)."

	(dt @env0:isNil @env0:or: [dt @env0:== None @env0:or: [dt @env0:isKindOf: PyDateTime]]) ifFalse: [
		^ TypeError ___signal___: 'utcoffset() argument must be a datetime instance or None'].
	^ (self @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Accessors'
method: PyTimezone
tzname: dt
	"Return the human-readable name, e.g. 'UTC' or 'UTC+02:00'."

	(dt @env0:isNil @env0:or: [dt @env0:== None @env0:or: [dt @env0:isKindOf: PyDateTime]]) ifFalse: [
		^ TypeError ___signal___: 'tzname() argument must be a datetime instance or None'].
	(self @env0:dynamicInstVarAt: #_name) @env0:isNil ifFalse: [^ (self @env0:dynamicInstVarAt: #_name)].
	^ self ___formatOffset___: (self @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Accessors'
method: PyTimezone
dst: dt
	"timezone instances do not represent DST transitions."

	(dt @env0:isNil @env0:or: [dt @env0:== None @env0:or: [dt @env0:isKindOf: PyDateTime]]) ifFalse: [
		^ TypeError ___signal___: 'dst() argument must be a datetime instance or None'].
	^ None
%

category: 'Grail-Accessors'
method: PyTimezone
fromutc: dt
	"Convert a UTC datetime (tzinfo == self) to this zone: dt + offset."

	(dt @env0:isKindOf: PyDateTime) ifFalse: [
		^ TypeError ___signal___: 'fromutc() argument must be a datetime instance'].
	(dt tzinfo @env0:== self) ifFalse: [
		^ ValueError ___signal___: 'fromutc: dt.tzinfo is not self'].
	^ dt __add__: (self @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Abstract'
method: PyTzinfo
utcoffset: dt
	"Abstract: a tzinfo subclass must override utcoffset()."

	^ NotImplementedError ___signal___: 'tzinfo subclass must override utcoffset()'
%

category: 'Grail-Abstract'
method: PyTzinfo
tzname: dt
	^ NotImplementedError ___signal___: 'tzinfo subclass must override tzname()'
%

category: 'Grail-Abstract'
method: PyTzinfo
dst: dt
	^ NotImplementedError ___signal___: 'tzinfo subclass must override dst()'
%

category: 'Grail-Abstract'
method: PyTzinfo
fromutc: dt
	"Default tzinfo.fromutc (CPython): shift a UTC datetime tagged with
	self into local time via utcoffset()/dst()."

	| dtoff dtdst delta d |
	d := dt.
	(d tzinfo @env0:== self) ifFalse: [^ ValueError ___signal___: 'dt.tzinfo is not self'].
	dtoff := d utcoffset.
	dtdst := d dst.
	(dtoff @env0:== None or: [dtdst @env0:== None]) ifTrue: [
		^ ValueError ___signal___: 'fromutc() requires a non-None utcoffset() result'].
	delta := dtoff __sub__: dtdst.
	(delta __bool__) ifTrue: [
		d := d __add__: delta.
		dtdst := d dst.
		dtdst @env0:== None ifTrue: [
			^ ValueError ___signal___: 'fromutc(): dt.dst gave inconsistent results; cannot convert']].
	^ d __add__: dtdst
%

category: 'Grail-Pickle'
method: PyTzinfo
__reduce__
	"(class, initargs, state) — CPython's tzinfo.__reduce__.

	tzinfo itself carries no data, but it must still be picklable so that
	concrete subclasses can be (test_pickling_base).  Args come from
	__getinitargs__ when the subclass defines one (timezone does);
	otherwise the subclass is reconstructed by calling it with NO
	arguments and its instance namespace is reapplied as state, which is
	how PicklableFixedOffset's offset/name survive the round trip
	(test_pickling_subclass) -- pickle.py's `r' opcode hands the third
	element to __setstate__, or merges it into the instance when it is a
	plain dict."

	| args state names |
	args := (self ___respondsTo___: #'__getinitargs__')
		ifTrue: [self __getinitargs__]
		ifFalse: [tuple @env0:new].
	state := dict ___new___.
	names := [self @env0:dynamicInstanceVariables]
		@env0:on: AbstractException do: [:e | e @env0:return: #()].
	names @env0:do: [:nm |
		| v |
		v := self @env0:dynamicInstVarAt: nm.
		v == nil ifFalse: [
			state __setitem__: nm @env0:asString @env0:asUnicodeString _: v]].
	^ tuple @env0:withAll: { self @env0:class. args. state }
%

category: 'Grail-Introspection'
classmethod: PyTzinfo
__module__
	"Pickling a tzinfo pickles its CLASS by (module, qualname), and
	pickle.py's _find_global rejects a class whose __module__ is not a
	string (test_pickling_base).  PyTimezone declares its own; the base
	class had none."

	^ 'datetime'
%

category: 'Grail-Introspection'
classmethod: PyTzinfo
__qualname__
	^ self @env0:== PyTzinfo
		ifTrue: ['tzinfo']
		ifFalse: [super __qualname__]
%

category: 'Grail-Introspection'
classmethod: PyTzinfo
__name__
	^ self @env0:== PyTzinfo
		ifTrue: ['tzinfo']
		ifFalse: [super __name__]
%

category: 'Grail-Accessors'
method: PyTimezone
__str__
	^ self tzname: None
%

category: 'Grail-Private'
method: PyTimezone
___formatOffset___: tdelta
	"CPython _name_from_offset: 'UTC±HH:MM', extended with ':SS' and
	'.ffffff' when the offset has a seconds / microseconds component."

	| micros stream sign hh mm ss us pad |
	micros := tdelta ___totalMicros___.
	micros @env0:= 0 ifTrue: [^ 'UTC'].
	pad := [:n | | s | s := n @env0:printString. s @env0:size @env0:< 2 ifTrue: ['0' @env0:, s] ifFalse: [s]].
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: 'UTC'.
	sign := micros @env0:< 0 ifTrue: [$-] ifFalse: [$+].
	stream @env0:nextPut: sign.
	micros := micros @env0:abs.
	hh := micros @env0:// 3600000000.
	mm := (micros @env0:\\ 3600000000) @env0:// 60000000.
	ss := (micros @env0:\\ 60000000) @env0:// 1000000.
	us := micros @env0:\\ 1000000.
	stream @env0:nextPutAll: (pad @env0:value: hh).
	stream @env0:nextPut: $:.
	stream @env0:nextPutAll: (pad @env0:value: mm).
	(ss @env0:~= 0 or: [us @env0:~= 0]) ifTrue: [
		stream @env0:nextPut: $:.
		stream @env0:nextPutAll: (pad @env0:value: ss).
		us @env0:~= 0 ifTrue: [
			| usStr |
			stream @env0:nextPut: $..
			usStr := us @env0:printString.
			[usStr @env0:size @env0:< 6] @env0:whileTrue: [usStr := '0' @env0:, usStr].
			stream @env0:nextPutAll: usStr]].
	^ stream @env0:contents
%

category: 'Grail-Equality'
method: PyTimezone
__eq__: other
	"Two timezones are equal iff their offsets are equal (CPython
	compares offset only, not name).  NotImplemented for a non-timezone
	so the reflected comparison runs (e.g. ALWAYS_EQ == tz)."

	(other isKindOf: PyTimezone) ifFalse: [^ #'___NotImplemented___'].
	^ (self @env0:dynamicInstVarAt: #_offset) __eq__: (other @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Equality'
method: PyTimezone
__ne__: other
	| eq |
	eq := self __eq__: other.
	(eq @env0:== #'___NotImplemented___') ifTrue: [^ eq].
	^ eq @env0:not
%

category: 'Grail-Equality'
method: PyTimezone
__hash__
	^ (self @env0:dynamicInstVarAt: #_offset) __hash__
%

category: 'Grail-Pickle'
method: PyTimezone
__reduce__
	"(class, (offset[, name])).  The utc singleton pickles with offset ONLY
	so it re-interns to timezone.utc on unpickling (timezone(timedelta(0))
	is utc), preserving identity."

	| name fields |
	(self @env0:== (PyTimezone utc)) ifTrue: [
		^ tuple @env0:withAll: {
			(self @env0:class).
			(tuple @env0:withAll: { (self @env0:dynamicInstVarAt: #_offset) }) }].
	name := self @env0:dynamicInstVarAt: #_name.
	fields := OrderedCollection @env0:new.
	fields @env0:add: (self @env0:dynamicInstVarAt: #_offset).
	name @env0:isNil ifFalse: [fields @env0:add: name].
	^ tuple @env0:withAll: {
		(self @env0:class).
		(tuple @env0:withAll: fields @env0:asArray) }
%

category: 'Grail-Class Attrs'
classmethod: PyTimezone
__module__
	^ 'datetime'
%

category: 'Grail-Introspection'
classmethod: PyTimezone
__qualname__
	^ self @env0:== PyTimezone
		ifTrue: ['timezone']
		ifFalse: [super __qualname__]
%

category: 'Grail-Introspection'
classmethod: PyTimezone
__name__
	^ self @env0:== PyTimezone
		ifTrue: ['timezone']
		ifFalse: [super __name__]
%

category: 'Grail-Conversion'
method: PyTimezone
__repr__
	"CPython: 'datetime.timezone.utc' for the singleton; otherwise
	'datetime.timezone(<offset repr>[, '<name>'])'."

	| offsetRepr name |
	(self @env0:== (PyTimezone utc)) ifTrue: [^ 'datetime.timezone.utc'].
	offsetRepr := (self @env0:dynamicInstVarAt: #_offset) __repr__.
	name := self @env0:dynamicInstVarAt: #_name.
	name @env0:isNil ifTrue: [
		^ 'datetime.timezone(' @env0:, offsetRepr @env0:, ')'].
	^ 'datetime.timezone(' @env0:, offsetRepr @env0:, ', ''' @env0:, name @env0:asString @env0:, ''')'
%

category: 'Grail-Class Attrs'
classmethod: PyTimezone
min
	"timezone.min == timezone(-timedelta(hours=23, minutes=59))."

	^ self __new__:
		(PyTimedelta @env0:___fromTotalMicros___: ((23 @env0:* 3600 @env0:+ (59 @env0:* 60)) @env0:* -1000000))
%

category: 'Grail-Class Attrs'
classmethod: PyTimezone
max
	"timezone.max == timezone(timedelta(hours=23, minutes=59))."

	^ self __new__:
		(PyTimedelta @env0:___fromTotalMicros___: ((23 @env0:* 3600 @env0:+ (59 @env0:* 60)) @env0:* 1000000))
%

! ===============================================================================
! PyDateTime - Python `datetime.datetime` (with date+time fields combined).
! ===============================================================================

set compile_env: 0

expectvalue /Class
doit
Object subclass: 'PyDateTime'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyDateTime category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyDateTime removeAllMethods: 0.
PyDateTime removeAllMethods: 1.
PyDateTime class removeAllMethods: 0.
PyDateTime class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: PyDateTime
___pythonValueAttrs___
	^ IdentitySet new
		add: #year;
		add: #month;
		add: #day;
		add: #hour;
		add: #minute;
		add: #second;
		add: #microsecond;
		add: #tzinfo;
		add: #fold;
		yourself
%

category: 'Grail-Private'
classmethod: PyDateTime
___fromFields___: y _: mo _: d _: h _: mi _: s _: us _: tz
	| inst |
	inst := self new.
	inst
		_year: y _month: mo _day: d
		_hour: h _minute: mi _second: s
		_microsecond: us _tzinfo: tz.
	^ inst
%

category: 'Grail-Hash'
method: PyDateTime
= other
	"Smalltalk value-equality + hash so equal datetimes collapse as
	PyDict/set keys (naive compare key; tzinfo-aware deferred, matching
	__eq__/__hash__)."

	^ (other isKindOf: PyDateTime)
		and: [(self @env1:___compareKey___) = (other @env1:___compareKey___)]
%

category: 'Grail-Hash'
method: PyDateTime
hash
	^ (self @env1:___compareKey___) hash
%

category: 'Grail-Private'
method: PyDateTime
_year: y _month: mo _day: d _hour: h _minute: mi _second: s _microsecond: us _tzinfo: tz
	self dynamicInstVarAt: #_year put: (y).
	self dynamicInstVarAt: #_month put: (mo).
	self dynamicInstVarAt: #_day put: (d).
	self dynamicInstVarAt: #_hour put: (h).
	self dynamicInstVarAt: #_minute put: (mi).
	self dynamicInstVarAt: #_second put: (s).
	self dynamicInstVarAt: #_microsecond put: (us).
	self dynamicInstVarAt: #_tzinfo put: (tz).
	^ self
%

set compile_env: 1

! ------- Constructors
! Override class-side value:value: to forward all arities + kwargs into
! the same varargs assembler.  Without this Object class >> value:value:
! would look for __new__:_:_:_:_:_:... selectors per arity, and the
! 6-/7-/8-arg cases would MessageNotUnderstood.

category: 'Grail-Callable'
classmethod: PyDateTime
value: positional value: kwargs
	^ self _datetime: positional kw: kwargs
%

category: 'Grail-Initialization'
classmethod: PyDateTime
_datetime: positional kw: kwargs
	"datetime(...) varargs constructor accepting optional second,
	microsecond, tzinfo."

	| year month day hour minute second micro tz fold inst |
	"year/month/day are ordinary parameters in CPython, so they may arrive
	as keywords (``datetime(2010, 10, day=10)'').  Reading them with a
	bare ``at:'' made any such call die with an out-of-bounds Smalltalk
	OffsetError instead (test_repr_subclass)."
	year := positional @env0:at: 1 ifAbsent: [nil].
	month := positional @env0:at: 2 ifAbsent: [nil].
	day := positional @env0:at: 3 ifAbsent: [nil].
	hour := positional @env0:size @env0:>= 4 ifTrue: [positional @env0:at: 4] ifFalse: [0].
	minute := positional @env0:size @env0:>= 5 ifTrue: [positional @env0:at: 5] ifFalse: [0].
	second := positional @env0:size @env0:>= 6 ifTrue: [positional @env0:at: 6] ifFalse: [0].
	micro := positional @env0:size @env0:>= 7 ifTrue: [positional @env0:at: 7] ifFalse: [0].
	tz := positional @env0:size @env0:>= 8 ifTrue: [positional @env0:at: 8] ifFalse: [nil].
	fold := 0.
	kwargs @env0:isNil ifFalse: [
		year := kwargs @env0:at: 'year' ifAbsent: [year].
		month := kwargs @env0:at: 'month' ifAbsent: [month].
		day := kwargs @env0:at: 'day' ifAbsent: [day].
		hour := kwargs @env0:at: 'hour' ifAbsent: [hour].
		minute := kwargs @env0:at: 'minute' ifAbsent: [minute].
		second := kwargs @env0:at: 'second' ifAbsent: [second].
		micro := kwargs @env0:at: 'microsecond' ifAbsent: [micro].
		tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz].
		fold := kwargs @env0:at: 'fold' ifAbsent: [0]
	].
	tz == None ifTrue: [tz := nil].
	inst := self @env0:___fromFields___: year _: month _: day _: hour _: minute _: second _: micro _: tz.
	fold @env0:= 0 ifFalse: [inst @env0:dynamicInstVarAt: #_fold put: fold].
	^ inst
%

category: 'Grail-Instantiation'
method: PyDateTime
___new__: positional kw: kwargs
	"Python-level `datetime.__new__(cls, ...)`, reached via
	object >> ___allocateInstance___:kw: when a PYTHON SUBCLASS of
	datetime is instantiated (``class A(datetime): ...``).  Direct
	construction goes through the class-side Grail-Callable
	``value:value:'' instead -- but ClassDefAst synthesizes a FRESH
	``value:value:'' on every Python-defined subclass, which shadows
	datetime's own and routes through the allocate-then-__init__
	protocol.  Without this, a subclass instance's _year/_month/... stay
	nil (test_repr_subclass, test_format).  Called non-virtually with the
	actual class as receiver, so forwarding to the same varargs assembler
	used by value:value: allocates via `self ___fromFields___:' and keeps
	the subclass.  See PyDate>>___new__:kw: for the Enum-mixin rationale."

	(Enum ___grailBuildingSet @env0:includes: self) ifTrue: [
		^ TypeError @env1:___signal___:
			'do not use `super().__new__; call the appropriate __new__ directly'].
	^ self _datetime: positional kw: kwargs
%

category: 'Grail-Initialization'
classmethod: PyDateTime
now
	^ self now: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
now: tz
	"now() / now(tz) - current local or zone-tagged datetime.  We
	read GemStone DateTime now and pull GMT components (so the wall
	clock is unaffected by the gem's local timezone), then attach
	the supplied tzinfo."

	| dt micros tz2 |
	dt := DateTime @env0:now.
	micros := ((dt @env0:instVarAt: 3) @env0:\\ 1000) @env0:* 1000.
	tz2 := tz == None ifTrue: [nil] ifFalse: [tz].
	^ self @env0:___fromFields___:
		(dt @env0:yearGmt)
		_: (dt @env0:monthGmt)
		_: (dt @env0:dayOfMonthGmt)
		_: (dt @env0:hourGmt)
		_: (dt @env0:minuteGmt)
		_: (dt @env0:secondGmt)
		_: micros
		_: tz2
%

category: 'Grail-Initialization'
classmethod: PyDateTime
today
	"datetime.today() — CPython defines it as exactly now() with no tz
	(datetime IS-A date there, but it OVERRIDES date.today; Grail's
	PyDateTime is a separate class, so it needs its own — test_today)."

	^ self now: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
utcnow
	"utcnow() - naive UTC datetime (deprecated in CPython 3.12+
	but still common in libraries like itsdangerous)."

	^ self now: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromtimestamp: ts
	^ self fromtimestamp: ts _: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
_fromtimestamp: positional kw: kwargs
	"fromtimestamp(timestamp, tz=None) — varargs/keyword form.  CPython
	names the first parameter ``timestamp'' (gh-85432), so
	``fromtimestamp(timestamp=...)'' must bind
	(test_fromtimestamp_keyword_arg)."

	| ts tz |
	ts := nil.
	tz := nil.
	positional @env0:isNil ifFalse: [
		positional @env0:size @env0:>= 1 ifTrue: [ts := positional @env0:at: 1].
		positional @env0:size @env0:>= 2 ifTrue: [tz := positional @env0:at: 2]].
	kwargs @env0:isNil ifFalse: [
		ts := kwargs @env0:at: 'timestamp' ifAbsent: [ts].
		tz := kwargs @env0:at: 'tz' ifAbsent: [tz]].
	^ self fromtimestamp: ts _: tz
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromtimestamp: ts _: tz
	"fromtimestamp(ts[, tz]) - Unix epoch seconds to PyDateTime.  ts must
	be a real number (None/str/... -> TypeError, gh-120268); a value so
	extreme the resulting date falls outside year 1..9999 -> OverflowError
	(GemStone's DateTime signals an uncatchable-by-Python ArgumentError
	for this -- resignal, test_insane_fromtimestamp)."

	| epoch dt secs micros tz2 |
	(ts @env0:isKindOf: Number) ifFalse: [
		^ TypeError @env1:___signal___:
			'an integer is required (got type ' @env0:, ts @env0:class __name__ @env0:, ')'].
	tz2 := tz == None ifTrue: [nil] ifFalse: [tz].
	secs := ts @env0:truncated.
	micros := ((ts @env0:- secs) @env0:* 1000000) @env0:truncated.
	epoch := DateTime
		@env0:newGmtWithYear: 1970
		month: 1
		day: 1
		hours: 0
		minutes: 0
		seconds: 0.
	dt := [epoch @env0:addSeconds: secs]
		@env0:on: Error
		do: [:ex | ^ OverflowError @env1:___signal___: 'timestamp out of range for platform time_t'].
	^ self @env0:___fromFields___:
		(dt @env0:yearGmt)
		_: (dt @env0:monthGmt)
		_: (dt @env0:dayOfMonthGmt)
		_: (dt @env0:hourGmt)
		_: (dt @env0:minuteGmt)
		_: (dt @env0:secondGmt)
		_: micros
		_: tz2
%

category: 'Grail-Initialization'
classmethod: PyDateTime
utcfromtimestamp: ts
	"utcfromtimestamp(ts) - naive UTC version."

	^ self fromtimestamp: ts _: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromisoformat: s
	"Parse ISO 8601 YYYY-MM-DD[ T]HH:MM:SS[.ffffff][+HH:MM | Z].
	Tolerant of either `T` or space as separator; rejects anything
	more exotic."

	| str datePart timePart year month day hour min sec micro tz idx pivot |
	str := s @env0:asString.
	str @env0:size @env0:< 10 ifTrue: [
		ValueError ___signal___: 'invalid isoformat: ' @env0:, str
	].
	year := (str @env0:copyFrom: 1 to: 4) @env0:asNumber.
	month := (str @env0:copyFrom: 6 to: 7) @env0:asNumber.
	day := (str @env0:copyFrom: 9 to: 10) @env0:asNumber.
	hour := 0. min := 0. sec := 0. micro := 0. tz := nil.
	str @env0:size @env0:> 10 ifTrue: [
		idx := 12.
		"Skip separator (T or space)."
		hour := (str @env0:copyFrom: idx to: idx @env0:+ 1) @env0:asNumber.
		min := (str @env0:copyFrom: idx @env0:+ 3 to: idx @env0:+ 4) @env0:asNumber.
		sec := (str @env0:copyFrom: idx @env0:+ 6 to: idx @env0:+ 7) @env0:asNumber.
		pivot := idx @env0:+ 8.
		"Optional .ffffff."
		(pivot @env0:<= str @env0:size @env0:and: [(str @env0:at: pivot) @env0:= $.]) ifTrue: [
			| fracEnd fracStr |
			fracEnd := pivot @env0:+ 1.
			[fracEnd @env0:<= str @env0:size
				@env0:and: [
					| c |
					c := (str @env0:at: fracEnd) @env0:asInteger.
					(c @env0:>= $0 @env0:asInteger) @env0:and: [c @env0:<= $9 @env0:asInteger]
				]
			] @env0:whileTrue: [fracEnd := fracEnd @env0:+ 1].
			fracStr := str @env0:copyFrom: pivot @env0:+ 1 to: fracEnd @env0:- 1.
			[fracStr @env0:size @env0:< 6] @env0:whileTrue: [fracStr := fracStr @env0:, '0'].
			fracStr @env0:size @env0:> 6 ifTrue: [fracStr := fracStr @env0:copyFrom: 1 to: 6].
			micro := fracStr @env0:asNumber.
			pivot := fracEnd
		].
		"Optional timezone."
		pivot @env0:<= str @env0:size ifTrue: [
			| tzChar tzMicros |
			tzChar := str @env0:at: pivot.
			(tzChar @env0:= $Z @env0:or: [tzChar @env0:= $z]) ifTrue: [
				tz := PyTimezone utc
			] ifFalse: [
				(tzChar @env0:= $+ @env0:or: [tzChar @env0:= $-]) ifTrue: [
					| h m sign |
					sign := tzChar @env0:= $- ifTrue: [-1] ifFalse: [1].
					h := (str @env0:copyFrom: pivot @env0:+ 1 to: pivot @env0:+ 2) @env0:asNumber.
					m := (str @env0:copyFrom: pivot @env0:+ 4 to: pivot @env0:+ 5) @env0:asNumber.
					tzMicros := sign @env0:* ((h @env0:* 3600 @env0:+ (m @env0:* 60)) @env0:* 1000000).
					tz := PyTimezone __new__: (PyTimedelta @env0:___fromTotalMicros___: tzMicros)
				]
			]
		]
	].
	^ self @env0:___fromFields___: year _: month _: day _: hour _: min _: sec _: micro _: tz
%

! ------- Accessors

category: 'Grail-Accessors'
method: PyDateTime
year
	^ (self @env0:dynamicInstVarAt: #_year)
%

category: 'Grail-Accessors'
method: PyDateTime
month
	^ (self @env0:dynamicInstVarAt: #_month)
%

category: 'Grail-Accessors'
method: PyDateTime
day
	^ (self @env0:dynamicInstVarAt: #_day)
%

category: 'Grail-Accessors'
method: PyDateTime
hour
	^ (self @env0:dynamicInstVarAt: #_hour)
%

category: 'Grail-Accessors'
method: PyDateTime
minute
	^ (self @env0:dynamicInstVarAt: #_minute)
%

category: 'Grail-Accessors'
method: PyDateTime
second
	^ (self @env0:dynamicInstVarAt: #_second)
%

category: 'Grail-Accessors'
method: PyDateTime
microsecond
	^ (self @env0:dynamicInstVarAt: #_microsecond)
%

category: 'Grail-Accessors'
method: PyDateTime
tzinfo
	(self @env0:dynamicInstVarAt: #_tzinfo) @env0:isNil ifTrue: [^ None].
	^ (self @env0:dynamicInstVarAt: #_tzinfo)
%

category: 'Grail-Accessors'
method: PyDateTime
fold
	"PEP 495 fold flag; 0 unless set via the constructor's fold= keyword
	(Grail does not model DST-fold ambiguity)."

	| f |
	f := self @env0:dynamicInstVarAt: #_fold.
	^ f @env0:isNil ifTrue: [0] ifFalse: [f]
%

category: 'Grail-Accessors'
method: PyDateTime
utcoffset
	"tzinfo.utcoffset(self), or None when naive."

	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ tz utcoffset: self
%

category: 'Grail-Accessors'
method: PyDateTime
dst
	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ tz dst: self
%

category: 'Grail-Accessors'
method: PyDateTime
tzname
	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ tz tzname: self
%

category: 'Grail-Conversion'
method: PyDateTime
astimezone: tz
	"Convert an aware datetime to zone `tz`.  Grail treats a naive
	datetime as UTC (offset 0), since it has no portable local zone."

	| mytz myoffset utcWall |
	"astimezone() with no argument converts to the local zone; Grail has
	no portable local zone and documents wall clocks as UTC, so an
	omitted/None tz means UTC (test_astimezone)."
	tz == None ifTrue: [^ self astimezone: PyTimezone utc].
	tz @env0:isNil ifTrue: [^ self astimezone: PyTimezone utc].
	mytz := self @env0:dynamicInstVarAt: #_tzinfo.
	(mytz @env0:notNil and: [mytz @env0:== tz]) ifTrue: [^ self].
	myoffset := mytz @env0:isNil
		ifTrue: [PyTimedelta @env0:___fromTotalMicros___: 0]
		ifFalse: [mytz utcoffset: self].
	"Shift to UTC wall-clock, retag with the target zone, then let the
	target zone map UTC -> local."
	utcWall := self __sub__: myoffset.
	^ tz fromutc: (PyDateTime @env0:___fromFields___:
		(utcWall year) _: (utcWall month) _: (utcWall day)
		_: (utcWall hour) _: (utcWall minute) _: (utcWall second)
		_: (utcWall microsecond) _: tz)
%

! ------- Conversion

category: 'Grail-Conversion'
method: PyDateTime
timestamp
	"Unix epoch seconds with sub-second precision.  Treats naive
	datetimes as UTC (CPython treats them as local; the gem doesn't
	have a portable local definition, so we pick a deterministic
	stand-in).  AWARE datetimes (tzinfo set) additionally subtract the
	utcoffset -- the wall-clock fields are LOCAL to that offset, and the
	true UTC instant is ``local - offset'' (matching CPython's
	``(self - self.utcoffset()).replace(tzinfo=timezone.utc)'' epoch
	derivation).  Missing this subtraction double-counts the offset on
	any round trip through __add__/__sub__'s timestamp+fromtimestamp
	implementation for an aware datetime (test_issue23600)."

	| secs off |
	secs := self ___naiveEpochSeconds___.
	off := self utcoffset.
	off @env0:== None ifTrue: [^ secs].
	^ secs @env0:- (off total_seconds)
%

category: 'Grail-Private'
method: PyDateTime
___naiveEpochSeconds___
	"The wall-clock fields as epoch seconds, tzinfo IGNORED (i.e. read as
	if UTC).  Pure civil-calendar arithmetic, NOT DateTime>>asSeconds:
	asSeconds carries the gem's standard UTC offset, so a difference
	straddling a DST boundary is an hour off (see
	time>>___unixEpochDays___)."

	| days whole |
	days := time @env0:___epochDaysForYear___: (self @env0:dynamicInstVarAt: #_year)
		_month: (self @env0:dynamicInstVarAt: #_month)
		_day: (self @env0:dynamicInstVarAt: #_day).
	whole := (days @env0:* 86400)
		@env0:+ ((self @env0:dynamicInstVarAt: #_hour) @env0:* 3600)
		@env0:+ ((self @env0:dynamicInstVarAt: #_minute) @env0:* 60)
		@env0:+ (self @env0:dynamicInstVarAt: #_second).
	^ whole @env0:asFloat
		@env0:+ ((self @env0:dynamicInstVarAt: #_microsecond) @env0:asFloat @env0:/ 1000000.0)
%

category: 'Grail-Conversion'
method: PyDateTime
isoformat
	^ self _isoformat: nil kw: nil
%

category: 'Grail-Private'
method: PyDateTime
___isoDatePart___
	"'YYYY-MM-DD'."

	^ (self ___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4) @env0:, '-' @env0:,
		(self ___pad___: (self @env0:dynamicInstVarAt: #_month) width: 2) @env0:, '-' @env0:,
		(self ___pad___: (self @env0:dynamicInstVarAt: #_day) width: 2)
%

category: 'Grail-Private'
method: PyDateTime
___isoTimePart___: timespec
	"The time half of isoformat(), honouring CPython's timespec values.
	An unrecognised value is a ValueError, as in CPython."

	| h mi s us body |
	h := self @env0:dynamicInstVarAt: #_hour.
	mi := self @env0:dynamicInstVarAt: #_minute.
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	timespec @env0:= 'hours' ifTrue: [^ self ___pad___: h width: 2].
	body := (self ___pad___: h width: 2) @env0:, ':' @env0:, (self ___pad___: mi width: 2).
	timespec @env0:= 'minutes' ifTrue: [^ body].
	body := body @env0:, ':' @env0:, (self ___pad___: s width: 2).
	timespec @env0:= 'seconds' ifTrue: [^ body].
	timespec @env0:= 'milliseconds' ifTrue: [
		^ body @env0:, '.' @env0:, (self ___pad___: (us @env0:// 1000) width: 3)].
	timespec @env0:= 'microseconds' ifTrue: [
		^ body @env0:, '.' @env0:, (self ___pad___: us width: 6)].
	timespec @env0:= 'auto' ifFalse: [
		^ ValueError @env1:___signal___: 'Unknown timespec value'].
	us @env0:= 0 ifTrue: [^ body].
	^ body @env0:, '.' @env0:, (self ___pad___: us width: 6)
%

category: 'Grail-Private'
method: PyDateTime
___isoTzSuffix___
	"'+HH:MM'-style UTC-offset suffix, or '' when naive."

	| tzStr |
	(self @env0:dynamicInstVarAt: #_tzinfo) @env0:isNil ifTrue: [^ ''].
	tzStr := (self @env0:dynamicInstVarAt: #_tzinfo) tzname: self.
	tzStr @env0:= 'UTC' ifTrue: [^ '+00:00'].
	tzStr @env0:size @env0:>= 6 ifTrue: [^ tzStr @env0:copyFrom: 4 to: tzStr @env0:size].
	^ ''
%

category: 'Grail-Conversion'
method: PyDateTime
_isoformat: positional kw: kwargs
	"isoformat(sep='T', timespec='auto') — the varargs/keyword form.
	Grail routes ``dt.isoformat(...)'' with ANY argument through the
	``_<name>:kw:'' selector (Object.gs), so without this the fixed-arity
	``isoformat:'' alone made every call that passed sep or timespec fail
	with ``takes a different number of arguments'' (test_isoformat,
	test_fromisoformat_timespecs, test_fromisoformat_separators)."

	| sep timespec sepCh |
	sep := $T.
	timespec := 'auto'.
	positional @env0:isNil ifFalse: [
		positional @env0:size @env0:>= 1 ifTrue: [sep := positional @env0:at: 1].
		positional @env0:size @env0:>= 2 ifTrue: [timespec := positional @env0:at: 2]].
	kwargs @env0:isNil ifFalse: [
		sep := kwargs @env0:at: 'sep' ifAbsent: [sep].
		timespec := kwargs @env0:at: 'timespec' ifAbsent: [timespec]].
	sepCh := sep @env0:isString ifTrue: [sep @env0:first] ifFalse: [sep].
	^ self ___isoDatePart___
		@env0:, (Unicode7 @env0:with: sepCh)
		@env0:, (self ___isoTimePart___: timespec)
		@env0:, self ___isoTzSuffix___
%

category: 'Grail-Conversion'
method: PyDateTime
isoformat: sep
	"ISO 8601 representation; sep is `T` by default but can be space."

	^ self _isoformat: { sep } kw: nil
%

category: 'Grail-Conversion'
method: PyDateTime
__str__
	^ self isoformat: ' '
%

category: 'Grail-Conversion'
method: PyDateTime
__repr__
	"Bare subclass names in the repr (gh-107773) and CPython's trailing-
	zero elision: second/microsecond are omitted when both are 0.  Same
	rules as PyDate>>__repr__ and PyTime>>__repr__ (test_repr_subclass)."

	| prefix s us body |
	prefix := (self @env0:class __module__) @env0:= 'datetime'
		ifTrue: ['datetime.']
		ifFalse: [''].
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	body := (self @env0:dynamicInstVarAt: #_year) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_month) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_day) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_hour) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_minute) @env0:printString.
	(s @env0:~= 0 or: [us @env0:~= 0]) ifTrue: [
		body := body @env0:, ', ' @env0:, s @env0:printString.
		us @env0:~= 0 ifTrue: [body := body @env0:, ', ' @env0:, us @env0:printString]].
	^ prefix @env0:, (self @env0:class __qualname__) @env0:, '(' @env0:, body @env0:, ')'
%

category: 'Grail-Conversion'
method: PyDateTime
strftime: format
	"Minimal strftime via delegating to the `time` module's struct_time
	tuple + formatter.  Supports the directives HTTP-date / cookie
	expiration / log timestamps need: %Y %m %d %H %M %S %y %j %p %a %A
	%b %B %Z %%."

	| structTime fmt |
	(format @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError @env1:___signal___: 'strftime() argument must be str, not '
			@env0:, format @env0:class __name__].
	structTime := struct_time @env0:withAll: {
		(self @env0:dynamicInstVarAt: #_year). (self @env0:dynamicInstVarAt: #_month). (self @env0:dynamicInstVarAt: #_day). (self @env0:dynamicInstVarAt: #_hour). (self @env0:dynamicInstVarAt: #_minute). (self @env0:dynamicInstVarAt: #_second).
		(self ___pyDayOfWeek___).
		(self ___dayOfYear___).
		-1
	}.
	"%f carries sub-second precision that struct_time cannot represent, so
	expand it here (test_more_strftime)."
	fmt := time @env0:___substituteMicroseconds___: format
		_: (self @env0:dynamicInstVarAt: #_microsecond).
	"A NAIVE datetime renders %z / %:z / %Z as empty strings, as CPython
	does before the generic formatter runs -- the `time' module's
	formatter has no tzinfo concept and would otherwise emit a guessed
	'UTC' (test_strftime).  An AWARE one keeps them for the formatter."
	(self @env0:dynamicInstVarAt: #_tzinfo) @env0:isNil ifTrue: [
		fmt := fmt @env0:copyReplaceAll: '%:z' with: ''.
		fmt := fmt @env0:copyReplaceAll: '%z' with: ''.
		fmt := fmt @env0:copyReplaceAll: '%Z' with: ''].
	^ time instance strftime: fmt _: structTime
%

category: 'Grail-Conversion'
method: PyDateTime
__format__: spec
	"datetime.__format__: empty spec -> str(self); else strftime(spec)."

	| tn |
	spec @env0:isNil ifTrue: [^ self __str__].
	(spec @env0:isKindOf: CharacterCollection) ifFalse: [
		tn := spec @env0:class ___pythonBuiltinTypeName___.
		tn @env0:isNil ifTrue: [tn := spec @env0:class @env0:name @env0:asString].
		^ TypeError ___signal___: '__format__() argument must be str, not ' @env0:, tn].
	spec @env0:isEmpty ifTrue: [^ self __str__].
	^ self strftime: spec
%

category: 'Grail-Conversion'
method: PyDateTime
timetuple
	"A real time.struct_time (tm_* named fields, not a bare tuple);
	tm_isdst = -1."

	^ struct_time @env0:withAll: {
		(self @env0:dynamicInstVarAt: #_year).
		(self @env0:dynamicInstVarAt: #_month).
		(self @env0:dynamicInstVarAt: #_day).
		(self @env0:dynamicInstVarAt: #_hour).
		(self @env0:dynamicInstVarAt: #_minute).
		(self @env0:dynamicInstVarAt: #_second).
		(self ___pyDayOfWeek___).
		(self ___dayOfYear___).
		-1 }
%

category: 'Grail-Accessors'
method: PyDateTime
date
	"The date() part as a naive PyDate."

	^ PyDate @env0:___fromFields___:
		(self @env0:dynamicInstVarAt: #_year)
		_: (self @env0:dynamicInstVarAt: #_month)
		_: (self @env0:dynamicInstVarAt: #_day)
%

category: 'Grail-Accessors'
method: PyDateTime
time
	"The time() part as a NAIVE PyTime (tzinfo dropped, per CPython)."

	^ PyTime @env0:___fromFields___:
		(self @env0:dynamicInstVarAt: #_hour)
		_: (self @env0:dynamicInstVarAt: #_minute)
		_: (self @env0:dynamicInstVarAt: #_second)
		_: (self @env0:dynamicInstVarAt: #_microsecond)
		_: nil
%

category: 'Grail-Accessors'
method: PyDateTime
isocalendar
	"(ISO year, ISO week, ISO weekday) — delegates to the date part."

	^ (PyDate @env0:___fromFields___:
		(self @env0:dynamicInstVarAt: #_year)
		_: (self @env0:dynamicInstVarAt: #_month)
		_: (self @env0:dynamicInstVarAt: #_day)) isocalendar
%

category: 'Grail-Accessors'
method: PyDateTime
toordinal
	"Proleptic Gregorian ordinal of the date part (datetime IS-A date in
	CPython; Grail's PyDateTime is a separate class, so delegate)."

	^ self date toordinal
%

category: 'Grail-Accessors'
method: PyDateTime
weekday
	"Monday=0..Sunday=6.  Inherited from date in CPython; delegated here
	because Grail's PyDateTime is not a PyDate subclass (test_weekday)."

	^ self ___pyDayOfWeek___
%

category: 'Grail-Accessors'
method: PyDateTime
isoweekday
	"ISO 8601: Monday=1..Sunday=7."

	^ (self ___pyDayOfWeek___) @env0:+ 1
%

category: 'Grail-Conversion'
method: PyDateTime
ctime
	"C asctime-style, e.g. 'Thu Jan  1 13:14:15 2004' (day space-padded
	to width 2; the real time, unlike date.ctime's fixed 00:00:00)."

	| head dayStr timeStr |
	head := time instance strftime: '%a %b' _: self timetuple.
	dayStr := (self @env0:dynamicInstVarAt: #_day) @env0:printString.
	dayStr @env0:size @env0:< 2 ifTrue: [dayStr := ' ' @env0:, dayStr].
	timeStr := (self ___pad___: (self @env0:dynamicInstVarAt: #_hour) width: 2) @env0:, ':' @env0:,
		(self ___pad___: (self @env0:dynamicInstVarAt: #_minute) width: 2) @env0:, ':' @env0:,
		(self ___pad___: (self @env0:dynamicInstVarAt: #_second) width: 2).
	^ head @env0:, ' ' @env0:, dayStr @env0:, ' ' @env0:, timeStr @env0:, ' ' @env0:,
		(self ___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4)
%

category: 'Grail-Initialization'
classmethod: PyDateTime
combine: aDate _: aTime
	"datetime.combine(date, time) — merge fields; inherit time's tzinfo."

	^ self combine: aDate _: aTime _: (aTime @env0:dynamicInstVarAt: #_tzinfo)
%

category: 'Grail-Initialization'
classmethod: PyDateTime
combine: aDate _: aTime _: tz
	"datetime.combine(date, time, tzinfo) — the explicit-tzinfo form
	(test_combine).  Allocates through `self', so a subclass receiver
	yields a subclass instance, as in CPython."

	| tz2 |
	tz2 := tz == None ifTrue: [nil] ifFalse: [tz].
	^ self @env0:___fromFields___:
		(aDate year) _: (aDate month) _: (aDate day)
		_: (aTime hour) _: (aTime minute) _: (aTime second)
		_: (aTime microsecond) _: tz2
%

category: 'Grail-Initialization'
classmethod: PyDateTime
_combine: positional kw: kwargs
	"combine(date, time, tzinfo=...) — varargs/keyword form."

	| d t tz |
	"CPython requires both date and time; too few args is a catchable
	TypeError, not an out-of-bounds Smalltalk OffsetError (test_combine)."
	(positional @env0:isNil or: [positional @env0:size @env0:< 2]) ifTrue: [
		^ TypeError @env1:___signal___:
			'combine() takes at least 2 arguments'].
	d := positional @env0:at: 1.
	t := positional @env0:at: 2.
	tz := positional @env0:size @env0:>= 3
		ifTrue: [positional @env0:at: 3]
		ifFalse: [t @env0:dynamicInstVarAt: #_tzinfo].
	kwargs @env0:isNil ifFalse: [tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz]].
	^ self combine: d _: t _: tz
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromordinal: ordinal
	"Proleptic Gregorian ordinal -> naive datetime at midnight."

	| d |
	d := PyDate fromordinal: ordinal.
	^ PyDateTime @env0:___fromFields___:
		(d year) _: (d month) _: (d day) _: 0 _: 0 _: 0 _: 0 _: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromisocalendar: year _: week _: day
	"datetime.fromisocalendar(y, w, d) -> naive datetime at midnight
	(inverse of isocalendar(), via the date-part ordinal)."

	^ PyDateTime fromordinal: (PyDate fromisocalendar: year _: week _: day) toordinal
%

category: 'Grail-Initialization'
classmethod: PyDateTime
strptime: dateStr _: fmt
	"datetime.strptime(date_string, format) delegates to the vendored
	_strptime module (CPython's C datetime does the same).  The module is
	cached in sys.modules after first load."

	| path strptimeMod |
	path := importlib ___moduleNameToPath___: '_strptime'.
	strptimeMod := importlib @env0:loadModuleFromPath: path name: '_strptime'.
	^ strptimeMod _strptime_datetime_datetime: self _: dateStr _: fmt
%

! ------- Arithmetic

category: 'Grail-Arithmetic'
method: PyDateTime
__add__: other
	"datetime + timedelta -> datetime.  Round-trip through epoch
	timestamp + microseconds so day/month/year overflow are handled
	by DateTime arithmetic."

	| newTs result |
	(other isKindOf: PyTimedelta) ifFalse: [
		^ TypeError ___signal___: 'unsupported operand for +'
	].
	"Operate on the NAIVE wall-clock fields and carry tzinfo through
	unchanged, as CPython does -- adding a timedelta never re-interprets
	the zone.  Using `timestamp' here instead would subtract utcoffset on
	the way out without adding it back on the way in, so every aware
	datetime drifted by its offset per operation (test_issue23600, which
	previously passed only because that drift cancelled the equal-and-
	opposite DST skew in the old asSeconds-based timestamp)."

	newTs := self ___naiveEpochSeconds___ @env0:+ other total_seconds.
	result := PyDateTime fromtimestamp: newTs _: (self @env0:dynamicInstVarAt: #_tzinfo).
	^ result
%

category: 'Grail-Arithmetic'
method: PyDateTime
__radd__: other
	"timedelta + datetime -> datetime (addition is commutative here)."

	^ self __add__: other
%

category: 'Grail-Arithmetic'
method: PyDateTime
__sub__: other
	"datetime - datetime -> timedelta; datetime - timedelta -> datetime."

	(other isKindOf: PyDateTime) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			((self timestamp @env0:- other timestamp) @env0:* 1000000) @env0:truncated
	].
	(other isKindOf: PyTimedelta) ifTrue: [
		^ self __add__: (other __neg__)
	].
	^ TypeError ___signal___: 'unsupported operand for -'
%

! ------- Equality / ordering

category: 'Grail-Equality'
method: PyDateTime
__eq__: other
	"NotImplemented (not false) for a non-datetime, so ALWAYS_EQ and the
	reflected comparison work; foreign operands never crash."

	(other isKindOf: PyDateTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___compareKey___ @env0:= other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__lt__: other
	(other isKindOf: PyDateTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___compareKey___ @env0:< other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__hash__
	^ self ___compareKey___ @env0:hash
%

category: 'Grail-Private'
method: PyDateTime
___compareKey___
	"Single integer preserving (year, month, day, hour, minute, second,
	microsecond) tuple order — used by every comparison and __hash__.
	(Naive; tzinfo-aware comparison is deferred to a later tier.)  Built
	as an integer rather than an Array because GemStone's `Array with:`
	tops out at 6 arguments and there are 7 fields."

	^ ((((((self @env0:dynamicInstVarAt: #_year) @env0:* 12
		@env0:+ ((self @env0:dynamicInstVarAt: #_month) @env0:- 1)) @env0:* 31
		@env0:+ ((self @env0:dynamicInstVarAt: #_day) @env0:- 1)) @env0:* 24
		@env0:+ (self @env0:dynamicInstVarAt: #_hour)) @env0:* 60
		@env0:+ (self @env0:dynamicInstVarAt: #_minute)) @env0:* 60
		@env0:+ (self @env0:dynamicInstVarAt: #_second)) @env0:* 1000000
		@env0:+ (self @env0:dynamicInstVarAt: #_microsecond)
%

category: 'Grail-Equality'
method: PyDateTime
__le__: other
	(other isKindOf: PyDateTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___compareKey___ @env0:<= other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__gt__: other
	(other isKindOf: PyDateTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___compareKey___ @env0:> other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__ge__: other
	(other isKindOf: PyDateTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___compareKey___ @env0:>= other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__ne__: other
	| eq |
	eq := self __eq__: other.
	(eq @env0:== #'___NotImplemented___') ifTrue: [^ eq].
	^ eq @env0:not
%

category: 'Grail-Pickle'
method: PyDateTime
__reduce__
	"(class, (y, mo, d, h, mi, s, us[, tzinfo]))."

	| tz fields |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	fields := OrderedCollection @env0:new.
	fields @env0:add: (self @env0:dynamicInstVarAt: #_year).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_month).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_day).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_hour).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_minute).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_second).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_microsecond).
	tz @env0:isNil ifFalse: [fields @env0:add: tz].
	^ tuple @env0:withAll: {
		(self @env0:class).
		(tuple @env0:withAll: fields @env0:asArray) }
%

category: 'Grail-Class Attrs'
classmethod: PyDateTime
__module__
	^ 'datetime'
%

category: 'Grail-Introspection'
classmethod: PyDateTime
__qualname__
	^ self @env0:== PyDateTime
		ifTrue: ['datetime']
		ifFalse: [super __qualname__]
%

category: 'Grail-Introspection'
classmethod: PyDateTime
__name__
	^ self @env0:== PyDateTime
		ifTrue: ['datetime']
		ifFalse: [super __name__]
%

category: 'Grail-Class Attrs'
classmethod: PyDateTime
resolution
	^ PyTimedelta @env0:___fromTotalMicros___: 1
%

category: 'Grail-Class Attrs'
classmethod: PyDateTime
min
	^ PyDateTime @env0:___fromFields___: 1 _: 1 _: 1 _: 0 _: 0 _: 0 _: 0 _: nil
%

category: 'Grail-Class Attrs'
classmethod: PyDateTime
max
	^ PyDateTime @env0:___fromFields___: 9999 _: 12 _: 31 _: 23 _: 59 _: 59 _: 999999 _: nil
%

! ------- Replace

category: 'Grail-Public'
method: PyDateTime
_replace: positional kw: kwargs
	"replace(year=..., month=..., ..., tzinfo=...) - return a new
	datetime with the named fields overridden."

	| y mo d h mi s us tz |
	y := (self @env0:dynamicInstVarAt: #_year). mo := (self @env0:dynamicInstVarAt: #_month). d := (self @env0:dynamicInstVarAt: #_day).
	h := (self @env0:dynamicInstVarAt: #_hour). mi := (self @env0:dynamicInstVarAt: #_minute). s := (self @env0:dynamicInstVarAt: #_second). us := (self @env0:dynamicInstVarAt: #_microsecond). tz := (self @env0:dynamicInstVarAt: #_tzinfo).
	kwargs @env0:isNil ifFalse: [
		y := kwargs @env0:at: 'year' ifAbsent: [y].
		mo := kwargs @env0:at: 'month' ifAbsent: [mo].
		d := kwargs @env0:at: 'day' ifAbsent: [d].
		h := kwargs @env0:at: 'hour' ifAbsent: [h].
		mi := kwargs @env0:at: 'minute' ifAbsent: [mi].
		s := kwargs @env0:at: 'second' ifAbsent: [s].
		us := kwargs @env0:at: 'microsecond' ifAbsent: [us].
		tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz].
		tz == None ifTrue: [tz := nil]
	].
	"type(self), not PyDateTime: CPython's replace() preserves the
	subclass (test_subclass_replace, test_subclass_replace_fold).
	___fromFields___ allocates with `self new', so a subclass receiver
	yields a subclass instance."
	^ self @env0:class @env0:___fromFields___: y _: mo _: d _: h _: mi _: s _: us _: tz
%

! ------- Private formatting helpers

category: 'Grail-Private'
method: PyDateTime
___pad___: n width: w
	| s |
	s := n @env0:printString.
	[s @env0:size @env0:< w] @env0:whileTrue: [s := '0' @env0:, s].
	^ s
%

category: 'Grail-Private'
method: PyDateTime
___pyDayOfWeek___
	"Python tm_wday: Monday=0..Sunday=6.  Computed from a plain Date, NOT
	from a GMT DateTime: DateTime>>dayOfWeek answers in LOCAL time, so a
	GMT-midnight instant lands on the PREVIOUS day in any timezone west of
	Greenwich, making every tm_wday/tm_yday one too low (test_timetuple,
	test_more_timetuple, test_more_strftime).  Date is timezone-free."

	| dow |
	dow := (Date
		@env0:newDay: (self @env0:dynamicInstVarAt: #_day)
		monthNumber: (self @env0:dynamicInstVarAt: #_month)
		year: (self @env0:dynamicInstVarAt: #_year)) @env0:dayOfWeek.
	^ dow @env0:= 1 ifTrue: [6] ifFalse: [dow @env0:- 2]
%

category: 'Grail-Private'
method: PyDateTime
___dayOfYear___
	"Plain Date, not a GMT DateTime -- see ___pyDayOfWeek___ for why."

	^ (Date
		@env0:newDay: (self @env0:dynamicInstVarAt: #_day)
		monthNumber: (self @env0:dynamicInstVarAt: #_month)
		year: (self @env0:dynamicInstVarAt: #_year)) @env0:dayOfYear
%

set compile_env: 0

! ===============================================================================
! PyDate - Python `datetime.date`.  Naive year/month/day with no time
! component.  Backed by GemStone's Date for weekday / ordinal arithmetic.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'PyDate'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyDate category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyDate removeAllMethods: 0.
PyDate removeAllMethods: 1.
PyDate class removeAllMethods: 0.
PyDate class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: PyDate
___pythonValueAttrs___
	^ IdentitySet new
		add: #year;
		add: #month;
		add: #day;
		yourself
%

category: 'Grail-Private'
classmethod: PyDate
___fromFields___: y _: m _: d
	| inst |
	inst := self new.
	inst _year: y _month: m _day: d.
	^ inst
%

category: 'Grail-Hash'
method: PyDate
= other
	"Smalltalk value-equality + hash so equal dates collapse as PyDict/set
	keys (they bucket non-PythonInstance keys by Smalltalk hash and match
	by Smalltalk =, which default to identity)."

	^ (other isKindOf: PyDate)
		and: [(self @env1:toordinal) = (other @env1:toordinal)]
%

category: 'Grail-Hash'
method: PyDate
hash
	^ (self @env1:toordinal) hash
%

category: 'Grail-Private'
method: PyDate
_year: y _month: m _day: d
	"Shared by every construction path (direct call, subclass __new__,
	fromordinal/fromtimestamp/replace/fromisocalendar...) so the field
	validation CPython's _check_date_fields does applies uniformly.
	Ported error messages/ranges verbatim from _pydatetime.py."

	| dim |
	(y @env0:< 1 or: [y @env0:> 9999]) ifTrue: [
		^ ValueError @env1:___signal___:
			'year must be in 1..9999, not ' @env0:, y @env0:printString].
	(m @env0:< 1 or: [m @env0:> 12]) ifTrue: [
		^ ValueError @env1:___signal___:
			'month must be in 1..12, not ' @env0:, m @env0:printString].
	dim := (Date @env0:newDay: 1 monthNumber: m year: y) @env0:daysInMonth.
	(d @env0:< 1 or: [d @env0:> dim]) ifTrue: [
		^ ValueError @env1:___signal___:
			'day ' @env0:, d @env0:printString
				@env0:, ' must be in range 1..' @env0:, dim @env0:printString
				@env0:, ' for month ' @env0:, m @env0:printString
				@env0:, ' in year ' @env0:, y @env0:printString].
	self dynamicInstVarAt: #_year put: y.
	self dynamicInstVarAt: #_month put: m.
	self dynamicInstVarAt: #_day put: d.
	^ self
%

set compile_env: 1

! ------- Constructors

category: 'Grail-Callable'
classmethod: PyDate
value: positional value: kwargs
	"date(year, month, day) — three positionals required.

	A lone 4-byte bytes/str first argument whose month byte is 1..12 is
	CPython's pickle backdoor: date(b'\x07\xdf\x0b\x1b') rebuilds
	2015-11-27 without re-validating each field.  An ill-formed byte
	string deliberately does NOT take that path; it falls through to
	normal construction, where a non-integer year is a catchable
	TypeError instead of the raw Smalltalk indexing error this used to
	raise (test_backdoor_resistance)."

	| y m d |
	y := positional @env0:at: 1 ifAbsent: [nil].
	m := positional @env0:at: 2 ifAbsent: [nil].
	d := positional @env0:at: 3 ifAbsent: [nil].
	kwargs @env0:isNil ifFalse: [
		y := kwargs @env0:at: 'year' ifAbsent: [y].
		m := kwargs @env0:at: 'month' ifAbsent: [m].
		d := kwargs @env0:at: 'day' ifAbsent: [d]].
	(m @env0:isNil and: [PyDate ___isPickleState___: y width: 4 monthAt: 3 mask: false])
		ifTrue: [^ self ___fromDateState___: y].
	PyDate ___requireIntegers___: { y. m. d }.
	^ self @env0:___fromFields___: y _: m _: d
%

category: 'Grail-Pickle'
classmethod: PyDate
___isPickleState___: obj width: n monthAt: i mask: maskFold
	"True when obj is a bytes/str of exactly n items whose month byte is a
	plausible 1..12 -- CPython's test for the constructor pickle backdoor.
	time/datetime steal the high bit of that byte for `fold', so they mask
	it off first; date has no fold and checks the raw value."

	| b |
	((obj @env0:isKindOf: ByteArray)
		@env0:or: [obj @env0:isKindOf: CharacterCollection]) ifFalse: [^ false].
	obj @env0:size @env0:= n ifFalse: [^ false].
	b := PyDate ___byteValueOf___: obj at: i.
	maskFold ifTrue: [b := b @env0:bitAnd: 127].
	^ b @env0:between: 1 and: 12
%

category: 'Grail-Pickle'
classmethod: PyDate
___byteValueOf___: obj at: i
	"The i-th item of a pickle state as an integer, whether the state
	arrived as bytes (SmallIntegers) or str (Characters)."

	| e |
	e := obj @env0:at: i.
	^ (e @env0:isKindOf: Character) ifTrue: [e @env0:asInteger] ifFalse: [e]
%

category: 'Grail-Pickle'
classmethod: PyDate
___requireIntegers___: fields
	"CPython's constructors reject a non-integer field with TypeError.
	Grail previously let e.g. a byte string reach the field setters and
	die with an uncatchable Smalltalk error instead."

	fields @env0:do: [:f |
		(f @env0:isKindOf: Integer) ifFalse: [
			^ TypeError @env1:___signal___: 'an integer is required']].
	^ nil
%

category: 'Grail-Pickle'
classmethod: PyDate
___fromDateState___: s
	"Rebuild from the 4-byte pickle state (yhi, ylo, month, day).  A
	classmethod: the constructors that reach it are class-side, so `self'
	is the class -- and going through it keeps a subclass receiver.

	Fields are stored DIRECTLY rather than through _year:_month:_day:,
	because the whole point of the backdoor is to skip revalidation: the
	byte pair can encode a year outside 1..9999 and CPython accepts it
	(``this shouldn't blow up because of the month byte alone'' --
	test_backdoor_resistance).  Only the month byte is ever checked, by
	___isPickleState___ before we get here."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #_year
		put: ((PyDate ___byteValueOf___: s at: 1) @env0:* 256)
			@env0:+ (PyDate ___byteValueOf___: s at: 2).
	inst @env0:dynamicInstVarAt: #_month put: (PyDate ___byteValueOf___: s at: 3).
	inst @env0:dynamicInstVarAt: #_day put: (PyDate ___byteValueOf___: s at: 4).
	^ inst
%

category: 'Grail-Instantiation'
method: PyDate
___new__: positional kw: kwargs
	"Python-level `date.__new__(cls, year, month, day)`, reached via
	object >> ___allocateInstance___:kw: when a PYTHON SUBCLASS of date
	is instantiated (``class A(date): ...``; ``A(y, m, d)``).  Direct
	construction (``date(y, m, d)``) instead goes through the class-side
	Grail-Callable ``value:value:`` above -- but ClassDefAst synthesizes a
	FRESH ``value:value:`` on every Python-defined subclass (see
	Object.gs's ``value:value:`` comment), which shadows date's own and
	routes through the allocate-then-__init__ protocol instead.  Without
	this method, that protocol falls back to plain ``self new`` with no
	field population, leaving a subclass instance's _year/_month/_day
	nil (test_repr_subclass, test_format's derived-class checks).  Called
	non-virtually with the actual class as receiver (self), matching a
	real ``def __new__(cls, ...)`` -- mirrors ___fromFields___:_:_:.

	EXCEPT: a mixed-in Enum (``class E(date, Enum): def __new__(cls, ...):
	return super().__new__(cls, ...)'') reaches this SAME selector via
	super()'s MRO walk (Enum's classmethod of the same name lives
	further down the registered MRO, past date) -- Grail's super()
	picks the nearest class defining the selector by position, unlike
	CPython's EnumType, which installs its own __new__ directly onto
	the mixed-in class so it's found FIRST regardless of mixin order.
	Defer to Enum's guard (test_enum's test_bad_new_super) whenever this
	class is a mid-construction enum member, rather than actually
	allocating a date -- keeps the fix local instead of touching Enum's
	class-creation machinery."

	| y m d inst |
	(Enum ___grailBuildingSet @env0:includes: self) ifTrue: [
		^ TypeError @env1:___signal___:
			'do not use `super().__new__; call the appropriate __new__ directly'].
	y := positional @env0:at: 1 ifAbsent: [nil].
	m := positional @env0:at: 2 ifAbsent: [nil].
	d := positional @env0:at: 3 ifAbsent: [nil].
	kwargs @env0:isNil ifFalse: [
		y := kwargs @env0:at: 'year' ifAbsent: [y].
		m := kwargs @env0:at: 'month' ifAbsent: [m].
		d := kwargs @env0:at: 'day' ifAbsent: [d]].
	"Same pickle backdoor as the class-side constructor, so a SUBCLASS of
	date unpickles too (test_backdoor_resistance runs over subclasses)."
	(m @env0:isNil and: [PyDate ___isPickleState___: y width: 4 monthAt: 3 mask: false])
		ifTrue: [^ self ___fromDateState___: y].
	PyDate ___requireIntegers___: { y. m. d }.
	inst := self @env0:new.
	inst @env0:_year: y _month: m _day: d.
	^ inst
%

category: 'Grail-Initialization'
classmethod: PyDate
today
	"Local-time date of today."

	| d |
	d := Date @env0:today.
	^ self @env0:___fromFields___:
		d @env0:year _: d @env0:monthIndex _: d @env0:dayOfMonth
%

category: 'Grail-Initialization'
classmethod: PyDate
strptime: dateStr _: fmt
	"date.strptime(date_string, format) (CPython 3.14+) — delegates to the
	vendored _strptime, exactly as PyDateTime>>strptime:_: does
	(test_strptime, test_strptime_single_digit, test_strptime_leap_year)."

	| path strptimeMod |
	path := importlib ___moduleNameToPath___: '_strptime'.
	strptimeMod := importlib @env0:loadModuleFromPath: path name: '_strptime'.
	^ strptimeMod _strptime_datetime_date: self _: dateStr _: fmt
%

category: 'Grail-Initialization'
classmethod: PyDate
fromisoformat: s
	"date.fromisoformat('YYYY-MM-DD')."

	| y m d |
	(s @env0:size) @env0:= 10 @env0:ifFalse: [
		ValueError ___signal___: 'Invalid isoformat string: ''' @env0:, s @env0:, ''''].
	y := (s @env0:copyFrom: 1 to: 4) @env0:asNumber.
	m := (s @env0:copyFrom: 6 to: 7) @env0:asNumber.
	d := (s @env0:copyFrom: 9 to: 10) @env0:asNumber.
	^ self @env0:___fromFields___: y _: m _: d
%

category: 'Grail-Initialization'
classmethod: PyDate
fromordinal: ordinal
	"Proleptic Gregorian ordinal: 0001-01-01 is day 1.  Build via
	GemStone Date arithmetic from the 0001-01-01 anchor."

	| epoch result |
	epoch := Date @env0:newDay: 1 monthNumber: 1 year: 1.
	result := epoch @env0:addDays: (ordinal @env0:- 1).
	^ self @env0:___fromFields___:
		result @env0:year
		_: result @env0:monthIndex
		_: result @env0:dayOfMonth
%

category: 'Grail-Initialization'
classmethod: PyDate
fromtimestamp: ts
	"date.fromtimestamp(ts) == datetime.fromtimestamp(ts).date().  Delegate
	to PyDateTime's epoch+addSeconds path (Duration>>fromSeconds: is absent
	in this GemStone, which crashed the old implementation)."

	^ (PyDateTime fromtimestamp: ts) date
%

! ------- Accessors

category: 'Grail-Accessors'
method: PyDate
year
	^ self @env0:dynamicInstVarAt: #_year
%

category: 'Grail-Accessors'
method: PyDate
month
	^ self @env0:dynamicInstVarAt: #_month
%

category: 'Grail-Accessors'
method: PyDate
day
	^ self @env0:dynamicInstVarAt: #_day
%

! ------- ISO / string

category: 'Grail-Conversion'
method: PyDate
isoformat
	"'YYYY-MM-DD' zero-padded."

	^ (self @env0:___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4) @env0:,
		'-' @env0:,
		(self @env0:___pad___: (self @env0:dynamicInstVarAt: #_month) width: 2) @env0:,
		'-' @env0:,
		(self @env0:___pad___: (self @env0:dynamicInstVarAt: #_day) width: 2)
%

category: 'Grail-Conversion'
method: PyDate
__str__
	^ self isoformat
%

category: 'Grail-Conversion'
method: PyDate
__repr__
	"Bare subclass names in the repr (gh-107773): only the real datetime
	module's own ``date'' gets the ``datetime.'' prefix -- a Python
	subclass's synthesized __module__ is its OWN defining module, not
	the literal string 'datetime', so it prints bare (matches CPython's
	_pydatetime._get_class_module; see test_repr_subclass)."

	| prefix |
	prefix := (self @env0:class __module__) @env0:= 'datetime'
		ifTrue: ['datetime.']
		ifFalse: [''].
	^ prefix @env0:, (self @env0:class __qualname__) @env0:, '(' @env0:,
		(self @env0:dynamicInstVarAt: #_year) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_month) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_day) @env0:printString @env0:, ')'
%

! ------- Ordinal / weekday helpers

category: 'Grail-Accessors'
method: PyDate
toordinal
	"Proleptic Gregorian ordinal: 0001-01-01 is day 1.  GemStone's
	Date asDays uses a different epoch (asDays of 0001-01-01 is
	-693960), so anchor the Python ordinal by subtracting the
	GemStone-side asDays for 0001-01-01."

	| epochAsDays |
	epochAsDays := -693960.
	^ (self @env0:___asDate___) @env0:asDays @env0:- epochAsDays @env0:+ 1
%

category: 'Grail-Accessors'
method: PyDate
weekday
	"Python convention: Monday=0..Sunday=6."

	| dow |
	dow := (self @env0:___asDate___) @env0:dayOfWeek.
	^ dow @env0:= 1 ifTrue: [6] ifFalse: [dow @env0:- 2]
%

category: 'Grail-Accessors'
method: PyDate
isoweekday
	"ISO 8601: Monday=1..Sunday=7."

	^ (self weekday) @env0:+ 1
%

category: 'Grail-Conversion'
method: PyDate
timetuple
	"A real time.struct_time (tm_* named fields, not a bare tuple), with
	the time fields zero; tm_isdst = -1."

	^ struct_time @env0:withAll: {
		(self @env0:dynamicInstVarAt: #_year).
		(self @env0:dynamicInstVarAt: #_month).
		(self @env0:dynamicInstVarAt: #_day).
		0. 0. 0.
		(self weekday).
		((self @env0:___asDate___) @env0:dayOfYear).
		-1 }
%

category: 'Grail-Conversion'
method: PyDate
strftime: format
	"Delegate to the time module's formatter with a midnight struct_time.
	%z/%Z/%:z are intercepted first: a date (always naive -- no tzinfo
	concept at all) formats them as empty, matching CPython's real
	datetime.strftime (which special-cases these BEFORE the C library
	call for exactly this naive/aware distinction -- the generic `time`
	module formatter doesn't know about tzinfo and mustn't guess 'UTC')."

	| pre |
	(format @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError @env1:___signal___: 'strftime() argument must be str, not '
			@env0:, format @env0:class __name__].
	pre := format @env0:copyReplaceAll: '%:z' with: ''.
	pre := pre @env0:copyReplaceAll: '%z' with: ''.
	pre := pre @env0:copyReplaceAll: '%Z' with: ''.
	"A date has no sub-second component, but CPython still expands %f --
	to all zeros."
	pre := time @env0:___substituteMicroseconds___: pre _: 0.
	^ time instance strftime: pre _: self timetuple
%

category: 'Grail-Conversion'
method: PyDate
__format__: spec
	"date.__format__: empty spec -> str(self); else strftime(spec)."

	| tn |
	spec @env0:isNil ifTrue: [^ self __str__].
	(spec @env0:isKindOf: CharacterCollection) ifFalse: [
		tn := spec @env0:class ___pythonBuiltinTypeName___.
		tn @env0:isNil ifTrue: [tn := spec @env0:class @env0:name @env0:asString].
		^ TypeError ___signal___: '__format__() argument must be str, not ' @env0:, tn].
	spec @env0:isEmpty ifTrue: [^ self __str__].
	^ self strftime: spec
%

category: 'Grail-Conversion'
method: PyDate
ctime
	"C asctime-style, e.g. 'Thu Jan  1 00:00:00 2004' (day space-padded
	to width 2, time always 00:00:00)."

	| head dayStr |
	head := time instance strftime: '%a %b' _: self timetuple.
	dayStr := (self @env0:dynamicInstVarAt: #_day) @env0:printString.
	dayStr @env0:size @env0:< 2 ifTrue: [dayStr := ' ' @env0:, dayStr].
	^ head @env0:, ' ' @env0:, dayStr @env0:, ' 00:00:00 ' @env0:,
		(self @env0:___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4)
%

category: 'Grail-Private'
classmethod: PyDate
___isoweek1monday___: year
	"Proleptic-ordinal of the Monday starting ISO week 1 of `year`."

	| firstday firstweekday week1monday |
	firstday := (PyDate @env0:___fromFields___: year _: 1 _: 1) toordinal.
	firstweekday := (firstday @env0:+ 6) @env0:\\ 7.
	week1monday := firstday @env0:- firstweekday.
	firstweekday @env0:> 3 ifTrue: [week1monday := week1monday @env0:+ 7].
	^ week1monday
%

category: 'Grail-Accessors'
method: PyDate
isocalendar
	"(ISO year, ISO week 1..53, ISO weekday 1..7)."

	| today year week1monday week day |
	year := self @env0:dynamicInstVarAt: #_year.
	week1monday := PyDate ___isoweek1monday___: year.
	today := self toordinal.
	week := (today @env0:- week1monday) @env0:// 7.
	day := (today @env0:- week1monday) @env0:\\ 7.
	week @env0:< 0 ifTrue: [
		year := year @env0:- 1.
		week1monday := PyDate ___isoweek1monday___: year.
		week := (today @env0:- week1monday) @env0:// 7.
		day := (today @env0:- week1monday) @env0:\\ 7].
	week @env0:>= 52 ifTrue: [
		(today @env0:>= (PyDate ___isoweek1monday___: (year @env0:+ 1))) ifTrue: [
			year := year @env0:+ 1.
			week := 0]].
	^ IsoCalendarDate @env0:withAll: { year. week @env0:+ 1. day @env0:+ 1 }
%

category: 'Grail-Initialization'
classmethod: PyDate
fromisocalendar: year _: week _: day
	"Inverse of isocalendar().  Ported validation verbatim from
	_pydatetime._isoweek_to_gregorian: real CPython gets its TypeErrors
	'for free' from comparing an int bound to a non-int (str/float/None)
	argument; Smalltalk's < / > raise an uncatchable low-level error
	instead for a class mismatch, so check types explicitly first."

	| ord outOfRange firstWeekday isLeap |
	(year @env0:isKindOf: Integer) ifFalse: [
		^ TypeError @env1:___signal___: 'ISO year must be an integer'].
	(week @env0:isKindOf: Integer) ifFalse: [
		^ TypeError @env1:___signal___: 'ISO week must be an integer'].
	(day @env0:isKindOf: Integer) ifFalse: [
		^ TypeError @env1:___signal___: 'ISO weekday must be an integer'].
	(year @env0:< 1 or: [year @env0:> 9999]) ifTrue: [
		^ ValueError @env1:___signal___:
			'year must be in 1..9999, not ' @env0:, year @env0:printString].
	((week @env0:> 0) @env0:and: [week @env0:< 53]) ifFalse: [
		outOfRange := true.
		(week @env0:= 53) ifTrue: [
			firstWeekday := (PyDate @env0:___fromFields___: year _: 1 _: 1) toordinal @env0:\\ 7.
			isLeap := (year @env0:\\ 4 @env0:= 0)
				@env0:and: [(year @env0:\\ 100 @env0:~= 0) @env0:or: [year @env0:\\ 400 @env0:= 0]].
			((firstWeekday @env0:= 4) @env0:or: [(firstWeekday @env0:= 3) @env0:and: [isLeap]])
				ifTrue: [outOfRange := false]].
		outOfRange ifTrue: [
			^ ValueError @env1:___signal___: 'Invalid week: ' @env0:, week @env0:printString]].
	((day @env0:> 0) @env0:and: [day @env0:< 8]) ifFalse: [
		^ ValueError @env1:___signal___:
			'Invalid weekday: ' @env0:, day @env0:printString @env0:, ' (range is [1, 7])'].
	ord := (PyDate ___isoweek1monday___: year)
		@env0:+ (7 @env0:* (week @env0:- 1))
		@env0:+ (day @env0:- 1).
	^ PyDate fromordinal: ord
%

set compile_env: 0

category: 'Grail-Private'
method: PyDate
___pad___: n width: w
	| s |
	s := n printString.
	[s size < w] whileTrue: [s := '0' , s].
	^ s
%

category: 'Grail-Private'
method: PyDate
___asDate___
	"Materialise a GemStone Date for weekday / ordinal arithmetic."

	^ Date
		newDay: (self dynamicInstVarAt: #_day)
		monthNumber: (self dynamicInstVarAt: #_month)
		year: (self dynamicInstVarAt: #_year)
%

set compile_env: 1

! ------- Replace + arithmetic

category: 'Grail-Mutation'
method: PyDate
_replace: positional kw: kwargs
	"date.replace(year=..., month=..., day=...)."

	| y m d |
	y := (self @env0:dynamicInstVarAt: #_year).
	m := (self @env0:dynamicInstVarAt: #_month).
	d := (self @env0:dynamicInstVarAt: #_day).
	kwargs @env0:isNil ifFalse: [
		y := kwargs @env0:at: 'year' ifAbsent: [y].
		m := kwargs @env0:at: 'month' ifAbsent: [m].
		d := kwargs @env0:at: 'day' ifAbsent: [d]].
	"type(self), not PyDate — replace() preserves the subclass
	(test_subclass_replace)."
	^ self @env0:class @env0:___fromFields___: y _: m _: d
%

category: 'Grail-Arithmetic'
method: PyDate
__add__: other
	"date + timedelta → date (days component only).  A result outside
	[MINYEAR, MAXYEAR] is an OverflowError (CPython), not the ValueError
	fromordinal/field construction raises for an out-of-range year --
	catch and re-signal (test_overflow: date.min - timedelta.resolution)."

	| days newOrdinal |
	(other isKindOf: PyTimedelta) ifFalse: [
		TypeError ___signal___: 'unsupported operand type(s) for +: ''date'' and non-timedelta'].
	days := other days.
	newOrdinal := (self toordinal) @env0:+ days.
	^ [PyDate fromordinal: newOrdinal]
		@env0:on: ValueError
		do: [:ex | OverflowError @env1:___signal___: 'date value out of range']
%

category: 'Grail-Arithmetic'
method: PyDate
__radd__: other
	"timedelta + date -> date (addition is commutative here)."

	^ self __add__: other
%

category: 'Grail-Arithmetic'
method: PyDate
__sub__: other
	"date - timedelta → date; date - date → timedelta."

	(other isKindOf: PyTimedelta) ifTrue: [
		| neg |
		neg := other __neg__.
		^ self __add__: neg].
	(other isKindOf: PyDate) ifTrue: [
		| diff |
		diff := (self toordinal) @env0:- (other toordinal).
		^ PyTimedelta @env0:___fromTotalMicros___:
			diff @env0:* 86400 @env0:* 1000000].
	TypeError ___signal___: 'unsupported operand type(s) for -: ''date'''
%

! ------- Equality / hashing

category: 'Grail-Equality'
method: PyDate
__eq__: other
	"NotImplemented (not false) for a non-date, so ALWAYS_EQ and the
	reflected comparison work; foreign operands never crash."

	(other isKindOf: PyDate) ifFalse: [^ #'___NotImplemented___'].
	^ (self toordinal) @env0:= (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__lt__: other
	(other isKindOf: PyDate) ifFalse: [^ #'___NotImplemented___'].
	^ (self toordinal) @env0:< (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__le__: other
	(other isKindOf: PyDate) ifFalse: [^ #'___NotImplemented___'].
	^ (self toordinal) @env0:<= (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__gt__: other
	(other isKindOf: PyDate) ifFalse: [^ #'___NotImplemented___'].
	^ (self toordinal) @env0:> (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__ge__: other
	(other isKindOf: PyDate) ifFalse: [^ #'___NotImplemented___'].
	^ (self toordinal) @env0:>= (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__ne__: other
	| eq |
	eq := self __eq__: other.
	(eq @env0:== #'___NotImplemented___') ifTrue: [^ eq].
	^ eq @env0:not
%

category: 'Grail-Equality'
method: PyDate
__hash__
	^ self toordinal
%

category: 'Grail-Pickle'
method: PyDate
__reduce__
	"(class, (year, month, day)) — pickle reconstructs via date(y, m, d)."

	^ tuple @env0:withAll: {
		(self @env0:class).
		(tuple @env0:withAll: {
			(self @env0:dynamicInstVarAt: #_year).
			(self @env0:dynamicInstVarAt: #_month).
			(self @env0:dynamicInstVarAt: #_day) }) }
%

category: 'Grail-Class Attrs'
classmethod: PyDate
__module__
	"So pickle's _find_global can locate `datetime.date`."

	^ 'datetime'
%

category: 'Grail-Introspection'
classmethod: PyDate
__qualname__
	"CPython-visible name (datetime.date), so pickle's _find_global
	resolves getattr(datetime, 'date') is PyDate.  Only for PyDate ITSELF
	-- a Python subclass (``class SubclassDate(date):``) must see its OWN
	name here (test_repr_subclass), so fall back to the generic
	object-level __qualname__ (self name asString) for anything else."

	^ self @env0:== PyDate
		ifTrue: ['date']
		ifFalse: [super __qualname__]
%

category: 'Grail-Introspection'
classmethod: PyDate
__name__
	"See __qualname__ above: only PyDate itself is 'date' -- a subclass
	must see its own name."

	^ self @env0:== PyDate
		ifTrue: ['date']
		ifFalse: [super __name__]
%

category: 'Grail-Class Attrs'
classmethod: PyDate
min
	^ PyDate @env0:___fromFields___: 1 _: 1 _: 1
%

category: 'Grail-Class Attrs'
classmethod: PyDate
max
	^ PyDate @env0:___fromFields___: 9999 _: 12 _: 31
%

category: 'Grail-Class Attrs'
classmethod: PyDate
resolution
	"date.resolution == timedelta(days=1)."

	^ PyTimedelta @env0:___fromTotalMicros___: (86400 @env0:* 1000000)
%

set compile_env: 0

! ===============================================================================
! PyTime - Python `datetime.time`.  Naive time-of-day with optional tzinfo.
! Stored as (hour, minute, second, microsecond, tzinfo).
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'PyTime'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyTime category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyTime removeAllMethods: 0.
PyTime removeAllMethods: 1.
PyTime class removeAllMethods: 0.
PyTime class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: PyTime
___pythonValueAttrs___
	^ IdentitySet new
		add: #hour;
		add: #minute;
		add: #second;
		add: #microsecond;
		add: #tzinfo;
		add: #fold;
		yourself
%

category: 'Grail-Private'
classmethod: PyTime
___fromFields___: h _: mi _: s _: us _: tz
	| inst |
	inst := self new.
	inst _hour: h _minute: mi _second: s _microsecond: us _tzinfo: tz.
	^ inst
%

category: 'Grail-Hash'
method: PyTime
= other
	"Smalltalk value-equality + hash so equal times collapse as PyDict/set
	keys (they bucket non-PythonInstance keys by Smalltalk hash and match
	by Smalltalk =, which default to identity).  Naive key; tzinfo-aware
	deferred, matching __eq__."

	^ (other isKindOf: PyTime)
		and: [(self @env1:___cmpKey___) = (other @env1:___cmpKey___)]
%

category: 'Grail-Hash'
method: PyTime
hash
	^ (self @env1:___cmpKey___) hash
%

category: 'Grail-Private'
method: PyTime
_hour: h _minute: mi _second: s _microsecond: us _tzinfo: tz
	self dynamicInstVarAt: #_hour put: h.
	self dynamicInstVarAt: #_minute put: mi.
	self dynamicInstVarAt: #_second put: s.
	self dynamicInstVarAt: #_microsecond put: us.
	self dynamicInstVarAt: #_tzinfo put: tz.
	^ self
%

set compile_env: 1

! ------- Constructors

category: 'Grail-Callable'
classmethod: PyTime
value: positional value: kwargs
	"time(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)."

	| h mi s us tz fold inst |
	h := positional @env0:size @env0:>= 1 ifTrue: [positional @env0:at: 1] ifFalse: [0].
	mi := positional @env0:size @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [0].
	s := positional @env0:size @env0:>= 3 ifTrue: [positional @env0:at: 3] ifFalse: [0].
	us := positional @env0:size @env0:>= 4 ifTrue: [positional @env0:at: 4] ifFalse: [0].
	tz := positional @env0:size @env0:>= 5 ifTrue: [positional @env0:at: 5] ifFalse: [nil].
	fold := 0.
	kwargs @env0:isNil ifFalse: [
		h := kwargs @env0:at: 'hour' ifAbsent: [h].
		mi := kwargs @env0:at: 'minute' ifAbsent: [mi].
		s := kwargs @env0:at: 'second' ifAbsent: [s].
		us := kwargs @env0:at: 'microsecond' ifAbsent: [us].
		tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz].
		fold := kwargs @env0:at: 'fold' ifAbsent: [0]].
	tz == None ifTrue: [tz := nil].
	inst := self @env0:___fromFields___: h _: mi _: s _: us _: tz.
	fold @env0:= 0 ifFalse: [inst @env0:dynamicInstVarAt: #_fold put: fold].
	^ inst
%

category: 'Grail-Instantiation'
method: PyTime
___new__: positional kw: kwargs
	"Python-level `time.__new__(cls, ...)`, reached via
	object >> ___allocateInstance___:kw: when a PYTHON SUBCLASS of time
	is instantiated (``class A(time): ...``).  Without it a subclass
	instance's _hour/_minute/_second/_microsecond stay nil, so repr and
	every formatter print ``nil'' (test_repr_subclass, test_subclass_time,
	test_format).  Mirrors the class-side value:value: assembler, and
	allocates through `self ___fromFields___:' so the subclass is kept.
	See PyDate>>___new__:kw: for the Enum-mixin rationale."

	| h mi s us tz fold inst |
	(Enum ___grailBuildingSet @env0:includes: self) ifTrue: [
		^ TypeError @env1:___signal___:
			'do not use `super().__new__; call the appropriate __new__ directly'].
	h := positional @env0:size @env0:>= 1 ifTrue: [positional @env0:at: 1] ifFalse: [0].
	mi := positional @env0:size @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [0].
	s := positional @env0:size @env0:>= 3 ifTrue: [positional @env0:at: 3] ifFalse: [0].
	us := positional @env0:size @env0:>= 4 ifTrue: [positional @env0:at: 4] ifFalse: [0].
	tz := positional @env0:size @env0:>= 5 ifTrue: [positional @env0:at: 5] ifFalse: [nil].
	fold := 0.
	kwargs @env0:isNil ifFalse: [
		h := kwargs @env0:at: 'hour' ifAbsent: [h].
		mi := kwargs @env0:at: 'minute' ifAbsent: [mi].
		s := kwargs @env0:at: 'second' ifAbsent: [s].
		us := kwargs @env0:at: 'microsecond' ifAbsent: [us].
		tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz].
		fold := kwargs @env0:at: 'fold' ifAbsent: [0]].
	tz == None ifTrue: [tz := nil].
	inst := self @env0:___fromFields___: h _: mi _: s _: us _: tz.
	fold @env0:= 0 ifFalse: [inst @env0:dynamicInstVarAt: #_fold put: fold].
	^ inst
%

category: 'Grail-Initialization'
classmethod: PyTime
strptime: dateStr _: fmt
	"time.strptime(date_string, format) (CPython 3.14+) — delegates to the
	vendored _strptime, exactly as PyDateTime>>strptime:_: does
	(test_strptime, test_strptime_errors, test_strptime_tz)."

	| path strptimeMod |
	path := importlib ___moduleNameToPath___: '_strptime'.
	strptimeMod := importlib @env0:loadModuleFromPath: path name: '_strptime'.
	^ strptimeMod _strptime_datetime_time: self _: dateStr _: fmt
%

category: 'Grail-Initialization'
classmethod: PyTime
fromisoformat: s
	"time.fromisoformat('HH:MM[:SS[.ffffff]][+HH:MM]') — simple subset.
	Accepts 'HH:MM', 'HH:MM:SS', 'HH:MM:SS.ffffff'.  Timezone suffix
	not yet parsed."

	| size h mi sec us frac padded endIdx |
	size := s @env0:size.
	(size @env0:>= 5) @env0:ifFalse: [
		ValueError ___signal___: 'Invalid isoformat string: ''' @env0:, s @env0:, ''''].
	h := (s @env0:copyFrom: 1 to: 2) @env0:asNumber.
	mi := (s @env0:copyFrom: 4 to: 5) @env0:asNumber.
	sec := 0.
	us := 0.
	size @env0:>= 8 @env0:ifTrue: [
		sec := (s @env0:copyFrom: 7 to: 8) @env0:asNumber.
		size @env0:>= 10 @env0:ifTrue: [
			"Microseconds: 1-6 fractional digits after the dot.  Truncate at 6."
			endIdx := size @env0:min: 15.
			frac := s @env0:copyFrom: 10 to: endIdx.
			padded := frac.
			[padded @env0:size @env0:< 6] @env0:whileTrue: [
				padded := padded @env0:, '0'].
			us := padded @env0:asNumber]].
	^ self @env0:___fromFields___: h _: mi _: sec _: us _: nil
%

! ------- Accessors

category: 'Grail-Accessors'
method: PyTime
hour
	^ self @env0:dynamicInstVarAt: #_hour
%

category: 'Grail-Accessors'
method: PyTime
minute
	^ self @env0:dynamicInstVarAt: #_minute
%

category: 'Grail-Accessors'
method: PyTime
second
	^ self @env0:dynamicInstVarAt: #_second
%

category: 'Grail-Accessors'
method: PyTime
microsecond
	^ self @env0:dynamicInstVarAt: #_microsecond
%

category: 'Grail-Accessors'
method: PyTime
tzinfo
	"None when naive; the configured tzinfo otherwise."

	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	^ tz @env0:isNil ifTrue: [None] ifFalse: [tz]
%

category: 'Grail-Accessors'
method: PyTime
fold
	"PEP 495 fold flag.  Grail does not model DST-fold ambiguity, so it
	is 0 unless explicitly set via the constructor's fold= keyword."

	| f |
	f := self @env0:dynamicInstVarAt: #_fold.
	^ f @env0:isNil ifTrue: [0] ifFalse: [f]
%

! ------- ISO / string

category: 'Grail-Conversion'
method: PyTime
isoformat
	"'HH:MM:SS' or 'HH:MM:SS.ffffff' when microseconds are non-zero."

	| us body |
	us := self @env0:dynamicInstVarAt: #_microsecond.
	body := (self @env0:___pad___: (self @env0:dynamicInstVarAt: #_hour) width: 2) @env0:,
		':' @env0:,
		(self @env0:___pad___: (self @env0:dynamicInstVarAt: #_minute) width: 2) @env0:,
		':' @env0:,
		(self @env0:___pad___: (self @env0:dynamicInstVarAt: #_second) width: 2).
	us @env0:= 0 ifTrue: [^ body].
	^ body @env0:, '.' @env0:, (self @env0:___pad___: us width: 6)
%

category: 'Grail-Conversion'
method: PyTime
_isoformat: positional kw: kwargs
	"isoformat(timespec='auto'|'hours'|'minutes'|'seconds'|'milliseconds'
	|'microseconds') — the keyword/positional timespec form."

	| timespec h mi s us body |
	timespec := 'auto'.
	(positional @env0:notNil and: [positional @env0:isEmpty @env0:not])
		ifTrue: [timespec := positional @env0:at: 1].
	kwargs @env0:isNil ifFalse: [timespec := kwargs @env0:at: 'timespec' ifAbsent: [timespec]].
	h := self @env0:dynamicInstVarAt: #_hour.
	mi := self @env0:dynamicInstVarAt: #_minute.
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	timespec @env0:= 'hours' ifTrue: [^ self @env0:___pad___: h width: 2].
	body := (self @env0:___pad___: h width: 2) @env0:, ':' @env0:, (self @env0:___pad___: mi width: 2).
	timespec @env0:= 'minutes' ifTrue: [^ body].
	body := body @env0:, ':' @env0:, (self @env0:___pad___: s width: 2).
	timespec @env0:= 'seconds' ifTrue: [^ body].
	timespec @env0:= 'milliseconds' ifTrue: [
		^ body @env0:, '.' @env0:, (self @env0:___pad___: (us @env0:// 1000) width: 3)].
	timespec @env0:= 'microseconds' ifTrue: [
		^ body @env0:, '.' @env0:, (self @env0:___pad___: us width: 6)].
	"auto"
	us @env0:= 0 ifTrue: [^ body].
	^ body @env0:, '.' @env0:, (self @env0:___pad___: us width: 6)
%

category: 'Grail-Conversion'
method: PyTime
__str__
	^ self isoformat
%

category: 'Grail-Conversion'
method: PyTime
__repr__
	"Bare subclass names in the repr (gh-107773) -- see PyDate>>__repr__
	(test_repr_subclass)."

	| h mi s us body prefix |
	h := self @env0:dynamicInstVarAt: #_hour.
	mi := self @env0:dynamicInstVarAt: #_minute.
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	body := h @env0:printString @env0:, ', ' @env0:, mi @env0:printString.
	(s @env0:~= 0 or: [us @env0:~= 0]) ifTrue: [
		body := body @env0:, ', ' @env0:, s @env0:printString.
		us @env0:~= 0 ifTrue: [body := body @env0:, ', ' @env0:, us @env0:printString]].
	prefix := (self @env0:class __module__) @env0:= 'datetime'
		ifTrue: ['datetime.']
		ifFalse: [''].
	^ prefix @env0:, (self @env0:class __qualname__) @env0:, '(' @env0:, body @env0:, ')'
%

category: 'Grail-Mutation'
method: PyTime
_replace: positional kw: kwargs
	"time.replace(hour=..., minute=..., second=..., microsecond=...,
	tzinfo=...)."

	| h mi s us tz |
	h := self @env0:dynamicInstVarAt: #_hour.
	mi := self @env0:dynamicInstVarAt: #_minute.
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	kwargs @env0:isNil ifFalse: [
		h := kwargs @env0:at: 'hour' ifAbsent: [h].
		mi := kwargs @env0:at: 'minute' ifAbsent: [mi].
		s := kwargs @env0:at: 'second' ifAbsent: [s].
		us := kwargs @env0:at: 'microsecond' ifAbsent: [us].
		tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz].
		tz == None ifTrue: [tz := nil]].
	"type(self), not PyTime — replace() preserves the subclass
	(test_subclass_replace)."
	^ self @env0:class @env0:___fromFields___: h _: mi _: s _: us _: tz
%

category: 'Grail-Conversion'
method: PyTime
strftime: format
	"Delegate to the time module's formatter; date fields are the CPython
	placeholder 1900-01-01."

	| structTime fmt |
	(format @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError @env1:___signal___: 'strftime() argument must be str, not '
			@env0:, format @env0:class __name__].
	structTime := struct_time @env0:withAll: {
		1900. 1. 1.
		(self @env0:dynamicInstVarAt: #_hour).
		(self @env0:dynamicInstVarAt: #_minute).
		(self @env0:dynamicInstVarAt: #_second).
		0. 1. -1 }.
	"%f carries sub-second precision struct_time cannot represent
	(test_strftime)."
	fmt := time @env0:___substituteMicroseconds___: format
		_: (self @env0:dynamicInstVarAt: #_microsecond).
	"A NAIVE time renders %z / %:z / %Z as empty -- see
	PyDateTime>>strftime: (test_strftime)."
	(self @env0:dynamicInstVarAt: #_tzinfo) @env0:isNil ifTrue: [
		fmt := fmt @env0:copyReplaceAll: '%:z' with: ''.
		fmt := fmt @env0:copyReplaceAll: '%z' with: ''.
		fmt := fmt @env0:copyReplaceAll: '%Z' with: ''].
	^ time instance strftime: fmt _: structTime
%

category: 'Grail-Conversion'
method: PyTime
__format__: spec
	| tn |
	spec @env0:isNil ifTrue: [^ self __str__].
	(spec @env0:isKindOf: CharacterCollection) ifFalse: [
		tn := spec @env0:class ___pythonBuiltinTypeName___.
		tn @env0:isNil ifTrue: [tn := spec @env0:class @env0:name @env0:asString].
		^ TypeError ___signal___: '__format__() argument must be str, not ' @env0:, tn].
	spec @env0:isEmpty ifTrue: [^ self __str__].
	^ self strftime: spec
%

category: 'Grail-Accessors'
method: PyTime
utcoffset
	"tzinfo.utcoffset(None), or None when naive."

	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ tz utcoffset: None
%

category: 'Grail-Accessors'
method: PyTime
dst
	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ tz dst: None
%

category: 'Grail-Accessors'
method: PyTime
tzname
	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ tz tzname: None
%

set compile_env: 0

category: 'Grail-Private'
method: PyTime
___pad___: n width: w
	| s |
	s := n printString.
	[s size < w] whileTrue: [s := '0' , s].
	^ s
%

set compile_env: 1

! ------- Equality / hashing

category: 'Grail-Equality'
method: PyTime
__eq__: other
	"NotImplemented (not false) for a non-time, so ALWAYS_EQ and the
	reflected comparison work; foreign operands never crash."

	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ (self @env0:dynamicInstVarAt: #_hour) @env0:= (other @env0:dynamicInstVarAt: #_hour)
		and: [(self @env0:dynamicInstVarAt: #_minute) @env0:= (other @env0:dynamicInstVarAt: #_minute)
		and: [(self @env0:dynamicInstVarAt: #_second) @env0:= (other @env0:dynamicInstVarAt: #_second)
		and: [(self @env0:dynamicInstVarAt: #_microsecond) @env0:= (other @env0:dynamicInstVarAt: #_microsecond)]]]
%

category: 'Grail-Equality'
method: PyTime
__hash__
	^ ((self @env0:dynamicInstVarAt: #_hour) @env0:* 3600
		@env0:+ ((self @env0:dynamicInstVarAt: #_minute) @env0:* 60)
		@env0:+ (self @env0:dynamicInstVarAt: #_second)) @env0:hash
%

category: 'Grail-Private'
method: PyTime
___cmpKey___
	"Microseconds since midnight — a total order for naive times.
	(tzinfo-aware comparison is deferred; CPython converts to UTC.)"

	^ (((self @env0:dynamicInstVarAt: #_hour) @env0:* 60
		@env0:+ (self @env0:dynamicInstVarAt: #_minute)) @env0:* 60
		@env0:+ (self @env0:dynamicInstVarAt: #_second)) @env0:* 1000000
		@env0:+ (self @env0:dynamicInstVarAt: #_microsecond)
%

category: 'Grail-Equality'
method: PyTime
__lt__: other
	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___cmpKey___ @env0:< other ___cmpKey___
%

category: 'Grail-Equality'
method: PyTime
__le__: other
	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___cmpKey___ @env0:<= other ___cmpKey___
%

category: 'Grail-Equality'
method: PyTime
__gt__: other
	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___cmpKey___ @env0:> other ___cmpKey___
%

category: 'Grail-Equality'
method: PyTime
__ge__: other
	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ self ___cmpKey___ @env0:>= other ___cmpKey___
%

category: 'Grail-Equality'
method: PyTime
__ne__: other
	| eq |
	eq := self __eq__: other.
	(eq @env0:== #'___NotImplemented___') ifTrue: [^ eq].
	^ eq @env0:not
%

category: 'Grail-Pickle'
method: PyTime
__reduce__
	"(class, (hour, minute, second, microsecond[, tzinfo]))."

	| tz fields |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	fields := OrderedCollection @env0:new.
	fields @env0:add: (self @env0:dynamicInstVarAt: #_hour).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_minute).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_second).
	fields @env0:add: (self @env0:dynamicInstVarAt: #_microsecond).
	tz @env0:isNil ifFalse: [fields @env0:add: tz].
	^ tuple @env0:withAll: {
		(self @env0:class).
		(tuple @env0:withAll: fields @env0:asArray) }
%

category: 'Grail-Class Attrs'
classmethod: PyTime
__module__
	^ 'datetime'
%

category: 'Grail-Introspection'
classmethod: PyTime
__qualname__
	^ self @env0:== PyTime
		ifTrue: ['time']
		ifFalse: [super __qualname__]
%

category: 'Grail-Introspection'
classmethod: PyTime
__name__
	^ self @env0:== PyTime
		ifTrue: ['time']
		ifFalse: [super __name__]
%

category: 'Grail-Class Attrs'
classmethod: PyTime
min
	^ PyTime @env0:___fromFields___: 0 _: 0 _: 0 _: 0 _: nil
%

category: 'Grail-Class Attrs'
classmethod: PyTime
max
	^ PyTime @env0:___fromFields___: 23 _: 59 _: 59 _: 999999 _: nil
%

category: 'Grail-Class Attrs'
classmethod: PyTime
resolution
	^ PyTimedelta @env0:___fromTotalMicros___: 1
%

set compile_env: 0

! ===============================================================================
! datetime module - exposes the three classes + constants
! ===============================================================================

expectvalue /Class
doit
module subclass: 'datetime'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
datetime comment:
'Python datetime module - date/time arithmetic.

Provides date / time / datetime / timedelta / timezone.  Smalltalk-
backed; arithmetic goes through PyTimedelta normalized integer
microseconds.  tzinfo is the canonical abstract base; concrete
subclasses (PyTimezone) provide ``utcoffset(dt)'' / ``tzname(dt)''
/ ``dst(dt)''.

Common access:
  datetime.datetime.now(datetime.timezone.utc)
  datetime.datetime.fromisoformat(s)
  datetime.date.today()
  datetime.time(12, 30)
  datetime.timedelta(seconds=N)
  datetime.timezone.utc
'
%

expectvalue /Class
doit
datetime category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
datetime removeAllMethods: 0.
datetime removeAllMethods: 1.
datetime class removeAllMethods: 0.
datetime class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: datetime
___pythonValueAttrs___
	"Class references are value-attrs so `datetime.datetime(...)`
	resolves the class then calls __new__ on it."

	^ IdentitySet new
		add: #date;
		add: #time;
		add: #datetime;
		add: #timedelta;
		add: #timezone;
		add: #tzinfo;
		add: #UTC;
		add: #MINYEAR;
		add: #MAXYEAR;
		add: #'__all__';
		yourself
%

set compile_env: 1

category: 'Grail-Accessors'
method: datetime
date
	^ PyDate
%

category: 'Grail-Accessors'
method: datetime
time
	^ PyTime
%

category: 'Grail-Accessors'
method: datetime
datetime
	"Resolves to the PyDateTime class so Python `datetime.datetime`
	hands back a callable class."

	^ PyDateTime
%

category: 'Grail-Accessors'
method: datetime
timedelta
	^ PyTimedelta
%

category: 'Grail-Accessors'
method: datetime
tzinfo
	^ PyTzinfo
%

category: 'Grail-Accessors'
method: datetime
timezone
	^ PyTimezone
%

category: 'Grail-Accessors'
method: datetime
MINYEAR
	^ 1
%

category: 'Grail-Accessors'
method: datetime
MAXYEAR
	^ 9999
%

category: 'Grail-Accessors'
method: datetime
UTC
	"datetime.UTC — alias for timezone.utc (added in CPython 3.11)."

	^ PyTimezone utc
%

category: 'Grail-Introspection'
method: datetime
__all__
	^ tuple @env0:withAll: {
		'date'. 'datetime'. 'time'. 'timedelta'. 'timezone'. 'tzinfo'.
		'MINYEAR'. 'MAXYEAR'. 'UTC' }
%

set compile_env: 0
