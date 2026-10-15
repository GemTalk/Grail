Extension { #name : 'PyDateTime' }

{ #category : 'Grail-Private' }
PyDateTime class >> ___applyFoldProbe___: result at: secs micros: micros [
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

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> ___ensureSessionTimeZone___ [
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

]

{ #category : 'Grail-Private' }
PyDateTime class >> ___expandTzDirectives___: fmt for: aDateTimeOrTime [
	"Port of the %z / %:z / %Z half of CPython's _wrap_strftime, run before
	the `time'-module formatter sees the string.

	utcoffset()/tzname() are asked for ONLY when the corresponding
	directive actually appears.  They used to be computed eagerly by the
	caller, so a tzinfo implementing just one of them -- CPython allows
	that; the base tzinfo raises NotImplementedError for whichever is
	missing -- made an unrelated format explode: a Badtzname whose
	tzname() works but whose utcoffset() does not answered
	NotImplementedError for strftime('%Z'), which asks for no offset at
	all (test_zones).

	A left-to-right SCANNER, not copyReplaceAll:, for two reasons CPython
	shares: '%%z' must stay a literal percent followed by 'z' rather than
	having its tail rewritten (test_zones formats '%%z=%z'), and a tzname
	is arbitrary user text whose own '%' characters must be DOUBLED so the
	downstream formatter emits them literally.

	An empty expansion is correct for a naive value: CPython renders %z and
	%Z as '' when utcoffset()/tzname() answer None."

	| out i n ch offset tzName haveOffset haveTzName |
	out := WriteStream @env0:on: Unicode7 @env0:new.
	haveOffset := false.
	haveTzName := false.
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
							haveOffset ifFalse: [
								offset := aDateTimeOrTime utcoffset. haveOffset := true].
							out @env0:nextPutAll:
								(PyDateTime ___formatOffsetDirective___: offset sep: '')
						] ifFalse: [
						c2 @env0:= $Z ifTrue: [
							haveTzName ifFalse: [
								tzName := aDateTimeOrTime tzname. haveTzName := true].
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
									haveOffset ifFalse: [
										offset := aDateTimeOrTime utcoffset. haveOffset := true].
									out @env0:nextPutAll:
										(PyDateTime ___formatOffsetDirective___: offset sep: ':')]
								ifFalse: [out @env0:nextPut: $%. out @env0:nextPut: c2]
						] ifFalse: [
							out @env0:nextPut: $%. out @env0:nextPut: c2]]]]]
			ifFalse: [out @env0:nextPut: ch]].
	^ out @env0:contents

]

{ #category : 'Grail-Private' }
PyDateTime class >> ___formatOffsetDirective___: offset sep: sep [
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

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> ___fromDateTime___: dt micros: micros tz: tz2 gmt: useGmt [
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
	"LOCAL civil fields come from time.localtime, which consults the tz
	DATABASE when one applies.  Reading DateTime's session-zone accessors
	instead used GemStone's rule-based zone, so this half of the round trip
	described a different zone from timestamp()'s half -- which goes through
	___mktime___ -> time.localtime -- and test_fromtimestamp_limits came back
	1:16:48 out, that being a Local Mean Time offset."
	^ self @env1:___fromLocalEpoch___:
		(((time @env0:___epochDaysForYear___: dt @env0:yearGmt
				_month: dt @env0:monthGmt
				_day: dt @env0:dayOfMonthGmt) @env0:* 86400)
			@env0:+ (dt @env0:hourGmt @env0:* 3600)
			@env0:+ (dt @env0:minuteGmt @env0:* 60)
			@env0:+ dt @env0:secondGmt)
		micros: micros tz: tz2

]

{ #category : 'Grail-Pickle' }
PyDateTime class >> ___fromDateTimeState___: s tz: tzArg [
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

]

{ #category : 'Grail-Private' }
PyDateTime class >> ___fromLocalEpoch___: epochSeconds micros: micros tz: tz2 [
	"Build the instance from the LOCAL civil fields of an instant, via
	time.localtime so the tz database drives the conversion."

	| st |
	st := time instance localtime: epochSeconds.
	^ self @env1:___allocateInstance___:
		{ (st __getitem__: 0).
		  (st __getitem__: 1).
		  (st __getitem__: 2).
		  (st __getitem__: 3).
		  (st __getitem__: 4).
		  (st __getitem__: 5).
		  micros.
		  tz2 } kw: nil

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> ___fromTimestamp___: ts tz: tz2 gmt: useGmt [
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

]

{ #category : 'Grail-Private' }
PyDateTime class >> ___localCivilAt___: secs micros: micros [
	"A naive PyDateTime holding the LOCAL wall clock at epoch-second
	`secs' -- CPython's ``converter(t)[:6]'' probe, built through
	___fromFields___ because it is a throwaway comparison value that must
	not run a subclass's __new__ (and so must not stash attributes or
	raise from user code) while probing."

	"Through time.localtime, so the probe reads the SAME zone the value it
	is compared against did.  Reading DateTime's session-zone accessors
	here left the probe on GemStone's rule-based zone while the result came
	from the tz database, so the two disagreed across any historical
	transition and fromtimestamp stamped fold=1 on an unambiguous 1935
	Tehran instant."
	| st |
	st := time instance localtime: secs.
	^ PyDateTime @env0:___fromFields___:
		(st __getitem__: 0) _: (st __getitem__: 1) _: (st __getitem__: 2)
		_: (st __getitem__: 3) _: (st __getitem__: 4) _: (st __getitem__: 5)
		_: micros _: nil

]

{ #category : 'Grail-Private' }
PyDateTime class >> ___localEpochAt___: u [
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

]

{ #category : 'Grail-Private' }
PyDateTime class >> ___warnDeprecatedUtc___: aMessage [
	"Emit a DeprecationWarning the way CPython's real utcnow()/
	utcfromtimestamp() do (both deprecated since 3.12).  Routes through
	the live `warnings` module instance rather than sending straight to
	the class, matching Float>>___checkDunderFloatResult___:'s pattern --
	looked up dynamically because this env-1 classmethod has no compile-
	time handle on the env-0 `warnings' module object."

	| warningsMod |
	warningsMod := (importlib @env1:modules) @env0:at: #warnings ifAbsent: [nil].
	warningsMod ifNotNil: [warningsMod warn: aMessage _: DeprecationWarning]

]

{ #category : 'Grail-Class Attrs' }
PyDateTime class >> __module__ [
	^ 'datetime'

]

{ #category : 'Grail-Introspection' }
PyDateTime class >> __name__ [
	^ self @env0:== PyDateTime
		ifTrue: ['datetime']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Introspection' }
PyDateTime class >> __qualname__ [
	^ self @env0:== PyDateTime
		ifTrue: ['datetime']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> _combine: positional kw: kwargs [
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
	env-1 MessageNotUnderstood).  A datetime is a date, so it is accepted
	too."
	(d @env0:isKindOf: PyDate) ifFalse: [
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

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> _datetime: positional kw: kwargs [
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

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> _fromtimestamp: positional kw: kwargs [
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

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> _now: positional kw: kwargs [
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

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> combine: aDate _: aTime [
	"datetime.combine(date, time) — merge fields; inherit time's tzinfo."

	^ self combine: aDate _: aTime _: (aTime @env0:dynamicInstVarAt: #_tzinfo)

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> combine: aDate _: aTime _: tz [
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
	A datetime is a date, so it is accepted too, as in CPython."

	| tz2 |
	(aDate @env0:isKindOf: PyDate) ifFalse: [
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

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> fromisocalendar: year _: week _: day [
	"datetime.fromisocalendar(y, w, d) -> naive datetime at midnight
	(inverse of isocalendar(), via the date-part ordinal).  self, not
	PyDateTime: preserves the subclass."

	^ self @env1:fromordinal: (PyDate fromisocalendar: year _: week _: day) toordinal

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> fromisoformat: s [
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
		"dateLen is where the date WOULD end: 10 for any 'YYYY-' prefix, even
		when the string is only 9 long ('2020-2020', '2020-12-1').  CPython
		slices dtstr[:10], which clamps; copyFrom:to: past the end raised an
		uncatchable OffsetError instead.  The short date then fails to parse
		as the ValueError this handler reports."
		PyDate @env1:___parseIsoDateFields___:
			(str @env0:copyFrom: 1 to: (dateLen @env0:min: str @env0:size))]
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

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> fromordinal: ordinal [
	"Proleptic Gregorian ordinal -> naive datetime at midnight."

	"self, not PyDateTime: fromordinal() preserves the subclass, AND (via
	___allocateInstance___:kw: rather than ___fromFields___:) routes
	through a subclass-overridden __new__ (test_subclass_alternate_constructors)."
	| d |
	d := PyDate fromordinal: ordinal.
	^ self @env1:___allocateInstance___:
		{ (d year). (d month). (d day). 0. 0. 0. 0. nil } kw: nil

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> fromtimestamp: ts [
	^ self fromtimestamp: ts _: nil

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> fromtimestamp: ts _: tz [
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

]

{ #category : 'Grail-Class Attrs' }
PyDateTime class >> max [
	^ PyDateTime @env0:___fromFields___: 9999 _: 12 _: 31 _: 23 _: 59 _: 59 _: 999999 _: nil

]

{ #category : 'Grail-Class Attrs' }
PyDateTime class >> min [
	^ PyDateTime @env0:___fromFields___: 1 _: 1 _: 1 _: 0 _: 0 _: 0 _: 0 _: nil

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> now [
	^ self now: nil

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> now: tz [
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

]

{ #category : 'Grail-Class Attrs' }
PyDateTime class >> resolution [
	^ PyTimedelta @env0:___fromTotalMicros___: 1

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> strptime: dateStr _: fmt [
	"datetime.strptime(date_string, format) delegates to the vendored
	_strptime module (CPython's C datetime does the same), imported once
	and reused from sys.modules (#1222)."

	^ (importlib ___runtimeModule___: '_strptime') _strptime_datetime_datetime: self _: dateStr _: fmt

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> today [
	"datetime.today() — CPython defines it as exactly now() with no tz
	(it OVERRIDES date.today, which would build a date — test_today)."

	^ self now: nil

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> utcfromtimestamp: ts [
	"utcfromtimestamp(ts) - naive UTC version.

	No longer delegates to ``fromtimestamp: ts _: nil'': that answers
	HOST-LOCAL wall time now, so the two had to stop being the same method
	or every caller asking for UTC would quietly have started getting local
	time.  Shares the epoch arithmetic and error handling via
	___fromTimestamp___:tz:gmt: and simply asks for the GMT field family."

	self ___warnDeprecatedUtc___: 'datetime.utcfromtimestamp() is deprecated and scheduled for removal in a future version.  Use timezone-aware objects to represent datetimes in UTC: datetime.fromtimestamp(timestamp, datetime.UTC).'.
	^ self ___fromTimestamp___: ts tz: nil gmt: true

]

{ #category : 'Grail-Initialization' }
PyDateTime class >> utcnow [
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

]

{ #category : 'Grail-Callable' }
PyDateTime class >> value: positional value: kwargs [
	^ self _datetime: positional kw: kwargs

]

{ #category : 'Grail-Private' }
PyDateTime >> ___awareCmp___: other allowMixed: allowMixed [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___checkUtcOffsetResult___: result for: methodName [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___compareKey___ [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___copyFoldTo___: aTime [
	"Carry self's fold onto an extracted PyTime, storing only a fold of 1
	so a plain value keeps its absent-instVar representation."

	| fold |
	fold := self @env0:dynamicInstVarAt: #_fold.
	(fold @env0:notNil and: [fold @env0:= 1]) ifTrue: [
		aTime @env0:dynamicInstVarAt: #_fold put: 1].
	^ aTime

]

{ #category : 'Grail-Private' }
PyDateTime >> ___dayOfYear___ [
	"Plain Date, not a GMT DateTime -- see ___pyDayOfWeek___ for why."

	^ (Date
		@env0:newDay: (self @env0:dynamicInstVarAt: #_day)
		monthNumber: (self @env0:dynamicInstVarAt: #_month)
		year: (self @env0:dynamicInstVarAt: #_year)) @env0:dayOfYear

]

{ #category : 'Grail-Private' }
PyDateTime >> ___isoDatePart___ [
	"'YYYY-MM-DD'."

	^ (self ___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4) @env0:, '-' @env0:,
		(self ___pad___: (self @env0:dynamicInstVarAt: #_month) width: 2) @env0:, '-' @env0:,
		(self ___pad___: (self @env0:dynamicInstVarAt: #_day) width: 2)

]

{ #category : 'Grail-Private' }
PyDateTime >> ___isoTimePart___: timespec [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___isoTzSuffix___ [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___localNaiveEpochSeconds___ [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___localTimezone___ [
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
	"The offset that maps THIS wall clock to its instant, not the offset in
	force AT that instant.  For a time inside a spring-forward GAP those
	differ: the wall clock never happened, so local(ts) - ts describes the
	post-transition side whichever fold was asked for, and astimezone()
	answered the two folds the wrong way round (gh-83861's check, that
	utc(fold=0) == utc(fold=1) + shift, came out inverted).  Deriving it
	from ___mktime___'s answer keeps astimezone consistent with
	timestamp(), which resolves the gap correctly for both folds.
	Unchanged for an AWARE value, where ts already came from its own
	utcoffset and this is the same quantity."
	off := myoff @env0:isNil
		ifTrue: [((self ___naiveEpochMicros___) @env0:// 1000000) @env0:- ts]
		ifFalse: [(PyDateTime ___localEpochAt___: ts) @env0:- ts].
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___mktime___ [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___naiveEpochMicros___ [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___naiveEpochSeconds___ [
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

]

{ #category : 'Grail-Instantiation' }
PyDateTime >> ___new__: positional kw: kwargs [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___pad___: n width: w [
	| s |
	s := n @env0:printString.
	[s @env0:size @env0:< w] @env0:whileTrue: [s := '0' @env0:, s].
	^ s

]

{ #category : 'Grail-Private' }
PyDateTime >> ___pyDayOfWeek___ [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> ___utcoffsetFoldFlipped___ [
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

]

{ #category : 'Grail-Arithmetic' }
PyDateTime >> __add__: other [
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

]

{ #category : 'Grail-Equality' }
PyDateTime >> __eq__: other [
	"NotImplemented (not false) for a non-datetime, so ALWAYS_EQ and the
	reflected comparison work; foreign operands never crash."

	(other isKindOf: PyDateTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: true) @env0:= 0

]

{ #category : 'Grail-Conversion' }
PyDateTime >> __format__: spec [
	"datetime.__format__: empty spec -> str(self); else strftime(spec)."

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
PyDateTime >> __ge__: other [
	(other isKindOf: PyDateTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: false) @env0:>= 0

]

{ #category : 'Grail-Equality' }
PyDateTime >> __gt__: other [
	(other isKindOf: PyDateTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: false) @env0:> 0

]

{ #category : 'Grail-Equality' }
PyDateTime >> __hash__ [
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

]

{ #category : 'Grail-Equality' }
PyDateTime >> __le__: other [
	(other isKindOf: PyDateTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: false) @env0:<= 0

]

{ #category : 'Grail-Equality' }
PyDateTime >> __lt__: other [
	(other isKindOf: PyDateTime) ifFalse: [^ NotImplemented].
	^ (self ___awareCmp___: other allowMixed: false) @env0:< 0

]

{ #category : 'Grail-Equality' }
PyDateTime >> __ne__: other [
	| eq |
	eq := self __eq__: other.
	(eq @env0:== NotImplemented) ifTrue: [^ eq].
	^ eq @env0:not

]

{ #category : 'Grail-Arithmetic' }
PyDateTime >> __radd__: other [
	"timedelta + datetime -> datetime (addition is commutative here)."

	^ self __add__: other

]

{ #category : 'Grail-Pickle' }
PyDateTime >> __reduce__ [
	"(class, state) at the default protocol, per CPython's
	datetime.__reduce__ (which is __reduce_ex__(2))."

	^ self __reduce_ex__: 2

]

{ #category : 'Grail-Pickle' }
PyDateTime >> __reduce_ex__: protocol [
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

]

{ #category : 'Grail-Conversion' }
PyDateTime >> __repr__ [
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

]

{ #category : 'Grail-Attribute Access' }
PyDateTime >> __setattr__: name _: value [
	"Exact datetime instances have no attribute storage in CPython
	(test_extra_attributes); Python-level subclasses keep theirs."

	(self @env0:class @env0:== PyDateTime) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.datetime'' object has no attribute ''' @env0:,
			name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value

]

{ #category : 'Grail-Conversion' }
PyDateTime >> __str__ [
	^ self isoformat: ' '

]

{ #category : 'Grail-Arithmetic' }
PyDateTime >> __sub__: other [
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

]

{ #category : 'Grail-Conversion' }
PyDateTime >> _astimezone: positional kw: kwargs [
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

]

{ #category : 'Grail-Conversion' }
PyDateTime >> _isoformat: positional kw: kwargs [
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

]

{ #category : 'Grail-Public' }
PyDateTime >> _replace: positional kw: kwargs [
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
	"The call a subclass's own __new__ sees, so it is CPython's
	call_subclass_fold: fold= only when it is 1 (tomlkit's Time and DateTime
	take no fold, and every replace() of theirs raised TypeError), the
	keywords in a Python dict, and None, not nil, for no tzinfo."
	^ self @env0:class @env1:___allocateInstance___:
		{ y. mo. d. h. mi. s. us. (tz @env0:isNil ifTrue: [None] ifFalse: [tz]) }
		kw: (fold @env0:= 0
			ifTrue: [nil]
			ifFalse: [((Python @env0:at: #PyDict) @env0:new) @env0:at: 'fold' put: fold; @env0:yourself])

]

{ #category : 'Grail-Conversion' }
PyDateTime >> _strftime: positional kw: kwargs [
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
PyDateTime >> astimezone: tz [
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

]

{ #category : 'Grail-Conversion' }
PyDateTime >> ctime [
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

]

{ #category : 'Grail-Accessors' }
PyDateTime >> date [
	"The date() part as a naive PyDate."

	^ PyDate @env0:___fromFields___:
		(self @env0:dynamicInstVarAt: #_year)
		_: (self @env0:dynamicInstVarAt: #_month)
		_: (self @env0:dynamicInstVarAt: #_day)

]

{ #category : 'Grail-Accessors' }
PyDateTime >> day [
	^ (self @env0:dynamicInstVarAt: #_day)

]

{ #category : 'Grail-Accessors' }
PyDateTime >> dst [
	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ self ___checkUtcOffsetResult___: (tz dst: self) for: 'dst'

]

{ #category : 'Grail-Accessors' }
PyDateTime >> fold [
	"PEP 495 fold flag; 0 unless set via the constructor's fold= keyword
	(Grail does not model DST-fold ambiguity)."

	| f |
	f := self @env0:dynamicInstVarAt: #_fold.
	^ f @env0:isNil ifTrue: [0] ifFalse: [f]

]

{ #category : 'Grail-Accessors' }
PyDateTime >> hour [
	^ (self @env0:dynamicInstVarAt: #_hour)

]

{ #category : 'Grail-Accessors' }
PyDateTime >> isocalendar [
	"(ISO year, ISO week, ISO weekday) — delegates to the date part."

	^ (PyDate @env0:___fromFields___:
		(self @env0:dynamicInstVarAt: #_year)
		_: (self @env0:dynamicInstVarAt: #_month)
		_: (self @env0:dynamicInstVarAt: #_day)) isocalendar

]

{ #category : 'Grail-Conversion' }
PyDateTime >> isoformat [
	^ self _isoformat: nil kw: nil

]

{ #category : 'Grail-Conversion' }
PyDateTime >> isoformat: sep [
	"ISO 8601 representation; sep is `T` by default but can be space."

	^ self _isoformat: { sep } kw: nil

]

{ #category : 'Grail-Accessors' }
PyDateTime >> isoweekday [
	"ISO 8601: Monday=1..Sunday=7."

	^ (self ___pyDayOfWeek___) @env0:+ 1

]

{ #category : 'Grail-Accessors' }
PyDateTime >> microsecond [
	^ (self @env0:dynamicInstVarAt: #_microsecond)

]

{ #category : 'Grail-Accessors' }
PyDateTime >> minute [
	^ (self @env0:dynamicInstVarAt: #_minute)

]

{ #category : 'Grail-Accessors' }
PyDateTime >> month [
	^ (self @env0:dynamicInstVarAt: #_month)

]

{ #category : 'Grail-Accessors' }
PyDateTime >> second [
	^ (self @env0:dynamicInstVarAt: #_second)

]

{ #category : 'Grail-Conversion' }
PyDateTime >> strftime: format [
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
	fmt := PyDateTime ___expandTzDirectives___: fmt for: self.
	^ time instance strftime: fmt _: structTime

]

{ #category : 'Grail-Accessors' }
PyDateTime >> time [
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

]

{ #category : 'Grail-Conversion' }
PyDateTime >> timestamp [
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

]

{ #category : 'Grail-Conversion' }
PyDateTime >> timetuple [
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

]

{ #category : 'Grail-Accessors' }
PyDateTime >> timetz [
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

]

{ #category : 'Grail-Accessors' }
PyDateTime >> toordinal [
	"Proleptic Gregorian ordinal of the date part.  Kept although
	PyDateTime now inherits PyDate's: that one would answer the same."

	^ self date toordinal

]

{ #category : 'Grail-Accessors' }
PyDateTime >> tzinfo [
	(self @env0:dynamicInstVarAt: #_tzinfo) @env0:isNil ifTrue: [^ None].
	^ (self @env0:dynamicInstVarAt: #_tzinfo)

]

{ #category : 'Grail-Accessors' }
PyDateTime >> tzname [
	| tz result |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	result := tz tzname: self.
	(result @env0:== None or: [result @env0:isKindOf: CharacterCollection]) ifFalse: [
		^ TypeError ___signal___: 'tzinfo.tzname() must return None or a string, not '
			@env0:, result @env0:class __name__].
	^ result

]

{ #category : 'Grail-Accessors' }
PyDateTime >> utcoffset [
	"tzinfo.utcoffset(self), or None when naive.  Validates the tzinfo
	subclass's return value the way CPython's C implementation does --
	None or a timedelta strictly within (-24h, 24h) -- since a custom
	tzinfo is arbitrary user code (test_tzinfo_classes,
	test_bad_tzinfo_classes)."

	| tz |
	tz := self @env0:dynamicInstVarAt: #_tzinfo.
	tz @env0:isNil ifTrue: [^ None].
	^ self ___checkUtcOffsetResult___: (tz utcoffset: self) for: 'utcoffset'

]

{ #category : 'Grail-Conversion' }
PyDateTime >> utctimetuple [
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

]

{ #category : 'Grail-Accessors' }
PyDateTime >> weekday [
	"Monday=0..Sunday=6 (test_weekday).  Inherited from date in CPython;
	this answers the same as PyDate's, from the stored fields."

	^ self ___pyDayOfWeek___

]

{ #category : 'Grail-Accessors' }
PyDateTime >> year [
	^ (self @env0:dynamicInstVarAt: #_year)

]
