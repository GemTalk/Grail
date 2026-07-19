! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

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
___unixEpochSeconds___
	"Cached Smalltalk-asSeconds value for 1970-01-01 00:00:00 UTC.
	DateTime asSeconds counts from a Smalltalk epoch (Jan 1 1901) so
	we subtract this to land in Unix epoch terms.  Cached once per
	session in a class-side dict to avoid recomputing on every
	time() call."

	^ 2177424000
%

set compile_env: 1

category: 'Grail-Initialization'
method: time
initialize
	"Pre-store ``struct_time'' as a marker class.  CPython has a
	real namedtuple-like class for this; Grail aliases it to
	``tuple'' so ``isinstance(t, struct_time)'' returns false for
	plain tuples (matching CPython for non-struct_time tuples) and
	the import path can find the name.  Werkzeug.http hits this via
	``from time import struct_time''."
	self @env0:dynamicInstVarAt: #struct_time put: tuple
%

category: 'Grail-Wall clock'
method: time
time
	"Return the current Unix epoch time as a float with millisecond
	resolution.  Mirrors CPython's time.time()."

	| dt secs msInDay subSecond |
	dt := DateTime @env0:now.
	secs := dt @env0:asSeconds @env0:- time @env0:___unixEpochSeconds___.
	"Sub-second component comes from msAfterMidnight; rem: 1000 strips
	the whole-seconds part that is already in `secs`."
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
	secs := dt @env0:asSeconds @env0:- time @env0:___unixEpochSeconds___.
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
	"Suspend the current process for ``seconds`` (int or float).
	Backed by GemStone Delay."

	| ms |
	ms := (seconds @env0:* 1000) @env0:truncated.
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
	"Local-time struct_time for a given epoch-seconds value."

	| epoch dt |
	epoch := DateTime
		@env0:newWithYear: 1970
		month: 1
		day: 1
		hours: 0
		minutes: 0
		seconds: 0.
	dt := epoch @env0:addSeconds: epochSeconds @env0:truncated.
	^ self ___structTimeFromDateTime___: dt
%

category: 'Grail-Private'
method: time
___structTimeFromDateTime___: dt
	"Local-time struct_time tuple matching CPython's struct_time."

	^ self
		___structTimeYear___: dt @env0:year
		_month: dt @env0:month
		_day: dt @env0:dayOfMonth
		_hour: dt @env0:hour
		_minute: dt @env0:minute
		_second: dt @env0:seconds
		_dayOfWeek: dt @env0:dayOfWeek
		_dayOfYear: dt @env0:dayOfYear
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
	"Build a struct_time tuple from components.  Python tm_wday is
	Monday=0..Sunday=6; Smalltalk dayOfWeek is Sunday=1..Saturday=7."

	| isoDow |
	isoDow := dow @env0:= 1 ifTrue: [6] ifFalse: [dow @env0:- 2].
	^ tuple @env0:withAll: {
		year.
		mon.
		day.
		hour.
		min.
		sec.
		isoDow.
		doy.
		-1 "tm_isdst unknown"
	}
%

category: 'Grail-Calendar'
method: time
mktime: structTime
	"Inverse of localtime(): convert struct_time tuple to epoch
	seconds.  Reads the first six fields (year..second) and ignores
	the rest."

	| year mon day hour min sec dt |
	year := structTime __getitem__: 0.
	mon := structTime __getitem__: 1.
	day := structTime __getitem__: 2.
	hour := structTime __getitem__: 3.
	min := structTime __getitem__: 4.
	sec := structTime __getitem__: 5.
	dt := DateTime
		@env0:newWithYear: year
		month: mon
		day: day
		hours: hour
		minutes: min
		seconds: sec.
	^ (dt @env0:asSeconds @env0:- time @env0:___unixEpochSeconds___) @env0:asFloat
%

category: 'Grail-Formatting'
method: time
strftime: format
	"strftime() with current time."

	^ self strftime: format _: self gmtime
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
				ch @env0:= $Y ifTrue: [stream @env0:nextPutAll: (year @env0:printString)].
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
