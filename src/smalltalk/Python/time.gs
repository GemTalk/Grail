! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ===============================================================================
! struct_time - Python `time.struct_time`.  A tuple subclass carrying the nine
! calendar fields, with the documented tm_* names as DATA attributes on top of
! plain index access.  It was previously aliased straight to ``tuple'', so
! ``t.tm_year'' raised AttributeError on every value returned by gmtime() /
! localtime() / date.timetuple() / datetime.timetuple() (test_timetuple,
! test_more_timetuple, test_fromtimestamp), and _strptime's
! ``time.struct_time(tt[:9])'' could not round-trip.
!
! Construction (``struct_time(seq)'') is inherited from tuple's __new__:/_new:kw:
! and equality against a plain tuple still holds, both matching CPython.
! ===============================================================================

expectvalue /Class
doit
tuple subclass: 'struct_time'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
struct_time category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
struct_time removeAllMethods: 0.
struct_time removeAllMethods: 1.
struct_time class removeAllMethods: 0.
struct_time class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: struct_time
___pythonValueAttrs___
	"Register the tm_* names as auto-invoked DATA attributes rather than
	plain callables -- without this ``t.tm_year'' resolves to a bound
	method object instead of the int (same mechanism as IsoCalendarDate's
	year/week/weekday in datetime_module.gs)."

	^ IdentitySet new
		add: #tm_year;
		add: #tm_mon;
		add: #tm_mday;
		add: #tm_hour;
		add: #tm_min;
		add: #tm_sec;
		add: #tm_wday;
		add: #tm_yday;
		add: #tm_isdst;
		yourself
%

set compile_env: 1

category: 'Grail-Accessors'
method: struct_time
tm_year
	^ self @env0:at: 1
%

category: 'Grail-Accessors'
method: struct_time
tm_mon
	^ self @env0:at: 2
%

category: 'Grail-Accessors'
method: struct_time
tm_mday
	^ self @env0:at: 3
%

category: 'Grail-Accessors'
method: struct_time
tm_hour
	^ self @env0:at: 4
%

category: 'Grail-Accessors'
method: struct_time
tm_min
	^ self @env0:at: 5
%

category: 'Grail-Accessors'
method: struct_time
tm_sec
	^ self @env0:at: 6
%

category: 'Grail-Accessors'
method: struct_time
tm_wday
	^ self @env0:at: 7
%

category: 'Grail-Accessors'
method: struct_time
tm_yday
	^ self @env0:at: 8
%

category: 'Grail-Accessors'
method: struct_time
tm_isdst
	^ self @env0:at: 9
%

category: 'Grail-Conversion'
method: struct_time
__repr__
	"CPython: time.struct_time(tm_year=2004, tm_mon=12, ..., tm_isdst=-1)."

	| ws names |
	names := #('tm_year' 'tm_mon' 'tm_mday' 'tm_hour' 'tm_min' 'tm_sec'
		'tm_wday' 'tm_yday' 'tm_isdst').
	ws := WriteStream @env0:on: Unicode7 @env0:new.
	ws @env0:nextPutAll: 'time.struct_time('.
	1 @env0:to: 9 @env0:do: [:i |
		i @env0:> 1 ifTrue: [ws @env0:nextPutAll: ', '].
		ws @env0:nextPutAll: (names @env0:at: i).
		ws @env0:nextPut: $=.
		ws @env0:nextPutAll: (self @env0:at: i) @env0:printString].
	ws @env0:nextPut: $).
	^ ws @env0:contents
%

set compile_env: 0

! ------- time module class
expectvalue /Class
doit
module subclass: 'time'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
time comment:
'Python time module - wall-clock, monotonic, and sleep primitives
backed by GemStone DateTime + Delay.

Notes:
  * Smalltalk DateTime stores year + dayOfYear + msAfterMidnight, so
    sub-second resolution comes through.
  * time.time() and time.monotonic() are both wall-clock derived; the
    distinction CPython draws (monotonic guarantees no rewind) is not
    enforced here.  Fine for itsdangerous timestamping and Werkzeug
    request timing; if you depend on strict monotonicity, sample once
    and compare deltas only.
  * sleep() uses GemStone Delay, which schedules at the VM level.'
%

