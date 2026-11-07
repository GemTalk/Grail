Extension { #name : 'time' }

{ #category : 'Grail-Formatting' }
time class >> ___dayOfMonthOutOfRangeMessage [
	^ 'day of month out of range'

]

{ #category : 'Grail-Formatting' }
time class >> ___dayOfWeekOutOfRangeMessage [
	^ 'day of week out of range'

]

{ #category : 'Grail-Formatting' }
time class >> ___dayOfYearOutOfRangeMessage [
	^ 'day of year out of range'

]

{ #category : 'Grail-Formatting' }
time class >> ___hourOutOfRangeMessage [
	^ 'hour out of range'

]

{ #category : 'Grail-Formatting' }
time class >> ___illegalTimeTupleMessage [
	^ 'strftime(): illegal time tuple argument'

]

{ #category : 'Grail-Formatting' }
time class >> ___intAboveMaximumMessage [
	^ 'signed integer is greater than maximum'

]

{ #category : 'Grail-Formatting' }
time class >> ___intBelowMinimumMessage [
	^ 'signed integer is less than minimum'

]

{ #category : 'Grail-Formatting' }
time class >> ___minuteOutOfRangeMessage [
	^ 'minute out of range'

]

{ #category : 'Grail-Formatting' }
time class >> ___monthOutOfRangeMessage [
	^ 'month out of range'

]

{ #category : 'Grail-Formatting' }
time class >> ___secondsOutOfRangeMessage [
	^ 'seconds out of range'

]

{ #category : 'Grail-Formatting' }
time class >> ___strftimeCallout [

	"strftime(3).  A CCallout wraps per-process C state, so it lives in
	SessionTemps, as os's callouts do."

	^ SessionTemps @env0:current
		@env0:at: #'Grail_time_strftime_callout'
		ifAbsentPut: [
			CCallout
				@env0:library: (CLibrary @env0:named: os ___libcName)
				name: 'strftime'
				result: #'uint64'
				args: #(#'ptr' #'uint64' #'ptr' #'ptr')]

]

{ #category : 'Grail-Formatting' }
time class >> ___strftimeFormatMessageFor: aFormat [
	^ 'strftime() argument 1 must be str, not '
		@env0:, (TypeError @env0:___badArgumentNameOf___: aFormat)

]

{ #category : 'Grail-Formatting' }
time class >> ___timeTupleRequiredMessage [
	^ 'Tuple or struct_time argument required'

]

{ #category : 'Grail-Formatting' }
time class >> ___yearOutOfRangeMessage [
	^ 'year out of range'

]

{ #category : 'Grail-Formatting' }
time >> ___check___: aField from: aMinimum to: aMaximum message: aMessage [

	(aField @env0:between: aMinimum and: aMaximum) ifFalse: [^ ValueError ___signal___: aMessage]

]

{ #category : 'Grail-Formatting' }
time >> ___checkedStructTmFields___: someFields [

	"someFields as checktm checks them (Modules/timemodule.c:679-748), each in
	turn: a month, a day of the month or a day of the year of 0 taken as the
	first, and any field out of its range refused."

	| fields |

	fields := someFields @env0:copy.
	(fields @env0:at: 5) @env0:= -1 ifTrue: [fields @env0:at: 5 put: 0].
	self ___check___: (fields @env0:at: 5) from: 0 to: 11 message: time ___monthOutOfRangeMessage.
	(fields @env0:at: 4) @env0:= 0 ifTrue: [fields @env0:at: 4 put: 1].
	self ___check___: (fields @env0:at: 4) from: 1 to: 31 message: time ___dayOfMonthOutOfRangeMessage.
	self ___check___: (fields @env0:at: 3) from: 0 to: 23 message: time ___hourOutOfRangeMessage.
	self ___check___: (fields @env0:at: 2) from: 0 to: 59 message: time ___minuteOutOfRangeMessage.
	self ___check___: (fields @env0:at: 1) from: 0 to: 61 message: time ___secondsOutOfRangeMessage.
	self ___check___: (fields @env0:at: 7) from: 0 to: 6 message: time ___dayOfWeekOutOfRangeMessage.
	(fields @env0:at: 8) @env0:= -1 ifTrue: [fields @env0:at: 8 put: 0].
	self ___check___: (fields @env0:at: 8) from: 0 to: 365 message: time ___dayOfYearOutOfRangeMessage.
	fields @env0:at: 9 put: (((fields @env0:at: 9) @env0:max: -1) @env0:min: 1).
	^ fields

]

{ #category : 'Grail-Formatting' }
time >> ___cIntField___: anObject [

	"anObject as PyArg_ParseTuple's ``i'' converts a time tuple's field
	(Python/getargs.c, convertsimple): an int, or what __index__ answers, that a
	C int holds."

	| value |

	value := anObject ___asIndex___.
	value @env0:> 2147483647 ifTrue: [^ OverflowError ___signal___: time ___intAboveMaximumMessage].
	value @env0:< -2147483648 ifTrue: [^ OverflowError ___signal___: time ___intBelowMinimumMessage].
	^ value

]

{ #category : 'Grail-Formatting' }
time >> ___endOfAsciiRunIn___: someCodePoints from: anIndex [

	"The index just past the run of ASCII code points -- 1 to 127, no NUL --
	that starts at anIndex."

	| index |

	index := anIndex.
	[index @env0:<= someCodePoints @env0:size
		@env0:and: [(someCodePoints @env0:at: index) @env0:between: 1 and: 127]]
			@env0:whileTrue: [index := index @env0:+ 1].
	^ index

]

{ #category : 'Grail-Formatting' }
time >> ___endOfLiteralRunIn___: someCodePoints from: anIndex [

	"The index of the next % at or after anIndex, or just past the end."

	| index |

	index := anIndex.
	[index @env0:<= someCodePoints @env0:size
		@env0:and: [(someCodePoints @env0:at: index) @env0:~= 37]]
			@env0:whileTrue: [index := index @env0:+ 1].
	^ index

]

{ #category : 'Grail-Private' }
time >> ___isoWeek1Monday___: y [
	"Ordinal (GemStone Date>>asDays epoch -- any fixed epoch works since
	only used for relative comparison below) of the Monday starting ISO
	week 1 of year y.  Same algorithm as datetime_module's own
	PyDate class >> ___isoweek1monday___:, duplicated here so time's
	strftime doesn't need to depend on the datetime module -- BUT that
	original computes `firstweekday` from ordinals in PYTHON's toordinal
	epoch (ordinal 1 = Monday), which GemStone's Date>>asDays epoch does
	NOT share (different start-of-week alignment); deriving the weekday
	via Date>>dayOfWeek instead (a semantic day-of-week query, immune to
	whatever epoch asDays anchors to) avoids porting a magic-number
	offset tuned for a numbering asDays doesn't use."

	| firstDate firstday dow0Monday firstweekday week1monday |
	firstDate := Date @env0:newDay: 1 monthNumber: 1 year: y.
	firstday := firstDate @env0:asDays.
	"Date>>dayOfWeek: 1=Sunday..7=Saturday (confirmed: 2001-01-01, a real
	Monday, reports 2).  Convert to 0=Monday..6=Sunday (Python's scheme)."
	dow0Monday := (firstDate @env0:dayOfWeek @env0:- 2) @env0:\\ 7.
	firstweekday := dow0Monday.
	week1monday := firstday @env0:- firstweekday.
	firstweekday @env0:> 3 ifTrue: [week1monday := week1monday @env0:+ 7].
	^ week1monday

]

{ #category : 'Grail-Private' }
time >> ___isoYear___: y month: mon day: day [
	"The ISO 8601 year for calendar date (y, mon, day) -- %G."

	| ord week1monday nextWeek1monday |
	ord := (Date @env0:newDay: day monthNumber: mon year: y) @env0:asDays.
	week1monday := self ___isoWeek1Monday___: y.
	ord @env0:< week1monday ifTrue: [^ y @env0:- 1].
	nextWeek1monday := self ___isoWeek1Monday___: y @env0:+ 1.
	ord @env0:>= nextWeek1monday ifTrue: [^ y @env0:+ 1].
	^ y

]

{ #category : 'Grail-Private' }
time >> ___monthAbbrev___: mon [
	^ #('Jan' 'Feb' 'Mar' 'Apr' 'May' 'Jun' 'Jul' 'Aug' 'Sep' 'Oct' 'Nov' 'Dec')
		@env0:at: mon

]

{ #category : 'Grail-Private' }
time >> ___monthName___: mon [
	^ #('January' 'February' 'March' 'April' 'May' 'June' 'July'
		'August' 'September' 'October' 'November' 'December')
		@env0:at: mon

]

{ #category : 'Grail-Initialization' }
time >> ___namedTimeZone___: aName [
	"``TimeZone named:'' guarded -- an unknown name raises rather than
	answering nil, and a name that resolves to something without a real
	offset is no use either."

	^ [TimeZone @env0:named: aName @env0:asString]
		@env0:on: Error
		do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-Private' }
time >> ___parseTzFile___: bytes [
	"Parse a TZif file into { transitionTimes. offsets. isdsts. abbrevs },
	four parallel Arrays where entry i describes the period STARTING at
	transitionTimes[i].  Answers nil if the bytes are not a usable TZif.

	Reads the VERSION 2+ 64-bit block when present, and only falls back to
	the 32-bit one otherwise.  That matters for exactly the history this
	exists to get right: the 32-bit block cannot express a transition before
	1901 or after 2038, and several zones carry their pre-1900 Local Mean
	Time -- an offset that is not a whole number of minutes -- as their
	FIRST entry.  Asia/Tehran's is +12:57:36, which is why datetimetester's
	IranTest was out by 4m16s against a rule-based zone."

	| pos ver counts timecnt typecnt charcnt leapcnt isstdcnt isutcnt
	  tsize transitions typeIdx offsets isdsts abbrinds abbrevs base blockStart |
	(bytes @env0:size @env0:< 44) ifTrue: [^ nil].
	((bytes @env0:copyFrom: 1 to: 4) @env0:asString @env0:= 'TZif') ifFalse: [^ nil].
	ver := (bytes @env0:at: 5) @env0:asInteger.
	"Header counts live at offset 21 (1-based), six 4-byte big-endian ints."
	counts := [:start |
		(1 @env0:to: 6) @env0:collect: [:k |
			self ___tzBigEndianAt___: bytes
				from: start @env0:+ ((k @env0:- 1) @env0:* 4)
				size: 4 signed: false]].
	blockStart := 1.
	tsize := 4.
	"Version '2'/'3' (bytes 0x32/0x33) repeat the whole thing with 8-byte
	times after the 32-bit block; skip to that second header."
	(ver @env0:>= 50) ifTrue: [
		| c1 skip |
		c1 := counts @env0:value: 21.
		skip := 44
			@env0:+ ((c1 @env0:at: 4) @env0:* 5)
			@env0:+ ((c1 @env0:at: 5) @env0:* 6)
			@env0:+ (c1 @env0:at: 6)
			@env0:+ ((c1 @env0:at: 3) @env0:* 8)
			@env0:+ (c1 @env0:at: 2)
			@env0:+ (c1 @env0:at: 1).
		blockStart := 1 @env0:+ skip.
		(blockStart @env0:+ 44 @env0:> bytes @env0:size) ifTrue: [^ nil].
		((bytes @env0:copyFrom: blockStart to: blockStart @env0:+ 3) @env0:asString @env0:= 'TZif')
			ifFalse: [^ nil].
		tsize := 8].
	counts := counts @env0:value: blockStart @env0:+ 20.
	isutcnt := counts @env0:at: 1.
	isstdcnt := counts @env0:at: 2.
	leapcnt := counts @env0:at: 3.
	timecnt := counts @env0:at: 4.
	typecnt := counts @env0:at: 5.
	charcnt := counts @env0:at: 6.
	typecnt @env0:= 0 ifTrue: [^ nil].
	pos := blockStart @env0:+ 44.
	transitions := Array @env0:new: timecnt.
	1 @env0:to: timecnt do: [:k |
		transitions @env0:at: k put:
			(self ___tzBigEndianAt___: bytes from: pos size: tsize signed: true).
		pos := pos @env0:+ tsize].
	typeIdx := Array @env0:new: timecnt.
	1 @env0:to: timecnt do: [:k |
		typeIdx @env0:at: k put: ((bytes @env0:at: pos) @env0:asInteger).
		pos := pos @env0:+ 1].
	offsets := Array @env0:new: typecnt.
	isdsts := Array @env0:new: typecnt.
	abbrinds := Array @env0:new: typecnt.
	1 @env0:to: typecnt do: [:k |
		offsets @env0:at: k put:
			(self ___tzBigEndianAt___: bytes from: pos size: 4 signed: true).
		isdsts @env0:at: k put: ((bytes @env0:at: pos @env0:+ 4) @env0:asInteger).
		abbrinds @env0:at: k put: ((bytes @env0:at: pos @env0:+ 5) @env0:asInteger).
		pos := pos @env0:+ 6].
	base := pos.
	abbrevs := Array @env0:new: typecnt.
	1 @env0:to: typecnt do: [:k |
		| start end |
		start := base @env0:+ (abbrinds @env0:at: k).
		end := start.
		[end @env0:<= bytes @env0:size
			@env0:and: [(bytes @env0:at: end) @env0:asInteger @env0:~= 0]]
				@env0:whileTrue: [end := end @env0:+ 1].
		abbrevs @env0:at: k put:
			((bytes @env0:copyFrom: start to: end @env0:- 1) @env0:asString)].
	^ Array @env0:with: transitions with: typeIdx
		with: (Array @env0:with: offsets with: isdsts with: abbrevs)

]

{ #category : 'Grail-Initialization' }
time >> ___posixSpecAsZoneName___: aSpec [
	"Translate a POSIX TZ spec to a zone-database name; nil when it is not
	one.  See ___timeZoneForSpec___: for the two shapes and why."

	| src i n stdName sign digits dstName ch |
	src := aSpec @env0:asString.
	n := src @env0:size.
	i := 1.
	"Standard-zone abbreviation: letters (a bracketed <+03> form is not
	produced by anything in the vendored tests, so it is left unhandled
	rather than half-handled)."
	[i @env0:<= n and: [(src @env0:at: i) @env0:isLetter]] @env0:whileTrue: [
		i := i @env0:+ 1].
	stdName := src @env0:copyFrom: 1 to: i @env0:- 1.
	stdName @env0:isEmpty ifTrue: [^ nil].
	"Offset: an optional sign then digits.  POSIX counts WEST as positive,
	the same way ``Etc/GMT+N'' does, so the sign passes straight through."
	sign := ''.
	(i @env0:<= n and: [
		ch := src @env0:at: i.
		ch @env0:== ('+' @env0:at: 1) or: [ch @env0:== ('-' @env0:at: 1)]])
		ifTrue: [
			sign := src @env0:copyFrom: i to: i.
			i := i @env0:+ 1].
	digits := WriteStream @env0:on: String @env0:new.
	[i @env0:<= n and: [(src @env0:at: i) @env0:isDigit]] @env0:whileTrue: [
		digits @env0:nextPut: (src @env0:at: i).
		i := i @env0:+ 1].
	digits := digits @env0:contents.
	digits @env0:isEmpty ifTrue: [^ nil].
	"A sub-hour offset cannot be expressed as Etc/GMT+N, and no DST-bearing
	name is built from one either."
	(i @env0:<= n and: [(src @env0:at: i) @env0:== (':' @env0:at: 1)])
		ifTrue: [^ nil].
	"Daylight abbreviation, when present, up to the rule separator."
	dstName := WriteStream @env0:on: String @env0:new.
	[i @env0:<= n and: [(src @env0:at: i) @env0:isLetter]] @env0:whileTrue: [
		dstName @env0:nextPut: (src @env0:at: i).
		i := i @env0:+ 1].
	dstName := dstName @env0:contents.
	"Strip a leading zero so ``EST+05EDT'' becomes the zone name ``EST5EDT''."
	[digits @env0:size @env0:> 1 and: [(digits @env0:at: 1) @env0:== ('0' @env0:at: 1)]]
		@env0:whileTrue: [digits := digits @env0:copyFrom: 2 to: digits @env0:size].
	dstName @env0:isEmpty ifFalse: [
		"Only a WEST (unsigned or +) offset forms a database name this way."
		sign @env0:= '-' ifTrue: [^ nil].
		^ stdName @env0:, digits @env0:, dstName].
	^ 'Etc/GMT' @env0:, (sign @env0:isEmpty ifTrue: ['+'] ifFalse: [sign]) @env0:, digits

]

{ #category : 'Grail-Initialization' }
time >> ___refreshTimezoneGlobals___ [
	"Recompute ``timezone'' / ``altzone'' / ``daylight'' / ``tzname'' from the
	SESSION zone.  These used to report a fixed non-DST UTC, because Grail had
	no trustworthy local zone and documented its wall clocks as UTC throughout.

	CPython's sign convention is seconds WEST of UTC, the opposite of
	GemStone's secondsFromGmt (seconds EAST), hence the negation:
	US/Eastern is secondsFromGmt = -18000 and time.timezone = 18000.

	Split out of initialize so tzset can re-publish them after the session
	zone changes; they are cached values, not live reads, so a zone change
	that did not refresh them left time.timezone describing the old zone."

	| tz stdName dstName |
	tz := TimeZone @env0:current.
	"A zone with no DST rule answers an EMPTY dstPrintString -- the UTC zone
	reports std='UTC' dst=''.  CPython repeats the standard name instead
	(time.tzname is ('UTC', 'UTC') on a UTC host, not ('UTC', '')), so fall
	back rather than publish an empty name.  Caught by CI: this machine is
	US/Eastern, where both names are populated, and the UTC runner was the
	only place the empty one showed up."
	"Derive these from the tz DATABASE when one applies: GemStone's zone
	carries a DST rule for zones that do not use DST at all, so a host on
	(say) -03 year round reported daylight=1 and tzname ('-03','-02') where
	CPython reports 0 and ('-03','-03').  That is what
	DatetimeLocalTimeTestCase>>testIsdstTracksTheZone has been failing on:
	the flags themselves were right, but daylight=1 sent the check down the
	branch that requires them to differ."
	(self ___tzGlobalsFromTable___) ifTrue: [^ self].
	stdName := tz @env0:standardPrintString @env0:asString.
	dstName := tz @env0:dstPrintString @env0:asString.
	dstName @env0:isEmpty ifTrue: [dstName := stdName].
	self @env0:dynamicInstVarAt: #tzname
		put: (tuple @env0:withAll: { stdName. dstName }).
	self @env0:dynamicInstVarAt: #timezone
		put: (tz @env0:secondsFromGmt) @env0:negated.
	self @env0:dynamicInstVarAt: #altzone
		put: ((tz @env0:secondsFromGmt) @env0:+ (tz @env0:secondsForDst)) @env0:negated.
	self @env0:dynamicInstVarAt: #daylight
		put: ((tz @env0:secondsForDst) @env0:= 0 ifTrue: [0] ifFalse: [1])

]

{ #category : 'Grail-Formatting' }
time >> ___strftimeRun___: someCodePoints with: aStructTm [

	"One run of ASCII characters of a format formatted by strftime(3), in a
	buffer grown until it holds the result, as time_strftime1 grows it
	(Modules/timemodule.c:784-866): until 256 bytes for each byte of the run,
	past which an empty answer is taken to be the answer.  CPython calls
	wcsftime where it has one; strftime's bytes read as UTF-8 answer the same
	in the C locale."

	| format size buffer length |

	format := CByteArray @env0:withAll: (ByteArray @env0:withAll: someCodePoints) nullTerminate: true.
	size := 1024.
	[buffer := CByteArray @env0:gcMalloc: size.
	length := time ___strftimeCallout @env0:callWith: { buffer. size. format. aStructTm }.
	length @env0:= 0 @env0:and: [size @env0:< (256 @env0:* someCodePoints @env0:size)]]
		@env0:whileTrue: [size := size @env0:* 2].
	^ (buffer @env0:byteArrayFrom: 0 numBytes: length) decode: 'utf-8' _: 'surrogateescape'

]

{ #category : 'Grail-Formatting' }
time >> ___strftimeRunsOf___: someCodePoints with: aStructTm [

	"The format's runs of ASCII formatted by strftime(3), and what follows each
	up to the next % kept as it stands, as time_strftime splits the format
	(Modules/timemodule.c:912-962)."

	| result start stop |

	result := Unicode7 @env0:new.
	stop := 1.
	[stop @env0:<= someCodePoints @env0:size] @env0:whileTrue: [
		start := stop.
		stop := self ___endOfAsciiRunIn___: someCodePoints from: start.
		stop @env0:> start ifTrue: [
			result := PyStrSurrogate
				@env0:___appending___: (self
					___strftimeRun___: (someCodePoints @env0:copyFrom: start to: stop @env0:- 1)
					with: aStructTm) @env0:___pyCodePoints___
				to: result].
		start := stop.
		stop := self ___endOfLiteralRunIn___: someCodePoints from: start.
		result := PyStrSurrogate
			@env0:___appending___: (someCodePoints @env0:copyFrom: start to: stop @env0:- 1)
			to: result].
	^ result

]

{ #category : 'Grail-Private' }
time >> ___structTimeLocalFromDateTime___: dt [
	"Local struct_time — uses DateTime's session-zone accessors, and
	reports a REAL tm_isdst rather than the -1 ``unknown'' the UTC path
	uses.

	tm_isdst is derived by comparing the actual offset at this instant
	(local civil seconds minus GMT civil seconds) against the zone's
	standard offset, rather than by testing the instant against
	startOfDstFor:/endOfDstFor: -- that keeps it correct without having to
	reproduce the transition-boundary rules here."

	| localSecs gmtSecs offset tz isdst |
	localSecs := ((time @env0:___epochDaysForYear___: dt @env0:year
			_month: dt @env0:month
			_day: dt @env0:dayOfMonth) @env0:* 86400)
		@env0:+ (dt @env0:hour @env0:* 3600)
		@env0:+ (dt @env0:minute @env0:* 60)
		@env0:+ dt @env0:second.
	gmtSecs := ((time @env0:___epochDaysForYear___: dt @env0:yearGmt
			_month: dt @env0:monthGmt
			_day: dt @env0:dayOfMonthGmt) @env0:* 86400)
		@env0:+ (dt @env0:hourGmt @env0:* 3600)
		@env0:+ (dt @env0:minuteGmt @env0:* 60)
		@env0:+ dt @env0:secondGmt.
	offset := localSecs @env0:- gmtSecs.
	tz := TimeZone @env0:current.
	"The secondsForDst = 0 guard is load-bearing.  For a zone with NO DST
	rule -- UTC being the obvious one -- the standard and DST offsets are
	equal, so the comparison below is trivially true and tm_isdst came back
	1 for every instant.  No test caught that: on a DST-less zone
	time.timezone = time.altzone, so assertions that pick between them by
	tm_isdst agree whichever branch they take."
	isdst := ((tz @env0:secondsForDst @env0:~= 0)
		@env0:and: [offset @env0:= (tz @env0:secondsFromGmt @env0:+ tz @env0:secondsForDst)])
			ifTrue: [1] ifFalse: [0].
	"tm_zone is the zone's name for the half of the year this instant is in,
	tzname[tm_isdst], and tm_gmtoff the offset just measured."
	^ (self
		___structTimeYear___: dt @env0:year
		_month: dt @env0:month
		_day: dt @env0:dayOfMonth
		_hour: dt @env0:hour
		_minute: dt @env0:minute
		_second: dt @env0:second
		_dayOfWeek: dt @env0:dayOfWeek
		_dayOfYear: dt @env0:dayOfYear
		_isdst: isdst)
			___zone___: ((self @env0:dynamicInstVarAt: #tzname) @env0:at: isdst @env0:+ 1)
			offset: offset

]

{ #category : 'Grail-Private' }
time >> ___structTimeUtcFromDateTime___: dt [
	"UTC struct_time tuple — uses DateTime's *Gmt accessors.  What the C
	library's gmtime answers: not daylight time, zone UTC, offset 0
	(Modules/timemodule.c time_gmtime, through tmtotuple).  It said
	tm_isdst -1, ``unknown'', which no gmtime reports."

	^ (self
		___structTimeYear___: dt @env0:yearGmt
		_month: dt @env0:monthGmt
		_day: dt @env0:dayOfMonthGmt
		_hour: dt @env0:hourGmt
		_minute: dt @env0:minuteGmt
		_second: dt @env0:secondGmt
		_dayOfWeek: dt @env0:dayOfWeekGmt
		_dayOfYear: dt @env0:dayOfYearGmt
		_isdst: 0)
			___zone___: 'UTC'
			offset: 0

]

{ #category : 'Grail-Private' }
time >> ___structTimeYear___: year _month: mon _day: day _hour: hour _minute: min _second: sec _dayOfWeek: dow _dayOfYear: doy [
	"Build a struct_time tuple with tm_isdst UNKNOWN (-1).  Right for the
	UTC path, where DST is not a concept."

	^ self
		___structTimeYear___: year
		_month: mon
		_day: day
		_hour: hour
		_minute: min
		_second: sec
		_dayOfWeek: dow
		_dayOfYear: doy
		_isdst: -1

]

{ #category : 'Grail-Private' }
time >> ___structTimeYear___: year _month: mon _day: day _hour: hour _minute: min _second: sec _dayOfWeek: dow _dayOfYear: doy _isdst: isdst [
	"Build a struct_time tuple from components.  Python tm_wday is
	Monday=0..Sunday=6; Smalltalk dayOfWeek is Sunday=1..Saturday=7."

	| isoDow |
	isoDow := dow @env0:= 1 ifTrue: [6] ifFalse: [dow @env0:- 2].
	^ struct_time @env0:withAll: {
		year.
		mon.
		day.
		hour.
		min.
		sec.
		isoDow.
		doy.
		isdst
	}

]

{ #category : 'Grail-Formatting' }
time >> ___structTm___: someFields zone: aZoneName offset: anOffset [

	"A struct tm holding someFields -- its nine ints, in the order Darwin's and
	glibc's both lay them out -- then tm_gmtoff and a pointer to aZoneName, or
	NULL when there is none."

	| structTm |

	structTm := CByteArray @env0:gcMalloc: 56.
	someFields @env0:doWithIndex: [:field :index |
		structTm @env0:int32At: index @env0:- 1 @env0:* 4 put: field].
	structTm @env0:int64At: 40 put: anOffset.
	aZoneName @env0:isNil ifFalse: [structTm @env0:pointerAt: 48 put: aZoneName].
	^ structTm

]

{ #category : 'Grail-Formatting' }
time >> ___structTmFields___: aTimeTuple [

	"The nine fields of a struct tm -- tm_sec first -- that gettmarg makes of a
	time tuple (Modules/timemodule.c:611-676): nine ints, the year less 1900,
	the month and the day of the year counted from 0, and Sunday as day 0 of
	the week.  The week day is a C remainder, so a day below -1 stays negative
	for checktm to refuse."

	| values year |

	(aTimeTuple isKindOf: tuple) ifFalse: [^ TypeError ___signal___: time ___timeTupleRequiredMessage].
	aTimeTuple __len__ @env0:= 9 ifFalse: [^ TypeError ___signal___: time ___illegalTimeTupleMessage].
	values := (0 @env0:to: 8) @env0:collect: [:index | self ___cIntField___: (aTimeTuple __getitem__: index)].
	year := values @env0:at: 1.
	year @env0:< (-2147483648 @env0:+ 1900) ifTrue: [
		^ OverflowError ___signal___: time ___yearOutOfRangeMessage].
	^ {
		values @env0:at: 6.
		values @env0:at: 5.
		values @env0:at: 4.
		values @env0:at: 3.
		(values @env0:at: 2) @env0:- 1.
		year @env0:- 1900.
		((values @env0:at: 7) @env0:+ 1) @env0:rem: 7.
		(values @env0:at: 8) @env0:- 1.
		values @env0:at: 9 }

]

{ #category : 'Grail-Initialization' }
time >> ___timeZoneForSpec___: aSpec [
	"Resolve a TZ specification to a GemStone TimeZone, or nil.

	Two forms reach here.  An Olson name (``UTC'',
	``Australia/Lord_Howe'') the zone database answers directly.  A POSIX
	spec -- ``STD offset [DST [offset] [,rule]]'' -- has to be translated:

	  * with a DST name (``EST+05EDT,M3.2.0,M11.1.0''), the concatenation
	    ``EST5EDT'' is itself a zone the database knows, and it carries the
	    real DST rule -- which matters, since the tests using this form are
	    precisely the ones about fold and the DST transitions.
	  * without one (``EDT4'', ``MSK-03''), the zone is a fixed offset, and
	    ``Etc/GMT+N'' has POSIX's own sign convention (positive = WEST), so
	    the offset transfers unchanged.

	Anything else answers nil, and tzset raises rather than pretend."

	| name |
	aSpec @env0:isEmpty ifTrue: [^ nil].
	(self ___namedTimeZone___: aSpec) @env0:ifNotNil: [:z | ^ z].
	name := self ___posixSpecAsZoneName___: aSpec.
	name == nil ifTrue: [^ nil].
	^ self ___namedTimeZone___: name

]

{ #category : 'Grail-Private' }
time >> ___tzBigEndianAt___: bytes from: pos size: n signed: signedFlag [
	"Big-endian integer of n bytes starting at 1-based pos."

	| v first |
	v := 0.
	first := (bytes @env0:at: pos) @env0:asInteger.
	1 @env0:to: n do: [:k |
		v := (v @env0:* 256) @env0:+ ((bytes @env0:at: pos @env0:+ k @env0:- 1) @env0:asInteger)].
	(signedFlag @env0:and: [first @env0:>= 128])
		ifTrue: [v := v @env0:- (256 @env0:raisedTo: n)].
	^ v

]

{ #category : 'Grail-Private' }
time >> ___tzEntryAt___: epochSeconds [
	"{ offsetSecondsEastOfUtc. isdst. abbrev } in effect at an INSTANT, from
	the tz database, or nil when no table applies.

	Binary search for the last transition at or before the instant.  Before
	the first transition the tz format says to use the first NON-dst type,
	which is where a zone's pre-1900 Local Mean Time lives."

	| table transitions typeIdx types lo hi mid idx t |
	table := self ___tzTable___.
	table == nil ifTrue: [^ nil].
	transitions := table @env0:at: 1.
	typeIdx := table @env0:at: 2.
	types := table @env0:at: 3.
	idx := nil.
	(transitions @env0:isEmpty @env0:or: [epochSeconds @env0:< (transitions @env0:at: 1)])
		ifTrue: [
			"Before recorded history: first non-dst type, else type 0."
			idx := 1.
			1 @env0:to: (types @env0:at: 2) @env0:size do: [:k |
				(idx @env0:= 1 @env0:and: [((types @env0:at: 2) @env0:at: k) @env0:= 0])
					ifTrue: [idx := k]]]
		ifFalse: [
			lo := 1.
			hi := transitions @env0:size.
			[lo @env0:< hi] @env0:whileTrue: [
				mid := (lo @env0:+ hi @env0:+ 1) @env0:// 2.
				t := transitions @env0:at: mid.
				t @env0:<= epochSeconds
					ifTrue: [lo := mid]
					ifFalse: [hi := mid @env0:- 1]].
			idx := (typeIdx @env0:at: lo) @env0:+ 1].
	idx @env0:< 1 ifTrue: [idx := 1].
	idx @env0:> (types @env0:at: 1) @env0:size ifTrue: [idx := (types @env0:at: 1) @env0:size].
	^ Array
		@env0:with: ((types @env0:at: 1) @env0:at: idx)
		with: ((types @env0:at: 2) @env0:at: idx)
		with: ((types @env0:at: 3) @env0:at: idx)

]

{ #category : 'Grail-Initialization' }
time >> ___tzEnvironmentSpec___ [
	"The current ``os.environ['TZ']'' as a Smalltalk String, or nil when it is
	unset or empty.

	Reached through the env-0 ``at:otherwise:'' protocol, which os_Environ
	implements for exactly this caller: when environ became a read-through
	view the DNU here was swallowed by the on:do: below and TZ read as unset,
	which silently un-pinned the zone for every run_with_tz test."

	| osMod env v |
	osMod := (Python @env0:at: #os otherwise: nil).
	osMod == nil ifTrue: [^ nil].
	env := [osMod @env0:___instance___ ___environView___]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	env == nil ifTrue: [^ nil].
	v := [env @env0:at: 'TZ' otherwise: nil]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	v == nil ifTrue: [^ nil].
	v := v @env0:asString.
	^ v @env0:isEmpty ifTrue: [nil] ifFalse: [v]

]

{ #category : 'Grail-Private' }
time >> ___tzFileBytesFor___: zoneName [
	"Raw bytes of the tz database file for zoneName, or nil.

	zoneName nil means the host's own zone, which is /etc/localtime (a copy
	of, or symlink to, the same TZif file).  A name is looked up under the
	zoneinfo root.  Anything that does not resolve to a readable TZif file
	answers nil, and the caller falls back to GemStone's rule-based zone."

	| roots path f bytes |
	zoneName == nil ifTrue: [
		f := GsFile @env0:openReadOnServer: '/etc/localtime'.
		f == nil ifTrue: [^ nil].
		bytes := f @env0:contents.
		f @env0:close.
		^ bytes].
	"Reject anything that could escape the zoneinfo root or name a
	non-zone file; real zone names are letters, digits, _ + - and /."
	(zoneName @env0:isEmpty
		or: [((zoneName @env0:indexOfSubCollection: '..') @env0:> 0)
		or: [(zoneName @env0:at: 1) @env0:= $/]]) ifTrue: [^ nil].
	roots := #('/usr/share/zoneinfo/' '/usr/lib/zoneinfo/'
		'/usr/share/lib/zoneinfo/' '/etc/zoneinfo/').
	roots @env0:do: [:root |
		path := root @env0:, zoneName.
		f := [GsFile @env0:openReadOnServer: path]
			@env0:on: Error do: [:ex | ex @env0:return: nil].
		f == nil ifFalse: [
			bytes := f @env0:contents.
			f @env0:close.
			(bytes @env0:notNil @env0:and: [bytes @env0:size @env0:> 4]) ifTrue: [^ bytes]]].
	^ nil

]

{ #category : 'Grail-Private' }
time >> ___tzGlobalsFromTable___ [
	"Publish timezone / altzone / daylight / tzname from the tz database.
	Answers false when no table applies, leaving the rule-based path.

	CPython reports the zone as it stands NOW, so the std/dst pair is taken
	from the types actually in use around the present instant rather than
	from every type the file has ever carried -- a zone that abandoned DST
	decades ago must report daylight=0 today."

	| table types now entry stdOff dstOff stdName dstName transitions typeIdx cutoff |
	table := self ___tzTable___.
	table == nil ifTrue: [^ false].
	transitions := table @env0:at: 1.
	typeIdx := table @env0:at: 2.
	types := table @env0:at: 3.
	now := self time @env0:truncated.
	entry := self ___tzEntryAt___: now.
	entry == nil ifTrue: [^ false].
	"Standard = the current entry when it is not DST, else the entry the
	zone falls back to."
	stdOff := entry @env0:at: 1.
	stdName := entry @env0:at: 3.
	dstOff := nil.
	dstName := nil.
	(entry @env0:at: 2) @env0:= 0
		ifFalse: [
			dstOff := entry @env0:at: 1.
			dstName := entry @env0:at: 3.
			stdOff := nil].
	"Scan the transitions of roughly the last two years for the other half."
	cutoff := now @env0:- (86400 @env0:* 800).
	1 @env0:to: transitions @env0:size do: [:k |
		| t idx off isdst nm |
		t := transitions @env0:at: k.
		(t @env0:>= cutoff @env0:and: [t @env0:<= (now @env0:+ (86400 @env0:* 400))]) ifTrue: [
			idx := (typeIdx @env0:at: k) @env0:+ 1.
			off := (types @env0:at: 1) @env0:at: idx.
			isdst := (types @env0:at: 2) @env0:at: idx.
			nm := (types @env0:at: 3) @env0:at: idx.
			isdst @env0:= 0
				ifTrue: [stdOff @env0:isNil ifTrue: [stdOff := off. stdName := nm]]
				ifFalse: [dstOff @env0:isNil ifTrue: [dstOff := off. dstName := nm]]]].
	stdOff @env0:isNil ifTrue: [stdOff := entry @env0:at: 1. stdName := entry @env0:at: 3].
	"No DST type in current use -- CPython reports the standard name twice
	and daylight 0."
	dstOff @env0:isNil ifTrue: [dstOff := stdOff. dstName := stdName].
	self @env0:dynamicInstVarAt: #tzname
		put: (tuple @env0:withAll: { stdName. dstName }).
	self @env0:dynamicInstVarAt: #timezone put: stdOff @env0:negated.
	self @env0:dynamicInstVarAt: #altzone put: dstOff @env0:negated.
	self @env0:dynamicInstVarAt: #daylight
		put: (dstOff @env0:= stdOff ifTrue: [0] ifFalse: [1]).
	^ true

]

{ #category : 'Grail-Private' }
time >> ___tzTable___ [
	"The parsed tz-database table for the CURRENT zone, or nil when there
	is none to use.  Memoised per session, and invalidated by tzset.

	nil is a normal answer, not a failure: a POSIX TZ spec such as
	``EST+05EDT,M3.2.0,M11.1.0'' names no file, and test.support.run_with_tz
	uses exactly that form.  Those keep the rule-based GemStone zone, which
	models a single std/dst rule pair correctly -- which is all such a spec
	describes."

	| temps key spec bytes table |
	temps := SessionTemps @env0:current.
	key := #'GrailTzTable'.
	(temps @env0:at: #'GrailTzTableSet' otherwise: false)
		ifTrue: [^ temps @env0:at: key otherwise: nil].
	temps @env0:at: #'GrailTzTableSet' put: true.
	spec := self ___tzEnvironmentSpec___.
	"An Olson name resolves to a file; a POSIX rule spec does not, and the
	host zone (no TZ set) is /etc/localtime."
	bytes := [self ___tzFileBytesFor___: spec]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	bytes == nil ifTrue: [
		temps @env0:at: key put: nil.
		^ nil].
	table := [self ___parseTzFile___: bytes]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	temps @env0:at: key put: table.
	^ table

]

{ #category : 'Grail-Private' }
time >> ___tzTableInvalidate___ [
	"Drop the memoised table so the next read re-reads the zone.  Called by
	tzset, which is the only thing that can change which zone applies."

	| temps |
	temps := SessionTemps @env0:current.
	temps @env0:at: #'GrailTzTableSet' put: false.
	temps @env0:at: #'GrailTzTable' put: nil

]

{ #category : 'Grail-Private' }
time >> ___wdayAbbrev___: wday [
	"wday is Monday=0..Sunday=6."
	^ #('Mon' 'Tue' 'Wed' 'Thu' 'Fri' 'Sat' 'Sun') @env0:at: wday @env0:+ 1

]

{ #category : 'Grail-Private' }
time >> ___wdayName___: wday [
	^ #('Monday' 'Tuesday' 'Wednesday' 'Thursday' 'Friday' 'Saturday' 'Sunday')
		@env0:at: wday @env0:+ 1

]

{ #category : 'Grail-Private' }
time >> ___zeroPad2___: n [
	| s |
	s := n @env0:printString.
	s @env0:size @env0:< 2 ifTrue: [^ '0' @env0:, s].
	^ s

]

{ #category : 'Grail-Private' }
time >> ___zeroPad4___: n [
	"Zero-pad to at least 4 digits (years wider than 4 pass through)."

	| s |
	s := n @env0:printString.
	[s @env0:size @env0:< 4] @env0:whileTrue: [s := '0' @env0:, s].
	^ s

]

{ #category : 'Grail-Formatting' }
time >> ___zoneNameOf___: aTimeTuple [

	"tm_zone as strftime(3) reads it: a struct_time's, as UTF-8 bytes ending in
	NUL, or nil -- a NULL pointer -- for any other tuple or a struct_time whose
	zone is None (Modules/timemodule.c:641-664)."

	| zone |

	(aTimeTuple @env0:class == struct_time) ifFalse: [^ nil].
	zone := aTimeTuple ___pyAttrLoad___: #tm_zone.
	zone == None ifTrue: [^ nil].
	^ CByteArray @env0:withAll: (zone encode: 'utf-8') nullTerminate: true

]

{ #category : 'Grail-Formatting' }
time >> ___zoneOffsetOf___: aTimeTuple [

	"tm_gmtoff: a struct_time's, or 0 for any other tuple or a struct_time
	whose offset is None."

	| offset |

	(aTimeTuple @env0:class == struct_time) ifFalse: [^ 0].
	offset := aTimeTuple ___pyAttrLoad___: #tm_gmtoff.
	offset == None ifTrue: [^ 0].
	^ offset ___asIndex___

]

{ #category : 'Grail-Formatting' }
time >> asctime [
	"asctime() with current time."

	^ self asctime: self gmtime

]

{ #category : 'Grail-Formatting' }
time >> asctime: structTime [
	"asctime(t) → e.g. 'Sun Jun 20 23:21:05 1993'.  CPython's exact
	24-character format."

	^ self strftime: '%a %b %d %H:%M:%S %Y' _: structTime

]

{ #category : 'Grail-Formatting' }
time >> ctime [
	^ self asctime: self localtime

]

{ #category : 'Grail-Formatting' }
time >> ctime: epochSeconds [
	^ self asctime: (self localtime: epochSeconds)

]

{ #category : 'Grail-Calendar' }
time >> gmtime [
	"Return the current time as a Python struct_time-shaped tuple
	in UTC.  We emit a plain tuple of nine integers; users who want
	named-field access should rely on the documented indices
	(tm_year=0, tm_mon=1, tm_mday=2, tm_hour=3, tm_min=4, tm_sec=5,
	tm_wday=6, tm_yday=7, tm_isdst=8)."

	^ self gmtime: self time

]

{ #category : 'Grail-Calendar' }
time >> gmtime: epochSeconds [
	"struct_time in UTC for a given epoch-seconds value.  Uses
	DateTime's *Gmt accessors so the returned components are UTC
	regardless of the gem's local timezone."

	| epoch dt |
	epoch := DateTime
		@env0:newGmtWithYear: 1970
		month: 1
		day: 1
		hours: 0
		minutes: 0
		seconds: 0.
	dt := epoch @env0:addSeconds: epochSeconds @env0:truncated.
	^ self ___structTimeUtcFromDateTime___: dt

]

{ #category : 'Grail-Initialization' }
time >> initialize [
	"Publish the real struct_time class (a tuple subclass with tm_* named
	fields, defined at the top of this file) as ``time.struct_time'', so
	``from time import struct_time'' -- which werkzeug.http and _strptime
	both do -- and ``isinstance(t, struct_time)'' behave as in CPython."

	self @env0:dynamicInstVarAt: #struct_time put: struct_time.
	"CPython's timemodule.c exports the struct_time field count, and _strptime
	reads it (``time._STRUCT_TM_ITEMS'') to build its result."
	self @env0:dynamicInstVarAt: #_STRUCT_TM_ITEMS put: 11.
	"``time.tzset'' has to READ as a callable.  A UNARY method on a module is
	treated as a value attribute, so the attribute load invoked it and
	answered its return -- ``time.tzset'' was None and ``time.tzset()'' then
	failed with ``'NoneType' object is not callable''.  Pre-storing a
	BoundMethod is the shape os.gs already uses for fsdecode/fsencode/fspath.
	(hasattr said True throughout, because the probing call succeeded.)"
	self @env0:dynamicInstVarAt: #tzset
		put: (BoundMethod receiver: self selector: #tzset).
	PyDateTime ___ensureSessionTimeZone___.
	self ___refreshTimezoneGlobals___

]

{ #category : 'Grail-Calendar' }
time >> localtime [
	"Local-time struct_time for current moment."

	^ self localtime: self time

]

{ #category : 'Grail-Calendar' }
time >> localtime: epochSeconds [
	"struct_time in HOST-LOCAL time for a given epoch-seconds value.

	This used to BE gmtime.  Grail had no trustworthy local zone -- the
	gem's session TimeZone is GemStone's PST default whatever host it runs
	on -- so the module documented its wall clocks as UTC throughout and
	set timezone=0, tzname=('UTC','UTC').  Self-consistent, and correct
	enough while datetime also answered UTC everywhere.

	Once datetime's naive constructors became host-local, that stopped
	holding: mktime is localtime's inverse, so a UTC mktime feeding a local
	datetime.fromtimestamp broke the round trip CPython's
	TestDate.test_fromtimestamp checks (``18 != 19'' -- a whole day out at
	the wrong hour).  PyDateTime class >> ___ensureSessionTimeZone___ aligns
	the session zone with the OS, so real local time is now available and
	both modules can use it."

	| entry epoch dt secs |
	PyDateTime ___ensureSessionTimeZone___.
	"Prefer the tz DATABASE when one applies.  GemStone's TimeZone models a
	single std/dst rule pair, which is right for the zone as it stands today
	but cannot reproduce its history: it was out by 2h across a 1918 DST
	boundary, and by 4m16s in 1935 Tehran, whose pre-1946 offset was
	+3:25:44 -- not a whole number of minutes, so no rule pair can express
	it.  The transition table carries both exactly.

	nil falls through to the rule-based path, which is what a POSIX TZ spec
	(``EST+05EDT,M3.2.0,M11.1.0'', as test.support.run_with_tz sets) names --
	no file, and a single rule pair is all such a spec describes."
	entry := [self ___tzEntryAt___: epochSeconds @env0:truncated]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	epoch := DateTime
		@env0:newGmtWithYear: 1970
		month: 1
		day: 1
		hours: 0
		minutes: 0
		seconds: 0.
	entry == nil ifTrue: [
		dt := epoch @env0:addSeconds: epochSeconds @env0:truncated.
		^ self ___structTimeLocalFromDateTime___: dt].
	"Local civil time IS utc + offset, so read the GMT fields of the shifted
	instant rather than asking the session zone to convert."
	secs := epochSeconds @env0:truncated @env0:+ (entry @env0:at: 1).
	dt := epoch @env0:addSeconds: secs.
	"The entry names the zone and its offset at this instant, which are
	tm_zone and tm_gmtoff."
	^ (self
		___structTimeYear___: dt @env0:yearGmt
		_month: dt @env0:monthGmt
		_day: dt @env0:dayOfMonthGmt
		_hour: dt @env0:hourGmt
		_minute: dt @env0:minuteGmt
		_second: dt @env0:secondGmt
		_dayOfWeek: dt @env0:dayOfWeekGmt
		_dayOfYear: dt @env0:dayOfYearGmt
		_isdst: ((entry @env0:at: 2) @env0:= 0 ifTrue: [0] ifFalse: [1]))
			___zone___: (entry @env0:at: 3)
			offset: (entry @env0:at: 1)

]

{ #category : 'Grail-Calendar' }
time >> mktime: structTime [
	"Inverse of localtime(): convert struct_time tuple to epoch
	seconds.  Reads the first six fields (year..second) and ignores
	the rest."

	| year mon day hour min sec localDt |
	year := structTime __getitem__: 0.
	mon := structTime __getitem__: 1.
	day := structTime __getitem__: 2.
	hour := structTime __getitem__: 3.
	min := structTime __getitem__: 4.
	sec := structTime __getitem__: 5.
	"The exact inverse of localtime:, which means interpreting the fields as
	HOST-LOCAL wall time.  This was pure civil arithmetic while localtime
	WAS gmtime; now that localtime is genuinely local, a civil inverse would
	be a gmtime inverse and the round trip would be off by the local offset
	(CPython's TestDate.test_fromtimestamp does
	``date.fromtimestamp(mktime((1999, 9, 19, 0, 0, 0, 0, 0, -1)))'' and
	expects day 19; a UTC mktime feeding a local fromtimestamp gave 18).

	Hands the fields to GemStone's LOCAL DateTime constructor and reads the
	GMT fields back, so the session zone does the DST-aware local->UTC
	mapping.  tm_isdst (field 8) is NOT consulted -- GemStone resolves the
	ambiguous hour itself; CPython would use it to disambiguate.

	Falls back to the civil (UTC-reading) inverse if the local constructor
	rejects the fields, rather than raising where it previously returned."

	PyDateTime ___ensureSessionTimeZone___.
	"When a tz table applies it must ALSO drive the inverse, or localtime and
	mktime describe different zones and every round trip is off by the
	difference -- test_fromtimestamp_limits does exactly such a round trip and
	broke by 1:16:48 (a Local Mean Time offset) the moment localtime alone
	started using the table.

	CPython's algorithm: guess the offset, correct, and check.  A wall clock
	that no instant maps to (a spring-forward gap) or that two map to (a
	fall-back fold) is resolved the way CPython's mktime does with
	tm_isdst = -1, by keeping the first solution found."
	(self ___tzTable___) @env0:notNil ifTrue: [
		| civil u1 t1 a b u2 t2 |
		civil := ((time @env0:___epochDaysForYear___: year _month: mon _day: day)
				@env0:* 86400)
			@env0:+ (hour @env0:* 3600) @env0:+ (min @env0:* 60) @env0:+ sec.
		a := ((self ___tzEntryAt___: civil) @env0:at: 1).
		u1 := civil @env0:- a.
		t1 := u1 @env0:+ ((self ___tzEntryAt___: u1) @env0:at: 1).
		t1 @env0:= civil ifTrue: [^ u1 @env0:asFloat].
		b := t1 @env0:- u1.
		u2 := civil @env0:- b.
		t2 := u2 @env0:+ ((self ___tzEntryAt___: u2) @env0:at: 1).
		t2 @env0:= civil ifTrue: [^ u2 @env0:asFloat].
		^ u1 @env0:asFloat].
	localDt := [DateTime
		@env0:newWithYear: year
		month: mon
		day: day
		hours: hour
		minutes: min
		seconds: sec]
			@env0:on: Error
			do: [:ex | nil].
	localDt @env0:isNil ifTrue: [
		^ ((time @env0:___epochDaysForYear___: year _month: mon _day: day) @env0:* 86400
			@env0:+ (hour @env0:* 3600)
			@env0:+ (min @env0:* 60)
			@env0:+ sec) @env0:asFloat].
	^ (((time @env0:___epochDaysForYear___: localDt @env0:yearGmt
			_month: localDt @env0:monthGmt
			_day: localDt @env0:dayOfMonthGmt) @env0:* 86400)
		@env0:+ (localDt @env0:hourGmt @env0:* 3600)
		@env0:+ (localDt @env0:minuteGmt @env0:* 60)
		@env0:+ localDt @env0:secondGmt) @env0:asFloat

]

{ #category : 'Grail-Monotonic' }
time >> monotonic [
	"time.monotonic() — seconds from a real monotonic clock, as a float.

	These four used to alias the WALL clock, which broke the one
	guarantee the name carries: an NTP step or a manual clock change
	moved them, and their resolution was the wall clock's milliseconds.
	``System class >> timeNs'' is the genuine article — high-resolution
	real time in nanoseconds from an arbitrary epoch, explicitly
	uncorrelated with time of day, i.e. CLOCK_MONOTONIC.

	The epoch being arbitrary is not a deviation: CPython documents the
	reference point of monotonic()/perf_counter() as undefined and only
	differences as meaningful."

	^ (self monotonic_ns) @env0:/ 1000000000.0

]

{ #category : 'Grail-Monotonic' }
time >> monotonic_ns [
	"Monotonic clock in nanoseconds (integer).  See monotonic."

	^ System @env0:timeNs

]

{ #category : 'Grail-Monotonic' }
time >> perf_counter [
	"time.perf_counter() — highest-resolution clock for measuring a short
	interval.  Same source as monotonic; on this VM there is no separate
	higher-resolution counter to prefer."

	^ (self perf_counter_ns) @env0:/ 1000000000.0

]

{ #category : 'Grail-Monotonic' }
time >> perf_counter_ns [
	^ System @env0:timeNs

]

{ #category : 'Grail-Monotonic' }
time >> process_time [
	"time.process_time() — CPU time consumed by this process, as a float
	in seconds, excluding time spent asleep.

	Previously mirrored monotonic(), i.e. reported ELAPSED time, so any
	caller measuring CPU cost (profilers, benchmark harnesses) got wall
	time inflated by every sleep and I/O wait.  ``System class >>
	readClockNano'' answers this process's CPU time in nanoseconds."

	^ (self process_time_ns) @env0:/ 1000000000.0

]

{ #category : 'Grail-Monotonic' }
time >> process_time_ns [
	"Process CPU time in nanoseconds (integer).  See process_time."

	^ System @env0:readClockNano

]

{ #category : 'Grail-Sleep' }
time >> sleep: seconds [
	"Suspend the current process for ``seconds`` (int or float, or
	anything float()-convertible).  Backed by GemStone Delay."

	| secs ms |
	secs := ((seconds isKindOf: Float) or: [seconds isKindOf: Integer])
		ifTrue: [seconds]
		ifFalse: [float __new__: seconds].
	ms := (secs @env0:* 1000) @env0:truncated.
	ms @env0:<= 0 ifTrue: [^ None].
	(Delay @env0:forMilliseconds: ms) @env0:wait.
	^ None

]

{ #category : 'Grail-Formatting' }
time >> strftime: format [
	"strftime() with current time.

	CPython defaults to LOCAL time here (``time.strftime(fmt)'' is
	``strftime(fmt, localtime())''); this used to pass gmtime, which was
	right while every wall clock in the module was UTC.  Callers that need
	GMT -- HTTP dates, cookie expiry -- pass an explicit gmtime() tuple and
	are unaffected."

	^ self strftime: format _: self localtime

]

{ #category : 'Grail-Formatting' }
time >> strftime: format _: aTimeTuple [

	"time.strftime(format, t) (Modules/timemodule.c, time_strftime): t made a
	struct tm as gettmarg makes it and checked as checktm checks it, and each
	run of ASCII characters in format formatted by the C library's
	strftime(3), so that every directive -- %c, %x, %U, %z and the platform's
	own -- answers what CPython's answers on the same machine.  Grail had its
	own formatter for fifteen directives and answered nothing for the rest:
	``%c'' was the empty string."

	| zone structTm |

	format @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: (time ___strftimeFormatMessageFor: format)].
	zone := self ___zoneNameOf___: aTimeTuple.
	structTm := self
		___structTm___: (self ___checkedStructTmFields___: (self ___structTmFields___: aTimeTuple))
		zone: zone
		offset: (self ___zoneOffsetOf___: aTimeTuple).
	^ self ___strftimeRunsOf___: format @env0:___pyCodePoints___ with: structTm

]

{ #category : 'Grail-Formatting' }
time >> strptime: aString [
	"``time.strptime(string)'' -- CPython's default format."

	^ self strptime: aString _: '%a %b %d %H:%M:%S %Y'

]

{ #category : 'Grail-Formatting' }
time >> strptime: aString _: format [
	"``time.strptime(string, format)'' -- delegates to the vendored _strptime,
	as CPython's timemodule.c does and as PyDateTime>>strptime:_: already
	does.  ssl.cert_time_to_seconds is a caller: ``from time import
	strptime''."

	^ (importlib ___runtimeModule___: '_strptime') _strptime_time: aString _: format

]

{ #category : 'Grail-Wall clock' }
time >> time [
	"Return the current Unix epoch time as a float with millisecond
	resolution.  Mirrors CPython's time.time()."

	| dt secs msInDay subSecond |
	dt := DateTime @env0:now.
	secs := time @env0:___epochSecondsFromGmtOf___: dt.
	"Sub-second component comes from msAfterMidnight; rem: 1000 strips
	the whole-seconds part that is already in `secs`.  Timezone offsets
	are whole minutes, so the millisecond-within-second is the same in
	any zone."
	msInDay := dt @env0:instVarAt: 3.
	subSecond := (msInDay @env0:rem: 1000) @env0:/ 1000.0.
	^ secs @env0:+ subSecond

]

{ #category : 'Grail-Wall clock' }
time >> time_ns [
	"Return the current Unix epoch time in nanoseconds (integer)."

	| dt secs msInDay |
	dt := DateTime @env0:now.
	secs := time @env0:___epochSecondsFromGmtOf___: dt.
	msInDay := dt @env0:instVarAt: 3.
	^ (secs @env0:* 1000000000) @env0:+ ((msInDay @env0:rem: 1000) @env0:* 1000000)

]

{ #category : 'Grail-Built-in Functions' }
time >> tzset [
	"CPython's ``time.tzset()'': re-read the timezone from the TZ environment
	variable and re-publish the module's timezone globals.

	The reason Grail needs it is test.support.run_with_tz, which pins the zone
	around a test by setting ``os.environ['TZ']'' and calling this.  With
	tzset missing, run_with_tz was a no-op and those tests ran in whatever zone
	the machine happened to be in -- test_timestamp_naive asserts 18000.0 for
	the epoch, true only in US/Eastern, so the same build ``passed'' or
	``failed'' depending on where it ran, and the scoreboard moved when the
	laptop changed zones.

	TZ is read from ``os.environ'', which is where Python code writes it.
	That is now a LIVE view over the gem environment rather than a private
	dict, so a TZ set through os.environ, os.putenv or the gem's own
	environment all reach here alike.  An unset TZ restores the host zone.

	Diverges from CPython in ONE way, on purpose: an unresolvable TZ raises
	ValueError instead of being silently ignored.  Silently keeping the old
	zone is how this problem stayed invisible; a caller that cannot get the
	zone it asked for should hear about it (run_with_tz turns it into a skip)."

	| spec zone |
	spec := self ___tzEnvironmentSpec___.
	zone := spec == nil
		ifTrue: [[TimeZone @env0:fromOS] @env0:on: Error do: [:ex | ex @env0:return: nil]]
		ifFalse: [self ___timeZoneForSpec___: spec].
	zone == nil ifTrue: [
		spec == nil ifFalse: [
			ValueError ___signal___: 'unsupported TZ specification: ''' @env0:,
				spec @env0:asString @env0:, '''']]
		ifFalse: [zone @env0:installAsCurrentTimeZone].
	"___ensureSessionTimeZone___ installs the host zone once per session and
	memoises that it has.  Set the memo here too, so a later first call to
	now() cannot silently undo the zone just installed."
	SessionTemps @env0:current @env0:at: #'GrailSessionTimeZoneSet' put: true.
	"Which zone FILE applies has just changed too."
	self ___tzTableInvalidate___.
	self ___refreshTimezoneGlobals___.
	^ None

]
