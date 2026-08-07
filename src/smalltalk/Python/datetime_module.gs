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
	stream := AppendStream @env0:on: Unicode7 @env0:new.
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
	stream := AppendStream @env0:on: Unicode7 @env0:new.
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

category: 'Grail-Attribute Access'
method: PyTimedelta
__setattr__: name _: value
	"CPython's datetime types are C types with no instance __dict__, so
	``x.abc = 1'' on an EXACT instance is an AttributeError
	(test_extra_attributes).  Python-level subclasses do get attribute
	storage in CPython too, so they fall through to the default.  Grail's
	own field writes never come here -- they use dynamicInstVarAt:put:
	directly."

	(self @env0:class @env0:== PyTimedelta) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.timedelta'' object has no attribute ''' @env0:,
			name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value
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
	"CPython checks the argument type FIRST -- without this, Eastern.fromutc(
	date.today()) died on a raw `#tzinfo not understood by PyDate' Smalltalk
	error instead of a catchable TypeError (test_fromutc)."
	(d @env0:isKindOf: PyDateTime) ifFalse: [
		^ TypeError ___signal___: 'fromutc() requires a datetime argument'].
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

category: 'Grail-Attribute Access'
method: PyTzinfo
__setattr__: name _: value
	"Exact tzinfo/timezone instances have no attribute storage in CPython
	(test_extra_attributes); user subclasses -- which is the whole point of
	tzinfo -- fall through and keep theirs."

	((self @env0:class @env0:== PyTzinfo) @env0:or: [self @env0:class @env0:== PyTimezone]) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.' @env0:, (self @env0:class @env0:== PyTimezone
				ifTrue: ['timezone'] ifFalse: ['tzinfo'])
			@env0:, ''' object has no attribute ''' @env0:, name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value
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
	stream := AppendStream @env0:on: Unicode7 @env0:new.
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
	"Shared by every construction path (direct call, subclass __new__,
	fromtimestamp/replace/fromisocalendar...) -- field validation ported
	from CPython's _check_date_fields / _check_time_fields
	(test_bad_constructor_arguments, test_valuerror_messages).  Mirrors
	PyDate>>_year:_month:_day:'s validation for the date part."

	| dim |
	(y @env0:< 1 or: [y @env0:> 9999]) ifTrue: [
		^ ValueError @env1:___signal___:
			'year must be in 1..9999, not ' @env0:, y @env0:printString].
	(mo @env0:< 1 or: [mo @env0:> 12]) ifTrue: [
		^ ValueError @env1:___signal___:
			'month must be in 1..12, not ' @env0:, mo @env0:printString].
	dim := (Date @env0:newDay: 1 monthNumber: mo year: y) @env0:daysInMonth.
	(d @env0:< 1 or: [d @env0:> dim]) ifTrue: [
		^ ValueError @env1:___signal___:
			'day ' @env0:, d @env0:printString
				@env0:, ' must be in range 1..' @env0:, dim @env0:printString
				@env0:, ' for month ' @env0:, mo @env0:printString
				@env0:, ' in year ' @env0:, y @env0:printString].
	(h @env0:< 0 or: [h @env0:> 23]) ifTrue: [
		^ ValueError @env1:___signal___:
			'hour must be in 0..23, not ' @env0:, h @env0:printString].
	(mi @env0:< 0 or: [mi @env0:> 59]) ifTrue: [
		^ ValueError @env1:___signal___:
			'minute must be in 0..59, not ' @env0:, mi @env0:printString].
	(s @env0:< 0 or: [s @env0:> 59]) ifTrue: [
		^ ValueError @env1:___signal___:
			'second must be in 0..59, not ' @env0:, s @env0:printString].
	(us @env0:< 0 or: [us @env0:> 999999]) ifTrue: [
		^ ValueError @env1:___signal___:
			'microsecond must be in 0..999999, not ' @env0:, us @env0:printString].
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
	"``fold'' is KEYWORD-ONLY: CPython's signature is
	datetime(year, month, day, hour=0, minute=0, second=0, microsecond=0,
	tzinfo=None, *, fold=0), so a 9th POSITIONAL argument is a TypeError,
	not a positional fold.  Grail read only indices 1..8 and silently
	dropped anything beyond, so datetime(2000,1,31,23,59,59,0,None,1)
	quietly built a fold=0 value (test_bad_constructor_arguments)."
	positional @env0:size @env0:> 8 ifTrue: [
		^ TypeError ___signal___: ('datetime() takes at most 8 positional arguments (' @env0:,
			positional @env0:size @env0:printString @env0:, ' given)')].
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
	"Pickle backdoor -- datetime(10_byte_state[, tzinfo]).  CPython accepts
	it whenever the first argument looks like a state string, with the
	SECOND argument doubling as the tzinfo (test_compat_unpickle,
	test_backdoor_resistance)."
	(PyDate ___isPickleState___: year width: 10 monthAt: 3 mask: true) ifTrue: [
		| stateTz |
		stateTz := ((month @env0:isNil) @env0:or: [month @env0:== None])
			ifTrue: [nil] ifFalse: [month].
		^ self ___fromDateTimeState___: year tz: stateTz].
	"CPython rejects a non-integer field with TypeError BEFORE any range
	check.  Without this a float year reached the kernel's Date
	newDay:monthNumber:year: and died with an uncatchable ArgumentTypeError
	(test_check_arg_types), and a byte string died on `#< not understood'
	(test_backdoor_resistance)."
	PyDate ___requireIntegers___: { year. month. day. hour. minute. second. micro }.
	tz == None ifTrue: [tz := nil].
	(tz @env0:isNil or: [tz @env0:isKindOf: PyTzinfo]) ifFalse: [
		^ TypeError ___signal___: 'tzinfo argument must be None or of a tzinfo subclass'].
	(fold @env0:= 0 or: [fold @env0:= 1]) ifFalse: [
		^ ValueError ___signal___:
			'fold must be either 0 or 1, not ' @env0:, fold @env0:printString].
	inst := self @env0:___fromFields___: year _: month _: day _: hour _: minute _: second _: micro _: tz.
	fold @env0:= 0 ifFalse: [inst @env0:dynamicInstVarAt: #_fold put: fold].
	^ inst
%

category: 'Grail-Pickle'
classmethod: PyDateTime
___fromDateTimeState___: s tz: tzArg
	"Rebuild from the 10-byte pickle state (yhi, ylo, month, day, hour,
	minute, second, us-hi, us-mid, us-lo), with `fold' stolen from the
	month byte's high bit.  Stores fields DIRECTLY, skipping
	_year:_month:... -- the point of the backdoor is to bypass
	revalidation, exactly as CPython's __setstate does (the byte pair can
	encode a year outside 1..9999 and CPython still accepts it)."

	| inst m fold |
	(tzArg @env0:isNil or: [tzArg @env0:isKindOf: PyTzinfo]) ifFalse: [
		^ TypeError ___signal___: 'bad tzinfo state arg'].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #_year
		put: ((PyDate ___byteValueOf___: s at: 1) @env0:* 256)
			@env0:+ (PyDate ___byteValueOf___: s at: 2).
	m := PyDate ___byteValueOf___: s at: 3.
	fold := 0.
	m @env0:> 127 ifTrue: [fold := 1. m := m @env0:- 128].
	inst @env0:dynamicInstVarAt: #_month put: m.
	inst @env0:dynamicInstVarAt: #_day put: (PyDate ___byteValueOf___: s at: 4).
	inst @env0:dynamicInstVarAt: #_hour put: (PyDate ___byteValueOf___: s at: 5).
	inst @env0:dynamicInstVarAt: #_minute put: (PyDate ___byteValueOf___: s at: 6).
	inst @env0:dynamicInstVarAt: #_second put: (PyDate ___byteValueOf___: s at: 7).
	inst @env0:dynamicInstVarAt: #_microsecond put:
		((((PyDate ___byteValueOf___: s at: 8) @env0:* 256)
			@env0:+ (PyDate ___byteValueOf___: s at: 9)) @env0:* 256)
			@env0:+ (PyDate ___byteValueOf___: s at: 10).
	inst @env0:dynamicInstVarAt: #_tzinfo put: tzArg.
	fold @env0:= 1 ifTrue: [inst @env0:dynamicInstVarAt: #_fold put: 1].
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
	"now() / now(tz) - current local or zone-tagged datetime.

	NAIVE now() is the HOST-LOCAL wall clock, per CPython.  This used to
	pull GMT components deliberately, ``so the wall clock is unaffected by
	the gem's local timezone'' -- a defensible workaround while the gem's
	timezone was GemStone's PST default no matter which host the gem ran
	on.  ___ensureSessionTimeZone___ now aligns the session zone with the
	OS, so the local accessors are the correct ones and naive now() finally
	tracks the machine's clock.

	An explicit tz keeps the previous GMT-components behaviour (correct for
	timezone.utc, which is how Grail's callers use it; a genuine conversion
	into an arbitrary offset is a separate piece of work)."

	| dt micros tz2 |
	(tz @env0:isNil or: [tz @env0:== None or: [tz @env0:isKindOf: PyTzinfo]]) ifFalse: [
		^ TypeError ___signal___: 'tz argument must be None or of a tzinfo subclass'].
	self ___ensureSessionTimeZone___.
	dt := DateTime @env0:now.
	micros := ((dt @env0:instVarAt: 3) @env0:\\ 1000) @env0:* 1000.
	tz2 := tz == None ifTrue: [nil] ifFalse: [tz].
	^ self
		___fromDateTime___: dt
		micros: micros
		tz: tz2
		gmt: tz2 @env0:notNil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
_now: positional kw: kwargs
	"Varargs entry for now()/now(tz)/now(tz=...).  The generic dynamic
	dispatch (BoundMethod>>value:value:, reached whenever the call isn't
	a compile-time-resolved direct send -- e.g. self.theclass.now(...),
	or ANY call at all that passes tz by keyword) tries the fixed-arity
	now/now: pair first and falls back here when neither arg count nor a
	bare positional call matches; a keyword call always lands here since
	now/now: are positional-only selectors."

	| tz |
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: ('now() takes at most 1 argument (' @env0:,
			positional @env0:size @env0:printString @env0:, ' given)')].
	tz := positional @env0:notEmpty ifTrue: [positional @env0:at: 1] ifFalse: [None].
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'tz' ifTrue: [tz := v]
			ifFalse: [TypeError ___signal___:
				('now() got an unexpected keyword argument ''' @env0:, key @env0:, '''')]]].
	^ self now: tz
%

category: 'Grail-Initialization'
classmethod: PyDateTime
___ensureSessionTimeZone___
	"Align this SESSION's TimeZone with the host OS, once per session.

	GemStone's session TimeZone is its built-in default (PST) regardless of
	the host the gem runs on, so ``local time'' bore no relation to the
	machine's clock -- on an EDT host the gem read UTC-7.  That is why the
	naive constructors here originally used GMT components throughout: UTC
	was at least a coherent answer, where the gem's ``local'' was simply
	wrong.

	The visible symptom was that ``date.today()'' (GemStone Date today,
	session-zone) and ``date.fromtimestamp(time.time())'' (GMT components)
	disagreed by a day whenever the session-zone date and the UTC date
	differed -- for the PST default, exactly when the UTC hour is
	00:00-06:59.  test_datetime's TestDate.test_today failed in that
	7-hour window each day and passed outside it, which is why it looked
	intermittent rather than broken.

	SESSION-LOCAL ON PURPOSE.  TimeZone class >> installOsTimeZone would
	``become:'' the repository-wide default AND commit, letting whichever
	host last ran it redefine local time for every user of the extent.
	``installAsCurrentTimeZone'' only writes session state (slot 17), needs
	no SystemUser and leaves needsCommit false.

	Memoised in SessionTemps: the zone lookup reads /etc/localtime, so it
	should not run on every now() call.  A failure leaves GemStone's
	default in place rather than breaking every date operation."

	| temps |
	temps := SessionTemps @env0:current.
	(temps @env0:at: #'GrailSessionTimeZoneSet' otherwise: false)
		ifTrue: [^ self].
	temps @env0:at: #'GrailSessionTimeZoneSet' put: true.
	[TimeZone @env0:fromOS @env0:installAsCurrentTimeZone]
		@env0:on: Error
		do: [:ex | "keep GemStone's default zone rather than fail the call"].
%

category: 'Grail-Initialization'
classmethod: PyDateTime
___fromDateTime___: dt micros: micros tz: tz2 gmt: useGmt
	"Build a PyDateTime from a GemStone DateTime, reading either the GMT
	or the session-local field accessors.  The two families are otherwise
	identical, so this keeps the local/UTC choice in ONE place instead of
	duplicating the eight-field call at every entry point."

	"self @env1:___allocateInstance___:kw: (not the low-level ___fromFields___:
	bypass) so a subclass's overridden __new__ runs -- an attribute it
	stashes (e.g. `result.extra = 7') must survive now()/utcnow()
	(test_subclass_now)."
	useGmt ifTrue: [
		| built |
		built := self @env1:___allocateInstance___:
			{ (dt @env0:yearGmt).
			  (dt @env0:monthGmt).
			  (dt @env0:dayOfMonthGmt).
			  (dt @env0:hourGmt).
			  (dt @env0:minuteGmt).
			  (dt @env0:secondGmt).
			  micros.
			  tz2 } kw: nil.
		"With a tz, those GMT fields are a UTC READING that still has to be
		mapped INTO the zone -- CPython's _fromtimestamp finishes with
		``result = tz.fromutc(result)''.  Grail only tagged them, so
		now(tz)/fromtimestamp(ts, tz) answered UTC wall-clock wearing the
		target zone's label: correct for timezone.utc (the only zone
		Grail's own callers used) but hours out for any other
		(test_tzinfo_now, test_tzinfo_fromtimestamp).  tz: nil -- utcnow()
		and utcfromtimestamp() -- still wants the plain UTC reading."
		tz2 @env0:isNil ifTrue: [^ built].
		^ tz2 fromutc: built].
	^ self @env1:___allocateInstance___:
		{ (dt @env0:year).
		  (dt @env0:month).
		  (dt @env0:dayOfMonth).
		  (dt @env0:hour).
		  (dt @env0:minute).
		  (dt @env0:second).
		  micros.
		  tz2 } kw: nil
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
	but still common in libraries like itsdangerous).

	No longer ``self now: nil''.  That was harmless only while now() also
	answered UTC; now that naive now() is host-local, utcnow has to read
	the GMT components itself or it would silently start returning local
	time to every caller that asked for UTC."

	| dt micros |
	self ___warnDeprecatedUtc___: 'datetime.utcnow() is deprecated and scheduled for removal in a future version.  Use timezone-aware objects to represent datetimes in UTC: datetime.now(datetime.UTC).'.
	dt := DateTime @env0:now.
	micros := ((dt @env0:instVarAt: 3) @env0:\\ 1000) @env0:* 1000.
	^ self ___fromDateTime___: dt micros: micros tz: nil gmt: true
%

category: 'Grail-Private'
classmethod: PyDateTime
___warnDeprecatedUtc___: aMessage
	"Emit a DeprecationWarning the way CPython's real utcnow()/
	utcfromtimestamp() do (both deprecated since 3.12).  Routes through
	the live `warnings` module instance rather than sending straight to
	the class, matching Float>>___checkDunderFloatResult___:'s pattern --
	looked up dynamically because this env-1 classmethod has no compile-
	time handle on the env-0 `warnings' module object."

	| warningsMod |
	warningsMod := (importlib @env1:modules) @env0:at: #warnings ifAbsent: [nil].
	warningsMod ifNotNil: [warningsMod warn: aMessage _: DeprecationWarning]
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

	| ts tz seen |
	ts := nil.
	tz := nil.
	seen := false.
	positional @env0:isNil ifFalse: [
		positional @env0:size @env0:> 2 ifTrue: [
			^ TypeError ___signal___:
				'fromtimestamp() takes at most 2 arguments (' @env0:,
				positional @env0:size @env0:printString @env0:, ' given)'].
		positional @env0:size @env0:>= 1 ifTrue: [ts := positional @env0:at: 1. seen := true].
		positional @env0:size @env0:>= 2 ifTrue: [tz := positional @env0:at: 2]].
	kwargs @env0:isNil ifFalse: [
		"An unrecognized keyword is a TypeError, not silently ignored
		(test_tzinfo_fromtimestamp passes tinfo=)."
		kwargs @env0:keysDo: [:k |
			| key |
			key := k @env0:asString.
			((key @env0:= 'timestamp') @env0:or: [key @env0:= 'tz']) ifFalse: [
				^ TypeError ___signal___:
					'fromtimestamp() got an unexpected keyword argument ''' @env0:,
					key @env0:, '''']].
		(kwargs @env0:includesKey: 'timestamp') ifTrue: [seen := true].
		ts := kwargs @env0:at: 'timestamp' ifAbsent: [ts].
		tz := kwargs @env0:at: 'tz' ifAbsent: [tz]].
	seen ifFalse: [
		^ TypeError ___signal___:
			'fromtimestamp() missing required argument ''timestamp'' (pos 1)'].
	"A non-tzinfo tz must raise TypeError before any conversion runs."
	(tz @env0:isNil @env0:or: [tz @env0:== None @env0:or: [tz @env0:isKindOf: PyTzinfo]]) ifFalse: [
		^ TypeError ___signal___: 'tzinfo argument must be None or of a tzinfo subclass'].
	^ self fromtimestamp: ts _: tz
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromtimestamp: ts _: tz
	"fromtimestamp(ts[, tz]) - Unix epoch seconds to PyDateTime.

	NAIVE fromtimestamp(ts) converts the epoch instant to HOST-LOCAL wall
	time in CPython -- it is NOT utcfromtimestamp.  Reading GMT components
	is what made ``date.fromtimestamp(time.time())'' disagree with
	``date.today()'' by a day for part of every day.  An explicit tz keeps
	the GMT components (correct for timezone.utc; see now:)."

	| tz2 |
	(tz @env0:isNil or: [tz @env0:== None or: [tz @env0:isKindOf: PyTzinfo]]) ifFalse: [
		^ TypeError ___signal___: 'fromtimestamp() argument 2 must be None or a datetime.tzinfo, not '
			@env0:, tz @env0:class __name__].
	tz2 := tz == None ifTrue: [nil] ifFalse: [tz].
	tz2 @env0:isNil ifTrue: [self ___ensureSessionTimeZone___].
	^ self ___fromTimestamp___: ts tz: tz2 gmt: tz2 @env0:notNil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
___fromTimestamp___: ts tz: tz2 gmt: useGmt
	"Shared epoch-to-PyDateTime worker for fromtimestamp / utcfromtimestamp.
	``ts'' must be a real number (None/str/... -> TypeError, gh-120268); a
	value so extreme the resulting date falls outside year 1..9999 ->
	OverflowError (GemStone's DateTime signals an uncatchable-by-Python
	ArgumentError for this -- resignal, test_insane_fromtimestamp).

	Split out so the two public entry points share this validation and
	epoch arithmetic while differing only in which field family they read;
	they used to be literally the same method, which is why utcfromtimestamp
	silently followed fromtimestamp onto local time."

	| epoch dt secs micros result |
	(ts @env0:isKindOf: Number) ifFalse: [
		^ TypeError @env1:___signal___:
			'an integer is required (got type ' @env0:, ts @env0:class __name__ @env0:, ')'].
	"floor, not truncated: for a negative fractional ts (e.g. -0.5, half a
	second before the epoch), truncating toward zero gives secs=0 and a
	NEGATIVE micros (-500000) -- floor gives secs=-1 and micros=500000,
	matching CPython (1969-12-31 23:59:59.500000, not -0.5s expressed as
	an invalid field combination).  Positive ts is unaffected: floor and
	truncated agree there (test_negative_float_fromtimestamp,
	test_negative_float_utcfromtimestamp, test_microsecond_rounding)."
	secs := ts @env0:floor.
	"Banker's rounding, like CPython's round() -- GemStone's Float>>rounded
	rounds half AWAY from zero, which put fromtimestamp(-1/2**7) (exactly
	7812.5 microseconds) one microsecond off (test_microsecond_rounding).
	Reuses timedelta's own helper, which exists for the same reason."
	micros := PyTimedelta @env0:___roundHalfEven___: ((ts @env0:- secs) @env0:* 1000000).
	micros @env0:>= 1000000 ifTrue: [secs := secs @env0:+ 1. micros := micros @env0:- 1000000].
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
	"GemStone's DateTime accepts a wider year range than Python's
	[1, 9999] without erroring, so a timestamp just beyond datetime.min/
	max (rather than astronomically out of range) sails through
	addSeconds: unharmed -- check the field ___fromDateTime___: is about
	to read directly (not the field-validating constructor path, which
	this fast path deliberately bypasses) and raise the same OverflowError
	CPython does (test_fromtimestamp_limits / test_utcfromtimestamp_limits)."
	((useGmt ifTrue: [dt @env0:yearGmt] ifFalse: [dt @env0:year]) @env0:between: 1 @env0:and: 9999)
		ifFalse: [^ OverflowError @env1:___signal___: 'date value out of range'].
	result := self ___fromDateTime___: dt micros: micros tz: tz2 gmt: useGmt.
	"A LOCAL, naive reading may be the SECOND pass over an ambiguous wall
	clock, which CPython detects with the probe below and records as
	fold=1 -- so fromtimestamp(s) and fromtimestamp(s + 3600) either side
	of a fall-back transition are distinguishable (test_fromtimestamp).
	Only for the naive-local family: a UTC reading has no ambiguity, and
	an explicit tz has already been mapped by fromutc."
	(useGmt @env0:or: [tz2 @env0:notNil]) ifTrue: [^ result].
	^ self ___applyFoldProbe___: result at: secs micros: micros
%

category: 'Grail-Private'
classmethod: PyDateTime
___applyFoldProbe___: result at: secs micros: micros
	"Port of the fold-detection tail of CPython's datetime._fromtimestamp.

	Reads the local clock a day earlier; if the offset changed in between
	(``trans'' negative), re-reads at the shifted instant and, when that
	lands on the SAME wall clock as `result', this timestamp is the second
	pass over a repeated hour -- fold=1.  24h is the largest fold the IANA
	database has ever carried, which is why CPython probes exactly that
	far back."

	| maxFold probe1 trans probe2 |
	maxFold := 24 @env0:* 3600.
	probe1 := self ___localCivilAt___: secs @env0:- maxFold micros: micros.
	trans := ((result ___naiveEpochMicros___) @env0:- (probe1 ___naiveEpochMicros___))
		@env0:- (maxFold @env0:* 1000000).
	trans @env0:< 0 ifTrue: [
		probe2 := self ___localCivilAt___: secs @env0:+ (trans @env0:// 1000000) micros: micros.
		(probe2 ___naiveEpochMicros___) @env0:= (result ___naiveEpochMicros___) ifTrue: [
			result @env0:dynamicInstVarAt: #_fold put: 1]].
	^ result
%

category: 'Grail-Private'
classmethod: PyDateTime
___localCivilAt___: secs micros: micros
	"A naive PyDateTime holding the LOCAL wall clock at epoch-second
	`secs' -- CPython's ``converter(t)[:6]'' probe, built through
	___fromFields___ because it is a throwaway comparison value that must
	not run a subclass's __new__ (and so must not stash attributes or
	raise from user code) while probing."

	| epoch d |
	epoch := DateTime
		@env0:newGmtWithYear: 1970 month: 1 day: 1 hours: 0 minutes: 0 seconds: 0.
	d := epoch @env0:addSeconds: secs.
	^ PyDateTime @env0:___fromFields___:
		(d @env0:year) _: (d @env0:month) _: (d @env0:dayOfMonth)
		_: (d @env0:hour) _: (d @env0:minute) _: (d @env0:second)
		_: micros _: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
utcfromtimestamp: ts
	"utcfromtimestamp(ts) - naive UTC version.

	No longer delegates to ``fromtimestamp: ts _: nil'': that answers
	HOST-LOCAL wall time now, so the two had to stop being the same method
	or every caller asking for UTC would quietly have started getting local
	time.  Shares the epoch arithmetic and error handling via
	___fromTimestamp___:tz:gmt: and simply asks for the GMT field family."

	self ___warnDeprecatedUtc___: 'datetime.utcfromtimestamp() is deprecated and scheduled for removal in a future version.  Use timezone-aware objects to represent datetimes in UTC: datetime.fromtimestamp(timestamp, datetime.UTC).'.
	^ self ___fromTimestamp___: ts tz: nil gmt: true
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromisoformat: s
	"Parse ISO 8601 YYYY-MM-DD[ T]HH:MM:SS[.ffffff][+HH:MM | Z] -- also the
	'basic format' YYYYMMDD (no dashes) date prefix and the ISO week-date
	forms 'YYYY-Www[-D]' / 'YYYYWww[D]' (test_fromisoformat_datetime_examples),
	all of which real CPython accepts equally.  Tolerant of either `T` or
	space as the date/time separator; the week-date-plus-time forms with
	NO separator character at all resolve the date/time split via
	___findIsoDatetimeSeparator___:, which ports CPython's own 'best
	effort' digit-run disambiguation for that spec extension."

	| str year month day hour min sec micro tz dateLen dateFields parsed
	  becameNextDay errorFlag |
	(s @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'fromisoformat: argument must be str'].
	str := s @env0:asString.
	str @env0:size @env0:< 7 ifTrue: [
		^ ValueError ___signal___: 'Invalid isoformat string: ''' @env0:, str @env0:, ''''
	].
	"Date half.  Any failure inside becomes CPython's single blanket
	ValueError naming the input (test_fromisoformat_fails_surrogate wants
	the repr of the ORIGINAL string in the message)."
	dateFields := [
		dateLen := PyDate @env1:___findIsoDatetimeSeparator___: str.
		PyDate @env1:___parseIsoDateFields___: (str @env0:copyFrom: 1 to: dateLen)]
		@env0:on: ValueError
		do: [:ex | ^ ValueError ___signal___:
			'Invalid isoformat string: ''' @env0:, str @env0:, ''''].
	year := dateFields @env0:at: 1.
	month := dateFields @env0:at: 2.
	day := dateFields @env0:at: 3.
	hour := 0. min := 0. sec := 0. micro := 0. tz := nil.
	becameNextDay := false.
	errorFlag := false.
	"Time half -- delegated to the shared, CPython-faithful
	_parse_isoformat_time port on PyTime, which consumes the WHOLE
	remainder or raises.  The old inline parser silently ignored trailing
	garbage ('2009-04-19T03;15:45' parsed as 03:00 and succeeded) and
	understood only '+HH:MM' offsets."
	str @env0:size @env0:> dateLen ifTrue: [
		| tstr |
		tstr := str @env0:copyFrom: dateLen @env0:+ 2 to: str @env0:size.
		parsed := [PyTime @env1:___parseIsoformatTime___: tstr]
			@env0:on: ValueError
			do: [:ex | ^ ValueError ___signal___:
				'Invalid isoformat string: ''' @env0:, str @env0:, ''''].
		hour := parsed @env0:at: 1.
		min := parsed @env0:at: 2.
		sec := parsed @env0:at: 3.
		micro := parsed @env0:at: 4.
		tz := parsed @env0:at: 5.
		becameNextDay := parsed @env0:at: 6.
		errorFlag := parsed @env0:at: 7
	].
	"Raised OUTSIDE the blanket handler above, because CPython reports this
	one with its own dedicated message rather than the generic
	'Invalid isoformat string'."
	errorFlag ifTrue: [
		^ ValueError ___signal___:
			'minute, second, and microsecond must be 0 when hour is 24'].
	"ISO 8601's midnight-of-next-day spelling '24:00:00'.  Validate the
	ORIGINAL date first (an out-of-range day/month must still raise its own
	message, even though its fields are about to be replaced by the wrapped
	date's), then advance one day via ordinal arithmetic
	(test_fromisoformat_fails_datetime_valueerror)."
	becameNextDay ifTrue: [
		| nd |
		nd := PyDate @env1:___allocateInstance___: { year. month. day } kw: nil.
		nd := PyDate @env1:fromordinal: nd @env1:toordinal @env0:+ 1.
		year := nd @env1:year. month := nd @env1:month. day := nd @env1:day
	].
	"___allocateInstance___:kw: (not ___fromFields___:) so a subclass's
	overridden __new__ runs (test_subclass_alternate_constructors)."
	^ self @env1:___allocateInstance___:
		{ year. month. day. hour. min. sec. micro. tz } kw: nil
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
	"tzinfo.utcoffset(self), or None when naive.  Validates the tzinfo
	subclass's return value the way CPython's C implementation does --
	None or a timedelta strictly within (-24h, 24h) -- since a custom
	tzinfo is arbitrary user code (test_tzinfo_classes,
	test_bad_tzinfo_classes)."

	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ self ___checkUtcOffsetResult___: (tz utcoffset: self) for: 'utcoffset'
%

category: 'Grail-Accessors'
method: PyDateTime
dst
	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ self ___checkUtcOffsetResult___: (tz dst: self) for: 'dst'
%

category: 'Grail-Accessors'
method: PyDateTime
tzname
	| tz result |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	result := tz tzname: self.
	(result @env0:== None or: [result @env0:isKindOf: CharacterCollection]) ifFalse: [
		^ TypeError ___signal___: 'tzinfo.tzname() must return None or a string, not '
			@env0:, result @env0:class __name__].
	^ result
%

category: 'Grail-Private'
method: PyDateTime
___checkUtcOffsetResult___: result for: methodName
	"Shared validation for utcoffset()/dst(): must be None or a timedelta
	strictly within (-24h, 24h) -- test_utc_offset_out_of_bounds' exact
	boundary is [-1439, 1439] minutes, i.e. |offset| < 1440 minutes."

	| totalMicros |
	result @env0:== None ifTrue: [^ result].
	(result @env0:isKindOf: PyTimedelta) ifFalse: [
		^ TypeError ___signal___: ('tzinfo.' @env0:, methodName
			@env0:, '() must return None or a timedelta, not ' @env0:, result @env0:class __name__)].
	totalMicros := (result days @env0:* 86400000000)
		@env0:+ (result seconds @env0:* 1000000)
		@env0:+ result microseconds.
	(totalMicros @env0:> -86400000000 @env0:and: [totalMicros @env0:< 86400000000]) ifFalse: [
		^ ValueError ___signal___: ('tzinfo.' @env0:, methodName
			@env0:, '() must return a timedelta strictly between -timedelta(hours=24) and timedelta(hours=24)')].
	^ result
%

category: 'Grail-Conversion'
method: PyDateTime
astimezone: tz
	"Convert to zone `tz', defaulting to the HOST-LOCAL zone.

	Both halves used to assume UTC because Grail had no portable local
	zone: an omitted tz meant timezone.utc, and a NAIVE receiver was read
	as offset 0.  The session zone is aligned with the OS now
	(___ensureSessionTimeZone___), so both follow CPython and go through
	___localTimezone___ -- which reports the offset in force at THIS
	instant, so a value either side of a DST transition converts with the
	right one (test_astimezone, test_astimezone_default_eastern)."

	| mytz myoffset utcWall |
	tz == None ifTrue: [^ self astimezone: self ___localTimezone___].
	tz @env0:isNil ifTrue: [^ self astimezone: self ___localTimezone___].
	(tz @env0:isKindOf: PyTzinfo) ifFalse: [
		^ TypeError ___signal___: 'tz argument must be None or of a tzinfo subclass'].
	mytz := self @env0:dynamicInstVarAt: #_tzinfo.
	(mytz @env0:notNil and: [mytz @env0:== tz]) ifTrue: [^ self].
	mytz @env0:isNil
		ifTrue: [
			mytz := self ___localTimezone___.
			myoffset := mytz utcoffset: self]
		ifFalse: [
			myoffset := self utcoffset.
			"An AWARE receiver whose tzinfo answers None is treated as naive
			from here on, exactly as CPython does -- it re-derives the offset
			from the local zone rather than propagating the None into the
			subtraction below, where it surfaced as `unsupported operand
			for -' (test_astimezone's Bogus case)."
			(myoffset @env0:isNil or: [myoffset @env0:== None]) ifTrue: [
				mytz := self ___localTimezone___.
				myoffset := mytz utcoffset: self]].
	"Shift to UTC wall-clock, retag with the target zone, then let the
	target zone map UTC -> local."
	utcWall := self __sub__: myoffset.
	^ tz fromutc: (PyDateTime @env0:___fromFields___:
		(utcWall year) _: (utcWall month) _: (utcWall day)
		_: (utcWall hour) _: (utcWall minute) _: (utcWall second)
		_: (utcWall microsecond) _: tz)
%

category: 'Grail-Conversion'
method: PyDateTime
_astimezone: positional kw: kwargs
	"Varargs entry for astimezone()/astimezone(tz)/astimezone(tz=...) --
	astimezone/astimezone: are positional-only selectors (see
	_now:kw: above for why the 0-arg and keyword-arg shapes both need
	a varargs handler)."

	| tz |
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: ('astimezone() takes at most 1 argument (' @env0:,
			positional @env0:size @env0:printString @env0:, ' given)')].
	tz := positional @env0:notEmpty ifTrue: [positional @env0:at: 1] ifFalse: [None].
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'tz' ifTrue: [tz := v]
			ifFalse: [TypeError ___signal___:
				('astimezone() got an unexpected keyword argument ''' @env0:, key @env0:, '''')]]].
	^ self astimezone: tz
%

! ------- Conversion

category: 'Grail-Conversion'
method: PyDateTime
timestamp
	"Unix epoch seconds with sub-second precision.

	NAIVE datetimes are read as HOST-LOCAL wall time, as in CPython.  They
	used to be read as UTC -- a deliberate ``deterministic stand-in'' while
	the gem had no trustworthy local zone.  Now that now()/fromtimestamp()
	answer local time, reading them back as UTC would break the round trip
	by the local offset: ``datetime.now().timestamp()'' came out 14400
	seconds adrift of ``time.time()'' on an EDT host, and
	``fromtimestamp(now().timestamp())'' lost four hours.

	AWARE datetimes (tzinfo set) subtract the utcoffset instead -- the
	wall-clock fields are local to THAT offset, and the true UTC instant is
	``local - offset'' (matching CPython's
	``(self - self.utcoffset()).replace(tzinfo=timezone.utc)'' derivation).
	Missing this subtraction double-counts the offset on any round trip
	through __add__/__sub__'s timestamp+fromtimestamp implementation for an
	aware datetime (test_issue23600).  Unchanged."

	| off |
	off := self utcoffset.
	"___mktime___, not ___localNaiveEpochSeconds___: the latter lets
	GemStone resolve an ambiguous local time, so it cannot honour fold
	(both readings of a repeated hour answered the same instant).  Whole
	seconds from the fold-aware search, microseconds added back here,
	exactly as CPython's timestamp() does (test_timestamp)."
	off @env0:== None ifTrue: [
		^ (self ___mktime___) @env0:asFloat
			@env0:+ ((self @env0:dynamicInstVarAt: #_microsecond) @env0:asFloat @env0:/ 1000000.0)].
	^ self ___naiveEpochSeconds___ @env0:- (off total_seconds)
%

category: 'Grail-Private'
method: PyDateTime
___localNaiveEpochSeconds___
	"Epoch seconds for wall-clock fields read as HOST-LOCAL time.

	Rather than computing an offset and applying it by hand -- which has to
	get DST right, including the ambiguous and non-existent wall times
	either side of a transition -- hand the fields to GemStone's LOCAL
	DateTime constructor and read the GMT fields back out.  The session
	TimeZone (aligned with the OS by
	PyDateTime class >> ___ensureSessionTimeZone___) does the DST-aware
	local->UTC mapping, and the civil arithmetic below is then the same
	___naiveEpochSeconds___ uses, just on the GMT fields.

	Falls back to the naive-as-UTC reading if the local constructor rejects
	the fields (year 1 / 9999 edges): answering a slightly-off epoch is
	better than turning ``timestamp()'' into an error where it previously
	returned a number.

	Ensures the session zone ITSELF, rather than relying on a now()/today()
	call having already done it.  ``datetime(2024,1,1).timestamp()'' reaches
	local time without constructing anything from the clock, so on a fresh
	session it would otherwise have been converted under GemStone's PST
	default -- 1704096000 (a PST reading) instead of 1704085200 (EST)."

	| localDt days whole |
	PyDateTime ___ensureSessionTimeZone___.
	localDt := [DateTime
		@env0:newWithYear: (self @env0:dynamicInstVarAt: #_year)
		month: (self @env0:dynamicInstVarAt: #_month)
		day: (self @env0:dynamicInstVarAt: #_day)
		hours: (self @env0:dynamicInstVarAt: #_hour)
		minutes: (self @env0:dynamicInstVarAt: #_minute)
		seconds: (self @env0:dynamicInstVarAt: #_second)]
			@env0:on: Error
			do: [:ex | nil].
	localDt @env0:isNil ifTrue: [^ self ___naiveEpochSeconds___].
	days := time @env0:___epochDaysForYear___: (localDt @env0:yearGmt)
		_month: (localDt @env0:monthGmt)
		_day: (localDt @env0:dayOfMonthGmt).
	whole := (days @env0:* 86400)
		@env0:+ ((localDt @env0:hourGmt) @env0:* 3600)
		@env0:+ ((localDt @env0:minuteGmt) @env0:* 60)
		@env0:+ (localDt @env0:secondGmt).
	^ whole @env0:asFloat
		@env0:+ ((self @env0:dynamicInstVarAt: #_microsecond) @env0:asFloat @env0:/ 1000000.0)
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

category: 'Grail-Private'
method: PyDateTime
___naiveEpochMicros___
	"Like ___naiveEpochSeconds___, but an EXACT integer microsecond count
	instead of a float -- for callers where the result must be exact
	(both-naive datetime subtraction) rather than a genuinely fractional
	API (timestamp(), which stays float, matching CPython's own
	timestamp() precision characteristics at extreme spans)."

	| days whole |
	days := time @env0:___epochDaysForYear___: (self @env0:dynamicInstVarAt: #_year)
		_month: (self @env0:dynamicInstVarAt: #_month)
		_day: (self @env0:dynamicInstVarAt: #_day).
	whole := (days @env0:* 86400)
		@env0:+ ((self @env0:dynamicInstVarAt: #_hour) @env0:* 3600)
		@env0:+ ((self @env0:dynamicInstVarAt: #_minute) @env0:* 60)
		@env0:+ (self @env0:dynamicInstVarAt: #_second).
	^ (whole @env0:* 1000000) @env0:+ (self @env0:dynamicInstVarAt: #_microsecond)
%

category: 'Grail-Private'
classmethod: PyDateTime
___localEpochAt___: u
	"CPython's ``local(u)'' helper from datetime._mktime: the civil fields
	localtime(u) reports, read back as if they were UTC.  local(u) - u is
	therefore the local UTC offset in effect at instant u, which is how
	the whole local-zone family derives an offset without a tm_gmtoff."

	| st |
	PyDateTime ___ensureSessionTimeZone___.
	st := time instance localtime: u.
	^ ((time @env0:___epochDaysForYear___: (st __getitem__: 0)
			_month: (st __getitem__: 1)
			_day: (st __getitem__: 2)) @env0:* 86400)
		@env0:+ ((st __getitem__: 3) @env0:* 3600)
		@env0:+ ((st __getitem__: 4) @env0:* 60)
		@env0:+ (st __getitem__: 5)
%

category: 'Grail-Private'
method: PyDateTime
___mktime___
	"POSIX timestamp for this NAIVE value's wall clock -- a port of
	CPython's datetime._mktime, which resolves the two readings of an
	ambiguous local time with ``fold'' and picks a defined answer for a
	time that does not exist at all.

	___localNaiveEpochSeconds___ hands the fields to GemStone's local
	DateTime constructor instead, which resolves the ambiguity ITSELF and
	so cannot honour fold: both readings of 2014-11-02 01:30 came back as
	the same instant (test_timestamp), and a gap time answered the wrong
	side (test_timestamp_naive).  This searches for the offset the way
	CPython does, so both folds and gaps come out right.

	Works in whole seconds, as CPython's does; the caller adds the
	microseconds back."

	| t maxFold a u1 t1 b u2 t2 fold |
	maxFold := 24 @env0:* 3600.
	fold := self @env0:dynamicInstVarAt: #_fold.
	fold @env0:isNil ifTrue: [fold := 0].
	t := (self ___naiveEpochMicros___) @env0:// 1000000.
	a := (PyDateTime ___localEpochAt___: t) @env0:- t.
	u1 := t @env0:- a.
	t1 := PyDateTime ___localEpochAt___: u1.
	t1 @env0:= t
		ifTrue: [
			"One solution found; the OTHER one (an hour earlier for fold=0,
			later for fold=1) may be the one asked for.  When both probes
			see the same offset there is no transition nearby and u1 is
			unambiguous."
			u2 := u1 @env0:+ (fold @env0:= 0 ifTrue: [maxFold @env0:negated] ifFalse: [maxFold]).
			b := (PyDateTime ___localEpochAt___: u2) @env0:- u2.
			a @env0:= b ifTrue: [^ u1]]
		ifFalse: [b := t1 @env0:- u1].
	u2 := t @env0:- b.
	t2 := PyDateTime ___localEpochAt___: u2.
	t2 @env0:= t ifTrue: [^ u2].
	t1 @env0:= t ifTrue: [^ u1].
	"Neither offset yields this wall clock: the time falls in a GAP.
	CPython answers max(u1,u2) for fold=0 and min(u1,u2) for fold=1."
	^ fold @env0:= 0 ifTrue: [u1 @env0:max: u2] ifFalse: [u1 @env0:min: u2]
%

category: 'Grail-Private'
method: PyDateTime
___localTimezone___
	"CPython's datetime._local_timezone: a fixed-offset timezone standing
	for the host zone as it is AT THIS INSTANT, so a value either side of
	a DST transition converts with the offset actually in force then.

	The name comes from time.tzname, choosing the DST entry when the
	offset at this instant differs from the zone's standard offset --
	Grail's struct_time carries no tm_zone/tm_gmtoff to read it from
	(test_astimezone_default_eastern wants '-0500 EST' and '-0400 EDT')."

	| ts off names stdOff nm myoff |
	"CPython reaches this on a naive receiver, or explicitly via
	``self.replace(tzinfo=None)._local_timezone()''.  Treat an offset of
	None as naive rather than sending ___totalMicros___ to it, so a
	tzinfo whose utcoffset() answers None (test_astimezone's Bogus) is
	handled here too instead of dying with a MessageNotUnderstood."
	myoff := (self @env0:dynamicInstVarAt: #_tzinfo) @env0:isNil
		ifTrue: [nil]
		ifFalse: [self utcoffset].
	(myoff @env0:== None) ifTrue: [myoff := nil].
	ts := myoff @env0:isNil
		ifTrue: [self ___mktime___]
		ifFalse: [((self ___naiveEpochMicros___)
			@env0:- (myoff ___totalMicros___)) @env0:// 1000000].
	off := (PyDateTime ___localEpochAt___: ts) @env0:- ts.
	PyDateTime ___ensureSessionTimeZone___.
	stdOff := TimeZone @env0:current @env0:secondsFromGmt.
	names := time instance @env0:dynamicInstVarAt: #tzname.
	nm := nil.
	names @env0:isNil ifFalse: [
		nm := off @env0:= stdOff
			ifTrue: [names __getitem__: 0]
			ifFalse: [names __getitem__: 1]].
	^ PyTimezone
		__new__: (PyTimedelta @env0:___fromTotalMicros___: off @env0:* 1000000)
		_: nm
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
	"'+HH:MM[:SS[.ffffff]]'-style UTC-offset suffix, or '' when naive or
	utcoffset() is None.  MUST be computed from utcoffset() (an actual
	timedelta), not from tzname() (a free-form display string like 'EST'
	or a FixedOffset's own '+HH:MM' NAME) -- the previous implementation
	tried to slice the offset back out of the tzname string, which only
	coincidentally worked when the name happened to already look like an
	offset, and produced garbage (':00' instead of '+00:00', or nothing
	at all for a non-round-minute offset) otherwise
	(test_isoformat, test_tzinfo_isoformat, test_zones)."

	| offset micros pad stream sign hh mm ss us |
	offset := self utcoffset.
	offset @env0:== None ifTrue: [^ ''].
	micros := (offset days @env0:* 86400000000)
		@env0:+ (offset seconds @env0:* 1000000)
		@env0:+ offset microseconds.
	pad := [:n | | s | s := n @env0:printString. s @env0:size @env0:< 2 ifTrue: ['0' @env0:, s] ifFalse: [s]].
	stream := AppendStream @env0:on: Unicode7 @env0:new.
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

	| prefix s us body tz |
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
	"CPython appends ', tzinfo=<repr>' then ', fold=1' (each only when
	applicable) -- test_zones asserts the exact string
	'datetime.datetime(2002, 3, 19, 7, 47, tzinfo=est)'."
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifFalse: [
		body := body @env0:, ', tzinfo=' @env0:, tz @env1:__repr__].
	(self @env1:fold) @env0:= 1 ifTrue: [body := body @env0:, ', fold=1'].
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
	"%z / %:z / %Z are expanded HERE, before the generic formatter runs --
	the `time' module's formatter has no tzinfo concept (it would emit a
	guessed 'UTC' for %Z and drop %z entirely)."
	fmt := PyDateTime ___expandTzDirectives___: fmt
		offset: self utcoffset
		tzname: self tzname.
	^ time instance strftime: fmt _: structTime
%

category: 'Grail-Private'
classmethod: PyDateTime
___formatOffsetDirective___: offset sep: sep
	"CPython's _format_offset: '' for a None offset, else
	(+|-)HH<sep>MM[<sep>SS[.ffffff]].  Shared by %z (sep '') and %:z
	(sep ':')."

	| micros sign stream pad hh mm ss us |
	offset @env0:== None ifTrue: [^ ''].
	micros := (offset days @env0:* 86400000000)
		@env0:+ (offset seconds @env0:* 1000000)
		@env0:+ offset microseconds.
	sign := micros @env0:< 0 ifTrue: ['-'] ifFalse: ['+'].
	micros := micros @env0:abs.
	pad := [:n | | t | t := n @env0:printString. t @env0:size @env0:< 2 ifTrue: ['0' @env0:, t] ifFalse: [t]].
	hh := micros @env0:// 3600000000.
	mm := (micros @env0:\\ 3600000000) @env0:// 60000000.
	ss := (micros @env0:\\ 60000000) @env0:// 1000000.
	us := micros @env0:\\ 1000000.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: sign.
	stream @env0:nextPutAll: (pad @env0:value: hh).
	stream @env0:nextPutAll: sep.
	stream @env0:nextPutAll: (pad @env0:value: mm).
	(ss @env0:~= 0 or: [us @env0:~= 0]) ifTrue: [
		stream @env0:nextPutAll: sep.
		stream @env0:nextPutAll: (pad @env0:value: ss).
		us @env0:~= 0 ifTrue: [
			| usStr |
			usStr := us @env0:printString.
			[usStr @env0:size @env0:< 6] @env0:whileTrue: [usStr := '0' @env0:, usStr].
			stream @env0:nextPutAll: '.' @env0:, usStr]].
	^ stream @env0:contents
%

category: 'Grail-Private'
classmethod: PyDateTime
___expandTzDirectives___: fmt offset: offset tzname: tzName
	"Port of the %z / %:z / %Z half of CPython's _wrap_strftime, run before
	the `time'-module formatter sees the string.

	A left-to-right SCANNER, not copyReplaceAll:, for two reasons CPython
	shares: '%%z' must stay a literal percent followed by 'z' rather than
	having its tail rewritten (test_zones formats '%%z=%z'), and a tzname
	is arbitrary user text whose own '%' characters must be DOUBLED so the
	downstream formatter emits them literally.

	An empty expansion is correct for a naive value: CPython renders %z and
	%Z as '' when utcoffset()/tzname() answer None."

	| out i n ch |
	out := WriteStream @env0:on: Unicode7 @env0:new.
	i := 1.
	n := fmt @env0:size.
	[i @env0:<= n] @env0:whileTrue: [
		ch := fmt @env0:at: i.
		i := i @env0:+ 1.
		ch @env0:= $%
			ifTrue: [
				i @env0:> n
					ifTrue: [out @env0:nextPut: $%]
					ifFalse: [
						| c2 |
						c2 := fmt @env0:at: i.
						i := i @env0:+ 1.
						c2 @env0:= $z ifTrue: [
							out @env0:nextPutAll:
								(PyDateTime ___formatOffsetDirective___: offset sep: '')
						] ifFalse: [
						c2 @env0:= $Z ifTrue: [
							tzName @env0:== None ifFalse: [
								| escaped |
								"Dispatch replace() at the PYTHON level, as CPython's
								_wrap_strftime does (``Zreplace = s.replace('%', '%%')'').
								A tzname() may answer a str SUBCLASS that overrides
								replace(); the old @env0:copyReplaceAll: was a kernel send
								that silently ignored the override.  CPython then fails in
								''.join() when the override answers a non-str, so a
								non-string result is a TypeError here
								(test_strftime_with_bad_tzname_replace).

								___pyAttrLoad___ + value:value: rather than a direct
								``@env1:replace: old _: new'' send: the override may be
								declared varargs (``def replace(self, *args)''), which
								compiles to a DIFFERENT selector than the fixed-arity
								replace:_:, so a direct send silently reaches str's base
								implementation instead of the subclass's."
								escaped := (tzName @env1:___pyAttrLoad___: #replace)
									@env1:value: { '%'. '%%' } value: nil.
								(escaped @env0:isKindOf: CharacterCollection) ifFalse: [
									^ TypeError @env1:___signal___:
										'strftime(): tzname.replace() must return str, not ' @env0:,
										(escaped @env1:__class__ @env1:__name__) @env0:asString].
								out @env0:nextPutAll: escaped @env0:asString]
						] ifFalse: [
						c2 @env0:= $: ifTrue: [
							"%:z -- anything else after the colon is passed through
							untouched, exactly as CPython does."
							(i @env0:<= n @env0:and: [(fmt @env0:at: i) @env0:= $z])
								ifTrue: [
									i := i @env0:+ 1.
									out @env0:nextPutAll:
										(PyDateTime ___formatOffsetDirective___: offset sep: ':')]
								ifFalse: [out @env0:nextPut: $%. out @env0:nextPut: c2]
						] ifFalse: [
							out @env0:nextPut: $%. out @env0:nextPut: c2]]]]]
			ifFalse: [out @env0:nextPut: ch]].
	^ out @env0:contents
%

category: 'Grail-Conversion'
method: PyDateTime
_strftime: positional kw: kwargs
	"Varargs entry for strftime(fmt) called with the format= keyword --
	gh-85432: real CPython's pure-Python datetime implementation names
	the parameter 'fmt', but the C-accelerated one names it 'format',
	and this varargs entry (reached whenever the call isn't a plain
	single positional arg -- see PyDateTime>>_now:kw: for why) matches
	the latter."

	| n format |
	n := positional @env0:size.
	n @env0:> 1 ifTrue: [
		TypeError ___signal___: ('strftime() takes at most 1 argument (' @env0:,
			n @env0:printString @env0:, ' given)')].
	format := n @env0:= 1 ifTrue: [positional @env0:at: 1] ifFalse: [nil].
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'format' ifTrue: [format := v]
			ifFalse: [TypeError ___signal___:
				('strftime() got an unexpected keyword argument ''' @env0:, key @env0:, '''')]]].
	format @env0:isNil ifTrue: [
		TypeError ___signal___: 'strftime() missing required argument: ''format'''].
	^ self strftime: format
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
	"A real time.struct_time (tm_* named fields, not a bare tuple).
	tm_isdst reflects dst(): -1 when naive or dst() is None, 1 when
	dst() is a nonzero timedelta, 0 when it's exactly zero
	(test_tzinfo_timetuple)."

	| dstVal isdst |
	dstVal := self dst.
	isdst := dstVal @env0:== None
		ifTrue: [-1]
		ifFalse: [
			((dstVal days @env0:= 0) @env0:and: [(dstVal seconds @env0:= 0) @env0:and: [dstVal microseconds @env0:= 0]])
				ifTrue: [0] ifFalse: [1]].
	^ struct_time @env0:withAll: {
		(self @env0:dynamicInstVarAt: #_year).
		(self @env0:dynamicInstVarAt: #_month).
		(self @env0:dynamicInstVarAt: #_day).
		(self @env0:dynamicInstVarAt: #_hour).
		(self @env0:dynamicInstVarAt: #_minute).
		(self @env0:dynamicInstVarAt: #_second).
		(self ___pyDayOfWeek___).
		(self ___dayOfYear___).
		isdst }
%

category: 'Grail-Conversion'
method: PyDateTime
utctimetuple
	"Like timetuple(), but converted to UTC first (aware datetimes) and
	tm_isdst is always 0 -- DST is never in effect for a UTC instant,
	regardless of what dst() says (test_utctimetuple).

	NOTE: gated on the VALUE of utcoffset(), not merely on tzinfo being
	set -- a tzinfo subclass may itself return None from utcoffset()
	(NOFS in test_utctimetuple), which CPython treats the same as
	naive/no-adjustment, not as a TypeError from subtracting None."

	| offset base |
	offset := self utcoffset.
	offset @env0:== None ifTrue: [
		^ struct_time @env0:withAll: {
			(self @env0:dynamicInstVarAt: #_year).
			(self @env0:dynamicInstVarAt: #_month).
			(self @env0:dynamicInstVarAt: #_day).
			(self @env0:dynamicInstVarAt: #_hour).
			(self @env0:dynamicInstVarAt: #_minute).
			(self @env0:dynamicInstVarAt: #_second).
			(self ___pyDayOfWeek___).
			(self ___dayOfYear___).
			0 }].
	base := self __sub__: offset.
	^ struct_time @env0:withAll: {
		(base year). (base month). (base day).
		(base hour). (base minute). (base second).
		(base ___pyDayOfWeek___).
		(base ___dayOfYear___).
		0 }
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
	"The time() part as a NAIVE PyTime (tzinfo dropped, per CPython).

	``fold'' comes along -- CPython's time()/timetz() both pass
	fold=self.fold, so the disambiguation bit is not silently lost when
	the time-of-day is extracted (test_member)."

	| t |
	t := PyTime @env0:___fromFields___:
		(self @env0:dynamicInstVarAt: #_hour)
		_: (self @env0:dynamicInstVarAt: #_minute)
		_: (self @env0:dynamicInstVarAt: #_second)
		_: (self @env0:dynamicInstVarAt: #_microsecond)
		_: nil.
	^ self ___copyFoldTo___: t
%

category: 'Grail-Private'
method: PyDateTime
___copyFoldTo___: aTime
	"Carry self's fold onto an extracted PyTime, storing only a fold of 1
	so a plain value keeps its absent-instVar representation."

	| fold |
	fold := self @env0:dynamicInstVarAt: #_fold.
	(fold @env0:notNil and: [fold @env0:= 1]) ifTrue: [
		aTime @env0:dynamicInstVarAt: #_fold put: 1].
	^ aTime
%

category: 'Grail-Accessors'
method: PyDateTime
timetz
	"The time() part as an AWARE PyTime -- like time(), but keeps tzinfo
	(test_extract, test_tz_aware_arithmetic).  Carries fold, as time()
	does (test_member)."

	| t |
	t := PyTime @env0:___fromFields___:
		(self @env0:dynamicInstVarAt: #_hour)
		_: (self @env0:dynamicInstVarAt: #_minute)
		_: (self @env0:dynamicInstVarAt: #_second)
		_: (self @env0:dynamicInstVarAt: #_microsecond)
		_: (self @env0:dynamicInstVarAt: #_tzinfo).
	^ self ___copyFoldTo___: t
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
	(test_combine).  Allocates via ___allocateInstance___:kw: (not the
	low-level ___fromFields___: bypass), so a subclass receiver yields a
	subclass instance AND routes through a subclass-overridden __new__,
	as in CPython.

	The REAL type checks live HERE, not in the varargs _combine:kw:
	entry: a fixed-arity call (``combine = datetime.combine;
	combine(t, d)'', args reversed) reaches this 3-arg selector DIRECTLY
	via BoundMethod>>value:value: -- which prefers a matching fixed-arity
	selector over the varargs fallback -- bypassing whatever validation
	only _combine:kw: performed.  A bare `aDate year' on a receiver of
	the wrong type previously raised an uncatchable env-1
	MessageNotUnderstood instead of Python's TypeError (test_combine).
	PyDateTime is not a PyDate subclass in Grail (see
	PyDateTime>>weekday's comment), so date accepts either."

	| tz2 |
	((aDate @env0:isKindOf: PyDate) @env0:or: [aDate @env0:isKindOf: PyDateTime]) ifFalse: [
		^ TypeError @env1:___signal___: 'date argument must be a date instance'].
	(aTime @env0:isKindOf: PyTime) ifFalse: [
		^ TypeError @env1:___signal___: 'time argument must be a time instance'].
	(tz @env0:== None @env0:or: [tz @env0:isNil @env0:or: [tz @env0:isKindOf: PyTzinfo]]) ifFalse: [
		^ TypeError @env1:___signal___: 'tzinfo argument must be None or of a tzinfo subclass'].
	tz2 := tz == None ifTrue: [nil] ifFalse: [tz].
	^ self @env1:___allocateInstance___:
		{ (aDate year). (aDate month). (aDate day).
		  (aTime hour). (aTime minute). (aTime second).
		  (aTime microsecond). tz2 } kw: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
_combine: positional kw: kwargs
	"combine(date, time, tzinfo=...) — varargs/keyword form.  date and time
	may each arrive positionally OR by keyword (test_combine calls
	``combine(time=t, date=d)''), so both are resolved the same way tz
	already was: positional slot first, keyword name as fallback."

	| posSize d t tz missing |
	posSize := positional @env0:isNil ifTrue: [0] ifFalse: [positional @env0:size].
	posSize @env0:> 3 ifTrue: [
		^ TypeError @env1:___signal___:
			'combine() takes at most 3 arguments (' @env0:, posSize @env0:printString @env0:, ' given)'].
	missing := Object @env0:new.
	d := posSize @env0:>= 1 ifTrue: [positional @env0:at: 1] ifFalse: [missing].
	kwargs @env0:isNil ifFalse: [d := kwargs @env0:at: 'date' ifAbsent: [d]].
	t := posSize @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [missing].
	kwargs @env0:isNil ifFalse: [t := kwargs @env0:at: 'time' ifAbsent: [t]].
	"CPython requires both date and time; too few args is a catchable
	TypeError, not an out-of-bounds Smalltalk OffsetError (test_combine)."
	(d @env0:== missing @env0:or: [t @env0:== missing]) ifTrue: [
		^ TypeError @env1:___signal___:
			'combine() takes at least 2 arguments'].
	"Real type checks (test_combine: combine(t, d) with args reversed, or
	either argument a non-date/non-time value, must raise TypeError -- a
	bare `aDate year' on a PyTime receiver instead raised an uncatchable
	env-1 MessageNotUnderstood).  PyDateTime is not a PyDate subclass in
	Grail (see PyDateTime>>weekday's comment), so date accepts either."
	((d @env0:isKindOf: PyDate) @env0:or: [d @env0:isKindOf: PyDateTime]) ifFalse: [
		^ TypeError @env1:___signal___: 'date argument must be a date instance'].
	(t @env0:isKindOf: PyTime) ifFalse: [
		^ TypeError @env1:___signal___: 'time argument must be a time instance'].
	tz := posSize @env0:>= 3
		ifTrue: [positional @env0:at: 3]
		ifFalse: [t @env0:dynamicInstVarAt: #_tzinfo].
	kwargs @env0:isNil ifFalse: [tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz]].
	(tz @env0:== None @env0:or: [tz @env0:isNil @env0:or: [tz @env0:isKindOf: PyTzinfo]]) ifFalse: [
		^ TypeError @env1:___signal___: 'tzinfo argument must be None or of a tzinfo subclass'].
	^ self combine: d _: t _: tz
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromordinal: ordinal
	"Proleptic Gregorian ordinal -> naive datetime at midnight."

	"self, not PyDateTime: fromordinal() preserves the subclass, AND (via
	___allocateInstance___:kw: rather than ___fromFields___:) routes
	through a subclass-overridden __new__ (test_subclass_alternate_constructors)."
	| d |
	d := PyDate fromordinal: ordinal.
	^ self @env1:___allocateInstance___:
		{ (d year). (d month). (d day). 0. 0. 0. 0. nil } kw: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromisocalendar: year _: week _: day
	"datetime.fromisocalendar(y, w, d) -> naive datetime at midnight
	(inverse of isocalendar(), via the date-part ordinal).  self, not
	PyDateTime: preserves the subclass."

	^ self @env1:fromordinal: (PyDate fromisocalendar: year _: week _: day) toordinal
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
	"datetime + timedelta -> datetime.  EXACT integer microsecond
	arithmetic -- CPython's C implementation never round-trips through a
	float, and neither should this: combining self's time-of-day with
	other's (days, seconds, microseconds) via a FLOAT total_seconds
	(the previous implementation) loses precision for large spans --
	``datetime.min + (datetime.max - datetime.min)'' landed one day
	past datetime.max instead of exactly on it (test_extreme_timedelta).
	Integer div/mod only, all the way through."

	| dayMicros selfTimeMicros deltaMicros totalMicros dayShift timeMicros
	  newOrdinal newDate h mi s us tz |
	(other isKindOf: PyTimedelta) ifFalse: [
		^ TypeError ___signal___: 'unsupported operand for +'
	].
	"Operate on the NAIVE wall-clock fields and carry tzinfo through
	unchanged, as CPython does -- adding a timedelta never re-interprets
	the zone (test_issue23600: a drift here cancels the equal-and-
	opposite DST skew only by accident, and only for THAT specific
	case)."

	dayMicros := 86400000000. "24 * 3600 * 1e6 -- exact, no float"
	selfTimeMicros := (((self hour @env0:* 3600) @env0:+ (self minute @env0:* 60) @env0:+ self second)
		@env0:* 1000000) @env0:+ self microsecond.
	deltaMicros := ((other days @env0:* dayMicros)
		@env0:+ (other seconds @env0:* 1000000)
		@env0:+ other microseconds).
	totalMicros := selfTimeMicros @env0:+ deltaMicros.
	"// and \\ are floor div/mod in Smalltalk (as in Python), so timeMicros
	lands in [0, dayMicros) even when totalMicros is negative."
	dayShift := totalMicros @env0:// dayMicros.
	timeMicros := totalMicros @env0:\\ dayMicros.
	newOrdinal := self toordinal @env0:+ dayShift.
	newDate := [PyDate fromordinal: newOrdinal]
		@env0:on: ValueError
		do: [:ex | ^ OverflowError @env1:___signal___: 'date value out of range'].
	us := timeMicros @env0:\\ 1000000.
	s := (timeMicros @env0:// 1000000) @env0:\\ 60.
	mi := (timeMicros @env0:// 60000000) @env0:\\ 60.
	h := timeMicros @env0:// 3600000000.
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	"self class, not PyDateTime: CPython builds the result with
	type(self).combine, so DateTimeSubclass + timedelta stays a
	DateTimeSubclass (test_subclass_datetime).

	___allocateInstance___:kw:, not the ___fromFields___: bypass, because
	type(self).combine ultimately calls cls(...) and so runs a subclass's
	overridden __new__ -- an attribute it stashes must survive addition.
	Previously invisible: nothing reached __add__ on a subclass instance
	until astimezone()/fromtimestamp(tz) began converting through
	timezone.fromutc, which IS dt + offset (test_subclass_now,
	test_subclass_alternate_constructors_datetime)."
	^ self @env0:class @env1:___allocateInstance___:
		{ (newDate year). (newDate month). (newDate day).
		  h. mi. s. us. tz } kw: nil
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
		| baseMicros mytz ottz myoff otoff |
		"CPython's datetime.__sub__, in EXACT integer microseconds (never a
		float: a float loses precision over large spans, and the huge-span
		comparisons in test_aware_compare / test_aware_subtract /
		test_tz_independent_comparing came out a microsecond off).

		The naive wall-clock difference is the base in every case, so a span
		straddling a DST change is the exact civil difference -- 30 days, not
		30 days less an hour.  It is also the FINAL answer whenever both
		operands share one tzinfo member, even if that tzinfo reports
		different offsets for the two instants (OperandDependentOffset);
		only genuinely different offsets are applied on top."
		baseMicros := (self ___naiveEpochMicros___) @env0:- (other ___naiveEpochMicros___).
		mytz := self @env0:dynamicInstVarAt: #_tzinfo.
		ottz := other @env0:dynamicInstVarAt: #_tzinfo.
		mytz @env0:== ottz ifTrue: [
			^ PyTimedelta @env0:___fromTotalMicros___: baseMicros].
		myoff := self utcoffset.
		otoff := other utcoffset.
		(myoff @env0:== None @env0:and: [otoff @env0:== None]) ifTrue: [
			^ PyTimedelta @env0:___fromTotalMicros___: baseMicros].
		(myoff @env0:== None @env0:or: [otoff @env0:== None]) ifTrue: [
			^ TypeError ___signal___:
				'can''t subtract offset-naive and offset-aware datetimes'].
		^ PyTimedelta @env0:___fromTotalMicros___:
			baseMicros @env0:+ (otoff ___totalMicros___) @env0:- (myoff ___totalMicros___)
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
	^ (self ___awareCmp___: other allowMixed: true) @env0:= 0
%

category: 'Grail-Equality'
method: PyDateTime
__lt__: other
	(other isKindOf: PyDateTime) ifFalse: [^ #'___NotImplemented___'].
	^ (self ___awareCmp___: other allowMixed: false) @env0:< 0
%

category: 'Grail-Equality'
method: PyDateTime
__hash__
	"Aware values hash by their true INSTANT, so two datetimes naming the
	same moment in different zones land in the same bucket as they compare
	equal (test_zones, test_even_more_compare).  An ambiguous (fold=1)
	value hashes as its fold=0 reading, exactly as CPython does, because
	the two readings must stay interchangeable as dict keys
	(test_hash_aware)."

	| off |
	off := (self @env1:fold) @env0:= 1
		ifTrue: [self ___utcoffsetFoldFlipped___]
		ifFalse: [self utcoffset].
	off @env0:== None ifTrue: [^ self ___compareKey___ @env0:hash].
	^ ((self ___naiveEpochMicros___) @env0:- (off ___totalMicros___)) @env0:hash
%

category: 'Grail-Private'
method: PyDateTime
___awareCmp___: other allowMixed: allowMixed
	"CPython's datetime._cmp, the single ordering/equality primitive.
	Answers a negative/zero/positive Integer, or 2 for the `unequal but
	unordered' naive-vs-aware case that == must report as False while the
	ordering operators must reject with TypeError.

	Order matters and mirrors CPython exactly: identical tzinfo MEMBERS
	compare naively without ever calling utcoffset() (so a tzinfo whose
	offset varies with the instant -- OperandDependentOffset in the tester
	-- still gives the plain civil difference); otherwise both offsets are
	consulted, equal offsets again reduce to a naive compare, and only
	genuinely different offsets compare true instants."

	| mytz ottz myoff otoff |
	mytz := self @env0:dynamicInstVarAt: #_tzinfo.
	ottz := other @env0:dynamicInstVarAt: #_tzinfo.
	mytz @env0:== ottz ifTrue: [
		^ (self ___compareKey___) @env0:- (other ___compareKey___)].
	myoff := self utcoffset.
	otoff := other utcoffset.
	"PEP 495 ambiguity probe, for == only (CPython's allow_mixed): when an
	operand's offset DEPENDS on its fold, the two are neither equal nor
	orderable, so == must answer False rather than silently pick one of the
	two readings (test_mixed_compare_fold, test_mixed_compare_gap)."
	allowMixed ifTrue: [
		((self ___utcoffsetFoldFlipped___) @env0:= myoff) ifFalse: [^ 2].
		((other ___utcoffsetFoldFlipped___) @env0:= otoff) ifFalse: [^ 2]].
	(myoff @env0:== None @env0:and: [otoff @env0:== None]) ifTrue: [
		^ (self ___compareKey___) @env0:- (other ___compareKey___)].
	(myoff @env0:== None @env0:or: [otoff @env0:== None]) ifTrue: [
		allowMixed ifTrue: [^ 2].
		^ TypeError ___signal___: 'can''t compare offset-naive and offset-aware datetimes'].
	^ ((self ___naiveEpochMicros___) @env0:- (myoff ___totalMicros___))
		@env0:- ((other ___naiveEpochMicros___) @env0:- (otoff ___totalMicros___))
%

category: 'Grail-Private'
method: PyDateTime
___utcoffsetFoldFlipped___
	"self.replace(fold=not self.fold).utcoffset() -- how CPython detects
	that an aware value sits in a DST fold or gap, where the offset is
	ambiguous.  Builds the flipped copy by direct field assignment rather
	than replace(), so no validation or subclass __new__ runs for what is
	purely an internal probe."

	| tz copy |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	copy := PyDateTime @env0:___fromFields___:
		(self @env0:dynamicInstVarAt: #_year)
		_: (self @env0:dynamicInstVarAt: #_month)
		_: (self @env0:dynamicInstVarAt: #_day)
		_: (self @env0:dynamicInstVarAt: #_hour)
		_: (self @env0:dynamicInstVarAt: #_minute)
		_: (self @env0:dynamicInstVarAt: #_second)
		_: (self @env0:dynamicInstVarAt: #_microsecond)
		_: tz.
	copy @env0:dynamicInstVarAt: #_fold put: 1 @env0:- (self @env1:fold).
	^ copy utcoffset
%

category: 'Grail-Private'
method: PyDateTime
___compareKey___
	"Single integer preserving (year, month, day, hour, minute, second,
	microsecond) tuple order — the NAIVE half of every comparison and of
	__hash__ (tzinfo is layered on top by ___awareCmp___:allowMixed:).
	Built as an integer rather than an Array because GemStone's `Array
	with:` tops out at 6 arguments and there are 7 fields."

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
	^ (self ___awareCmp___: other allowMixed: false) @env0:<= 0
%

category: 'Grail-Equality'
method: PyDateTime
__gt__: other
	(other isKindOf: PyDateTime) ifFalse: [^ #'___NotImplemented___'].
	^ (self ___awareCmp___: other allowMixed: false) @env0:> 0
%

category: 'Grail-Equality'
method: PyDateTime
__ge__: other
	(other isKindOf: PyDateTime) ifFalse: [^ #'___NotImplemented___'].
	^ (self ___awareCmp___: other allowMixed: false) @env0:>= 0
%

category: 'Grail-Equality'
method: PyDateTime
__ne__: other
	| eq |
	eq := self __eq__: other.
	(eq @env0:== #'___NotImplemented___') ifTrue: [^ eq].
	^ eq @env0:not
%

category: 'Grail-Attribute Access'
method: PyDateTime
__setattr__: name _: value
	"Exact datetime instances have no attribute storage in CPython
	(test_extra_attributes); Python-level subclasses keep theirs."

	(self @env0:class @env0:== PyDateTime) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.datetime'' object has no attribute ''' @env0:,
			name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value
%

category: 'Grail-Pickle'
method: PyDateTime
__reduce__
	"(class, state) at the default protocol, per CPython's
	datetime.__reduce__ (which is __reduce_ex__(2))."

	^ self __reduce_ex__: 2
%

category: 'Grail-Pickle'
method: PyDateTime
__reduce_ex__: protocol
	"CPython's datetime.__reduce_ex__: (class, (10-byte state[, tzinfo])).

	The state is the packed byte string the constructor's pickle backdoor
	already understands, NOT the plain (y, mo, d, ...) field tuple this
	used to emit.  Two reasons: it is the only place `fold' can travel --
	CPython hides it in the high bit of the MONTH byte, and only from
	protocol 4 on, so an older protocol keeps its historical meaning
	(test_pickle_fold) -- and it makes Grail's output byte-identical to
	CPython's, the natural counterpart to reading CPython's pickles in
	test_compat_unpickle.

	A field tuple could not carry fold at all: __reduce__ args are
	positional, and fold is keyword-only."

	| y m fold us state tz |
	y := self @env0:dynamicInstVarAt: #_year.
	m := self @env0:dynamicInstVarAt: #_month.
	fold := self @env0:dynamicInstVarAt: #_fold.
	((fold @env0:notNil and: [fold @env0:= 1]) and: [protocol @env0:> 3])
		ifTrue: [m := m @env0:+ 128].
	us := self @env0:dynamicInstVarAt: #_microsecond.
	state := ByteArray @env0:new: 10.
	state @env0:at: 1 put: (y @env0:// 256);
		@env0:at: 2 put: (y @env0:\\ 256);
		@env0:at: 3 put: m;
		@env0:at: 4 put: (self @env0:dynamicInstVarAt: #_day);
		@env0:at: 5 put: (self @env0:dynamicInstVarAt: #_hour);
		@env0:at: 6 put: (self @env0:dynamicInstVarAt: #_minute);
		@env0:at: 7 put: (self @env0:dynamicInstVarAt: #_second);
		@env0:at: 8 put: (us @env0:// 65536);
		@env0:at: 9 put: ((us @env0:// 256) @env0:\\ 256);
		@env0:at: 10 put: (us @env0:\\ 256).
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	^ tuple @env0:withAll: {
		(self @env0:class).
		(tz @env0:isNil
			ifTrue: [tuple @env0:withAll: { state }]
			ifFalse: [tuple @env0:withAll: { state. tz }]) }
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

	| y mo d h mi s us tz fold |
	y := (self @env0:dynamicInstVarAt: #_year). mo := (self @env0:dynamicInstVarAt: #_month). d := (self @env0:dynamicInstVarAt: #_day).
	h := (self @env0:dynamicInstVarAt: #_hour). mi := (self @env0:dynamicInstVarAt: #_minute). s := (self @env0:dynamicInstVarAt: #_second). us := (self @env0:dynamicInstVarAt: #_microsecond). tz := (self @env0:dynamicInstVarAt: #_tzinfo).
	"fold defaults to self's OWN fold (preserved), not 0 -- CPython's
	replace() keeps fold unless the caller overrides it (test_subclass_replace_fold)."
	fold := self @env0:dynamicInstVarAt: #_fold.
	fold @env0:isNil ifTrue: [fold := 0].
	"replace() takes its fields POSITIONALLY too -- CPython's signature is
	replace(year, month, day, hour, minute, second, microsecond, tzinfo,
	*, fold).  Grail read kwargs only and silently ignored every
	positional, so dt.replace(1, 1, 1, 1, 1, 1, 1, None, 1) answered an
	unchanged copy instead of the TypeError its keyword-only fold demands
	(test_replace)."
	positional @env0:size @env0:> 8 ifTrue: [
		^ TypeError @env1:___signal___:
			'replace() takes at most 8 positional arguments (' @env0:,
			positional @env0:size @env0:printString @env0:, ' given)'].
	positional @env0:size @env0:>= 1 ifTrue: [y := positional @env0:at: 1].
	positional @env0:size @env0:>= 2 ifTrue: [mo := positional @env0:at: 2].
	positional @env0:size @env0:>= 3 ifTrue: [d := positional @env0:at: 3].
	positional @env0:size @env0:>= 4 ifTrue: [h := positional @env0:at: 4].
	positional @env0:size @env0:>= 5 ifTrue: [mi := positional @env0:at: 5].
	positional @env0:size @env0:>= 6 ifTrue: [s := positional @env0:at: 6].
	positional @env0:size @env0:>= 7 ifTrue: [us := positional @env0:at: 7].
	positional @env0:size @env0:>= 8 ifTrue: [
		tz := positional @env0:at: 8.
		tz == None ifTrue: [tz := nil]].
	kwargs @env0:isNil ifFalse: [
		y := kwargs @env0:at: 'year' ifAbsent: [y].
		mo := kwargs @env0:at: 'month' ifAbsent: [mo].
		d := kwargs @env0:at: 'day' ifAbsent: [d].
		h := kwargs @env0:at: 'hour' ifAbsent: [h].
		mi := kwargs @env0:at: 'minute' ifAbsent: [mi].
		s := kwargs @env0:at: 'second' ifAbsent: [s].
		us := kwargs @env0:at: 'microsecond' ifAbsent: [us].
		tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz].
		fold := kwargs @env0:at: 'fold' ifAbsent: [fold].
		tz == None ifTrue: [tz := nil]
	].
	(fold @env0:= 0 @env0:or: [fold @env0:= 1]) ifFalse: [
		^ ValueError @env1:___signal___:
			'fold must be either 0 or 1, not ' @env0:, fold @env0:printString].
	"type(self), not PyDateTime: CPython's replace() preserves the
	subclass (test_subclass_replace, test_subclass_replace_fold), AND
	routes through a subclass-overridden __new__ (see PyDate>>_replace:kw:
	for why ___allocateInstance___:kw: replaces the old ___fromFields___:
	bypass -- a custom __new__'s stashed attribute must survive replace())."
	^ self @env0:class @env1:___allocateInstance___:
		{ y. mo. d. h. mi. s. us. tz } kw: (Dictionary @env0:new @env0:at: 'fold' put: fold; @env0:yourself)
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
	"Local-time date of today.

	``Date today'' reads the SESSION's TimeZone, which GemStone defaults to
	PST regardless of host -- so this was local to the wrong zone.  Aligning
	the session zone with the OS first makes it the real local date, and
	makes it agree with fromtimestamp(time.time()) at every hour."

	| d |
	PyDateTime ___ensureSessionTimeZone___.
	d := Date @env0:today.
	"___allocateInstance___:kw: (not ___fromFields___:) so a subclass's
	overridden __new__ runs (test_subclass_alternate_constructors)."
	^ self @env1:___allocateInstance___:
		{ d @env0:year. d @env0:monthIndex. d @env0:dayOfMonth } kw: nil
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
	"date.fromisoformat('YYYY-MM-DD') -- also the CPython 'basic format'
	'YYYYMMDD' (no dashes, 8 chars) and the ISO week-date forms
	'YYYY-Www[-D]' / 'YYYYWww[D]' (test_fromisoformat_date_examples), all
	of which real CPython accepts equally.  ___allocateInstance___:kw:
	(not ___fromFields___:) so a subclass's overridden __new__ runs
	(test_fromisoformat_subclass)."

	| str fields |
	"A non-str argument is a TypeError, not a ValueError -- previously
	bytes/None went through asString and died on a raw kernel error
	(test_fromisoformat_fails_typeerror)."
	(s @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'fromisoformat: argument must be str'].
	str := s @env0:asString.
	((str @env0:size @env0:= 7) @env0:or: [(str @env0:size @env0:= 8) @env0:or: [str @env0:size @env0:= 10]])
		ifFalse: [^ ValueError ___signal___: 'Invalid isoformat string: ''' @env0:, str @env0:, ''''].
	fields := self @env1:___parseIsoDateFields___: str.
	^ self @env1:___allocateInstance___:
		{ fields @env0:at: 1. fields @env0:at: 2. fields @env0:at: 3 } kw: nil
%

category: 'Grail-Initialization'
classmethod: PyDate
fromordinal: ordinal
	"Proleptic Gregorian ordinal: 0001-01-01 is day 1.  Build via
	GemStone Date arithmetic from the 0001-01-01 anchor."

	| epoch result |
	epoch := Date @env0:newDay: 1 monthNumber: 1 year: 1.
	result := epoch @env0:addDays: (ordinal @env0:- 1).
	^ self @env1:___allocateInstance___:
		{ result @env0:year. result @env0:monthIndex. result @env0:dayOfMonth } kw: nil
%

category: 'Grail-Initialization'
classmethod: PyDate
fromtimestamp: ts
	"date.fromtimestamp(ts) == datetime.fromtimestamp(ts).date().  Delegate
	to PyDateTime's epoch+addSeconds path (Duration>>fromSeconds: is absent
	in this GemStone, which crashed the old implementation) for the field
	arithmetic/validation, but allocate via self (not the plain PyDate
	`.date()' would hand back) so a subclass's overridden __new__ runs
	(test_subclass_alternate_constructors)."

	| dt |
	dt := PyDateTime fromtimestamp: ts.
	^ self @env1:___allocateInstance___: { dt year. dt month. dt day } kw: nil
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
_strftime: positional kw: kwargs
	"Varargs entry for strftime(fmt) called with the format= keyword --
	gh-85432: real CPython's pure-Python datetime implementation names
	the parameter 'fmt', but the C-accelerated one names it 'format',
	and this varargs entry (reached whenever the call isn't a plain
	single positional arg -- see PyDateTime>>_now:kw: for why) matches
	the latter."

	| n format |
	n := positional @env0:size.
	n @env0:> 1 ifTrue: [
		TypeError ___signal___: ('strftime() takes at most 1 argument (' @env0:,
			n @env0:printString @env0:, ' given)')].
	format := n @env0:= 1 ifTrue: [positional @env0:at: 1] ifFalse: [nil].
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'format' ifTrue: [format := v]
			ifFalse: [TypeError ___signal___:
				('strftime() got an unexpected keyword argument ''' @env0:, key @env0:, '''')]]].
	format @env0:isNil ifTrue: [
		TypeError ___signal___: 'strftime() missing required argument: ''format'''].
	^ self strftime: format
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
___parseIsoDateFields___: dateStr
	"Port of CPython's _parse_isoformat_date: extract { year. month. day }
	from an isolated ISO 8601 date token of length 7, 8, or 10 --
	'YYYY-MM-DD', 'YYYYMMDD' ('basic format'), or the ISO week-date forms
	'YYYY-Www[-D]' / 'YYYYWww[D]'.  Week forms delegate the
	(year,week,day) -> (year,month,day) conversion to fromisocalendar:,
	which already ports _isoweek_to_gregorian's validation, so both stay
	in sync (test_fromisoformat_date_examples)."

	| year hasSep pos month day weekno dayno wd digits |
	"Strict ASCII-digit reader.  Every field used to go through asNumber,
	a lenient PREFIX parser: '200a' answered 200, so fromisoformat happily
	accepted '200a-12-04' (test_fromisoformat_fails), while pure garbage
	raised an UNCATCHABLE kernel rtErrBadFormat instead of a Python
	ValueError.  Comparing code points 48..57 (not Character>>isDigit) also
	rejects non-ASCII digits, as CPython does for '٢025-03-09'."
	digits := [:from :count |
		| v c |
		(from @env0:< 1 @env0:or: [from @env0:+ count @env0:- 1 @env0:> dateStr @env0:size]) ifTrue: [
			ValueError ___signal___: 'Invalid isoformat string: ''' @env0:, dateStr @env0:, ''''].
		v := 0.
		from @env0:to: from @env0:+ count @env0:- 1 do: [:i |
			c := (dateStr @env0:at: i) @env0:asInteger.
			(c @env0:>= 48 @env0:and: [c @env0:<= 57]) ifFalse: [
				ValueError ___signal___: 'Invalid isoformat string: ''' @env0:, dateStr @env0:, ''''].
			v := (v @env0:* 10) @env0:+ (c @env0:- 48)].
		v].
	year := digits @env0:value: 1 value: 4.
	hasSep := (dateStr @env0:at: 5) @env0:= $-.
	pos := 5 @env0:+ (hasSep ifTrue: [1] ifFalse: [0]).
	((dateStr @env0:at: pos) @env0:= $W) ifTrue: [
		pos := pos @env0:+ 1.
		weekno := digits @env0:value: pos value: 2.
		pos := pos @env0:+ 2.
		dayno := 1.
		(dateStr @env0:size @env0:>= pos) ifTrue: [
			(((dateStr @env0:at: pos) @env0:= $-) @env0:~= hasSep) ifTrue: [
				ValueError ___signal___: 'Inconsistent use of dash separator'].
			hasSep ifTrue: [pos := pos @env0:+ 1].
			dayno := digits @env0:value: pos value: 1.
		].
		wd := PyDate @env1:fromisocalendar: year _: weekno _: dayno.
		^ { wd @env1:year. wd @env1:month. wd @env1:day }
	].
	month := digits @env0:value: pos value: 2.
	pos := pos @env0:+ 2.
	(((dateStr @env0:at: pos) @env0:= $-) @env0:~= hasSep) ifTrue: [
		ValueError ___signal___: 'Inconsistent use of dash separator'].
	hasSep ifTrue: [pos := pos @env0:+ 1].
	day := digits @env0:value: pos value: 2.
	^ { year. month. day }
%

category: 'Grail-Private'
classmethod: PyDate
___findIsoDatetimeSeparator___: str
	"Port of CPython's _find_isoformat_datetime_separator: locates the
	length of the DATE portion of a combined ISO 8601 date[-time] string
	-- the char immediately after it is the date/time separator (T or
	space), consumed by the caller (see PyDateTime>>fromisoformat:).
	Handles the 'best effort' digit-run disambiguation CPython itself
	documents for the separator-less week-date-plus-time extension of
	the spec (test_fromisoformat_datetime_examples)."

	| len0 idx |
	len0 := str @env0:size.
	len0 @env0:= 7 ifTrue: [^ 7].
	((str @env0:at: 5) @env0:= $-) ifTrue: [
		((str @env0:at: 6) @env0:= $W) ifTrue: [
			len0 @env0:< 8 ifTrue: [ValueError ___signal___: 'Invalid ISO string'].
			(len0 @env0:> 8 @env0:and: [(str @env0:at: 9) @env0:= $-]) ifTrue: [
				len0 @env0:= 9 ifTrue: [ValueError ___signal___: 'Invalid ISO string'].
				(len0 @env0:> 10 @env0:and: [(str @env0:at: 11) @env0:isDigit]) ifTrue: [^ 8].
				^ 10
			] ifFalse: [^ 8]
		] ifFalse: [^ 10]
	] ifFalse: [
		((str @env0:at: 5) @env0:= $W) ifTrue: [
			idx := 7.
			[idx @env0:< len0 @env0:and: [(str @env0:at: idx @env0:+ 1) @env0:isDigit]]
				@env0:whileTrue: [idx := idx @env0:+ 1].
			idx @env0:< 9 ifTrue: [^ idx].
			(idx @env0:\\ 2 @env0:= 0) ifTrue: [^ 7] ifFalse: [^ 8]
		] ifFalse: [^ 8]
	]
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
	"self, not PyDate: fromisocalendar() preserves the subclass too."
	^ self @env1:fromordinal: ord
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
	"type(self), not PyDate — replace() preserves the subclass AND, unlike
	___fromFields___: (a low-level field-setting bypass), routes through a
	subclass-overridden __new__ the same way direct construction does --
	so an attribute a custom __new__ stashes (e.g. `result.extra = 7')
	survives replace() too (test_subclass_replace: DateSubclass.__new__
	sets .extra, and replace()'d instances must keep it)."
	^ self @env0:class @env1:___allocateInstance___: { y. m. d } kw: nil
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
	"self class, not PyDate: CPython builds the result with
	type(self).fromordinal, so DateSubclass + timedelta stays a
	DateSubclass (test_subclass_date)."
	^ [self @env0:class @env1:fromordinal: newOrdinal]
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
		"CPython is `self + timedelta(-other.days)': it negates the DAYS
		FIELD, not the whole timedelta.  Negating the timedelta first is
		different whenever it has a sub-day part -- -timedelta(days=1,
		hours=2) normalises to days=-2, so date(2000,1,2) - that answered
		1999-12-31 instead of 2000-01-01 (test_delta_non_days_ignored)."
		^ self __add__: (PyTimedelta @env0:___fromTotalMicros___:
			(other days) @env0:negated @env0:* 86400 @env0:* 1000000)].
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

category: 'Grail-Attribute Access'
method: PyDate
__setattr__: name _: value
	"Exact date instances have no attribute storage in CPython
	(test_extra_attributes); Python-level subclasses keep theirs."

	(self @env0:class @env0:== PyDate) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.date'' object has no attribute ''' @env0:,
			name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value
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
	"Shared by every construction path (direct call, subclass __new__,
	replace, fromisoformat, strptime) -- field validation ported from
	CPython's _check_time_fields, mirroring PyDateTime>>_year:_month:...'s
	time-part validation, which is why only the `time' variants of
	test_bad_constructor_arguments / test_replace / test_valuerror_messages
	were failing.  The pickle byte-state backdoor deliberately bypasses
	this method (it writes the dynamic instVars directly, as CPython's
	__setstate does) so a round-tripped state is never revalidated."

	(h @env0:< 0 or: [h @env0:> 23]) ifTrue: [
		^ ValueError @env1:___signal___:
			'hour must be in 0..23, not ' @env0:, h @env0:printString].
	(mi @env0:< 0 or: [mi @env0:> 59]) ifTrue: [
		^ ValueError @env1:___signal___:
			'minute must be in 0..59, not ' @env0:, mi @env0:printString].
	(s @env0:< 0 or: [s @env0:> 59]) ifTrue: [
		^ ValueError @env1:___signal___:
			'second must be in 0..59, not ' @env0:, s @env0:printString].
	(us @env0:< 0 or: [us @env0:> 999999]) ifTrue: [
		^ ValueError @env1:___signal___:
			'microsecond must be in 0..999999, not ' @env0:, us @env0:printString].
	self dynamicInstVarAt: #_hour put: h.
	self dynamicInstVarAt: #_minute put: mi.
	self dynamicInstVarAt: #_second put: s.
	self dynamicInstVarAt: #_microsecond put: us.
	self dynamicInstVarAt: #_tzinfo put: tz.
	^ self
%

set compile_env: 1

! ------- Constructors

category: 'Grail-Pickle'
classmethod: PyTime
___isTimePickleState___: obj
	"CPython's test for time()'s constructor pickle backdoor: a bytes/str
	of exactly 6 items whose hour byte, with the `fold' high bit masked
	off, is a plausible 0..23.  Deliberately narrow -- test_backdoor_
	resistance feeds 6-char strings whose first byte fails this (' ', '9',
	chr(24), '\\xff') and expects them to fall through to the ordinary
	integer type check's TypeError, not to be decoded as state."

	| b |
	((obj @env0:isKindOf: ByteArray)
		@env0:or: [obj @env0:isKindOf: CharacterCollection]) ifFalse: [^ false].
	obj @env0:size @env0:= 6 ifFalse: [^ false].
	b := (PyDate ___byteValueOf___: obj at: 1) @env0:bitAnd: 127.
	^ b @env0:< 24
%

category: 'Grail-Pickle'
classmethod: PyTime
___fromTimeState___: s tz: tzArg
	"Rebuild from the 6-byte pickle state (hour, minute, second, us-hi,
	us-mid, us-lo), with `fold' stolen from the hour byte's high bit.
	Stores fields DIRECTLY, skipping _hour:_minute:... -- the point of the
	backdoor is to bypass revalidation, exactly as CPython's __setstate
	does (and as PyDate>>___fromDateState___: already does for date)."

	| inst h fold |
	(tzArg @env0:isNil or: [tzArg @env0:isKindOf: PyTzinfo]) ifFalse: [
		^ TypeError @env1:___signal___: 'bad tzinfo state arg'].
	inst := self @env0:new.
	h := PyDate ___byteValueOf___: s at: 1.
	fold := 0.
	h @env0:> 127 ifTrue: [fold := 1. h := h @env0:- 128].
	inst @env0:dynamicInstVarAt: #_hour put: h.
	inst @env0:dynamicInstVarAt: #_minute put: (PyDate ___byteValueOf___: s at: 2).
	inst @env0:dynamicInstVarAt: #_second put: (PyDate ___byteValueOf___: s at: 3).
	inst @env0:dynamicInstVarAt: #_microsecond put:
		((((PyDate ___byteValueOf___: s at: 4) @env0:* 256)
			@env0:+ (PyDate ___byteValueOf___: s at: 5)) @env0:* 256)
			@env0:+ (PyDate ___byteValueOf___: s at: 6).
	inst @env0:dynamicInstVarAt: #_tzinfo put: tzArg.
	fold @env0:= 1 ifTrue: [inst @env0:dynamicInstVarAt: #_fold put: 1].
	^ inst
%

category: 'Grail-Callable'
classmethod: PyTime
___buildTime___: positional kw: kwargs for: cls
	"The ONE time() assembler, shared by the class-side value:value: and
	the subclass-side ___new__:kw: (which previously carried duplicate,
	separately-drifting copies).  `cls' is the class to instantiate, so a
	Python subclass of time keeps its own class."

	| h mi s us tz fold inst |
	"``fold'' is KEYWORD-ONLY: CPython's signature is
	time(hour=0, minute=0, second=0, microsecond=0, tzinfo=None, *, fold=0),
	so at most FIVE positional arguments.  The cap was 6, which let
	time(0, 0, 0, 0, None, 0) through as a silent fold=0 instead of the
	TypeError CPython raises (test_constructors)."
	positional @env0:size @env0:> 5 ifTrue: [
		^ TypeError @env1:___signal___:
			'time() takes at most 5 positional arguments (' @env0:,
			positional @env0:size @env0:printString @env0:, ' given)'].
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
	"Pickle backdoor -- time(6_byte_state[, tzinfo]).  CPython passes
	`minute or None' as the tzinfo state arg (test_compat_unpickle)."
	(PyTime ___isTimePickleState___: h) ifTrue: [
		| stateTz |
		stateTz := ((mi @env0:isNil) @env0:or: [(mi @env0:== None) @env0:or: [mi @env0:= 0]])
			ifTrue: [nil] ifFalse: [mi].
		^ cls ___fromTimeState___: h tz: stateTz].
	"CPython rejects a non-integer field with TypeError before any range
	check (test_backdoor_resistance's leftover bad strings land here)."
	PyDate ___requireIntegers___: { h. mi. s. us }.
	tz == None ifTrue: [tz := nil].
	(tz @env0:isNil or: [tz @env0:isKindOf: PyTzinfo]) ifFalse: [
		^ TypeError @env1:___signal___: 'tzinfo argument must be None or of a tzinfo subclass'].
	(fold @env0:= 0 or: [fold @env0:= 1]) ifFalse: [
		^ ValueError @env1:___signal___:
			'fold must be either 0 or 1, not ' @env0:, fold @env0:printString].
	inst := cls @env0:___fromFields___: h _: mi _: s _: us _: tz.
	fold @env0:= 0 ifFalse: [inst @env0:dynamicInstVarAt: #_fold put: fold].
	^ inst
%

category: 'Grail-Callable'
classmethod: PyTime
value: positional value: kwargs
	"time(hour=0, minute=0, second=0, microsecond=0, tzinfo=None, *, fold=0)."

	^ PyTime ___buildTime___: positional kw: kwargs for: self
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

	(Enum ___grailBuildingSet @env0:includes: self) ifTrue: [
		^ TypeError @env1:___signal___:
			'do not use `super().__new__; call the appropriate __new__ directly'].
	^ PyTime ___buildTime___: positional kw: kwargs for: self
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

category: 'Grail-Private'
classmethod: PyTime
___twoDigitsIn___: str at: pos
	"Two STRICT ASCII digits at pos..pos+1 as an Integer.  Deliberately not
	Character>>isDigit (CPython's parser rejects non-ASCII digits, e.g. the
	'٢025-03-09' case) and never asNumber -- that reader is a lenient
	PREFIX parser ('200a' -> 200) whose leniency is exactly why
	fromisoformat used to accept malformed input, and which raises an
	UNCATCHABLE kernel error on pure garbage instead of a Python
	ValueError.  Works for both String (Characters) and bytes
	(SmallIntegers) elements."

	| a b |
	(pos @env0:< 1 @env0:or: [pos @env0:+ 1 @env0:> str @env0:size]) ifTrue: [
		^ ValueError ___signal___: 'Invalid time component'].
	a := (str @env0:at: pos) @env0:asInteger.
	b := (str @env0:at: pos @env0:+ 1) @env0:asInteger.
	((a @env0:>= 48 @env0:and: [a @env0:<= 57])
		@env0:and: [b @env0:>= 48 @env0:and: [b @env0:<= 57]]) ifFalse: [
		^ ValueError ___signal___: 'Invalid time component'].
	^ ((a @env0:- 48) @env0:* 10) @env0:+ (b @env0:- 48)
%

category: 'Grail-Private'
classmethod: PyTime
___parseHhMmSsFf___: tstr
	"Port of CPython's _parse_hh_mm_ss_ff: parses
	HH[:?MM[:?SS[{.,}fff[fff]]]] and answers { h. mi. s. us }.  Whether a
	':' follows the HOUR decides the mode for the whole string: once seen,
	every later component must also be colon-separated; otherwise the
	compact HHMMSS form is in force and no separator may appear at all."

	| lenStr comps pos hasSep nextChar done comp |
	lenStr := tstr @env0:size.
	comps := Array @env0:new: 4.
	comps @env0:at: 1 put: 0.
	comps @env0:at: 2 put: 0.
	comps @env0:at: 3 put: 0.
	comps @env0:at: 4 put: 0.
	pos := 1.
	hasSep := false.
	done := false.
	comp := 0.
	[comp @env0:< 3 @env0:and: [done @env0:not]] @env0:whileTrue: [
		(lenStr @env0:- pos @env0:+ 1) @env0:< 2 ifTrue: [
			^ ValueError ___signal___: 'Incomplete time component'].
		comps @env0:at: comp @env0:+ 1 put: (PyTime ___twoDigitsIn___: tstr at: pos).
		pos := pos @env0:+ 2.
		nextChar := pos @env0:<= lenStr ifTrue: [tstr @env0:at: pos] ifFalse: [nil].
		comp @env0:= 0 ifTrue: [hasSep := nextChar @env0:= $:].
		(nextChar @env0:isNil @env0:or: [comp @env0:>= 2])
			ifTrue: [done := true]
			ifFalse: [
				(hasSep @env0:and: [nextChar @env0:~= $:]) ifTrue: [
					^ ValueError ___signal___: 'Invalid time separator'].
				hasSep ifTrue: [pos := pos @env0:+ 1]].
		comp := comp @env0:+ 1].
	pos @env0:<= lenStr ifTrue: [
		| c fracStr toParse val |
		c := tstr @env0:at: pos.
		(c @env0:= $. @env0:or: [c @env0:= $,]) ifFalse: [
			^ ValueError ___signal___: 'Invalid microsecond separator'].
		pos := pos @env0:+ 1.
		fracStr := tstr @env0:copyFrom: pos to: lenStr.
		"An EMPTY fraction is an error too -- CPython gets that for free
		from int('') raising (test_fromisoformat_fails_datetime's
		'...12:30:45.')."
		fracStr @env0:isEmpty ifTrue: [
			^ ValueError ___signal___: 'Non-digit values in fraction'].
		fracStr @env0:do: [:ch |
			| cv |
			cv := ch @env0:asInteger.
			(cv @env0:>= 48 @env0:and: [cv @env0:<= 57]) ifFalse: [
				^ ValueError ___signal___: 'Non-digit values in fraction']].
		toParse := fracStr @env0:size @env0:min: 6.
		val := 0.
		1 @env0:to: toParse do: [:i |
			val := (val @env0:* 10) @env0:+ ((fracStr @env0:at: i) @env0:asInteger @env0:- 48)].
		"Fewer than 6 digits means the fraction was truncated, not scaled:
		'.6' is 600000 microseconds, not 6."
		1 @env0:to: 6 @env0:- toParse do: [:i | val := val @env0:* 10].
		comps @env0:at: 4 put: val].
	^ comps
%

category: 'Grail-Private'
classmethod: PyTime
___parseIsoformatTime___: tstr
	"Port of CPython's _parse_isoformat_time -- the time half of both
	time.fromisoformat and datetime.fromisoformat, including the full
	timezone grammar (Z, +HH, +HHMM, +HH:MM, +HHMMSS, +HH:MM:SS.ffffff).
	Answers { h. mi. s. us. tzOrNil. becameNextDay. errorFromComponents },
	where becameNextDay flags the '24:00:00' midnight-rollover spelling and
	errorFromComponents flags a 24:00 with nonzero minute/second/micro."

	| lenStr tzPos timestr comps h tz becameNextDay errorFlag |
	lenStr := tstr @env0:size.
	lenStr @env0:< 2 ifTrue: [^ ValueError ___signal___: 'Isoformat time too short'].
	"First of '-', '+', 'Z' starts the timezone (CPython's find-chain)."
	tzPos := tstr @env0:indexOf: $-.
	tzPos @env0:= 0 ifTrue: [tzPos := tstr @env0:indexOf: $+].
	tzPos @env0:= 0 ifTrue: [tzPos := tstr @env0:indexOf: $Z].
	timestr := tzPos @env0:> 0
		ifTrue: [tstr @env0:copyFrom: 1 to: tzPos @env0:- 1]
		ifFalse: [tstr].
	comps := PyTime ___parseHhMmSsFf___: timestr.
	h := comps @env0:at: 1.
	becameNextDay := false.
	errorFlag := false.
	h @env0:= 24 ifTrue: [
		(((comps @env0:at: 2) @env0:= 0) @env0:and: [
			((comps @env0:at: 3) @env0:= 0) @env0:and: [(comps @env0:at: 4) @env0:= 0]])
			ifTrue: [comps @env0:at: 1 put: 0. becameNextDay := true]
			ifFalse: [errorFlag := true]].
	tz := nil.
	((tzPos @env0:= lenStr) @env0:and: [(tstr @env0:at: lenStr) @env0:= $Z])
		ifTrue: [tz := PyTimezone utc]
		ifFalse: [
			tzPos @env0:> 0 ifTrue: [
				| tzstr tzComps sign micros |
				tzstr := tstr @env0:copyFrom: tzPos @env0:+ 1 to: lenStr.
				"Valid offset lengths are 2, 4, 5, 6, 8, 10+ -- 0/1/3 are
				malformed, as is anything trailing a 'Z'."
				(((tzstr @env0:size @env0:= 0)
					@env0:or: [(tzstr @env0:size @env0:= 1) @env0:or: [tzstr @env0:size @env0:= 3]])
					@env0:or: [(tstr @env0:at: tzPos) @env0:= $Z]) ifTrue: [
					^ ValueError ___signal___: 'Malformed time zone string'].
				tzComps := PyTime ___parseHhMmSsFf___: tzstr.
				(((tzComps @env0:at: 1) @env0:= 0) @env0:and: [
					((tzComps @env0:at: 2) @env0:= 0) @env0:and: [
					((tzComps @env0:at: 3) @env0:= 0) @env0:and: [(tzComps @env0:at: 4) @env0:= 0]]])
					ifTrue: [tz := PyTimezone utc]
					ifFalse: [
						sign := (tstr @env0:at: tzPos) @env0:= $- ifTrue: [-1] ifFalse: [1].
						micros := ((((tzComps @env0:at: 1) @env0:* 3600)
							@env0:+ ((tzComps @env0:at: 2) @env0:* 60)
							@env0:+ (tzComps @env0:at: 3)) @env0:* 1000000)
							@env0:+ (tzComps @env0:at: 4).
						"PyTimezone __new__: already rejects |offset| >= 24h,
						covering the '+24:30' cases."
						tz := PyTimezone __new__:
							(PyTimedelta @env0:___fromTotalMicros___: sign @env0:* micros)]]].
	^ { comps @env0:at: 1. comps @env0:at: 2. comps @env0:at: 3. comps @env0:at: 4.
		tz. becameNextDay. errorFlag }
%

category: 'Grail-Initialization'
classmethod: PyTime
fromisoformat: s
	"time.fromisoformat -- the full CPython grammar, not the old
	'HH:MM[:SS[.ffffff]]'-at-fixed-offsets subset: compact HHMMSS forms,
	',' as the fraction separator, an optional leading 'T', and a real
	timezone suffix (which the old parser dropped entirely, silently
	answering a NAIVE time for an aware string).  Like CPython, ANY parse
	or construction failure surfaces as a single ValueError naming the
	input (test_fromisoformat_time_examples, test_fromisoformat_fails,
	test_fromisoformat_timespecs)."

	| str |
	(s @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'fromisoformat: argument must be str'].
	str := s @env0:asString.
	(str @env0:isEmpty @env0:not @env0:and: [(str @env0:at: 1) @env0:= $T]) ifTrue: [
		str := str @env0:copyFrom: 2 to: str @env0:size].
	^ [| parsed |
		parsed := PyTime ___parseIsoformatTime___: str.
		"___allocateInstance___:kw: (not ___fromFields___:) so a subclass's
		overridden __new__ runs (test_fromisoformat_subclass)."
		self @env1:___allocateInstance___:
			{ parsed @env0:at: 1. parsed @env0:at: 2. parsed @env0:at: 3.
			  parsed @env0:at: 4. parsed @env0:at: 5 } kw: nil]
		@env0:on: ValueError
		do: [:ex |
			ValueError ___signal___:
				'Invalid isoformat string: ''' @env0:, str @env0:, '''']
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

category: 'Grail-Private'
method: PyTime
___isoTzSuffix___
	"'+HH:MM[:SS[.ffffff]]'-style UTC-offset suffix, or '' when naive --
	the time-side twin of PyDateTime>>___isoTzSuffix___ (see there for why
	it must be derived from utcoffset() rather than tzname()).  Without
	it, an AWARE time's isoformat() dropped its offset entirely
	(test_isoformat_timezone)."

	| offset micros pad stream sign hh mm ss us |
	offset := self utcoffset.
	offset @env0:== None ifTrue: [^ ''].
	micros := (offset days @env0:* 86400000000)
		@env0:+ (offset seconds @env0:* 1000000)
		@env0:+ offset microseconds.
	pad := [:n | | t | t := n @env0:printString. t @env0:size @env0:< 2 ifTrue: ['0' @env0:, t] ifFalse: [t]].
	stream := WriteStream @env0:on: Unicode7 @env0:new.
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

category: 'Grail-Conversion'
method: PyTime
isoformat
	"'HH:MM:SS[.ffffff][+HH:MM]'.  Routed through the timespec form so the
	no-arg spelling (and __str__ through it) also carries the UTC-offset
	suffix for aware times."

	^ self _isoformat: nil kw: nil
%

category: 'Grail-Conversion'
method: PyTime
_isoformat: positional kw: kwargs
	"isoformat(timespec='auto'|'hours'|'minutes'|'seconds'|'milliseconds'
	|'microseconds') — the keyword/positional timespec form."

	| timespec h mi s us body suffix |
	"CPython's signature accepts exactly one argument named `timespec';
	anything else is a TypeError rather than being silently ignored
	(test_1653736)."
	(positional @env0:notNil @env0:and: [positional @env0:size @env0:> 1]) ifTrue: [
		^ TypeError ___signal___: 'isoformat() takes at most 1 argument'].
	kwargs @env0:isNil ifFalse: [
		kwargs @env0:keysDo: [:k |
			k @env0:asString @env0:= 'timespec' ifFalse: [
				^ TypeError ___signal___:
					'isoformat() got an unexpected keyword argument ''' @env0:,
					k @env0:asString @env0:, '''']]].
	timespec := 'auto'.
	(positional @env0:notNil and: [positional @env0:isEmpty @env0:not])
		ifTrue: [timespec := positional @env0:at: 1].
	kwargs @env0:isNil ifFalse: [timespec := kwargs @env0:at: 'timespec' ifAbsent: [timespec]].
	h := self @env0:dynamicInstVarAt: #_hour.
	mi := self @env0:dynamicInstVarAt: #_minute.
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	suffix := self ___isoTzSuffix___.
	timespec @env0:= 'hours' ifTrue: [^ (self @env0:___pad___: h width: 2) @env0:, suffix].
	body := (self @env0:___pad___: h width: 2) @env0:, ':' @env0:, (self @env0:___pad___: mi width: 2).
	timespec @env0:= 'minutes' ifTrue: [^ body @env0:, suffix].
	body := body @env0:, ':' @env0:, (self @env0:___pad___: s width: 2).
	timespec @env0:= 'seconds' ifTrue: [^ body @env0:, suffix].
	timespec @env0:= 'milliseconds' ifTrue: [
		^ body @env0:, '.' @env0:, (self @env0:___pad___: (us @env0:// 1000) width: 3) @env0:, suffix].
	timespec @env0:= 'microseconds' ifTrue: [
		^ body @env0:, '.' @env0:, (self @env0:___pad___: us width: 6) @env0:, suffix].
	"Anything else is an error -- 'auto' is the only remaining valid value.
	PyDateTime's counterpart already checked this; PyTime silently treated
	every unknown spec as 'auto' (test_isoformat's timespec='monkey')."
	timespec @env0:= 'auto' ifFalse: [
		^ ValueError ___signal___: 'Unknown timespec value'].
	us @env0:= 0 ifTrue: [^ body @env0:, suffix].
	^ body @env0:, '.' @env0:, (self @env0:___pad___: us width: 6) @env0:, suffix
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

	| h mi s us body prefix tz |
	h := self @env0:dynamicInstVarAt: #_hour.
	mi := self @env0:dynamicInstVarAt: #_minute.
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	body := h @env0:printString @env0:, ', ' @env0:, mi @env0:printString.
	(s @env0:~= 0 or: [us @env0:~= 0]) ifTrue: [
		body := body @env0:, ', ' @env0:, s @env0:printString.
		us @env0:~= 0 ifTrue: [body := body @env0:, ', ' @env0:, us @env0:printString]].
	"CPython appends ', tzinfo=<repr>' then ', fold=1', each only when
	applicable (test_zones, test_repr_subclass, test_repr)."
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifFalse: [
		body := body @env0:, ', tzinfo=' @env0:, tz @env1:__repr__].
	(self @env1:fold) @env0:= 1 ifTrue: [body := body @env0:, ', fold=1'].
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

	| h mi s us tz fold |
	h := self @env0:dynamicInstVarAt: #_hour.
	mi := self @env0:dynamicInstVarAt: #_minute.
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	"fold defaults to self's OWN fold (preserved), not 0 (test_subclass_replace_fold)."
	fold := self @env0:dynamicInstVarAt: #_fold.
	fold @env0:isNil ifTrue: [fold := 0].
	"Positional fields, as CPython's replace(hour, minute, second,
	microsecond, tzinfo, *, fold) allows -- reading kwargs only meant
	t.replace(1, 1, 1, None, 1) silently answered an unchanged copy
	instead of rejecting 1 as a tzinfo (test_replace)."
	positional @env0:size @env0:> 5 ifTrue: [
		^ TypeError @env1:___signal___:
			'replace() takes at most 5 positional arguments (' @env0:,
			positional @env0:size @env0:printString @env0:, ' given)'].
	positional @env0:size @env0:>= 1 ifTrue: [h := positional @env0:at: 1].
	positional @env0:size @env0:>= 2 ifTrue: [mi := positional @env0:at: 2].
	positional @env0:size @env0:>= 3 ifTrue: [s := positional @env0:at: 3].
	positional @env0:size @env0:>= 4 ifTrue: [us := positional @env0:at: 4].
	positional @env0:size @env0:>= 5 ifTrue: [
		tz := positional @env0:at: 5.
		tz == None ifTrue: [tz := nil]].
	kwargs @env0:isNil ifFalse: [
		h := kwargs @env0:at: 'hour' ifAbsent: [h].
		mi := kwargs @env0:at: 'minute' ifAbsent: [mi].
		s := kwargs @env0:at: 'second' ifAbsent: [s].
		us := kwargs @env0:at: 'microsecond' ifAbsent: [us].
		tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz].
		fold := kwargs @env0:at: 'fold' ifAbsent: [fold].
		tz == None ifTrue: [tz := nil]].
	(fold @env0:= 0 @env0:or: [fold @env0:= 1]) ifFalse: [
		^ ValueError @env1:___signal___:
			'fold must be either 0 or 1, not ' @env0:, fold @env0:printString].
	"type(self), not PyTime — replace() preserves the subclass, AND (see
	PyDate>>_replace:kw:) routes through a subclass-overridden __new__ so
	a stashed attribute survives replace() too."
	^ self @env0:class @env1:___allocateInstance___:
		{ h. mi. s. us. tz } kw: (Dictionary @env0:new @env0:at: 'fold' put: fold; @env0:yourself)
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
	"%z / %:z / %Z -- see PyDateTime>>strftime: and
	___expandTzDirectives___:offset:tzname: (test_strftime, test_zones)."
	fmt := PyDateTime ___expandTzDirectives___: fmt
		offset: self utcoffset
		tzname: self tzname.
	^ time instance strftime: fmt _: structTime
%

category: 'Grail-Conversion'
method: PyTime
_strftime: positional kw: kwargs
	"Varargs entry for strftime(fmt) called with the format= keyword --
	gh-85432: real CPython's pure-Python datetime implementation names
	the parameter 'fmt', but the C-accelerated one names it 'format',
	and this varargs entry (reached whenever the call isn't a plain
	single positional arg -- see PyDateTime>>_now:kw: for why) matches
	the latter."

	| n format |
	n := positional @env0:size.
	n @env0:> 1 ifTrue: [
		TypeError ___signal___: ('strftime() takes at most 1 argument (' @env0:,
			n @env0:printString @env0:, ' given)')].
	format := n @env0:= 1 ifTrue: [positional @env0:at: 1] ifFalse: [nil].
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'format' ifTrue: [format := v]
			ifFalse: [TypeError ___signal___:
				('strftime() got an unexpected keyword argument ''' @env0:, key @env0:, '''')]]].
	format @env0:isNil ifTrue: [
		TypeError ___signal___: 'strftime() missing required argument: ''format'''].
	^ self strftime: format
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
	"tzinfo.utcoffset(None), or None when naive.  Validated like
	PyDateTime>>utcoffset -- a custom tzinfo is arbitrary user code
	(test_tzinfo_classes)."

	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ self ___checkUtcOffsetResult___: (tz utcoffset: None) for: 'utcoffset'
%

category: 'Grail-Accessors'
method: PyTime
dst
	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ self ___checkUtcOffsetResult___: (tz dst: None) for: 'dst'
%

category: 'Grail-Private'
method: PyTime
___checkUtcOffsetResult___: result for: methodName
	"Shared validation for utcoffset()/dst(): must be None or a timedelta
	strictly within (-24h, 24h).  Mirrors PyDateTime's method of the same
	name (test_tzinfo_classes' C4 wrong-types and C6 out-of-range cases)."

	| totalMicros |
	result @env0:== None ifTrue: [^ result].
	(result @env0:isKindOf: PyTimedelta) ifFalse: [
		^ TypeError ___signal___: ('tzinfo.' @env0:, methodName
			@env0:, '() must return None or a timedelta, not ' @env0:, result @env0:class __name__)].
	totalMicros := (result days @env0:* 86400000000)
		@env0:+ (result seconds @env0:* 1000000)
		@env0:+ result microseconds.
	(totalMicros @env0:> -86400000000 @env0:and: [totalMicros @env0:< 86400000000]) ifFalse: [
		^ ValueError ___signal___: ('tzinfo.' @env0:, methodName
			@env0:, '() must return a timedelta strictly between -timedelta(hours=24) and timedelta(hours=24)')].
	^ result
%

category: 'Grail-Accessors'
method: PyTime
tzname
	"Validates the tzinfo subclass's return value the way CPython does --
	None or a str -- since a custom tzinfo is arbitrary user code.  Mirrors
	PyDateTime>>tzname (test_zones' Badtzname, whose tzname() answers a
	non-str and must make strftime('%Z') raise TypeError)."

	| tz result |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	result := tz tzname: None.
	(result @env0:== None or: [result @env0:isKindOf: CharacterCollection]) ifFalse: [
		^ TypeError ___signal___: 'tzinfo.tzname() must return None or a string, not '
			@env0:, result @env0:class __name__].
	^ result
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
	^ (self ___awareCmp___: other allowMixed: true) @env0:= 0
%

category: 'Grail-Equality'
method: PyTime
__hash__
	"Aware times hash by their UTC-adjusted value, so two times naming the
	same moment-of-day in different zones share a bucket exactly as they
	compare equal (test_zones, test_hash_edge_cases)."

	| off |
	off := self utcoffset.
	off @env0:== None ifTrue: [
		^ ((self @env0:dynamicInstVarAt: #_hour) @env0:* 3600
			@env0:+ ((self @env0:dynamicInstVarAt: #_minute) @env0:* 60)
			@env0:+ (self @env0:dynamicInstVarAt: #_second)) @env0:hash].
	^ ((self ___cmpKey___) @env0:- (off ___totalMicros___)) @env0:hash
%

category: 'Grail-Private'
method: PyTime
___awareCmp___: other allowMixed: allowMixed
	"CPython's time._cmp -- see PyDateTime>>___awareCmp___:allowMixed: for
	the full rationale; the only difference is that time passes None to
	utcoffset() (there is no instant to disambiguate with)."

	| mytz ottz myoff otoff |
	mytz := self @env0:dynamicInstVarAt: #_tzinfo.
	ottz := other @env0:dynamicInstVarAt: #_tzinfo.
	mytz @env0:== ottz ifTrue: [
		^ (self ___cmpKey___) @env0:- (other ___cmpKey___)].
	myoff := self utcoffset.
	otoff := other utcoffset.
	(myoff @env0:== None @env0:and: [otoff @env0:== None]) ifTrue: [
		^ (self ___cmpKey___) @env0:- (other ___cmpKey___)].
	(myoff @env0:== None @env0:or: [otoff @env0:== None]) ifTrue: [
		allowMixed ifTrue: [^ 2].
		^ TypeError ___signal___: 'can''t compare offset-naive and offset-aware times'].
	^ ((self ___cmpKey___) @env0:- (myoff ___totalMicros___))
		@env0:- ((other ___cmpKey___) @env0:- (otoff ___totalMicros___))
%

category: 'Grail-Private'
method: PyTime
___cmpKey___
	"Microseconds since midnight — the NAIVE half of every comparison
	(tzinfo is layered on top by ___awareCmp___:allowMixed:)."

	^ (((self @env0:dynamicInstVarAt: #_hour) @env0:* 60
		@env0:+ (self @env0:dynamicInstVarAt: #_minute)) @env0:* 60
		@env0:+ (self @env0:dynamicInstVarAt: #_second)) @env0:* 1000000
		@env0:+ (self @env0:dynamicInstVarAt: #_microsecond)
%

category: 'Grail-Equality'
method: PyTime
__lt__: other
	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ (self ___awareCmp___: other allowMixed: false) @env0:< 0
%

category: 'Grail-Equality'
method: PyTime
__le__: other
	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ (self ___awareCmp___: other allowMixed: false) @env0:<= 0
%

category: 'Grail-Equality'
method: PyTime
__gt__: other
	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ (self ___awareCmp___: other allowMixed: false) @env0:> 0
%

category: 'Grail-Equality'
method: PyTime
__ge__: other
	(other isKindOf: PyTime) ifFalse: [^ #'___NotImplemented___'].
	^ (self ___awareCmp___: other allowMixed: false) @env0:>= 0
%

category: 'Grail-Equality'
method: PyTime
__ne__: other
	| eq |
	eq := self __eq__: other.
	(eq @env0:== #'___NotImplemented___') ifTrue: [^ eq].
	^ eq @env0:not
%

category: 'Grail-Attribute Access'
method: PyTime
__setattr__: name _: value
	"Exact time instances have no attribute storage in CPython
	(test_extra_attributes); Python-level subclasses keep theirs."

	(self @env0:class @env0:== PyTime) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.time'' object has no attribute ''' @env0:,
			name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value
%

category: 'Grail-Pickle'
method: PyTime
__reduce__
	"(class, state) at the default protocol, per CPython's time.__reduce__."

	^ self __reduce_ex__: 2
%

category: 'Grail-Pickle'
method: PyTime
__reduce_ex__: protocol
	"CPython's time.__reduce_ex__: (class, (6-byte state[, tzinfo])).

	See PyDateTime>>__reduce_ex__: for why this is the packed byte state
	rather than a field tuple.  time hides `fold' in the high bit of the
	HOUR byte (datetime uses the month byte), again only from protocol 4
	on (test_pickle_fold)."

	| h fold us state tz |
	h := self @env0:dynamicInstVarAt: #_hour.
	fold := self @env0:dynamicInstVarAt: #_fold.
	((fold @env0:notNil and: [fold @env0:= 1]) and: [protocol @env0:> 3])
		ifTrue: [h := h @env0:+ 128].
	us := self @env0:dynamicInstVarAt: #_microsecond.
	state := ByteArray @env0:new: 6.
	state @env0:at: 1 put: h;
		@env0:at: 2 put: (self @env0:dynamicInstVarAt: #_minute);
		@env0:at: 3 put: (self @env0:dynamicInstVarAt: #_second);
		@env0:at: 4 put: (us @env0:// 65536);
		@env0:at: 5 put: ((us @env0:// 256) @env0:\\ 256);
		@env0:at: 6 put: (us @env0:\\ 256).
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	^ tuple @env0:withAll: {
		(self @env0:class).
		(tz @env0:isNil
			ifTrue: [tuple @env0:withAll: { state }]
			ifFalse: [tuple @env0:withAll: { state. tz }]) }
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