expectvalue /Class
doit
time category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
time removeAllMethods: 0.
time removeAllMethods: 1.
time class removeAllMethods: 0.
time class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Private'
classmethod: time
___unixEpochDays___
	"Date>>asDays for 1970-01-01, the anchor for all epoch<->civil
	conversions here.

	Epoch math deliberately goes through Date (pure civil-calendar day
	counting, no timezone) rather than DateTime>>asSeconds.  asSeconds
	bakes in the gem's STANDARD UTC offset, so the difference between two
	asSeconds values that straddle a DST boundary is off by the DST shift
	-- e.g. with the default US/Pacific zone, `DateTime now asSeconds -
	(DateTime newGmtWithYear: 1970 ...) asSeconds' ran a full hour ahead
	of the true Unix epoch every summer, which is what made time.time()
	(and everything derived from it) wrong half the year."

	^ 25202
%

category: 'Grail-Private'
classmethod: time
___epochSecondsFromGmtOf___: dt
	"Whole Unix-epoch seconds for the instant `dt`, read through its *Gmt
	accessors and converted with pure civil-calendar arithmetic (see
	___unixEpochDays___ for why not asSeconds)."

	^ (time ___epochDaysForYear___: dt yearGmt _month: dt monthGmt _day: dt dayOfMonthGmt)
		* 86400
		+ (dt hourGmt * 3600)
		+ (dt minuteGmt * 60)
		+ dt secondGmt
%

category: 'Grail-Private'
classmethod: time
___substituteMicroseconds___: fmt _: micros
	"Expand the %f directive to 6-digit zero-padded microseconds BEFORE
	handing the format to the struct_time formatter.  struct_time has no
	sub-second field, so %f cannot be resolved there -- CPython's
	datetime.strftime runs the same pre-pass.  The scan steps over whole
	directives so an escaped ``%%f'' keeps its literal ``f'', and a lone
	trailing ``%'' is passed through untouched.

	(Named `fmt', not `format': ``format'' is already declared as a
	global -- Python's builtin -- and shadowing it is a compile error.)"

	| ws i sz us c |
	us := micros printString.
	[us size < 6] whileTrue: [us := '0' , us].
	ws := WriteStream on: Unicode7 new.
	i := 1.
	sz := fmt size.
	[i <= sz] whileTrue: [
		c := fmt at: i.
		((c = $%) and: [i < sz])
			ifTrue: [
				(fmt at: i + 1) = $f
					ifTrue: [ws nextPutAll: us]
					ifFalse: [ws nextPut: c; nextPut: (fmt at: i + 1)].
				i := i + 2]
			ifFalse: [
				ws nextPut: c.
				i := i + 1]].
	^ ws contents
%

category: 'Grail-Private'
classmethod: time
___epochDaysForYear___: y _month: m _day: d
	"Days since 1970-01-01 for a civil date; timezone-free."

	^ (Date newDay: d monthNumber: m year: y) asDays - time ___unixEpochDays___
%

set compile_env: 1

category: 'Grail-Initialization'
method: time
initialize
	"Publish the real struct_time class (a tuple subclass with tm_* named
	fields, defined at the top of this file) as ``time.struct_time'', so
	``from time import struct_time'' -- which werkzeug.http and _strptime
	both do -- and ``isinstance(t, struct_time)'' behave as in CPython."

	self @env0:dynamicInstVarAt: #struct_time put: struct_time.
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
%

