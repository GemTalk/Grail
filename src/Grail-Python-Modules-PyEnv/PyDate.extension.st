Extension { #name : 'PyDate' }

{ #category : 'Grail-Pickle' }
PyDate class >> ___byteValueOf___: obj at: i [
	"The i-th item of a pickle state as an integer, whether the state
	arrived as bytes (SmallIntegers) or str (Characters)."

	| e |
	e := obj @env0:at: i.
	^ (e @env0:isKindOf: Character) ifTrue: [e @env0:asInteger] ifFalse: [e]

]

{ #category : 'Grail-Private' }
PyDate class >> ___findIsoDatetimeSeparator___: str [
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

]

{ #category : 'Grail-Pickle' }
PyDate class >> ___fromDateState___: s [
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

]

{ #category : 'Grail-Private' }
PyDate class >> ___isoweek1monday___: year [
	"Proleptic-ordinal of the Monday starting ISO week 1 of `year`."

	| firstday firstweekday week1monday |
	firstday := (PyDate @env0:___fromFields___: year _: 1 _: 1) toordinal.
	firstweekday := (firstday @env0:+ 6) @env0:\\ 7.
	week1monday := firstday @env0:- firstweekday.
	firstweekday @env0:> 3 ifTrue: [week1monday := week1monday @env0:+ 7].
	^ week1monday

]

{ #category : 'Grail-Pickle' }
PyDate class >> ___isPickleState___: obj width: n monthAt: i mask: maskFold [
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

]

{ #category : 'Grail-Private' }
PyDate class >> ___parseIsoDateFields___: dateStr [
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

]

{ #category : 'Grail-Pickle' }
PyDate class >> ___requireIntegers___: fields [
	"CPython's constructors reject a non-integer field with TypeError.
	Grail previously let e.g. a byte string reach the field setters and
	die with an uncatchable Smalltalk error instead."

	fields @env0:do: [:f |
		(f @env0:isKindOf: Integer) ifFalse: [
			^ TypeError @env1:___signal___: 'an integer is required']].
	^ nil

]

{ #category : 'Grail-Class Attrs' }
PyDate class >> __module__ [
	"So pickle's _find_global can locate `datetime.date`."

	^ 'datetime'

]

{ #category : 'Grail-Introspection' }
PyDate class >> __name__ [
	"See __qualname__ above: only PyDate itself is 'date' -- a subclass
	must see its own name."

	^ self @env0:== PyDate
		ifTrue: ['date']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Introspection' }
PyDate class >> __qualname__ [
	"CPython-visible name (datetime.date), so pickle's _find_global
	resolves getattr(datetime, 'date') is PyDate.  Only for PyDate ITSELF
	-- a Python subclass (``class SubclassDate(date):``) must see its OWN
	name here (test_repr_subclass), so fall back to the generic
	object-level __qualname__ (self name asString) for anything else."

	^ self @env0:== PyDate
		ifTrue: ['date']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Initialization' }
PyDate class >> fromisocalendar: year _: week _: day [
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

]

{ #category : 'Grail-Initialization' }
PyDate class >> fromisoformat: s [
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

]

{ #category : 'Grail-Initialization' }
PyDate class >> fromordinal: ordinal [
	"Proleptic Gregorian ordinal: 0001-01-01 is day 1.  Build via
	GemStone Date arithmetic from the 0001-01-01 anchor."

	| epoch result |
	epoch := Date @env0:newDay: 1 monthNumber: 1 year: 1.
	result := epoch @env0:addDays: (ordinal @env0:- 1).
	^ self @env1:___allocateInstance___:
		{ result @env0:year. result @env0:monthIndex. result @env0:dayOfMonth } kw: nil

]

{ #category : 'Grail-Initialization' }
PyDate class >> fromtimestamp: ts [
	"date.fromtimestamp(ts) == datetime.fromtimestamp(ts).date().  Delegate
	to PyDateTime's epoch+addSeconds path (Duration>>fromSeconds: is absent
	in this GemStone, which crashed the old implementation) for the field
	arithmetic/validation, but allocate via self (not the plain PyDate
	`.date()' would hand back) so a subclass's overridden __new__ runs
	(test_subclass_alternate_constructors)."

	| dt |
	dt := PyDateTime fromtimestamp: ts.
	^ self @env1:___allocateInstance___: { dt year. dt month. dt day } kw: nil

]

{ #category : 'Grail-Class Attrs' }
PyDate class >> max [
	^ PyDate @env0:___fromFields___: 9999 _: 12 _: 31

]

{ #category : 'Grail-Class Attrs' }
PyDate class >> min [
	^ PyDate @env0:___fromFields___: 1 _: 1 _: 1

]

{ #category : 'Grail-Class Attrs' }
PyDate class >> resolution [
	"date.resolution == timedelta(days=1)."

	^ PyTimedelta @env0:___fromTotalMicros___: (86400 @env0:* 1000000)

]

{ #category : 'Grail-Initialization' }
PyDate class >> strptime: dateStr _: fmt [
	"date.strptime(date_string, format) (CPython 3.14+) — delegates to the
	vendored _strptime, exactly as PyDateTime>>strptime:_: does
	(test_strptime, test_strptime_single_digit, test_strptime_leap_year)."

	^ (importlib ___runtimeModule___: '_strptime') _strptime_datetime_date: self _: dateStr _: fmt

]

{ #category : 'Grail-Initialization' }
PyDate class >> today [
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

]

{ #category : 'Grail-Callable' }
PyDate class >> value: positional value: kwargs [
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

]

{ #category : 'Grail-Equality' }
PyDate >> ___isDateOperand___: other [
	"Is other a date that date's own comparisons and subtraction accept?  A
	datetime is a date subclass, but CPython's date methods answer
	NotImplemented for one, so ``date(2026, 10, 5) == datetime(2026, 10,
	5)'' is False and ``<'' or ``-'' between them raises TypeError rather
	than comparing the date parts."

	^ (other @env0:isKindOf: PyDate)
		@env0:and: [(other @env0:isKindOf: PyDateTime) @env0:not]

]

{ #category : 'Grail-Instantiation' }
PyDate >> ___new__: positional kw: kwargs [
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

	A mixed-in Enum reaches this same selector by two routes CPython treats
	oppositely -- ``super().__new__(cls, ...)'' is rejected, an explicit
	``date.__new__(cls, ...)'' is the required form -- and both arrive here with
	a mid-construction enum class as the receiver, so the ``is self being
	built?'' test this method used to make rejected the legitimate one too.  The
	guard lives at the one place that can tell them apart, SuperBoundMethod >>
	value:value:; see PyTimedelta >> ___new__:kw: for the full account."

	| y m d inst |
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

]

{ #category : 'Grail-Arithmetic' }
PyDate >> __add__: other [
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

]

{ #category : 'Grail-Equality' }
PyDate >> __eq__: other [
	"NotImplemented (not false) for a non-date, so ALWAYS_EQ and the
	reflected comparison work; foreign operands never crash."

	(self ___isDateOperand___: other) ifFalse: [^ NotImplemented].
	^ (self toordinal) @env0:= (other toordinal)

]

{ #category : 'Grail-Conversion' }
PyDate >> __format__: spec [
	"date.__format__: empty spec -> str(self); else strftime(spec)."

	| tn |
	spec @env0:isNil ifTrue: [^ self __str__].
	(spec @env0:isKindOf: CharacterCollection) ifFalse: [
		tn := spec @env0:class ___pythonBuiltinTypeName___.
		tn @env0:isNil ifTrue: [tn := spec @env0:class @env0:name @env0:asString].
		^ TypeError ___signal___: '__format__() argument must be str, not ' @env0:, tn].
	spec @env0:isEmpty ifTrue: [^ self __str__].
	^ self strftime: spec

]

{ #category : 'Grail-Equality' }
PyDate >> __ge__: other [
	(self ___isDateOperand___: other) ifFalse: [^ NotImplemented].
	^ (self toordinal) @env0:>= (other toordinal)

]

{ #category : 'Grail-Equality' }
PyDate >> __gt__: other [
	(self ___isDateOperand___: other) ifFalse: [^ NotImplemented].
	^ (self toordinal) @env0:> (other toordinal)

]

{ #category : 'Grail-Equality' }
PyDate >> __hash__ [
	^ self toordinal

]

{ #category : 'Grail-Equality' }
PyDate >> __le__: other [
	(self ___isDateOperand___: other) ifFalse: [^ NotImplemented].
	^ (self toordinal) @env0:<= (other toordinal)

]

{ #category : 'Grail-Equality' }
PyDate >> __lt__: other [
	(self ___isDateOperand___: other) ifFalse: [^ NotImplemented].
	^ (self toordinal) @env0:< (other toordinal)

]

{ #category : 'Grail-Equality' }
PyDate >> __ne__: other [
	| eq |
	eq := self __eq__: other.
	(eq @env0:== NotImplemented) ifTrue: [^ eq].
	^ eq @env0:not

]

{ #category : 'Grail-Arithmetic' }
PyDate >> __radd__: other [
	"timedelta + date -> date (addition is commutative here)."

	^ self __add__: other

]

{ #category : 'Grail-Pickle' }
PyDate >> __reduce__ [
	"(class, (year, month, day)) — pickle reconstructs via date(y, m, d)."

	^ tuple @env0:withAll: {
		(self @env0:class).
		(tuple @env0:withAll: {
			(self @env0:dynamicInstVarAt: #_year).
			(self @env0:dynamicInstVarAt: #_month).
			(self @env0:dynamicInstVarAt: #_day) }) }

]

{ #category : 'Grail-Conversion' }
PyDate >> __repr__ [
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

]

{ #category : 'Grail-Attribute Access' }
PyDate >> __setattr__: name _: value [
	"Exact date instances have no attribute storage in CPython
	(test_extra_attributes); Python-level subclasses keep theirs."

	(self @env0:class @env0:== PyDate) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.date'' object has no attribute ''' @env0:,
			name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value

]

{ #category : 'Grail-Conversion' }
PyDate >> __str__ [
	^ self isoformat

]

{ #category : 'Grail-Arithmetic' }
PyDate >> __sub__: other [
	"date - timedelta → date; date - date → timedelta."

	(other isKindOf: PyTimedelta) ifTrue: [
		"CPython is `self + timedelta(-other.days)': it negates the DAYS
		FIELD, not the whole timedelta.  Negating the timedelta first is
		different whenever it has a sub-day part -- -timedelta(days=1,
		hours=2) normalises to days=-2, so date(2000,1,2) - that answered
		1999-12-31 instead of 2000-01-01 (test_delta_non_days_ignored)."
		^ self __add__: (PyTimedelta @env0:___fromTotalMicros___:
			(other days) @env0:negated @env0:* 86400 @env0:* 1000000)].
	(self ___isDateOperand___: other) ifTrue: [
		| diff |
		diff := (self toordinal) @env0:- (other toordinal).
		^ PyTimedelta @env0:___fromTotalMicros___:
			diff @env0:* 86400 @env0:* 1000000].
	TypeError ___signal___: 'unsupported operand type(s) for -: ''date'''

]

{ #category : 'Grail-Mutation' }
PyDate >> _replace: positional kw: kwargs [
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

]

{ #category : 'Grail-Conversion' }
PyDate >> _strftime: positional kw: kwargs [
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

]

{ #category : 'Grail-Conversion' }
PyDate >> ctime [
	"C asctime-style, e.g. 'Thu Jan  1 00:00:00 2004' (day space-padded
	to width 2, time always 00:00:00)."

	| head dayStr |
	head := time instance strftime: '%a %b' _: self timetuple.
	dayStr := (self @env0:dynamicInstVarAt: #_day) @env0:printString.
	dayStr @env0:size @env0:< 2 ifTrue: [dayStr := ' ' @env0:, dayStr].
	^ head @env0:, ' ' @env0:, dayStr @env0:, ' 00:00:00 ' @env0:,
		(self @env0:___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4)

]

{ #category : 'Grail-Accessors' }
PyDate >> day [
	^ self @env0:dynamicInstVarAt: #_day

]

{ #category : 'Grail-Accessors' }
PyDate >> isocalendar [
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

]

{ #category : 'Grail-Conversion' }
PyDate >> isoformat [
	"'YYYY-MM-DD' zero-padded."

	^ (self @env0:___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4) @env0:,
		'-' @env0:,
		(self @env0:___pad___: (self @env0:dynamicInstVarAt: #_month) width: 2) @env0:,
		'-' @env0:,
		(self @env0:___pad___: (self @env0:dynamicInstVarAt: #_day) width: 2)

]

{ #category : 'Grail-Accessors' }
PyDate >> isoweekday [
	"ISO 8601: Monday=1..Sunday=7."

	^ (self weekday) @env0:+ 1

]

{ #category : 'Grail-Accessors' }
PyDate >> month [
	^ self @env0:dynamicInstVarAt: #_month

]

{ #category : 'Grail-Conversion' }
PyDate >> strftime: format [
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

]

{ #category : 'Grail-Conversion' }
PyDate >> timetuple [
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

]

{ #category : 'Grail-Accessors' }
PyDate >> toordinal [
	"Proleptic Gregorian ordinal: 0001-01-01 is day 1.  GemStone's
	Date asDays uses a different epoch (asDays of 0001-01-01 is
	-693960), so anchor the Python ordinal by subtracting the
	GemStone-side asDays for 0001-01-01."

	| epochAsDays |
	epochAsDays := -693960.
	^ (self @env0:___asDate___) @env0:asDays @env0:- epochAsDays @env0:+ 1

]

{ #category : 'Grail-Accessors' }
PyDate >> weekday [
	"Python convention: Monday=0..Sunday=6."

	| dow |
	dow := (self @env0:___asDate___) @env0:dayOfWeek.
	^ dow @env0:= 1 ifTrue: [6] ifFalse: [dow @env0:- 2]

]

{ #category : 'Grail-Accessors' }
PyDate >> year [
	^ self @env0:dynamicInstVarAt: #_year

]
