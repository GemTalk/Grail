Extension { #name : 'PyTimezone' }

{ #category : 'Grail-Class Attrs' }
PyTimezone class >> __module__ [
	^ 'datetime'

]

{ #category : 'Grail-Introspection' }
PyTimezone class >> __name__ [
	^ self @env0:== PyTimezone
		ifTrue: ['timezone']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Initialization' }
PyTimezone class >> __new__ [
	"timezone() with no argument: the offset is required.  Reachable since
	``datetime.timezone()'' became a call (#1448) -- it answered the class
	before -- and through an alias it built a timezone whose offset was nil."

	^ TypeError ___signal___: 'timezone() missing required argument ''offset'' (pos 1)'

]

{ #category : 'Grail-Initialization' }
PyTimezone class >> __new__: tdelta [
	"timezone(offset) constructor.  A zero offset with no name returns the
	canonical utc singleton (CPython interns timezone(timedelta(0)) as utc)."

	(tdelta @env0:isKindOf: PyTimedelta) ifFalse: [
		^ TypeError ___signal___: 'offset must be a timedelta'].
	(tdelta ___totalMicros___ @env0:= 0) ifTrue: [^ PyTimezone utc].
	(tdelta ___totalMicros___) @env0:abs @env0:> 86399999999 ifTrue: [
		^ ValueError ___signal___:
			'offset must be a timedelta strictly between -timedelta(hours=24) and timedelta(hours=24).'].
	^ self @env0:new @env0:_offset: tdelta _name: nil

]

{ #category : 'Grail-Initialization' }
PyTimezone class >> __new__: tdelta _: aName [
	"timezone(offset, name) constructor."

	(tdelta @env0:isKindOf: PyTimedelta) ifFalse: [
		^ TypeError ___signal___: 'offset must be a timedelta'].
	(aName @env0:isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'name must be a string'].
	(tdelta ___totalMicros___) @env0:abs @env0:> 86399999999 ifTrue: [
		^ ValueError ___signal___:
			'offset must be a timedelta strictly between -timedelta(hours=24) and timedelta(hours=24).'].
	^ self @env0:new @env0:_offset: tdelta _name: aName

]

{ #category : 'Grail-Initialization' }
PyTimezone class >> __new__: tdelta _: aName _: extra [
	"timezone() takes at most 2 arguments -- a 3rd is a TypeError
	(test_constructor: ``timezone(ZERO, 'ABC', 'extra')'').  Without this,
	object class >> value:value:'s arity-dispatch builds the selector
	__new__:_:_: and performs it directly with NO such-selector guard,
	which would otherwise crash with an uncaught MessageNotUnderstood
	instead of a catchable TypeError."

	^ TypeError ___signal___: 'timezone() takes at most 2 arguments'

]

{ #category : 'Grail-Introspection' }
PyTimezone class >> __qualname__ [
	^ self @env0:== PyTimezone
		ifTrue: ['timezone']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Class Attrs' }
PyTimezone class >> max [
	"timezone.max == timezone(timedelta(hours=23, minutes=59))."

	^ self __new__:
		(PyTimedelta @env0:___fromTotalMicros___: ((23 @env0:* 3600 @env0:+ (59 @env0:* 60)) @env0:* 1000000))

]

{ #category : 'Grail-Class Attrs' }
PyTimezone class >> min [
	"timezone.min == timezone(-timedelta(hours=23, minutes=59))."

	^ self __new__:
		(PyTimedelta @env0:___fromTotalMicros___: ((23 @env0:* 3600 @env0:+ (59 @env0:* 60)) @env0:* -1000000))

]

{ #category : 'Grail-Class Attrs' }
PyTimezone class >> utc [
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

]

{ #category : 'Grail-Callable' }
PyTimezone class >> value: positional value: kwargs [
	"timezone(offset, name=<unset>).  Both are ordinary parameters, so either
	may come by keyword: annotated-types builds its cases with
	``timezone(offset=timedelta(hours=1))''.  The class-side call used to
	dispatch on the positional count alone (the __new__ arities above) and
	refused any keyword with ``PyTimezone() takes no keyword arguments''.
	Binds the two, with CPython's messages for a bad call, then hands them to
	those same constructors."

	| given offset hasOffset tzName hasName |
	given := positional @env0:size.
	kwargs @env0:isNil ifFalse: [given := given @env0:+ kwargs @env0:size].
	given @env0:> 2 ifTrue: [
		^ TypeError ___signal___: 'timezone() takes at most 2 arguments ('
			@env0:, given @env0:printString @env0:, ' given)'].
	hasOffset := positional @env0:size @env0:>= 1.
	hasOffset ifTrue: [offset := positional @env0:at: 1].
	hasName := positional @env0:size @env0:>= 2.
	hasName ifTrue: [tzName := positional @env0:at: 2].
	kwargs @env0:isNil ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			(key @env0:= 'offset')
				ifTrue: [
					hasOffset ifTrue: [
						^ TypeError ___signal___:
							'argument for timezone() given by name (''offset'') and position (1)'].
					hasOffset := true.
					offset := v]
				ifFalse: [
					(key @env0:= 'name') ifFalse: [
						^ TypeError ___signal___:
							'timezone() got an unexpected keyword argument '''
								@env0:, key @env0:, ''''].
					hasName ifTrue: [
						^ TypeError ___signal___:
							'argument for timezone() given by name (''name'') and position (2)'].
					hasName := true.
					tzName := v]]].
	hasOffset ifFalse: [^ self __new__].
	^ hasName
		ifTrue: [self __new__: offset _: tzName]
		ifFalse: [self __new__: offset]

]

{ #category : 'Grail-Private' }
PyTimezone >> ___formatOffset___: tdelta [
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

]

{ #category : 'Grail-Equality' }
PyTimezone >> __eq__: other [
	"Two timezones are equal iff their offsets are equal (CPython
	compares offset only, not name).  NotImplemented for a non-timezone
	so the reflected comparison runs (e.g. ALWAYS_EQ == tz)."

	(other isKindOf: PyTimezone) ifFalse: [^ NotImplemented].
	^ (self @env0:dynamicInstVarAt: #_offset) __eq__: (other @env0:dynamicInstVarAt: #_offset)

]

{ #category : 'Grail-Equality' }
PyTimezone >> __hash__ [
	^ (self @env0:dynamicInstVarAt: #_offset) __hash__

]

{ #category : 'Grail-Equality' }
PyTimezone >> __ne__: other [
	| eq |
	eq := self __eq__: other.
	(eq @env0:== NotImplemented) ifTrue: [^ eq].
	^ eq @env0:not

]

{ #category : 'Grail-Pickle' }
PyTimezone >> __reduce__ [
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

]

{ #category : 'Grail-Conversion' }
PyTimezone >> __repr__ [
	"CPython: 'datetime.timezone.utc' for the singleton; otherwise
	'datetime.timezone(<offset repr>[, '<name>'])'."

	| offsetRepr name |
	(self @env0:== (PyTimezone utc)) ifTrue: [^ 'datetime.timezone.utc'].
	offsetRepr := (self @env0:dynamicInstVarAt: #_offset) __repr__.
	name := self @env0:dynamicInstVarAt: #_name.
	name @env0:isNil ifTrue: [
		^ 'datetime.timezone(' @env0:, offsetRepr @env0:, ')'].
	^ 'datetime.timezone(' @env0:, offsetRepr @env0:, ', ''' @env0:, name @env0:asString @env0:, ''')'

]

{ #category : 'Grail-Accessors' }
PyTimezone >> __str__ [
	^ self tzname: None

]

{ #category : 'Grail-Accessors' }
PyTimezone >> dst: dt [
	"timezone instances do not represent DST transitions."

	(dt @env0:isNil @env0:or: [dt @env0:== None @env0:or: [dt @env0:isKindOf: PyDateTime]]) ifFalse: [
		^ TypeError ___signal___: 'dst() argument must be a datetime instance or None'].
	^ None

]

{ #category : 'Grail-Accessors' }
PyTimezone >> fromutc: dt [
	"Convert a UTC datetime (tzinfo == self) to this zone: dt + offset."

	(dt @env0:isKindOf: PyDateTime) ifFalse: [
		^ TypeError ___signal___: 'fromutc() argument must be a datetime instance'].
	(dt tzinfo @env0:== self) ifFalse: [
		^ ValueError ___signal___: 'fromutc: dt.tzinfo is not self'].
	^ dt __add__: (self @env0:dynamicInstVarAt: #_offset)

]

{ #category : 'Grail-Accessors' }
PyTimezone >> tzname: dt [
	"Return the human-readable name, e.g. 'UTC' or 'UTC+02:00'."

	(dt @env0:isNil @env0:or: [dt @env0:== None @env0:or: [dt @env0:isKindOf: PyDateTime]]) ifFalse: [
		^ TypeError ___signal___: 'tzname() argument must be a datetime instance or None'].
	(self @env0:dynamicInstVarAt: #_name) @env0:isNil ifFalse: [^ (self @env0:dynamicInstVarAt: #_name)].
	^ self ___formatOffset___: (self @env0:dynamicInstVarAt: #_offset)

]

{ #category : 'Grail-Accessors' }
PyTimezone >> utcoffset: dt [
	"Return the configured offset (independent of `dt`) -- but `dt` must
	still be None or a datetime instance (test_utcoffset: a bare string/
	int argument is a TypeError, matching CPython's argument check even
	though the offset itself doesn't depend on dt's value)."

	(dt @env0:isNil @env0:or: [dt @env0:== None @env0:or: [dt @env0:isKindOf: PyDateTime]]) ifFalse: [
		^ TypeError ___signal___: 'utcoffset() argument must be a datetime instance or None'].
	^ (self @env0:dynamicInstVarAt: #_offset)

]
