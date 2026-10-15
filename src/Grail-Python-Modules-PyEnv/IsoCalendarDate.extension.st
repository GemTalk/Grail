Extension { #name : 'IsoCalendarDate' }

{ #category : 'Grail-Pickling' }
IsoCalendarDate >> __reduce__ [
	"CPython: pickling an IsoCalendarDate deliberately loses the type,
	round-tripping to a plain tuple (test_isocalendar_pickling).  Returns
	(tuple, (plain_tuple_copy_of_self,)) -- unpickling calls
	tuple(plain_tuple_copy_of_self), reconstructing a bare tuple."

	| plain |
	plain := tuple @env0:withAll: self.
	^ tuple @env0:withAll: { tuple. (tuple @env0:withAll: { plain }) }

]

{ #category : 'Grail-Conversion' }
IsoCalendarDate >> __repr__ [
	^ 'IsoCalendarDate(year=' @env0:, (self @env0:at: 1) @env0:printString
		@env0:, ', week=' @env0:, (self @env0:at: 2) @env0:printString
		@env0:, ', weekday=' @env0:, (self @env0:at: 3) @env0:printString
		@env0:, ')'

]

{ #category : 'Grail-Accessors' }
IsoCalendarDate >> week [
	^ self @env0:at: 2

]

{ #category : 'Grail-Accessors' }
IsoCalendarDate >> weekday [
	^ self @env0:at: 3

]

{ #category : 'Grail-Accessors' }
IsoCalendarDate >> year [
	^ self @env0:at: 1

]
