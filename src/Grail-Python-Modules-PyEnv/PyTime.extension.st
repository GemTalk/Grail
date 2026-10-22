Extension { #name : 'PyTime' }

{ #category : 'Grail-Callable' }
PyTime class >> ___buildTime___: positional kw: kwargs for: cls [
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

]

{ #category : 'Grail-Pickle' }
PyTime class >> ___fromTimeState___: s tz: tzArg [
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

]

{ #category : 'Grail-Pickle' }
PyTime class >> ___isTimePickleState___: obj [
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

]

{ #category : 'Grail-Private' }
PyTime class >> ___parseHhMmSsFf___: tstr [
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

]

{ #category : 'Grail-Private' }
PyTime class >> ___parseIsoformatTime___: tstr [
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

]

{ #category : 'Grail-Private' }
PyTime class >> ___twoDigitsIn___: str at: pos [
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

]

{ #category : 'Grail-Class Attrs' }
PyTime class >> __module__ [
	^ 'datetime'

]

{ #category : 'Grail-Introspection' }
PyTime class >> __name__ [
	^ self @env0:== PyTime
		ifTrue: ['time']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Introspection' }
PyTime class >> __qualname__ [
	^ self @env0:== PyTime
		ifTrue: ['time']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Initialization' }
PyTime class >> fromisoformat: s [
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

]

{ #category : 'Grail-Class Attrs' }
PyTime class >> max [
	^ PyTime @env0:___fromFields___: 23 _: 59 _: 59 _: 999999 _: nil

]

{ #category : 'Grail-Class Attrs' }
PyTime class >> min [
	^ PyTime @env0:___fromFields___: 0 _: 0 _: 0 _: 0 _: nil

]

{ #category : 'Grail-Class Attrs' }
PyTime class >> resolution [
	^ PyTimedelta @env0:___fromTotalMicros___: 1

]

{ #category : 'Grail-Initialization' }
PyTime class >> strptime: dateStr _: fmt [
	"time.strptime(date_string, format) (CPython 3.14+) — delegates to the
	vendored _strptime, exactly as PyDateTime>>strptime:_: does
	(test_strptime, test_strptime_errors, test_strptime_tz)."

	^ (importlib ___runtimeModule___: '_strptime') _strptime_datetime_time: self _: dateStr _: fmt

]

{ #category : 'Grail-Callable' }
PyTime class >> value: positional value: kwargs [
	"time(hour=0, minute=0, second=0, microsecond=0, tzinfo=None, *, fold=0)."

	^ PyTime ___buildTime___: positional kw: kwargs for: self

]

{ #category : 'Grail-Private' }
PyTime >> ___awareCmp___: other allowMixed: allowMixed [
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

]

{ #category : 'Grail-Private' }
PyTime >> ___checkUtcOffsetResult___: result for: methodName [
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

]

{ #category : 'Grail-Private' }
PyTime >> ___cmpKey___ [
	"Microseconds since midnight — the NAIVE half of every comparison
	(tzinfo is layered on top by ___awareCmp___:allowMixed:)."

	^ (((self @env0:dynamicInstVarAt: #_hour) @env0:* 60
		@env0:+ (self @env0:dynamicInstVarAt: #_minute)) @env0:* 60
		@env0:+ (self @env0:dynamicInstVarAt: #_second)) @env0:* 1000000
		@env0:+ (self @env0:dynamicInstVarAt: #_microsecond)

]

{ #category : 'Grail-Conversion' }
PyTime >> ___isoformat___: positional kw: kwargs [
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

]

{ #category : 'Grail-Private' }
PyTime >> ___isoTzSuffix___ [
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

]

{ #category : 'Grail-Instantiation' }
PyTime >> ___new__: positional kw: kwargs [
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

]

{ #category : 'Grail-Equality' }
PyTime >> __eq__: other [
	"NotImplemented (not false) for a non-time, so ALWAYS_EQ and the
	reflected comparison work; foreign operands never crash."

	(other isKindOf: PyTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: true) @env0:= 0

]

{ #category : 'Grail-Conversion' }
PyTime >> __format__: spec [
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
PyTime >> __ge__: other [
	(other isKindOf: PyTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: false) @env0:>= 0

]

{ #category : 'Grail-Equality' }
PyTime >> __gt__: other [
	(other isKindOf: PyTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: false) @env0:> 0

]

{ #category : 'Grail-Equality' }
PyTime >> __hash__ [
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

]

{ #category : 'Grail-Equality' }
PyTime >> __le__: other [
	(other isKindOf: PyTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: false) @env0:<= 0

]

{ #category : 'Grail-Equality' }
PyTime >> __lt__: other [
	(other isKindOf: PyTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: false) @env0:< 0

]

{ #category : 'Grail-Equality' }
PyTime >> __ne__: other [
	| eq |
	eq := self __eq__: other.
	(eq @env0:== NotImplemented) ifTrue: [^ eq].
	^ eq @env0:not

]

{ #category : 'Grail-Pickle' }
PyTime >> __reduce__ [
	"(class, state) at the default protocol, per CPython's time.__reduce__."

	^ self __reduce_ex__: 2

]

{ #category : 'Grail-Pickle' }
PyTime >> __reduce_ex__: protocol [
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

]

{ #category : 'Grail-Conversion' }
PyTime >> __repr__ [
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

]

{ #category : 'Grail-Attribute Access' }
PyTime >> __setattr__: name _: value [
	"Exact time instances have no attribute storage in CPython
	(test_extra_attributes); Python-level subclasses keep theirs."

	(self @env0:class @env0:== PyTime) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.time'' object has no attribute ''' @env0:,
			name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value

]

{ #category : 'Grail-Conversion' }
PyTime >> __str__ [
	^ self isoformat

]

{ #category : 'Grail-Conversion' }
PyTime >> _isoformat: positional kw: kwargs [
	"The varargs form ``isoformat(...)'' compiles to; the work is ___isoformat___:kw:.
	Kept apart from it because a Python subclass's own ``def isoformat'' compiles a
	``_isoformat:kw:'' too, and a fixed form re-sending THIS selector landed on that
	override: ``time.isoformat(sub)'' answered the subclass's result (#1613)."

	^ self ___isoformat___: positional kw: kwargs
]

{ #category : 'Grail-Mutation' }
PyTime >> _replace: positional kw: kwargs [
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
	"The call a subclass's own __new__ sees, so it is CPython's
	call_subclass_fold: fold= only when it is 1 (tomlkit's Time and DateTime
	take no fold, and every replace() of theirs raised TypeError), the
	keywords in a Python dict, and None, not nil, for no tzinfo."
	^ self @env0:class @env1:___allocateInstance___:
		{ h. mi. s. us. (tz @env0:isNil ifTrue: [None] ifFalse: [tz]) }
		kw: (fold @env0:= 0
			ifTrue: [nil]
			ifFalse: [((Python @env0:at: #PyDict) @env0:new) @env0:at: 'fold' put: fold; @env0:yourself])

]

{ #category : 'Grail-Conversion' }
PyTime >> _strftime: positional kw: kwargs [
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

{ #category : 'Grail-Accessors' }
PyTime >> dst [
	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ self ___checkUtcOffsetResult___: (tz dst: None) for: 'dst'

]

{ #category : 'Grail-Accessors' }
PyTime >> fold [
	"PEP 495 fold flag.  Grail does not model DST-fold ambiguity, so it
	is 0 unless explicitly set via the constructor's fold= keyword."

	| f |
	f := self @env0:dynamicInstVarAt: #_fold.
	^ f @env0:isNil ifTrue: [0] ifFalse: [f]

]

{ #category : 'Grail-Accessors' }
PyTime >> hour [
	^ self @env0:dynamicInstVarAt: #_hour

]

{ #category : 'Grail-Conversion' }
PyTime >> isoformat [
	"'HH:MM:SS[.ffffff][+HH:MM]'.  Routed through the timespec form so the
	no-arg spelling (and __str__ through it) also carries the UTC-offset
	suffix for aware times."

	^ self ___isoformat___: nil kw: nil

]

{ #category : 'Grail-Accessors' }
PyTime >> microsecond [
	^ self @env0:dynamicInstVarAt: #_microsecond

]

{ #category : 'Grail-Accessors' }
PyTime >> minute [
	^ self @env0:dynamicInstVarAt: #_minute

]

{ #category : 'Grail-Accessors' }
PyTime >> second [
	^ self @env0:dynamicInstVarAt: #_second

]

{ #category : 'Grail-Conversion' }
PyTime >> strftime: format [
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
	fmt := PyDateTime ___expandTzDirectives___: fmt for: self.
	^ time instance strftime: fmt _: structTime

]

{ #category : 'Grail-Accessors' }
PyTime >> tzinfo [
	"None when naive; the configured tzinfo otherwise."

	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	^ tz @env0:isNil ifTrue: [None] ifFalse: [tz]

]

{ #category : 'Grail-Accessors' }
PyTime >> tzname [
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

]

{ #category : 'Grail-Accessors' }
PyTime >> utcoffset [
	"tzinfo.utcoffset(None), or None when naive.  Validated like
	PyDateTime>>utcoffset -- a custom tzinfo is arbitrary user code
	(test_tzinfo_classes)."

	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ self ___checkUtcOffsetResult___: (tz utcoffset: None) for: 'utcoffset'

]
