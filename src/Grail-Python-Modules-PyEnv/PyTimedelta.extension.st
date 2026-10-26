Extension { #name : 'PyTimedelta' }

{ #category : 'Grail-Private' }
PyTimedelta class >> ___integerRatioOf___: aFloat [
	"as_integer_ratio() validated before use.

	It is user-overridable -- a float SUBCLASS may answer anything -- so
	CPython's timedelta checks the result explicitly before using it,
	raising TypeError when it is not a tuple and ValueError when it is not
	a 2-tuple.  The messages below are that C implementation's, verbatim.

	Grail indexed the result directly (``ratio at: 1'' / ``at: 2''), so a
	bad value produced a nonsense numerator/denominator and surfaced as
	``ZeroDivisionError: division by zero'' -- or, for a short tuple, an
	out-of-bounds Smalltalk error -- instead (test_issue31293)."

	| ratio |
	ratio := aFloat as_integer_ratio.
	(ratio @env0:isKindOf: tuple) ifFalse: [
		^ TypeError ___signal___:
			'unexpected return type from as_integer_ratio(): expected tuple, not '''
			@env0:, (ratio @env0:class __name__) @env0:asString @env0:, ''''].
	ratio @env0:size @env0:= 2 ifFalse: [
		^ ValueError ___signal___: 'as_integer_ratio() must return a 2-tuple'].
	^ ratio

]

{ #category : 'Grail-Private' }
PyTimedelta class >> ___isFloatOperand___: obj [
	"True for anything timedelta arithmetic must treat as a Python float.

	``isKindOf: Float'' alone misses a float SUBCLASS: the kernel Float is
	sealed, so ``class F(float)'' becomes an AbstractPyFloat wrapper, which
	is a Number but not a Float.  Such an operand therefore took the INTEGER
	path -- multiplying/dividing by the wrapper directly instead of going
	through as_integer_ratio -- so a subclass that overrides
	as_integer_ratio was ignored entirely (test_issue31293).

	Mirrors float>>__instancecheck__, which recognizes the same wrapper."

	^ (obj @env0:isKindOf: Float) @env0:or: [obj @env0:isKindOf: AbstractPyFloat]

]

{ #category : 'Grail-Class Attrs' }
PyTimedelta class >> __module__ [
	^ 'datetime'

]

{ #category : 'Grail-Introspection' }
PyTimedelta class >> __name__ [
	"CPython name is 'timedelta', not the Smalltalk class name -- but only
	for PyTimedelta itself; see __qualname__ above."

	^ self @env0:== PyTimedelta
		ifTrue: ['timedelta']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Introspection' }
PyTimedelta class >> __qualname__ [
	"Only PyTimedelta ITSELF is 'timedelta' -- a Python subclass
	(``class SubclassTimeDelta(timedelta):``) must see its own name here
	(test_repr_subclass), so fall back to the generic object-level
	__qualname__ (self name asString) for anything else."

	^ self @env0:== PyTimedelta
		ifTrue: ['timedelta']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Initialization' }
PyTimedelta class >> _timedelta: positional kw: kwargs [
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
	"A NaN or infinite component is CPython's ValueError or OverflowError, from
	rounding it to a whole number of microseconds.  Here it went on to
	___fromDaysSecondsMicros___ as a Float day count, and the date primitive
	refused it with an uncatchable ArgumentTypeError (a binary plist's date of
	inf seconds -- test_plistlib test_invalid_binary)."
	vals @env0:do: [:each |
		(each @env0:isKindOf: Float) ifTrue: [each ___checkIntConvertible___]].

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

]

{ #category : 'Grail-Class Attrs' }
PyTimedelta class >> max [
	"timedelta.max == timedelta(days=999999999, hours=23, minutes=59,
	seconds=59, microseconds=999999)."

	^ PyTimedelta @env0:___fromTotalMicros___:
		((999999999 @env0:* 86400 @env0:+ 86399) @env0:* 1000000 @env0:+ 999999)

]

{ #category : 'Grail-Class Attrs' }
PyTimedelta class >> min [
	"timedelta.min == timedelta(-999999999)."

	^ PyTimedelta @env0:___fromTotalMicros___:
		(-999999999 @env0:* 86400 @env0:* 1000000)

]

{ #category : 'Grail-Class Attrs' }
PyTimedelta class >> resolution [
	"timedelta.resolution == timedelta(microseconds=1)."

	^ PyTimedelta @env0:___fromTotalMicros___: 1

]

{ #category : 'Grail-Callable' }
PyTimedelta class >> value: positional value: kwargs [
	"Class-side callable - forward every arity + kwargs into the
	varargs assembler.  Bypasses Object class >> value:value: which
	would dispatch by __new__ arity (no 7-arg __new__ defined)."

	^ self _timedelta: positional kw: kwargs

]

{ #category : 'Grail-Instantiation' }
PyTimedelta >> ___new__: positional kw: kwargs [
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

	A mixed-in Enum reaches this same selector by TWO routes that have to be
	told apart, and a local guard here cannot tell them apart:

	    class E(timedelta, Enum):
	        def __new__(cls, v):
	            return super().__new__(cls, v)      -- CPython REJECTS this
	    class Period(timedelta, Enum):
	        def __new__(cls, value, period):
	            obj = timedelta.__new__(cls, value) -- CPython REQUIRES this

	Both arrive as ``___new__:kw:'' with a mid-construction enum class as the
	receiver, so the ``is self being built?'' test this method used to make
	raised test_bad_new_super's TypeError for the second one as well, and
	test_enum's test_ignore could not build its members at all.

	The distinction is WHERE THE CALL CAME FROM, which only the caller knows:
	SuperBoundMethod >> value:value: fires Enum class >> ___grailSuperNewGuard:
	on the super() path, before the MRO walk resolves to whichever storage
	__new__ the mixin order exposes.  That is the whole guard, so nothing is
	needed here -- an explicit timedelta.__new__ is simply allowed to allocate.

	The assembler is a CLASS-SIDE method, so ``self _timedelta:kw:'' reaches it
	only from a receiver whose METACLASS chain passes PyTimedelta class.  A
	mixed enum's does not: ``class P(timedelta, Enum)'' is rooted at Enum in
	Smalltalk and carries timedelta as a merged SECONDARY base, so the send was
	a raw MessageNotUnderstood -- an error Python cannot even catch.

	Compute on PyTimedelta in that case and RE-HOME the result onto an instance
	of the actual class, which is what CPython's ``timedelta.__new__(cls, ...)''
	answers and what the enum then hangs _value_ off.  Cheap because a
	timedelta's whole state is three DYNAMIC instVars -- there is no declared
	layout to inherit, so any object can carry them and P needs no PyTimedelta
	on its Smalltalk chain to be a working timedelta.  Rooting P at PyTimedelta
	instead was tried and is the wrong lever: it takes the class off the Enum
	chain, and the 52 date-mixin enum tests that rely on ___grailValueMixinFor:
	building the member's value all break."

	| proto inst |
	((self @env0:class @env0:whichClassIncludesSelector: #'_timedelta:kw:'
		environmentId: 1) @env0:isNil) ifFalse: [
			^ self _timedelta: positional kw: kwargs].
	proto := PyTimedelta _timedelta: positional kw: kwargs.
	inst := self @env0:new.
	#( #_days #_seconds #_microseconds ) @env0:do: [:slot |
		inst @env0:dynamicInstVarAt: slot
			put: (proto @env0:dynamicInstVarAt: slot)].
	^ inst

]

{ #category : 'Grail-Accessors' }
PyTimedelta >> ___totalMicros___ [
	"Internal: signed total microseconds."

	^ ((self @env0:dynamicInstVarAt: #_days) @env0:* 86400000000) @env0:+ ((self @env0:dynamicInstVarAt: #_seconds) @env0:* 1000000) @env0:+ (self @env0:dynamicInstVarAt: #_microseconds)

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __abs__ [
	self ___totalMicros___ @env0:< 0 ifTrue: [
		^ self __neg__
	].
	^ self

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __add__: other [
	"NotImplemented (not a direct TypeError) for a non-timedelta, so the
	reflected op runs: timedelta + date/datetime dispatches to the
	date/datetime __radd__."

	(other isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self ___totalMicros___ @env0:+ other ___totalMicros___)
	].
	^ NotImplemented

]

{ #category : 'Grail-Conversion' }
PyTimedelta >> __bool__ [
	"False iff the delta is exactly zero (CPython)."

	^ self ___totalMicros___ @env0:~= 0

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __divmod__: other [
	"divmod(td, td) -> (int, td), as CPython's timedelta.__divmod__ answers.

	Needed explicitly now that builtins>>divmod:_: DISPATCHES on __divmod__
	instead of computing ``(a // b, a % b)'' itself -- without it,
	``divmod(timedelta, timedelta)'' raised, which is
	test_datetime's TestTimeDelta>>test_divmod.  Upstream _pydatetime defines
	the same method for the same reason; Grail's timedelta is Smalltalk, so it
	needs its own.

	Delegates to __floordiv__ and __mod__ so the two stay in step, including
	their ZeroDivisionError and their (int, timedelta) result types."

	(other isKindOf: PyTimedelta) ifFalse: [^ NotImplemented].
	^ tuple @env0:with: (self __floordiv__: other) with: (self __mod__: other)

]

{ #category : 'Grail-Equality' }
PyTimedelta >> __eq__: other [
	"NotImplemented (not false) for a non-timedelta, so the reflected
	comparison runs (e.g. ALWAYS_EQ == timedelta is True)."

	(other isKindOf: PyTimedelta) ifFalse: [^ NotImplemented].
	^ self ___totalMicros___ @env0:= other ___totalMicros___

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __floordiv__: other [
	"td // td -> int; td // int -> td.  A float divisor is NOT accepted
	(matches CPython: timedelta.__floordiv__ only handles (int,
	timedelta), unlike __truediv__/__mul__).  Zero divisor ->
	ZeroDivisionError."

	(other isKindOf: PyTimedelta) ifTrue: [
		other ___totalMicros___ @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
		^ self ___totalMicros___ @env0:// other ___totalMicros___].
	((other isKindOf: Number) and: [(other isKindOf: Float) not]) ifFalse: [^ NotImplemented].
	other @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
	^ PyTimedelta @env0:___fromTotalMicros___: (self ___totalMicros___ @env0:// other)

]

{ #category : 'Grail-Equality' }
PyTimedelta >> __ge__: other [
	(other isKindOf: PyTimedelta) ifFalse: [^ NotImplemented].
	^ self ___totalMicros___ @env0:>= other ___totalMicros___

]

{ #category : 'Grail-Equality' }
PyTimedelta >> __gt__: other [
	(other isKindOf: PyTimedelta) ifFalse: [^ NotImplemented].
	^ self ___totalMicros___ @env0:> other ___totalMicros___

]

{ #category : 'Grail-Equality' }
PyTimedelta >> __hash__ [
	^ self ___totalMicros___ @env0:hash

]

{ #category : 'Grail-Equality' }
PyTimedelta >> __le__: other [
	(other isKindOf: PyTimedelta) ifFalse: [^ NotImplemented].
	^ self ___totalMicros___ @env0:<= other ___totalMicros___

]

{ #category : 'Grail-Equality' }
PyTimedelta >> __lt__: other [
	(other isKindOf: PyTimedelta) ifFalse: [^ NotImplemented].
	^ self ___totalMicros___ @env0:< other ___totalMicros___

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __mod__: other [
	"td % td -> td (only a timedelta divisor is valid).  Zero -> ZeroDivisionError."

	(other isKindOf: PyTimedelta) ifFalse: [^ NotImplemented].
	other ___totalMicros___ @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
	^ PyTimedelta @env0:___fromTotalMicros___:
		(self ___totalMicros___ @env0:\\ other ___totalMicros___)

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __mul__: scale [
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
	(scale isKindOf: Number) ifFalse: [^ NotImplemented].
	(PyTimedelta ___isFloatOperand___: scale) ifFalse: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self ___totalMicros___ @env0:* scale) @env0:truncated].
	ratio := PyTimedelta ___integerRatioOf___: scale.
	a := ratio @env0:at: 1.
	b := ratio @env0:at: 2.
	usec := self ___totalMicros___.
	^ PyTimedelta @env0:___fromTotalMicros___:
		(PyTimedelta @env0:___divideAndRound___: usec @env0:* a by: b)

]

{ #category : 'Grail-Equality' }
PyTimedelta >> __ne__: other [
	| eq |
	eq := self __eq__: other.
	(eq @env0:== NotImplemented) ifTrue: [^ eq].
	^ eq @env0:not

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __neg__ [
	^ PyTimedelta @env0:___fromTotalMicros___: self ___totalMicros___ @env0:negated

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __pos__ [
	"Unary plus returns self (CPython)."

	^ self

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __radd__: other [
	"other + self (addition commutes for timedeltas)."

	^ self __add__: other

]

{ #category : 'Grail-Pickle' }
PyTimedelta >> __reduce__ [
	"(class, (days, seconds, microseconds))."

	^ tuple @env0:withAll: {
		(self @env0:class).
		(tuple @env0:withAll: {
			(self @env0:dynamicInstVarAt: #_days).
			(self @env0:dynamicInstVarAt: #_seconds).
			(self @env0:dynamicInstVarAt: #_microseconds) }) }

]

{ #category : 'Grail-Conversion' }
PyTimedelta >> __repr__ [
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

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __rmul__: scale [
	"scale * self (multiplication commutes)."

	^ self __mul__: scale

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __rsub__: other [
	"other - self."

	(other isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(other ___totalMicros___ @env0:- self ___totalMicros___)].
	^ TypeError ___signal___: 'unsupported operand for -'

]

{ #category : 'Grail-Attribute Access' }
PyTimedelta >> __setattr__: name _: value [
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

]

{ #category : 'Grail-Conversion' }
PyTimedelta >> __str__ [
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

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __sub__: other [
	(other isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self ___totalMicros___ @env0:- other ___totalMicros___)
	].
	^ TypeError ___signal___: 'unsupported operand for -'

]

{ #category : 'Grail-Arithmetic' }
PyTimedelta >> __truediv__: other [
	"td / td -> float; td / int -> td (exact _divide_and_round, matching
	CPython -- NOT naive float division + rounded, which reintroduces
	binary representation error); td / float -> td, via the float's
	EXACT integer ratio (as_integer_ratio) same as __mul__ above.
	Zero divisor -> ZeroDivisionError."

	| usec |
	(other isKindOf: PyTimedelta) ifTrue: [
		other ___totalMicros___ @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
		^ (self ___totalMicros___ @env0:/ other ___totalMicros___) @env0:asFloat].
	(other isKindOf: Number) ifFalse: [^ NotImplemented].
	usec := self ___totalMicros___.
	"The FLOAT branch runs before any zero test, as CPython's does: it has
	no explicit zero check at all, so as_integer_ratio() is consulted first
	and ZeroDivisionError only falls out of the division afterwards.  A
	float SUBCLASS overriding as_integer_ratio with something invalid must
	therefore raise TypeError/ValueError -- checking for a zero divisor up
	front pre-empted that, since such an instance compares equal to 0
	(test_issue31293).  0.0 still divides by zero: its ratio is (0, 1), so
	the numerator `a' below is 0."
	(PyTimedelta ___isFloatOperand___: other) ifTrue: [
		| ratio a b |
		ratio := PyTimedelta ___integerRatioOf___: other.
		a := ratio @env0:at: 1.
		b := ratio @env0:at: 2.
		a @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
		^ PyTimedelta @env0:___fromTotalMicros___:
			(PyTimedelta @env0:___divideAndRound___: b @env0:* usec by: a)].
	other @env0:= 0 ifTrue: [^ ZeroDivisionError ___signal___: 'division by zero'].
	^ PyTimedelta @env0:___fromTotalMicros___:
		(PyTimedelta @env0:___divideAndRound___: usec by: other)

]

{ #category : 'Grail-Accessors' }
PyTimedelta >> days [
	^ (self @env0:dynamicInstVarAt: #_days)

]

{ #category : 'Grail-Accessors' }
PyTimedelta >> microseconds [
	^ (self @env0:dynamicInstVarAt: #_microseconds)

]

{ #category : 'Grail-Accessors' }
PyTimedelta >> seconds [
	^ (self @env0:dynamicInstVarAt: #_seconds)

]

{ #category : 'Grail-Accessors' }
PyTimedelta >> total_seconds [
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

]
