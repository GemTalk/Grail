! ===============================================================================
! Interval Methods (Python 'range' type)
! ===============================================================================
! This file contains method implementations for the Interval class when used
! as the Python 'range' type. Interval is a GemStone Smalltalk class that
! represents an arithmetic sequence, which maps well to Python's range.
!
! Mapping:
!   Python range(start, stop, step) -> GemStone Interval from:to:by:
!   - start -> from
!   - stop -> to (but Python's stop is exclusive, Smalltalk's to is inclusive)
!   - step -> by
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from range
expectvalue /Metaclass3
doit
range removeAllMethods: 2.
range class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Python class methods for range

category: 'Python-Initialization'
classmethod: range
__new__: cls _: stop
	"range(stop) - creates range from 0 to stop-1 with step 1"

	| stopVal |
	stopVal := stop.

	"Python's range(stop) goes from 0 to stop-1"
	^ range ___from___: 0 to: (stopVal ___minus___: 1) by: 1
%

category: 'Python-Initialization'
classmethod: range
__new__: cls _: start _: stop
	"range(start, stop) - creates range from start to stop-1 with step 1"

	| startVal stopVal |
	startVal := start.
	stopVal := stop.

	"Python's range(start, stop) goes from start to stop-1"
	^ range ___from___: startVal to: (stopVal ___minus___: 1) by: 1
%

category: 'Python-Initialization'
classmethod: range
__new__: cls _: start _: stop _: step
	"range(start, stop, step) - creates range from start to stop-1 with given step"

	| startVal stopVal stepVal adjustedStop |
	startVal := start.
	stopVal := stop.
	stepVal := step.

	"Step cannot be zero"
	(stepVal ___eq___: 0) ifTrue: [
		ValueError ___signal___: 'range() arg 3 must not be zero'
	].

	"Python's range is exclusive of stop, but Interval's to is inclusive.
	 For positive step: to = stop - 1
	 For negative step: to = stop + 1
	 But we need to handle empty ranges correctly."
	adjustedStop := (stepVal ___gt___: 0)
		ifTrue: [stopVal ___minus___: (1)]
		ifFalse: [stopVal ___plus___: 1].

	^ range ___from___: startVal to: adjustedStop by: stepVal
%

! ------------------- Python instance methods for range

category: 'Python-Sequence Protocol'
method: range
__iter__
	"Return an iterator over the range."

	^ range_iterator perform: #___on: env: 2 withArguments: {self}
%


category: 'Python-Attributes'
method: range
start
	"Return the start value (Python's start attribute)"
	^ self perform: #_from env: 0
%

category: 'Python-Attributes'
method: range
stop
	"Return the stop value (Python's stop attribute - exclusive)"

	| fromVal byVal toVal |
	fromVal := self perform: #_from env: 0.
	byVal := self perform: #increment env: 0.
	toVal := self perform: #_to env: 0.

	"Convert from inclusive 'to' to exclusive 'stop'"
	^ (byVal ___gt___: 0)
		ifTrue: [toVal ___plus___: 1]
		ifFalse: [toVal ___minus___: (1)]
%

category: 'Python-Attributes'
method: range
step
	"Return the step value (Python's step attribute)"
	^ self perform: #increment env: 0
%

category: 'Python-Sequence Protocol'
method: range
__len__
	"Return the length of the range"
	^ self ___size___
%

category: 'Python-Sequence Protocol'
method: range
__getitem__: index
	"Return the item at the given index or a slice"

	| idx size indexClass |
	indexClass := index ___class___.

	"Check if this is a slice object - if slice class exists"
	"For now, just handle integer indexing"

	size := self ___size___.
	idx := index.

	"Handle negative indices"
	(idx ___lt___: 0) ifTrue: [
		idx := size ___plus___: idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx ___lt___: 0) or: [
		idx ___ge___: size
	]) ifTrue: [
		IndexError ___signal___: 'range object index out of range'
	].

	"Convert to 1-based Smalltalk index and get value"
	^ self ___at___: (idx ___plus___: 1)
%

