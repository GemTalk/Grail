! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

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
	"Build a normalized timedelta from total signed microseconds."

	| inst days secs micros |
	"Normalize so 0 <= micros < 1e6 and 0 <= secs < 86400, with `days`
	carrying the sign (matches CPython's storage)."
	micros := totalMicros @env0:\\ 1000000.
	secs := (totalMicros @env0:// 1000000) @env0:\\ 86400.
	days := totalMicros @env0:// 1000000 @env0:// 86400.
	inst := self @env0:new.
	inst @env0:_days: days _seconds: secs _microseconds: micros.
	^ inst
%

category: 'Grail-Private'
method: PyTimedelta
_days: d _seconds: s _microseconds: us
	self @env0:dynamicInstVarAt: #_days put: (d).
	self @env0:dynamicInstVarAt: #_seconds put: (s).
	self @env0:dynamicInstVarAt: #_microseconds put: (us).
	^ self
%

set compile_env: 1

category: 'Grail-Callable'
classmethod: PyTimedelta
value: positional value: kwargs
	"Class-side callable - forward every arity + kwargs into the
	varargs assembler.  Bypasses Object class >> value:value: which
	would dispatch by __new__ arity (no 7-arg __new__ defined)."

	^ self @env1:_timedelta: positional kw: kwargs
%

category: 'Grail-Initialization'
classmethod: PyTimedelta
_timedelta: positional kw: kwargs
	"Varargs constructor accepting any combination of named time
	units: days, seconds, microseconds, milliseconds, minutes,
	hours, weeks."

	| total positionalKeys keys idx |
	total := 0.
	positionalKeys := #(#days #seconds #microseconds #milliseconds #minutes #hours #weeks).
	idx := 1.
	positional @env0:do: [:val |
		total := total @env0:+ ((self @env0:___multiplier___: (positionalKeys @env0:at: idx)) @env0:* val).
		idx := idx @env0:+ 1
	].
	kwargs @env0:isNil ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v |
			total := total @env0:+ ((self @env0:___multiplier___: k) @env0:* v)
		]
	].
	^ self @env0:___fromTotalMicros___: total @env0:truncated
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
	sym := unit @env0:asSymbol.
	sym @env0:= #days ifTrue: [^ 86400000000].
	sym @env0:= #seconds ifTrue: [^ 1000000].
	sym @env0:= #microseconds ifTrue: [^ 1].
	sym @env0:= #milliseconds ifTrue: [^ 1000].
	sym @env0:= #minutes ifTrue: [^ 60000000].
	sym @env0:= #hours ifTrue: [^ 3600000000].
	sym @env0:= #weeks ifTrue: [^ 604800000000].
	^ TypeError @env1:___signal___: 'unsupported timedelta unit: ' @env0:, unit @env0:asString
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
	"Float total over all stored fields."

	^ ((self @env0:dynamicInstVarAt: #_days) @env0:* 86400 @env0:+ (self @env0:dynamicInstVarAt: #_seconds)) @env0:asFloat
		@env0:+ ((self @env0:dynamicInstVarAt: #_microseconds) @env0:asFloat @env0:/ 1000000.0)
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
	(other @env0:isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self @env1:___totalMicros___ @env0:+ other @env1:___totalMicros___)
	].
	^ TypeError @env1:___signal___: 'unsupported operand for +'
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__sub__: other
	(other @env0:isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self @env1:___totalMicros___ @env0:- other @env1:___totalMicros___)
	].
	^ TypeError @env1:___signal___: 'unsupported operand for -'
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__neg__
	^ PyTimedelta @env0:___fromTotalMicros___: self @env1:___totalMicros___ @env0:negated
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__mul__: scale
	^ PyTimedelta @env0:___fromTotalMicros___:
		(self @env1:___totalMicros___ @env0:* scale) @env0:truncated
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__abs__
	self @env1:___totalMicros___ @env0:< 0 ifTrue: [
		^ self @env1:__neg__
	].
	^ self
%

category: 'Grail-Equality'
method: PyTimedelta
__eq__: other
	(other @env0:isKindOf: PyTimedelta) ifFalse: [^ false].
	^ self @env1:___totalMicros___ @env0:= other @env1:___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__lt__: other
	^ self @env1:___totalMicros___ @env0:< other @env1:___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__hash__
	^ self @env1:___totalMicros___ @env0:hash
%

category: 'Grail-Conversion'
method: PyTimedelta
__str__
	"Roughly CPython's repr: e.g. '1 day, 3:04:05.000006'."

	| stream absMicros days hours mins secs us usStr |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	absMicros := self @env1:___totalMicros___.
	absMicros @env0:< 0 ifTrue: [
		stream @env0:nextPutAll: '-'.
		absMicros := absMicros @env0:negated
	].
	days := absMicros @env0:// 86400000000.
	absMicros := absMicros @env0:\\ 86400000000.
	hours := absMicros @env0:// 3600000000.
	absMicros := absMicros @env0:\\ 3600000000.
	mins := absMicros @env0:// 60000000.
	absMicros := absMicros @env0:\\ 60000000.
	secs := absMicros @env0:// 1000000.
	us := absMicros @env0:\\ 1000000.
	days @env0:= 0 ifFalse: [
		stream @env0:nextPutAll: days @env0:printString.
		stream @env0:nextPutAll: (days @env0:= 1 ifTrue: [' day, '] ifFalse: [' days, '])
	].
	stream @env0:nextPutAll: hours @env0:printString.
	stream @env0:nextPut: $:.
	mins @env0:< 10 ifTrue: [stream @env0:nextPut: $0].
	stream @env0:nextPutAll: mins @env0:printString.
	stream @env0:nextPut: $:.
	secs @env0:< 10 ifTrue: [stream @env0:nextPut: $0].
	stream @env0:nextPutAll: secs @env0:printString.
	us @env0:= 0 ifFalse: [
		stream @env0:nextPut: $..
		usStr := us @env0:printString.
		[usStr @env0:size @env0:< 6] @env0:whileTrue: [usStr := '0' @env0:, usStr].
		stream @env0:nextPutAll: usStr
	].
	^ stream @env0:contents
%

! ===============================================================================
! PyTimezone - Python `datetime.timezone`.  Stored as a PyTimedelta offset
! plus optional name.  `timezone.utc` is the canonical UTC singleton.
! ===============================================================================

set compile_env: 0

expectvalue /Class
doit
Object subclass: 'PyTimezone'
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
	self @env0:dynamicInstVarAt: #_offset put: (tdelta).
	self @env0:dynamicInstVarAt: #_name put: (nameOrNil).
	^ self
%

set compile_env: 1

category: 'Grail-Singletons'
classmethod: PyTimezone
utc
	"timezone.utc - canonical singleton for UTC."

	_utc @env0:isNil ifTrue: [
		_utc := self @env0:new
			@env0:_offset: (PyTimedelta @env0:___fromTotalMicros___: 0) _name: 'UTC'
	].
	^ _utc
%

category: 'Grail-Initialization'
classmethod: PyTimezone
__new__: tdelta
	"timezone(offset) constructor."

	^ self @env0:new @env0:_offset: tdelta _name: nil
%

category: 'Grail-Initialization'
classmethod: PyTimezone
__new__: tdelta _: aName
	"timezone(offset, name) constructor."

	^ self @env0:new @env0:_offset: tdelta _name: aName
%

category: 'Grail-Accessors'
method: PyTimezone
utcoffset: dt
	"Return the configured offset (independent of `dt`)."

	^ (self @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Accessors'
method: PyTimezone
tzname: dt
	"Return the human-readable name, e.g. 'UTC' or 'UTC+02:00'."

	(self @env0:dynamicInstVarAt: #_name) @env0:isNil ifFalse: [^ (self @env0:dynamicInstVarAt: #_name)].
	^ self @env1:___formatOffset___: (self @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Accessors'
method: PyTimezone
dst: dt
	"timezone instances do not represent DST transitions."

	^ None
%

category: 'Grail-Accessors'
method: PyTimezone
__str__
	^ self @env1:tzname: None
%

category: 'Grail-Private'
method: PyTimezone
___formatOffset___: tdelta
	| total stream hours mins sign |
	total := tdelta @env1:total_seconds @env0:truncated.
	total @env0:= 0 ifTrue: [^ 'UTC'].
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: 'UTC'.
	sign := total @env0:< 0 ifTrue: [$-] ifFalse: [$+].
	stream @env0:nextPut: sign.
	total := total @env0:abs.
	hours := total @env0:// 3600.
	mins := (total @env0:\\ 3600) @env0:// 60.
	hours @env0:< 10 ifTrue: [stream @env0:nextPut: $0].
	stream @env0:nextPutAll: hours @env0:printString.
	stream @env0:nextPut: $:.
	mins @env0:< 10 ifTrue: [stream @env0:nextPut: $0].
	stream @env0:nextPutAll: mins @env0:printString.
	^ stream @env0:contents
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
		yourself
%

category: 'Grail-Private'
classmethod: PyDateTime
___fromFields___: y _: mo _: d _: h _: mi _: s _: us _: tz
	| inst |
	inst := self @env0:new.
	inst
		@env0:_year: y _month: mo _day: d
		_hour: h _minute: mi _second: s
		_microsecond: us _tzinfo: tz.
	^ inst
%

category: 'Grail-Private'
method: PyDateTime
_year: y _month: mo _day: d _hour: h _minute: mi _second: s _microsecond: us _tzinfo: tz
	self @env0:dynamicInstVarAt: #_year put: (y).
	self @env0:dynamicInstVarAt: #_month put: (mo).
	self @env0:dynamicInstVarAt: #_day put: (d).
	self @env0:dynamicInstVarAt: #_hour put: (h).
	self @env0:dynamicInstVarAt: #_minute put: (mi).
	self @env0:dynamicInstVarAt: #_second put: (s).
	self @env0:dynamicInstVarAt: #_microsecond put: (us).
	self @env0:dynamicInstVarAt: #_tzinfo put: (tz).
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
	^ self @env1:_datetime: positional kw: kwargs
%

category: 'Grail-Initialization'
classmethod: PyDateTime
_datetime: positional kw: kwargs
	"datetime(...) varargs constructor accepting optional second,
	microsecond, tzinfo."

	| year month day hour minute second micro tz |
	year := positional @env0:at: 1.
	month := positional @env0:at: 2.
	day := positional @env0:at: 3.
	hour := positional @env0:size @env0:>= 4 ifTrue: [positional @env0:at: 4] ifFalse: [0].
	minute := positional @env0:size @env0:>= 5 ifTrue: [positional @env0:at: 5] ifFalse: [0].
	second := positional @env0:size @env0:>= 6 ifTrue: [positional @env0:at: 6] ifFalse: [0].
	micro := positional @env0:size @env0:>= 7 ifTrue: [positional @env0:at: 7] ifFalse: [0].
	tz := positional @env0:size @env0:>= 8 ifTrue: [positional @env0:at: 8] ifFalse: [nil].
	kwargs @env0:isNil ifFalse: [
		hour := kwargs @env0:at: 'hour' ifAbsent: [hour].
		minute := kwargs @env0:at: 'minute' ifAbsent: [minute].
		second := kwargs @env0:at: 'second' ifAbsent: [second].
		micro := kwargs @env0:at: 'microsecond' ifAbsent: [micro].
		tz := kwargs @env0:at: 'tzinfo' ifAbsent: [tz]
	].
	tz @env0:== None ifTrue: [tz := nil].
	^ self @env0:___fromFields___: year _: month _: day _: hour _: minute _: second _: micro _: tz
%

category: 'Grail-Initialization'
classmethod: PyDateTime
now
	^ self @env1:now: nil
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
	tz2 := tz @env0:== None ifTrue: [nil] ifFalse: [tz].
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
utcnow
	"utcnow() - naive UTC datetime (deprecated in CPython 3.12+
	but still common in libraries like itsdangerous)."

	^ self @env1:now: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromtimestamp: ts
	^ self @env1:fromtimestamp: ts _: nil
%

category: 'Grail-Initialization'
classmethod: PyDateTime
fromtimestamp: ts _: tz
	"fromtimestamp(ts[, tz]) - Unix epoch seconds to PyDateTime."

	| epoch dt secs micros tz2 |
	tz2 := tz @env0:== None ifTrue: [nil] ifFalse: [tz].
	secs := ts @env0:truncated.
	micros := ((ts @env0:- secs) @env0:* 1000000) @env0:truncated.
	epoch := DateTime
		@env0:newGmtWithYear: 1970
		month: 1
		day: 1
		hours: 0
		minutes: 0
		seconds: 0.
	dt := epoch @env0:addSeconds: secs.
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

	^ self @env1:fromtimestamp: ts _: nil
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
		ValueError @env1:___signal___: 'invalid isoformat: ' @env0:, str
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
				tz := PyTimezone @env1:utc
			] ifFalse: [
				(tzChar @env0:= $+ @env0:or: [tzChar @env0:= $-]) ifTrue: [
					| h m sign |
					sign := tzChar @env0:= $- ifTrue: [-1] ifFalse: [1].
					h := (str @env0:copyFrom: pivot @env0:+ 1 to: pivot @env0:+ 2) @env0:asNumber.
					m := (str @env0:copyFrom: pivot @env0:+ 4 to: pivot @env0:+ 5) @env0:asNumber.
					tzMicros := sign @env0:* ((h @env0:* 3600 @env0:+ (m @env0:* 60)) @env0:* 1000000).
					tz := PyTimezone @env1:__new__: (PyTimedelta @env0:___fromTotalMicros___: tzMicros)
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

! ------- Conversion

category: 'Grail-Conversion'
method: PyDateTime
timestamp
	"Unix epoch seconds with sub-second precision.  Treats naive
	datetimes as UTC (CPython treats them as local; the gem doesn't
	have a portable local definition, so we pick a deterministic
	stand-in)."

	| epoch dt |
	epoch := DateTime
		@env0:newGmtWithYear: 1970
		month: 1
		day: 1
		hours: 0
		minutes: 0
		seconds: 0.
	dt := DateTime
		@env0:newGmtWithYear: (self @env0:dynamicInstVarAt: #_year)
		month: (self @env0:dynamicInstVarAt: #_month)
		day: (self @env0:dynamicInstVarAt: #_day)
		hours: (self @env0:dynamicInstVarAt: #_hour)
		minutes: (self @env0:dynamicInstVarAt: #_minute)
		seconds: (self @env0:dynamicInstVarAt: #_second).
	^ (dt @env0:asSeconds @env0:- epoch @env0:asSeconds)
		@env0:asFloat @env0:+ ((self @env0:dynamicInstVarAt: #_microsecond) @env0:asFloat @env0:/ 1000000.0)
%

category: 'Grail-Conversion'
method: PyDateTime
isoformat
	^ self @env1:isoformat: $T
%

category: 'Grail-Conversion'
method: PyDateTime
isoformat: sep
	"ISO 8601 representation; sep is `T` by default but can be space."

	| stream micros tzStr |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: (self @env1:___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4).
	stream @env0:nextPut: $-.
	stream @env0:nextPutAll: (self @env1:___pad___: (self @env0:dynamicInstVarAt: #_month) width: 2).
	stream @env0:nextPut: $-.
	stream @env0:nextPutAll: (self @env1:___pad___: (self @env0:dynamicInstVarAt: #_day) width: 2).
	stream @env0:nextPut: (sep @env0:isString ifTrue: [sep @env0:first] ifFalse: [sep]).
	stream @env0:nextPutAll: (self @env1:___pad___: (self @env0:dynamicInstVarAt: #_hour) width: 2).
	stream @env0:nextPut: $:.
	stream @env0:nextPutAll: (self @env1:___pad___: (self @env0:dynamicInstVarAt: #_minute) width: 2).
	stream @env0:nextPut: $:.
	stream @env0:nextPutAll: (self @env1:___pad___: (self @env0:dynamicInstVarAt: #_second) width: 2).
	(self @env0:dynamicInstVarAt: #_microsecond) @env0:= 0 ifFalse: [
		stream @env0:nextPut: $..
		micros := (self @env0:dynamicInstVarAt: #_microsecond) @env0:printString.
		[micros @env0:size @env0:< 6] @env0:whileTrue: [micros := '0' @env0:, micros].
		stream @env0:nextPutAll: micros
	].
	(self @env0:dynamicInstVarAt: #_tzinfo) @env0:isNil ifFalse: [
		tzStr := (self @env0:dynamicInstVarAt: #_tzinfo) @env1:tzname: self.
		tzStr @env0:= 'UTC' ifTrue: [
			stream @env0:nextPutAll: '+00:00'
		] ifFalse: [
			"UTC+HH:MM -> +HH:MM"
			tzStr @env0:size @env0:>= 6 ifTrue: [
				stream @env0:nextPutAll: (tzStr @env0:copyFrom: 4 to: tzStr @env0:size)
			]
		]
	].
	^ stream @env0:contents
%

category: 'Grail-Conversion'
method: PyDateTime
__str__
	^ self @env1:isoformat: ' '
%

category: 'Grail-Conversion'
method: PyDateTime
__repr__
	^ 'datetime.datetime(' @env0:,
		(self @env0:dynamicInstVarAt: #_year) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_month) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_day) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_hour) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_minute) @env0:printString @env0:, ', ' @env0:,
		(self @env0:dynamicInstVarAt: #_second) @env0:printString @env0:, ')'
%

category: 'Grail-Conversion'
method: PyDateTime
strftime: format
	"Minimal strftime via delegating to the `time` module's struct_time
	tuple + formatter.  Supports the directives HTTP-date / cookie
	expiration / log timestamps need: %Y %m %d %H %M %S %y %j %p %a %A
	%b %B %Z %%."

	| structTime |
	structTime := tuple @env0:withAll: {
		(self @env0:dynamicInstVarAt: #_year). (self @env0:dynamicInstVarAt: #_month). (self @env0:dynamicInstVarAt: #_day). (self @env0:dynamicInstVarAt: #_hour). (self @env0:dynamicInstVarAt: #_minute). (self @env0:dynamicInstVarAt: #_second).
		(self @env1:___pyDayOfWeek___).
		(self @env1:___dayOfYear___).
		-1
	}.
	^ time @env1:instance @env1:strftime: format _: structTime
%

! ------- Arithmetic

category: 'Grail-Arithmetic'
method: PyDateTime
__add__: other
	"datetime + timedelta -> datetime.  Round-trip through epoch
	timestamp + microseconds so day/month/year overflow are handled
	by DateTime arithmetic."

	| newTs result |
	(other @env0:isKindOf: PyTimedelta) ifFalse: [
		^ TypeError @env1:___signal___: 'unsupported operand for +'
	].
	newTs := self @env1:timestamp @env0:+ other @env1:total_seconds.
	result := PyDateTime @env1:fromtimestamp: newTs _: (self @env0:dynamicInstVarAt: #_tzinfo).
	^ result
%

category: 'Grail-Arithmetic'
method: PyDateTime
__sub__: other
	"datetime - datetime -> timedelta; datetime - timedelta -> datetime."

	(other @env0:isKindOf: PyDateTime) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			((self @env1:timestamp @env0:- other @env1:timestamp) @env0:* 1000000) @env0:truncated
	].
	(other @env0:isKindOf: PyTimedelta) ifTrue: [
		^ self @env1:__add__: (other @env1:__neg__)
	].
	^ TypeError @env1:___signal___: 'unsupported operand for -'
%

! ------- Equality / ordering

category: 'Grail-Equality'
method: PyDateTime
__eq__: other
	(other @env0:isKindOf: PyDateTime) ifFalse: [^ false].
	^ self @env1:___compareKey___ @env0:= other @env1:___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__lt__: other
	^ self @env1:___compareKey___ @env0:< other @env1:___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__hash__
	^ self @env1:___compareKey___ @env0:hash
%

category: 'Grail-Private'
method: PyDateTime
___compareKey___
	"Tuple of fields suitable for ordering."

	^ Array @env0:with: (self @env0:dynamicInstVarAt: #_year) with: (self @env0:dynamicInstVarAt: #_month) with: (self @env0:dynamicInstVarAt: #_day) with: (self @env0:dynamicInstVarAt: #_hour) with: (self @env0:dynamicInstVarAt: #_minute) with: (self @env0:dynamicInstVarAt: #_second) with: (self @env0:dynamicInstVarAt: #_microsecond)
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
		tz @env0:== None ifTrue: [tz := nil]
	].
	^ PyDateTime @env0:___fromFields___: y _: mo _: d _: h _: mi _: s _: us _: tz
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
	"Python tm_wday: Monday=0..Sunday=6.  Compute via GemStone Date."

	| dt dow |
	dt := DateTime
		@env0:newGmtWithYear: (self @env0:dynamicInstVarAt: #_year)
		month: (self @env0:dynamicInstVarAt: #_month)
		day: (self @env0:dynamicInstVarAt: #_day)
		hours: 0
		minutes: 0
		seconds: 0.
	dow := dt @env0:dayOfWeek.
	^ dow @env0:= 1 ifTrue: [6] ifFalse: [dow @env0:- 2]
%

category: 'Grail-Private'
method: PyDateTime
___dayOfYear___
	| dt |
	dt := DateTime
		@env0:newGmtWithYear: (self @env0:dynamicInstVarAt: #_year)
		month: (self @env0:dynamicInstVarAt: #_month)
		day: (self @env0:dynamicInstVarAt: #_day)
		hours: 0
		minutes: 0
		seconds: 0.
	^ dt @env0:dayOfYear
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

Provides timedelta / datetime / timezone (skipping standalone date /
time / tzinfo for now - itsdangerous, Werkzeug, Flask use the
combined datetime form throughout).  Smalltalk-backed; arithmetic
goes through PyTimedelta normalized integer microseconds.

Common access:
  datetime.datetime.now(datetime.timezone.utc)
  datetime.datetime.fromisoformat(s)
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
		add: #datetime;
		add: #timedelta;
		add: #timezone;
		add: #MINYEAR;
		add: #MAXYEAR;
		yourself
%

set compile_env: 1

category: 'Grail-Initialization'
method: datetime
initialize
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

set compile_env: 0
