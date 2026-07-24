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
	micros := totalMicros \\ 1000000.
	secs := (totalMicros // 1000000) \\ 86400.
	days := totalMicros // 1000000 // 86400.
	inst := self new.
	inst _days: days _seconds: secs _microseconds: micros.
	^ inst
%

category: 'Grail-Private'
method: PyTimedelta
_days: d _seconds: s _microseconds: us
	self dynamicInstVarAt: #_days put: (d).
	self dynamicInstVarAt: #_seconds put: (s).
	self dynamicInstVarAt: #_microseconds put: (us).
	^ self
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
	(other isKindOf: PyTimedelta) ifTrue: [
		^ PyTimedelta @env0:___fromTotalMicros___:
			(self ___totalMicros___ @env0:+ other ___totalMicros___)
	].
	^ TypeError ___signal___: 'unsupported operand for +'
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
	^ PyTimedelta @env0:___fromTotalMicros___:
		(self ___totalMicros___ @env0:* scale) @env0:truncated
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__truediv__: other
	"td / td -> float; td / number -> td."

	(other isKindOf: PyTimedelta) ifTrue: [
		^ (self ___totalMicros___ @env0:/ other ___totalMicros___) @env0:asFloat].
	^ PyTimedelta @env0:___fromTotalMicros___:
		(self ___totalMicros___ @env0:/ other) @env0:rounded
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__floordiv__: other
	"td // td -> int; td // number -> td."

	(other isKindOf: PyTimedelta) ifTrue: [
		^ self ___totalMicros___ @env0:// other ___totalMicros___].
	^ PyTimedelta @env0:___fromTotalMicros___: (self ___totalMicros___ @env0:// other)
%

category: 'Grail-Arithmetic'
method: PyTimedelta
__mod__: other
	"td % td -> td."

	^ PyTimedelta @env0:___fromTotalMicros___:
		(self ___totalMicros___ @env0:\\ other ___totalMicros___)
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
	(other isKindOf: PyTimedelta) ifFalse: [^ false].
	^ self ___totalMicros___ @env0:= other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__lt__: other
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
	^ 'timedelta'
%

category: 'Grail-Conversion'
method: PyTimedelta
__str__
	"Roughly CPython's repr: e.g. '1 day, 3:04:05.000006'."

	| stream absMicros days hours mins secs us usStr |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	absMicros := self ___totalMicros___.
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

category: 'Grail-Equality'
method: PyTimedelta
__le__: other
	^ self ___totalMicros___ @env0:<= other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__gt__: other
	^ self ___totalMicros___ @env0:> other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__ge__: other
	^ self ___totalMicros___ @env0:>= other ___totalMicros___
%

category: 'Grail-Equality'
method: PyTimedelta
__ne__: other
	^ (self __eq__: other) @env0:not
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
	omitting zero components; 'datetime.timedelta(0)' when all zero."

	| d s us stream any |
	d := self @env0:dynamicInstVarAt: #_days.
	s := self @env0:dynamicInstVarAt: #_seconds.
	us := self @env0:dynamicInstVarAt: #_microseconds.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: 'datetime.timedelta('.
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
	^ self ___formatOffset___: (self @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Accessors'
method: PyTimezone
dst: dt
	"timezone instances do not represent DST transitions."

	^ None
%

category: 'Grail-Accessors'
method: PyTimezone
fromutc: dt
	"Convert a UTC datetime (tzinfo == self) to this zone: dt + offset."

	^ dt __add__: (self @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Accessors'
method: PyTimezone
__str__
	^ self tzname: None
%

category: 'Grail-Private'
method: PyTimezone
___formatOffset___: tdelta
	| total stream hours mins sign |
	total := tdelta total_seconds @env0:truncated.
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

category: 'Grail-Equality'
method: PyTimezone
__eq__: other
	"Two timezones are equal iff their offsets are equal (CPython
	compares offset only, not name)."

	(other isKindOf: PyTimezone) ifFalse: [^ false].
	^ (self @env0:dynamicInstVarAt: #_offset) __eq__: (other @env0:dynamicInstVarAt: #_offset)
%

category: 'Grail-Equality'
method: PyTimezone
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Equality'
method: PyTimezone
__hash__
	^ (self @env0:dynamicInstVarAt: #_offset) __hash__
%

category: 'Grail-Pickle'
method: PyTimezone
__reduce__
	"(class, (offset[, name]))."

	| name fields |
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
	^ 'timezone'
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
	year := positional @env0:at: 1.
	month := positional @env0:at: 2.
	day := positional @env0:at: 3.
	hour := positional @env0:size @env0:>= 4 ifTrue: [positional @env0:at: 4] ifFalse: [0].
	minute := positional @env0:size @env0:>= 5 ifTrue: [positional @env0:at: 5] ifFalse: [0].
	second := positional @env0:size @env0:>= 6 ifTrue: [positional @env0:at: 6] ifFalse: [0].
	micro := positional @env0:size @env0:>= 7 ifTrue: [positional @env0:at: 7] ifFalse: [0].
	tz := positional @env0:size @env0:>= 8 ifTrue: [positional @env0:at: 8] ifFalse: [nil].
	fold := 0.
	kwargs @env0:isNil ifFalse: [
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
fromtimestamp: ts _: tz
	"fromtimestamp(ts[, tz]) - Unix epoch seconds to PyDateTime."

	| epoch dt secs micros tz2 |
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
	^ self isoformat: $T
%

category: 'Grail-Conversion'
method: PyDateTime
isoformat: sep
	"ISO 8601 representation; sep is `T` by default but can be space."

	| stream micros tzStr |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: (self ___pad___: (self @env0:dynamicInstVarAt: #_year) width: 4).
	stream @env0:nextPut: $-.
	stream @env0:nextPutAll: (self ___pad___: (self @env0:dynamicInstVarAt: #_month) width: 2).
	stream @env0:nextPut: $-.
	stream @env0:nextPutAll: (self ___pad___: (self @env0:dynamicInstVarAt: #_day) width: 2).
	stream @env0:nextPut: (sep @env0:isString ifTrue: [sep @env0:first] ifFalse: [sep]).
	stream @env0:nextPutAll: (self ___pad___: (self @env0:dynamicInstVarAt: #_hour) width: 2).
	stream @env0:nextPut: $:.
	stream @env0:nextPutAll: (self ___pad___: (self @env0:dynamicInstVarAt: #_minute) width: 2).
	stream @env0:nextPut: $:.
	stream @env0:nextPutAll: (self ___pad___: (self @env0:dynamicInstVarAt: #_second) width: 2).
	(self @env0:dynamicInstVarAt: #_microsecond) @env0:= 0 ifFalse: [
		stream @env0:nextPut: $..
		micros := (self @env0:dynamicInstVarAt: #_microsecond) @env0:printString.
		[micros @env0:size @env0:< 6] @env0:whileTrue: [micros := '0' @env0:, micros].
		stream @env0:nextPutAll: micros
	].
	(self @env0:dynamicInstVarAt: #_tzinfo) @env0:isNil ifFalse: [
		tzStr := (self @env0:dynamicInstVarAt: #_tzinfo) tzname: self.
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
	^ self isoformat: ' '
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
		(self ___pyDayOfWeek___).
		(self ___dayOfYear___).
		-1
	}.
	^ time instance strftime: format _: structTime
%

category: 'Grail-Conversion'
method: PyDateTime
__format__: spec
	"datetime.__format__: empty spec -> str(self); else strftime(spec)."

	(spec @env0:isNil or: [spec @env0:isEmpty]) ifTrue: [^ self __str__].
	^ self strftime: spec
%

category: 'Grail-Conversion'
method: PyDateTime
timetuple
	"struct_time-shaped 9-tuple; tm_isdst = -1."

	^ tuple @env0:withAll: {
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

category: 'Grail-Initialization'
classmethod: PyDateTime
combine: aDate _: aTime
	"datetime.combine(date, time) — merge fields; inherit time's tzinfo."

	^ PyDateTime @env0:___fromFields___:
		(aDate year) _: (aDate month) _: (aDate day)
		_: (aTime hour) _: (aTime minute) _: (aTime second)
		_: (aTime microsecond) _: (aTime @env0:dynamicInstVarAt: #_tzinfo)
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
	newTs := self timestamp @env0:+ other total_seconds.
	result := PyDateTime fromtimestamp: newTs _: (self @env0:dynamicInstVarAt: #_tzinfo).
	^ result
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
	(other isKindOf: PyDateTime) ifFalse: [^ false].
	^ self ___compareKey___ @env0:= other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__lt__: other
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
	^ self ___compareKey___ @env0:<= other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__gt__: other
	^ self ___compareKey___ @env0:> other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__ge__: other
	^ self ___compareKey___ @env0:>= other ___compareKey___
%

category: 'Grail-Equality'
method: PyDateTime
__ne__: other
	^ (self __eq__: other) @env0:not
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
	^ 'datetime'
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

category: 'Grail-Private'
method: PyDate
_year: y _month: m _day: d
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
	"date(year, month, day) — three positionals required."

	| y m d |
	y := positional @env0:at: 1.
	m := positional @env0:at: 2.
	d := positional @env0:at: 3.
	kwargs @env0:isNil ifFalse: [
		y := kwargs @env0:at: 'year' ifAbsent: [y].
		m := kwargs @env0:at: 'month' ifAbsent: [m].
		d := kwargs @env0:at: 'day' ifAbsent: [d]].
	^ self @env0:___fromFields___: y _: m _: d
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
	"Local-time date from POSIX timestamp."

	| epoch dt d |
	epoch := DateTime @env0:newGmtWithYear: 1970 month: 1 day: 1 hours: 0 minutes: 0 seconds: 0.
	dt := epoch @env0:+ (Duration @env0:fromSeconds: ts).
	d := dt @env0:asDate.
	^ self @env0:___fromFields___:
		d @env0:year _: d @env0:monthIndex _: d @env0:dayOfMonth
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
	^ 'datetime.date(' @env0:,
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
	"struct_time-shaped 9-tuple (time fields zero); tm_isdst = -1."

	^ tuple @env0:withAll: {
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
	"Delegate to the time module's formatter with a midnight struct_time."

	^ time instance strftime: format _: self timetuple
%

category: 'Grail-Conversion'
method: PyDate
__format__: spec
	"date.__format__: empty spec -> str(self); else strftime(spec)."

	(spec @env0:isNil or: [spec @env0:isEmpty]) ifTrue: [^ self __str__].
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
	^ tuple @env0:withAll: { year. week @env0:+ 1. day @env0:+ 1 }
%

category: 'Grail-Initialization'
classmethod: PyDate
fromisocalendar: year _: week _: day
	"Inverse of isocalendar()."

	| ord |
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
	^ PyDate @env0:___fromFields___: y _: m _: d
%

category: 'Grail-Arithmetic'
method: PyDate
__add__: other
	"date + timedelta → date (days component only)."

	| days newOrdinal |
	(other isKindOf: PyTimedelta) ifFalse: [
		TypeError ___signal___: 'unsupported operand type(s) for +: ''date'' and non-timedelta'].
	days := other days.
	newOrdinal := (self toordinal) @env0:+ days.
	^ PyDate fromordinal: newOrdinal
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
	(other isKindOf: PyDate) ifFalse: [^ false].
	^ (self toordinal) @env0:= (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__lt__: other
	(other isKindOf: PyDate) ifFalse: [
		TypeError ___signal___: 'can''t compare date to non-date'].
	^ (self toordinal) @env0:< (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__le__: other
	(other isKindOf: PyDate) ifFalse: [
		TypeError ___signal___: 'can''t compare date to non-date'].
	^ (self toordinal) @env0:<= (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__gt__: other
	(other isKindOf: PyDate) ifFalse: [
		TypeError ___signal___: 'can''t compare date to non-date'].
	^ (self toordinal) @env0:> (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__ge__: other
	(other isKindOf: PyDate) ifFalse: [
		TypeError ___signal___: 'can''t compare date to non-date'].
	^ (self toordinal) @env0:>= (other toordinal)
%

category: 'Grail-Equality'
method: PyDate
__ne__: other
	^ (self __eq__: other) @env0:not
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
	resolves getattr(datetime, 'date') is PyDate."

	^ 'date'
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
	| h mi s us body |
	h := self @env0:dynamicInstVarAt: #_hour.
	mi := self @env0:dynamicInstVarAt: #_minute.
	s := self @env0:dynamicInstVarAt: #_second.
	us := self @env0:dynamicInstVarAt: #_microsecond.
	body := h @env0:printString @env0:, ', ' @env0:, mi @env0:printString.
	(s @env0:~= 0 or: [us @env0:~= 0]) ifTrue: [
		body := body @env0:, ', ' @env0:, s @env0:printString.
		us @env0:~= 0 ifTrue: [body := body @env0:, ', ' @env0:, us @env0:printString]].
	^ 'datetime.time(' @env0:, body @env0:, ')'
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
	^ PyTime @env0:___fromFields___: h _: mi _: s _: us _: tz
%

category: 'Grail-Conversion'
method: PyTime
strftime: format
	"Delegate to the time module's formatter; date fields are the CPython
	placeholder 1900-01-01."

	| structTime |
	structTime := tuple @env0:withAll: {
		1900. 1. 1.
		(self @env0:dynamicInstVarAt: #_hour).
		(self @env0:dynamicInstVarAt: #_minute).
		(self @env0:dynamicInstVarAt: #_second).
		0. 1. -1 }.
	^ time instance strftime: format _: structTime
%

category: 'Grail-Conversion'
method: PyTime
__format__: spec
	(spec @env0:isNil or: [spec @env0:isEmpty]) ifTrue: [^ self __str__].
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
	(other isKindOf: PyTime) ifFalse: [^ false].
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
	^ self ___cmpKey___ @env0:< other ___cmpKey___
%

category: 'Grail-Equality'
method: PyTime
__le__: other
	^ self ___cmpKey___ @env0:<= other ___cmpKey___
%

category: 'Grail-Equality'
method: PyTime
__gt__: other
	^ self ___cmpKey___ @env0:> other ___cmpKey___
%

category: 'Grail-Equality'
method: PyTime
__ge__: other
	^ self ___cmpKey___ @env0:>= other ___cmpKey___
%

category: 'Grail-Equality'
method: PyTime
__ne__: other
	^ (self __eq__: other) @env0:not
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
	^ 'time'
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
		yourself
%

set compile_env: 1

category: 'Grail-Initialization'
method: datetime
initialize
%

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

set compile_env: 0
