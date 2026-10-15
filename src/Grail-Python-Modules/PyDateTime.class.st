Class {
	#name : 'PyDateTime',
	#superclass : 'PyDate',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
PyDateTime class >> ___fromFields___: y _: mo _: d _: h _: mi _: s _: us _: tz [
	| inst |
	inst := self new.
	inst
		_year: y _month: mo _day: d
		_hour: h _minute: mi _second: s
		_microsecond: us _tzinfo: tz.
	^ inst

]

{ #category : 'Grail-Introspection' }
PyDateTime class >> ___pythonValueAttrs___ [
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

]

{ #category : 'Grail-Private' }
PyDateTime >> _year: y _month: mo _day: d _hour: h _minute: mi _second: s _microsecond: us _tzinfo: tz [
	"Shared by every construction path (direct call, subclass __new__,
	fromtimestamp/replace/fromisocalendar...) -- field validation ported
	from CPython's _check_date_fields / _check_time_fields
	(test_bad_constructor_arguments, test_valuerror_messages).  Mirrors
	PyDate>>_year:_month:_day:'s validation for the date part."

	| dim |
	(y @env0:< 1 or: [y @env0:> 9999]) ifTrue: [
		^ ValueError @env1:___signal___:
			'year must be in 1..9999, not ' @env0:, y @env0:printString].
	(mo @env0:< 1 or: [mo @env0:> 12]) ifTrue: [
		^ ValueError @env1:___signal___:
			'month must be in 1..12, not ' @env0:, mo @env0:printString].
	dim := (Date @env0:newDay: 1 monthNumber: mo year: y) @env0:daysInMonth.
	(d @env0:< 1 or: [d @env0:> dim]) ifTrue: [
		^ ValueError @env1:___signal___:
			'day ' @env0:, d @env0:printString
				@env0:, ' must be in range 1..' @env0:, dim @env0:printString
				@env0:, ' for month ' @env0:, mo @env0:printString
				@env0:, ' in year ' @env0:, y @env0:printString].
	(h @env0:< 0 or: [h @env0:> 23]) ifTrue: [
		^ ValueError @env1:___signal___:
			'hour must be in 0..23, not ' @env0:, h @env0:printString].
	(mi @env0:< 0 or: [mi @env0:> 59]) ifTrue: [
		^ ValueError @env1:___signal___:
			'minute must be in 0..59, not ' @env0:, mi @env0:printString].
	(s @env0:< 0 or: [s @env0:> 59]) ifTrue: [
		^ ValueError @env1:___signal___:
			'second must be in 0..59, not ' @env0:, s @env0:printString].
	(us @env0:< 0 or: [us @env0:> 999999]) ifTrue: [
		^ ValueError @env1:___signal___:
			'microsecond must be in 0..999999, not ' @env0:, us @env0:printString].
	self dynamicInstVarAt: #_year put: (y).
	self dynamicInstVarAt: #_month put: (mo).
	self dynamicInstVarAt: #_day put: (d).
	self dynamicInstVarAt: #_hour put: (h).
	self dynamicInstVarAt: #_minute put: (mi).
	self dynamicInstVarAt: #_second put: (s).
	self dynamicInstVarAt: #_microsecond put: (us).
	self dynamicInstVarAt: #_tzinfo put: (tz).
	^ self

]

{ #category : 'Grail-Hash' }
PyDateTime >> = other [
	"Smalltalk value-equality + hash so equal datetimes collapse as
	PyDict/set keys (naive compare key; tzinfo-aware deferred, matching
	__eq__/__hash__)."

	^ (other isKindOf: PyDateTime)
		and: [(self @env1:___compareKey___) = (other @env1:___compareKey___)]

]

{ #category : 'Grail-Hash' }
PyDateTime >> hash [
	^ (self @env1:___compareKey___) hash

]
