Extension { #name : 'datetime' }

{ #category : 'Grail-Introspection' }
datetime >> __all__ [
	^ tuple @env0:withAll: {
		'date'. 'datetime'. 'time'. 'timedelta'. 'timezone'. 'tzinfo'.
		'MINYEAR'. 'MAXYEAR'. 'UTC' }

]

{ #category : 'Grail-Type Accessors' }
datetime >> date [
	^ PyDate

]

{ #category : 'Grail-Type Accessors' }
datetime >> datetime [
	"Resolves to the PyDateTime class so Python `datetime.datetime`
	hands back a callable class."

	^ PyDateTime

]

{ #category : 'Grail-Type Accessors' }
datetime >> MAXYEAR [
	^ 9999

]

{ #category : 'Grail-Type Accessors' }
datetime >> MINYEAR [
	^ 1

]

{ #category : 'Grail-Type Accessors' }
datetime >> time [
	^ PyTime

]

{ #category : 'Grail-Type Accessors' }
datetime >> timedelta [
	^ PyTimedelta

]

{ #category : 'Grail-Type Accessors' }
datetime >> timezone [
	^ PyTimezone

]

{ #category : 'Grail-Type Accessors' }
datetime >> tzinfo [
	^ PyTzinfo

]

{ #category : 'Grail-Type Accessors' }
datetime >> UTC [
	"datetime.UTC — alias for timezone.utc (added in CPython 3.11)."

	^ PyTimezone utc

]
