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
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from range
expectvalue /Metaclass3
doit
range removeAllMethods: 1.
range class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: range
__new__: start _: stop
	"range(start, stop) — creates range from start to stop-1 with step 1.
	Receiver is the class."

	"Python's range(start, stop) goes from start to stop-1"
	^ self @env0:from: start to: (stop @env0:- 1) by: 1
%

category: 'Grail-Initialization'
classmethod: range
__new__: start _: stop _: step
	"range(start, stop, step) — creates range from start to stop-1 with
	given step. Receiver is the class."

	| adjustedStop |
	"Step cannot be zero"
	(step @env0:= 0) ifTrue: [
		ValueError ___signal___: 'range() arg 3 must not be zero'
	].

	"Python's range is exclusive of stop, but Interval's to is inclusive.
	 For positive step: to = stop - 1
	 For negative step: to = stop + 1
	 But we need to handle empty ranges correctly."
	adjustedStop := (step @env0:> 0)
		ifTrue: [stop @env0:- 1]
		ifFalse: [stop @env0:+ 1].

	^ self @env0:from: start to: adjustedStop by: step
%

category: 'Grail-Initialization'
classmethod: range
__new__: stop
	"range(stop) — creates range from 0 to stop-1 with step 1.
	Receiver is the class."

	"Python's range(stop) goes from 0 to stop-1"
	^ self @env0:from: 0 to: (stop @env0:- 1) by: 1
%

category: 'Grail-Sequence Protocol'
method: range
__bool__
	"Test if range is non-empty"

	| size |
	size := self @env0:size.
	^ size @env0:> 0
%

category: 'Grail-Sequence Protocol'
method: range
__contains__: value
	"Test if value is in the range"

	^ self @env0:includes: value
%

category: 'Grail-Comparison'
method: range
__eq__: other
	"Test equality with another range"

	| otherClass selfSize otherSize selfStart otherStart selfStep otherStep |
	otherClass := other @env0:class.
	(otherClass == range) ifFalse: [ ^ false ].

	"Two ranges are equal if they produce the same sequence"
	selfSize := self @env0:size.
	otherSize := other @env0:size.

	"Empty ranges are equal"
	(selfSize == 0) ifTrue: [
		^ otherSize == 0
	].

	"Non-empty ranges must have same start, stop, and step"
	selfStart := self start.
	otherStart := other start.
	(selfStart @env0:= otherStart) ifFalse: [ ^ false ].

	selfStep := self step.
	otherStep := other step.
	(selfStep @env0:= otherStep) ifFalse: [ ^ false ].

	^ selfSize @env0:= otherSize
%

category: 'Grail-Sequence Protocol'
method: range
__getitem__: index
	"Return the item at the given index or a slice."

	| idx size |
	(index isKindOf: slice) ifTrue: [
		^ self ___getslice___: index start
			_: index stop
			_: index step
	].
	"Non-integer, non-slice index: catchable TypeError instead of an
	uncatchable env-0 comparison DNU on the index."
	((index isKindOf: Integer)
		or: [(index @env0:class
			@env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil]) ifFalse: [
		TypeError ___signal___: ('range indices must be integers or slices, not '
			@env0:, index @env0:class @env0:name @env0:asString)].
	size := self @env0:size.
	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'range object index out of range'
	].

	"Convert to 1-based Smalltalk index and get value"
	^ self @env0:at: (idx @env0:+ 1)
%

category: 'Grail-Hashing'
method: range
__hash__
	"Return hash of the range"

	^ self @env0:hash
%

category: 'Grail-Sequence Protocol'
method: range
__iter__
	"Return an iterator over the range."

	^ range_iterator ___on: self
%

category: 'Grail-Sequence Protocol'
method: range
__len__
	"Return the length of the range"
	^ self @env0:size
%

category: 'Grail-Comparison'
method: range
__ne__: other
	"Test inequality with another range"

	| eq |
	eq := self __eq__: other.
	^ eq @env0:not
%

category: 'Grail-String Representation'
method: range
__repr__
	"Return string representation of the range"

	| stream |
	stream := WriteStream @env0:on: (Unicode7 ___new___).

	stream @env0:nextPutAll: 'range('.

	"If start is 0 and step is 1, just show stop"
	((from @env0:= 0) and: [
		by @env0:= 1
	]) ifTrue: [
		stream @env0:nextPutAll: ((to @env0:+ 1) @env0:printString)
	] ifFalse: [
		"Show start and stop"
		stream @env0:nextPutAll: (from @env0:printString).
		stream @env0:nextPutAll: ', '.
		stream @env0:nextPutAll: ((to @env0:+ 1) @env0:printString).

		"If step is not 1, show it too"
		(by @env0:= 1) ifFalse: [
			stream @env0:nextPutAll: ', '.
			stream @env0:nextPutAll: (by @env0:printString).
		].
	].

	stream @env0:nextPut: $).
	^ stream @env0:contents
%

category: 'Grail-Iteration'
method: range
__reversed__
	"Return a reversed range"

	| size startVal stepVal newStart newStop newStep |
	size := self @env0:size.

	"Empty range returns empty range"
	(size == 0) ifTrue: [
		^ range __new__: 0 _: 0 _: 1
	].

	startVal := self start.
	stepVal := self step.

	"Calculate new start: original start + (size - 1) * step"
	newStart := startVal  @env0:+ ((size @env0:- 1) @env0:* stepVal).

	"New step is negated"
	newStep := stepVal @env0:negated.

	"New stop is original start + newStep (exclusive)"
	newStop := startVal @env0:+ newStep.

	^ range __new__: newStart _: newStop _: newStep
%

category: 'Grail-Sequence Methods'
method: range
count: value
	"Return the number of times value appears in the range (0 or 1)"

	| contains |
	contains := self __contains__: value.
	^ contains ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Sequence Methods'
method: range
index: value
	"Return the index of value in the range. Raises ValueError if not found."

	| fromVal byVal idx |
	fromVal := self @env0:_from.
	byVal := self @env0:increment.

	"Check if value is in range"
	(self __contains__: value) ifFalse: [
		ValueError ___signal___: ((value @env0:printString) @env0:, ' is not in range')
	].

	"Calculate index: (value - start) / step"
	idx := (value @env0:- fromVal) @env0:// byVal.
	^ idx
%

category: 'Grail-Attributes'
method: range
start
	"Return the start value (Python's start attribute)"
	^ self @env0:_from
%

category: 'Grail-Attributes'
method: range
step
	"Return the step value (Python's step attribute)"
	^ self @env0:increment
%

category: 'Grail-Attributes'
method: range
stop
	"Return the stop value (Python's stop attribute - exclusive)"

	| fromVal byVal toVal |
	fromVal := self @env0:_from.
	byVal := self @env0:increment.
	toVal := self @env0:_to.

	"Convert from inclusive 'to' to exclusive 'stop'"
	^ (byVal @env0:> 0)
		ifTrue: [toVal @env0:+ 1]
		ifFalse: [toVal @env0:- (1)]
%

set compile_env: 0
