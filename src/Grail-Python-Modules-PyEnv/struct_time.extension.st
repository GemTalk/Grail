Extension { #name : 'struct_time' }

{ #category : 'Grail-Conversion' }
struct_time >> __repr__ [
	"CPython: time.struct_time(tm_year=2004, tm_mon=12, ..., tm_isdst=-1)."

	| ws names |
	names := #('tm_year' 'tm_mon' 'tm_mday' 'tm_hour' 'tm_min' 'tm_sec'
		'tm_wday' 'tm_yday' 'tm_isdst').
	ws := WriteStream @env0:on: Unicode7 @env0:new.
	ws @env0:nextPutAll: 'time.struct_time('.
	1 @env0:to: 9 @env0:do: [:i |
		i @env0:> 1 ifTrue: [ws @env0:nextPutAll: ', '].
		ws @env0:nextPutAll: (names @env0:at: i).
		ws @env0:nextPut: $=.
		ws @env0:nextPutAll: (self @env0:at: i) @env0:printString].
	ws @env0:nextPut: $).
	^ ws @env0:contents

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_hour [
	^ self @env0:at: 4

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_isdst [
	^ self @env0:at: 9

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_mday [
	^ self @env0:at: 3

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_min [
	^ self @env0:at: 5

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_mon [
	^ self @env0:at: 2

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_sec [
	^ self @env0:at: 6

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_wday [
	^ self @env0:at: 7

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_yday [
	^ self @env0:at: 8

]

{ #category : 'Grail-Accessors' }
struct_time >> tm_year [
	^ self @env0:at: 1

]
