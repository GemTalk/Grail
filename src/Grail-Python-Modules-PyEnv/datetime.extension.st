Extension { #name : 'datetime' }

{ #category : 'Grail-Introspection' }
datetime >> __all__ [
	^ tuple @env0:withAll: {
		'date'. 'datetime'. 'time'. 'timedelta'. 'timezone'. 'tzinfo'.
		'MINYEAR'. 'MAXYEAR'. 'UTC' }

]

{ #category : 'Grail-Type Accessors' }
datetime >> date [
	^ self ___assignedGlobalAt___: #date otherwise: [PyDate]

]

{ #category : 'Grail-Type Accessors' }
datetime >> datetime [
	"Resolves to the PyDateTime class so Python `datetime.datetime`
	hands back a callable class.  A Python assignment to the name is what this
	answers instead, as it is for every type accessor here (issue #1973): see
	module >> ___assignedGlobalAt___:otherwise:."

	^ self ___assignedGlobalAt___: #datetime otherwise: [PyDateTime]

]

{ #category : 'Grail-Type Accessors' }
datetime >> MAXYEAR [
	^ self ___assignedGlobalAt___: #MAXYEAR otherwise: [9999]

]

{ #category : 'Grail-Type Accessors' }
datetime >> MINYEAR [
	^ self ___assignedGlobalAt___: #MINYEAR otherwise: [1]

]

{ #category : 'Grail-Type Accessors' }
datetime >> time [
	^ self ___assignedGlobalAt___: #time otherwise: [PyTime]

]

{ #category : 'Grail-Type Accessors' }
datetime >> timedelta [
	^ self ___assignedGlobalAt___: #timedelta otherwise: [PyTimedelta]

]

{ #category : 'Grail-Type Accessors' }
datetime >> timezone [
	^ self ___assignedGlobalAt___: #timezone otherwise: [PyTimezone]

]

{ #category : 'Grail-Type Accessors' }
datetime >> tzinfo [
	^ self ___assignedGlobalAt___: #tzinfo otherwise: [PyTzinfo]

]

{ #category : 'Grail-Type Accessors' }
datetime >> UTC [
	"datetime.UTC — alias for timezone.utc (added in CPython 3.11)."

	^ self ___assignedGlobalAt___: #UTC otherwise: [PyTimezone utc]

]
