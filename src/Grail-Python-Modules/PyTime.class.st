Class {
	#name : 'PyTime',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
PyTime class >> ___fromFields___: h _: mi _: s _: us _: tz [
	| inst |
	inst := self new.
	inst _hour: h _minute: mi _second: s _microsecond: us _tzinfo: tz.
	^ inst

]

{ #category : 'Grail-Introspection' }
PyTime class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #hour;
		add: #minute;
		add: #second;
		add: #microsecond;
		add: #tzinfo;
		add: #fold;
		yourself

]

{ #category : 'Grail-Private' }
PyTime >> ___pad___: n width: w [
	| s |
	s := n printString.
	[s size < w] whileTrue: [s := '0' , s].
	^ s

]

{ #category : 'Grail-Private' }
PyTime >> _hour: h _minute: mi _second: s _microsecond: us _tzinfo: tz [
	"Shared by every construction path (direct call, subclass __new__,
	replace, fromisoformat, strptime) -- field validation ported from
	CPython's _check_time_fields, mirroring PyDateTime>>_year:_month:...'s
	time-part validation, which is why only the `time' variants of
	test_bad_constructor_arguments / test_replace / test_valuerror_messages
	were failing.  The pickle byte-state backdoor deliberately bypasses
	this method (it writes the dynamic instVars directly, as CPython's
	__setstate does) so a round-tripped state is never revalidated."

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
	self dynamicInstVarAt: #_hour put: h.
	self dynamicInstVarAt: #_minute put: mi.
	self dynamicInstVarAt: #_second put: s.
	self dynamicInstVarAt: #_microsecond put: us.
	self dynamicInstVarAt: #_tzinfo put: tz.
	^ self

]

{ #category : 'Grail-Hash' }
PyTime >> = other [
	"Smalltalk value-equality + hash so equal times collapse as PyDict/set
	keys (they bucket non-PythonInstance keys by Smalltalk hash and match
	by Smalltalk =, which default to identity).  Naive key; tzinfo-aware
	deferred, matching __eq__."

	^ (other isKindOf: PyTime)
		and: [(self @env1:___cmpKey___) = (other @env1:___cmpKey___)]

]

{ #category : 'Grail-Hash' }
PyTime >> hash [
	^ (self @env1:___cmpKey___) hash

]
