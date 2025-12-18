! ------------------- Remove existing behavior from slice
removeallmethods slice
removeallclassmethods slice
! ------------------- Class methods for slice
category: 'Python'
classmethod: slice
__call__: aStop

	^self __call__: None _: aStop _: None
%
category: 'Python'
classmethod: slice
__call__: aStart _: aStop

	^self __call__: aStart _: aStop _: None
%
category: 'Python'
classmethod: slice
__call__: aStart _: aStop _: aStep

	^(self __new__: aStart _: aStop _: aStep) __init__: aStart _: aStop _: aStep; yourself
%
category: 'Python'
classmethod: slice
__new__: aStart _: aStop _: aStep

	^self basicNew
%
! ------------------- Instance methods for slice
category: 'Python'
method: slice
__doc__

	^str ___value: 'slice(stop)\n' ,
		'slice(start, stop[, step])\n' ,
		'\n' ,
		'Create a slice object.  This is used for extended slicing (e.g. a[0:10:2]).'
%
category: 'Python'
method: slice
__eq__: other

	(other isKindOf: slice) ifFalse: [^False].
	^((start __eq__: other start) == True and: [
		(stop __eq__: other stop) == True and: [
			(step __eq__: other step) == True]])
		ifTrue: [True] ifFalse: [False]
%
category: 'Python'
method: slice
__hash__

	"Slices are not hashable in Python"
	TypeError signal: 'unhashable type: ''slice'''
%
category: 'Python'
method: slice
__init__: aStart _: aStop _: aStep

	start := aStart.
	stop := aStop.
	step := aStep.
%
category: 'Python'
method: slice
__ne__: other

	^(self __eq__: other) __not__
%
category: 'Python'
method: slice
__repr__

	| stream |
	stream := WriteStream on: String new.
	stream nextPutAll: 'slice('.
	stream nextPutAll: start __repr__ ___value.
	stream nextPutAll: ', '.
	stream nextPutAll: stop __repr__ ___value.
	stream nextPutAll: ', '.
	stream nextPutAll: step __repr__ ___value.
	stream nextPut: $).
	^str ___value: stream contents
%
category: 'Python'
method: slice
indices: aLength

	"Return (start, stop, step) tuple for a sequence of given length.
	 Handles negative indices and clamps to bounds."
	| len startVal stopVal stepVal |
	len := aLength ___value.

	"Get step, defaulting to 1"
	stepVal := step == None ifTrue: [1] ifFalse: [step ___value].
	stepVal = 0 ifTrue: [ValueError signal: 'slice step cannot be zero'].

	"Get start"
	stepVal > 0 ifTrue: [
		startVal := start == None ifTrue: [0] ifFalse: [start ___value].
		startVal < 0 ifTrue: [startVal := (len + startVal) max: 0].
		startVal := startVal min: len.

		stopVal := stop == None ifTrue: [len] ifFalse: [stop ___value].
		stopVal < 0 ifTrue: [stopVal := (len + stopVal) max: 0].
		stopVal := stopVal min: len.
	] ifFalse: [
		"Negative step"
		start == None ifTrue: [
			startVal := len - 1.
		] ifFalse: [
			startVal := start ___value.
			startVal < 0 ifTrue: [startVal := len + startVal].
			startVal := startVal min: (len - 1) max: -1.
		].

		stop == None ifTrue: [
			stopVal := -1.
		] ifFalse: [
			stopVal := stop ___value.
			stopVal < 0 ifTrue: [stopVal := len + stopVal].
			stopVal := stopVal min: (len - 1) max: -1.
		].
	].

	^tuple ___value: { int ___value: startVal. int ___value: stopVal. int ___value: stepVal }
%
category: 'Python'
method: slice
start

	^start
%
category: 'Python'
method: slice
step

	^step
%
category: 'Python'
method: slice
stop

	^stop
%