category: 'Python-Sequence Protocol'
method: range
__bool__
	"Test if range is non-empty"

	| size |
	size := self ___size___.
	^ size ___gt___: 0
%

category: 'Python-Sequence Protocol'
method: range
__contains__: value
	"Test if value is in the range"

	^ self ___includes___: value
%

category: 'Python-Comparison'
method: range
__eq__: other
	"Test equality with another range"

	| otherClass selfSize otherSize selfStart otherStart selfStep otherStep |
	otherClass := other ___class___.
	(otherClass ___eq___: range) ifFalse: [ ^ false ].

	"Two ranges are equal if they produce the same sequence"
	selfSize := self ___size___.
	otherSize := other ___size___.

	"Empty ranges are equal"
	(selfSize ___eq___: 0) ifTrue: [
		^ otherSize ___eq___: 0
	].

	"Non-empty ranges must have same start, stop, and step"
	selfStart := self perform: #start env: 2.
	otherStart := other perform: #start env: 2.
	(selfStart ___eq___: otherStart) ifFalse: [ ^ false ].

	selfStep := self perform: #step env: 2.
	otherStep := other perform: #step env: 2.
	(selfStep ___eq___: otherStep) ifFalse: [ ^ false ].

	^ selfSize ___eq___: otherSize
%

category: 'Python-Comparison'
method: range
__ne__: other
	"Test inequality with another range"

	| eq |
	eq := self perform: #__eq__: env: 2 withArguments: {other}.
	^ eq ___not___
%

category: 'Python-Hashing'
method: range
__hash__
	"Return hash of the range"

	^ self ___hash___
%

category: 'Python-String Representation'
method: range
__repr__
	"Return string representation of the range"

	| stream |
	stream := WriteStream ___on___: (Unicode7 ___new___).

	stream ___nextPutAll___: 'range('.

	"If start is 0 and step is 1, just show stop"
	((from ___eq___: 0) and: [
		by ___eq___: 1
	]) ifTrue: [
		stream ___nextPutAll___: ((to ___plus___: 1) ___printString___)
	] ifFalse: [
		"Show start and stop"
		stream ___nextPutAll___: (from ___printString___).
		stream ___nextPutAll___: ', '.
		stream ___nextPutAll___: ((to ___plus___: 1) ___printString___).

		"If step is not 1, show it too"
		(by ___eq___: 1) ifFalse: [
			stream ___nextPutAll___: ', '.
			stream ___nextPutAll___: (by ___printString___).
		].
	].

	stream ___nextPut___: $).
	^ stream ___contents___
%

category: 'Python-Sequence Methods'
method: range
count: value
	"Return the number of times value appears in the range (0 or 1)"

	| contains |
	contains := self __contains__: value.
	^ contains ifTrue: [1] ifFalse: [0]
%

category: 'Python-Sequence Methods'
method: range
index: value
	"Return the index of value in the range. Raises ValueError if not found."

	| fromVal byVal idx |
	fromVal := self perform: #_from env: 0.
	byVal := self perform: #increment env: 0.

	"Check if value is in range"
	(self __contains__: value) ifFalse: [
		ValueError ___signal___: ((value ___printString___) ___concat___: ' is not in range')
	].

	"Calculate index: (value - start) / step"
	idx := (value ___minus___: fromVal) ___divideInteger___: byVal.
	^ idx
%

category: 'Python-Iteration'
method: range
__reversed__
	"Return a reversed range"

	| size startVal stepVal newStart newStop newStep |
	size := self ___size___.

	"Empty range returns empty range"
	(size ___eq___: 0) ifTrue: [
		^ range perform: #__new__:_:_:_: env: 2 withArguments: {range. 0. 0. 1}
	].

	startVal := self perform: #start env: 2.
	stepVal := self perform: #step env: 2.

	"Calculate new start: original start + (size - 1) * step"
	newStart := startVal  ___plus___: ((size ___minus___: 1) ___times___: stepVal).

	"New step is negated"
	newStep := stepVal ___negated___.

	"New stop is original start + newStep (exclusive)"
	newStop := startVal ___plus___: newStep.

	^ range __new__: range _: newStart _: newStop _: newStep
%

set compile_env: 0