category: 'Grail-Initialization'
method: time
tzset
	"CPython's ``time.tzset()'': re-read the timezone from the TZ environment
	variable and re-publish the module's timezone globals.

	The reason Grail needs it is test.support.run_with_tz, which pins the zone
	around a test by setting ``os.environ['TZ']'' and calling this.  With
	tzset missing, run_with_tz was a no-op and those tests ran in whatever zone
	the machine happened to be in -- test_timestamp_naive asserts 18000.0 for
	the epoch, true only in US/Eastern, so the same build ``passed'' or
	``failed'' depending on where it ran, and the scoreboard moved when the
	laptop changed zones.

	TZ is read from ``os.environ'' (Grail's own dict), not from the gem
	environment: that is where Python code writes it, and a gem cannot change
	its own OS environment anyway.  An unset TZ restores the host zone.

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
	self ___refreshTimezoneGlobals___.
	^ None
%

category: 'Grail-Initialization'
method: time
___tzEnvironmentSpec___
	"The current ``os.environ['TZ']'' as a Smalltalk String, or nil when it is
	unset or empty.  Reads the os module's own dict rather than the gem
	environment -- that is where Python code writes it."

	| osMod env v |
	osMod := (Python @env0:at: #os otherwise: nil).
	osMod == nil ifTrue: [^ nil].
	env := [osMod @env0:___instance___ environ]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	env == nil ifTrue: [^ nil].
	v := [env @env0:at: 'TZ' otherwise: nil]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	v == nil ifTrue: [^ nil].
	v := v @env0:asString.
	^ v @env0:isEmpty ifTrue: [nil] ifFalse: [v]
%

category: 'Grail-Initialization'
method: time
___timeZoneForSpec___: aSpec
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
%

category: 'Grail-Initialization'
method: time
___namedTimeZone___: aName
	"``TimeZone named:'' guarded -- an unknown name raises rather than
	answering nil, and a name that resolves to something without a real
	offset is no use either."

	^ [TimeZone @env0:named: aName @env0:asString]
		@env0:on: Error
		do: [:ex | ex @env0:return: nil]
%

category: 'Grail-Initialization'
method: time
___posixSpecAsZoneName___: aSpec
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
%

category: 'Grail-Initialization'
method: time
___refreshTimezoneGlobals___
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
%

category: 'Grail-Wall clock'
method: time
time
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
%

category: 'Grail-Wall clock'
method: time
time_ns
	"Return the current Unix epoch time in nanoseconds (integer)."

	| dt secs msInDay |
	dt := DateTime @env0:now.
	secs := time @env0:___epochSecondsFromGmtOf___: dt.
	msInDay := dt @env0:instVarAt: 3.
	^ (secs @env0:* 1000000000) @env0:+ ((msInDay @env0:rem: 1000) @env0:* 1000000)
%

category: 'Grail-Monotonic'
method: time
monotonic
	"Return a monotonic clock value as a float.  Grail derives this
	from the wall clock, so back-stepping is theoretically possible
	if the system clock is adjusted - for timing intervals over
	sub-second to minute scales this is fine in practice."

	^ self time
%

category: 'Grail-Monotonic'
method: time
monotonic_ns
	"Monotonic clock in nanoseconds (integer)."

	^ self time_ns
%

category: 'Grail-Monotonic'
method: time
perf_counter
	"High-resolution performance counter.  Mirrors monotonic()."

	^ self monotonic
%

category: 'Grail-Monotonic'
method: time
perf_counter_ns
	^ self monotonic_ns
%

category: 'Grail-Monotonic'
method: time
process_time
	"Process CPU time.  Grail doesn't separate user/system CPU, so
	this mirrors monotonic()."

	^ self monotonic
%

category: 'Grail-Sleep'
method: time
sleep: seconds
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
%

category: 'Grail-Calendar'
method: time
gmtime
	"Return the current time as a Python struct_time-shaped tuple
	in UTC.  We emit a plain tuple of nine integers; users who want
	named-field access should rely on the documented indices
	(tm_year=0, tm_mon=1, tm_mday=2, tm_hour=3, tm_min=4, tm_sec=5,
	tm_wday=6, tm_yday=7, tm_isdst=8)."

	^ self gmtime: self time
%

category: 'Grail-Calendar'
method: time
gmtime: epochSeconds
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
%

category: 'Grail-Calendar'
method: time
localtime
	"Local-time struct_time for current moment."

	^ self localtime: self time
%

category: 'Grail-Calendar'
method: time
localtime: epochSeconds
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

	| epoch dt |
	PyDateTime ___ensureSessionTimeZone___.
	epoch := DateTime
		@env0:newGmtWithYear: 1970
		month: 1
		day: 1
		hours: 0
		minutes: 0
		seconds: 0.
	dt := epoch @env0:addSeconds: epochSeconds @env0:truncated.
	^ self ___structTimeLocalFromDateTime___: dt
%

category: 'Grail-Private'
method: time
___structTimeLocalFromDateTime___: dt
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
	^ self
		___structTimeYear___: dt @env0:year
		_month: dt @env0:month
		_day: dt @env0:dayOfMonth
		_hour: dt @env0:hour
		_minute: dt @env0:minute
		_second: dt @env0:second
		_dayOfWeek: dt @env0:dayOfWeek
		_dayOfYear: dt @env0:dayOfYear
		_isdst: isdst
%

category: 'Grail-Private'
method: time
___structTimeUtcFromDateTime___: dt
	"UTC struct_time tuple — uses DateTime's *Gmt accessors."

	^ self
		___structTimeYear___: dt @env0:yearGmt
		_month: dt @env0:monthGmt
		_day: dt @env0:dayOfMonthGmt
		_hour: dt @env0:hourGmt
		_minute: dt @env0:minuteGmt
		_second: dt @env0:secondGmt
		_dayOfWeek: dt @env0:dayOfWeekGmt
		_dayOfYear: dt @env0:dayOfYearGmt
%

category: 'Grail-Private'
method: time
___structTimeYear___: year _month: mon _day: day _hour: hour _minute: min _second: sec _dayOfWeek: dow _dayOfYear: doy
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
%

category: 'Grail-Private'
method: time
___structTimeYear___: year _month: mon _day: day _hour: hour _minute: min _second: sec _dayOfWeek: dow _dayOfYear: doy _isdst: isdst
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
%

category: 'Grail-Calendar'
method: time
mktime: structTime
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
%

category: 'Grail-Formatting'
method: time
strftime: format
	"strftime() with current time.

	CPython defaults to LOCAL time here (``time.strftime(fmt)'' is
	``strftime(fmt, localtime())''); this used to pass gmtime, which was
	right while every wall clock in the module was UTC.  Callers that need
	GMT -- HTTP dates, cookie expiry -- pass an explicit gmtime() tuple and
	are unaffected."

	^ self strftime: format _: self localtime
%

category: 'Grail-Formatting'
method: time
strftime: format _: structTime
	"Minimal strftime supporting the directives used by Werkzeug,
	itsdangerous, and email.utils: %Y %m %d %H %M %S %y %j %p %a %A
	%b %B %Z %% .  Anything else passes through literally — far less
	than CPython but enough for HTTP-date / cookie expiration / log
	timestamps."

	| year mon day hour min sec wday yday stream src i ch buf |
	year := structTime __getitem__: 0.
	mon := structTime __getitem__: 1.
	day := structTime __getitem__: 2.
	hour := structTime __getitem__: 3.
	min := structTime __getitem__: 4.
	sec := structTime __getitem__: 5.
	wday := structTime __getitem__: 6.
	yday := structTime __getitem__: 7.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	src := format @env0:asString.
	i := 1.
	[i @env0:<= src @env0:size] @env0:whileTrue: [
		ch := src @env0:at: i.
		(ch @env0:= $%) ifTrue: [
			i := i @env0:+ 1.
			i @env0:<= src @env0:size ifTrue: [
				ch := src @env0:at: i.
				ch @env0:= $Y ifTrue: [
					"Python's datetime %Y zero-pads the year to at least 4
					digits (date(1,1,1).strftime('%Y') -> '0001')."
					stream @env0:nextPutAll: (self ___zeroPad4___: year)].
				ch @env0:= $F ifTrue: [
					"ISO date %Y-%m-%d (C99)."
					stream @env0:nextPutAll: (self ___zeroPad4___: year).
					stream @env0:nextPut: $-.
					stream @env0:nextPutAll: (self ___zeroPad2___: mon).
					stream @env0:nextPut: $-.
					stream @env0:nextPutAll: (self ___zeroPad2___: day)].
				ch @env0:= $C ifTrue: [
					"Century, zero-padded to 2 digits (C99)."
					stream @env0:nextPutAll: (self ___zeroPad2___: (year @env0:// 100))].
				ch @env0:= $G ifTrue: [
					"ISO 8601 year (can differ from %Y near year boundaries --
					the first/last few days of a calendar year can belong to
					an ISO week of the adjacent year), zero-padded like %Y."
					stream @env0:nextPutAll:
						(self ___zeroPad4___: (self ___isoYear___: year month: mon day: day))].
				ch @env0:= $y ifTrue: [
					buf := (year @env0:rem: 100) @env0:printString.
					buf @env0:size @env0:< 2 ifTrue: [stream @env0:nextPut: $0].
					stream @env0:nextPutAll: buf].
				ch @env0:= $m ifTrue: [stream @env0:nextPutAll: (self ___zeroPad2___: mon)].
				ch @env0:= $d ifTrue: [stream @env0:nextPutAll: (self ___zeroPad2___: day)].
				ch @env0:= $H ifTrue: [stream @env0:nextPutAll: (self ___zeroPad2___: hour)].
				ch @env0:= $M ifTrue: [stream @env0:nextPutAll: (self ___zeroPad2___: min)].
				ch @env0:= $S ifTrue: [stream @env0:nextPutAll: (self ___zeroPad2___: sec)].
				ch @env0:= $j ifTrue: [
					buf := yday @env0:printString.
					[buf @env0:size @env0:< 3] @env0:whileTrue: [buf := '0' @env0:, buf].
					stream @env0:nextPutAll: buf].
				ch @env0:= $p ifTrue: [stream @env0:nextPutAll: (hour @env0:< 12 ifTrue: ['AM'] ifFalse: ['PM'])].
				ch @env0:= $a ifTrue: [stream @env0:nextPutAll: (self ___wdayAbbrev___: wday)].
				ch @env0:= $A ifTrue: [stream @env0:nextPutAll: (self ___wdayName___: wday)].
				ch @env0:= $b ifTrue: [stream @env0:nextPutAll: (self ___monthAbbrev___: mon)].
				ch @env0:= $B ifTrue: [stream @env0:nextPutAll: (self ___monthName___: mon)].
				ch @env0:= $Z ifTrue: [stream @env0:nextPutAll: 'UTC'].
				ch @env0:= $% ifTrue: [stream @env0:nextPut: $%].
			].
			i := i @env0:+ 1
		] ifFalse: [
			stream @env0:nextPut: ch.
			i := i @env0:+ 1
		]
	].
	^ stream @env0:contents
%

category: 'Grail-Private'
method: time
___zeroPad2___: n
	| s |
	s := n @env0:printString.
	s @env0:size @env0:< 2 ifTrue: [^ '0' @env0:, s].
	^ s
%

category: 'Grail-Private'
method: time
___zeroPad4___: n
	"Zero-pad to at least 4 digits (years wider than 4 pass through)."

	| s |
	s := n @env0:printString.
	[s @env0:size @env0:< 4] @env0:whileTrue: [s := '0' @env0:, s].
	^ s
%

category: 'Grail-Private'
method: time
___isoWeek1Monday___: y
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
%

category: 'Grail-Private'
method: time
___isoYear___: y month: mon day: day
	"The ISO 8601 year for calendar date (y, mon, day) -- %G."

	| ord week1monday nextWeek1monday |
	ord := (Date @env0:newDay: day monthNumber: mon year: y) @env0:asDays.
	week1monday := self ___isoWeek1Monday___: y.
	ord @env0:< week1monday ifTrue: [^ y @env0:- 1].
	nextWeek1monday := self ___isoWeek1Monday___: y @env0:+ 1.
	ord @env0:>= nextWeek1monday ifTrue: [^ y @env0:+ 1].
	^ y
%

category: 'Grail-Private'
method: time
___wdayAbbrev___: wday
	"wday is Monday=0..Sunday=6."
	^ #('Mon' 'Tue' 'Wed' 'Thu' 'Fri' 'Sat' 'Sun') @env0:at: wday @env0:+ 1
%

category: 'Grail-Private'
method: time
___wdayName___: wday
	^ #('Monday' 'Tuesday' 'Wednesday' 'Thursday' 'Friday' 'Saturday' 'Sunday')
		@env0:at: wday @env0:+ 1
%

category: 'Grail-Private'
method: time
___monthAbbrev___: mon
	^ #('Jan' 'Feb' 'Mar' 'Apr' 'May' 'Jun' 'Jul' 'Aug' 'Sep' 'Oct' 'Nov' 'Dec')
		@env0:at: mon
%

category: 'Grail-Private'
method: time
___monthName___: mon
	^ #('January' 'February' 'March' 'April' 'May' 'June' 'July'
		'August' 'September' 'October' 'November' 'December')
		@env0:at: mon
%

category: 'Grail-Formatting'
method: time
asctime
	"asctime() with current time."

	^ self asctime: self gmtime
%

category: 'Grail-Formatting'
method: time
asctime: structTime
	"asctime(t) → e.g. 'Sun Jun 20 23:21:05 1993'.  CPython's exact
	24-character format."

	^ self strftime: '%a %b %d %H:%M:%S %Y' _: structTime
%

category: 'Grail-Formatting'
method: time
ctime
	^ self asctime: self localtime
%

category: 'Grail-Formatting'
method: time
ctime: epochSeconds
	^ self asctime: (self localtime: epochSeconds)
%

set compile_env: 0
