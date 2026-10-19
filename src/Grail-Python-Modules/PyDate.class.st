Class {
	#name : 'PyDate',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
PyDate class >> ___fromFields___: y _: m _: d [
	| inst |
	inst := self new.
	inst _year: y _month: m _day: d.
	^ inst

]

{ #category : 'Grail-Introspection' }
PyDate class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #year;
		add: #month;
		add: #day;
		yourself

]

{ #category : 'Grail-Private' }
PyDate >> ___asDate___ [
	"Materialise a GemStone Date for weekday / ordinal arithmetic."

	^ Date
		newDay: (self dynamicInstVarAt: #_day)
		monthNumber: (self dynamicInstVarAt: #_month)
		year: (self dynamicInstVarAt: #_year)

]

{ #category : 'Grail-Private' }
PyDate >> ___pad___: n width: w [
	| s |
	s := n printString.
	[s size < w] whileTrue: [s := '0' , s].
	^ s

]

{ #category : 'Grail-Private' }
PyDate >> _year: y _month: m _day: d [
	"Shared by every construction path (direct call, subclass __new__,
	fromordinal/fromtimestamp/replace/fromisocalendar...) so the field
	validation CPython's _check_date_fields does applies uniformly.
	Ported error messages/ranges verbatim from _pydatetime.py."

	| dim |
	(y @env0:< 1 or: [y @env0:> 9999]) ifTrue: [
		^ ValueError @env1:___signal___:
			'year must be in 1..9999, not ' @env0:, y @env0:printString].
	(m @env0:< 1 or: [m @env0:> 12]) ifTrue: [
		^ ValueError @env1:___signal___:
			'month must be in 1..12, not ' @env0:, m @env0:printString].
	dim := (Date @env0:newDay: 1 monthNumber: m year: y) @env0:daysInMonth.
	(d @env0:< 1 or: [d @env0:> dim]) ifTrue: [
		^ ValueError @env1:___signal___:
			'day ' @env0:, d @env0:printString
				@env0:, ' must be in range 1..' @env0:, dim @env0:printString
				@env0:, ' for month ' @env0:, m @env0:printString
				@env0:, ' in year ' @env0:, y @env0:printString].
	self dynamicInstVarAt: #_year put: y.
	self dynamicInstVarAt: #_month put: m.
	self dynamicInstVarAt: #_day put: d.
	^ self

]

{ #category : 'Grail-Hash' }
PyDate >> = other [
	"Smalltalk value-equality + hash so equal dates collapse as PyDict/set
	keys (they bucket non-PythonInstance keys by Smalltalk hash and match
	by Smalltalk =, which default to identity).  A datetime is a date
	subclass but never equal to one, as __eq__: says."

	^ (self @env1:___isDateOperand___: other)
		and: [(self @env1:toordinal) = (other @env1:toordinal)]

]

{ #category : 'Grail-Hash' }
PyDate >> hash [
	^ (self @env1:toordinal) hash

]
