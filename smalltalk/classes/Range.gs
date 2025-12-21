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

! ------------------- Python class methods for range
set compile_env: 2

category: 'Python-Initialization'
classmethod: range
__new__: cls _: stop
	"range(stop) - creates range from 0 to stop-1 with step 1"

	| stopVal |
	stopVal := stop.

	"Python's range(stop) goes from 0 to stop-1"
	^ range perform: #from:to:by: env: 0 withArguments: {
		0.
		(stopVal perform: #- env: 0 withArguments: {1}).
		1
	}
%

category: 'Python-Initialization'
classmethod: range
__new__: cls _: start _: stop
	"range(start, stop) - creates range from start to stop-1 with step 1"

	| startVal stopVal |
	startVal := start.
	stopVal := stop.

	"Python's range(start, stop) goes from start to stop-1"
	^ range perform: #from:to:by: env: 0 withArguments: {
		startVal.
		(stopVal perform: #- env: 0 withArguments: {1}).
		1
	}
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
	(stepVal perform: #= env: 0 withArguments: {0}) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'range() arg 3 must not be zero'}
	].

	"Python's range is exclusive of stop, but Interval's to is inclusive.
	 For positive step: to = stop - 1
	 For negative step: to = stop + 1
	 But we need to handle empty ranges correctly."
	adjustedStop := (stepVal perform: #> env: 0 withArguments: {0})
		ifTrue: [stopVal perform: #- env: 0 withArguments: {1}]
		ifFalse: [stopVal perform: #+ env: 0 withArguments: {1}].

	^ range perform: #from:to:by: env: 0 withArguments: {
		startVal.
		adjustedStop.
		stepVal
	}
%

set compile_env: 0

! ------------------- Python instance methods for range
set compile_env: 2

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
	^ (byVal perform: #> env: 0 withArguments: {0})
		ifTrue: [toVal perform: #+ env: 0 withArguments: {1}]
		ifFalse: [toVal perform: #- env: 0 withArguments: {1}]
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
	^ self perform: #size env: 0
%

category: 'Python-Sequence Protocol'
method: range
__getitem__: index
	"Return the item at the given index or a slice"

	| idx size indexClass |
	indexClass := index perform: #class env: 0.

	"Check if this is a slice object - if slice class exists"
	"For now, just handle integer indexing"

	size := self perform: #size env: 0.
	idx := index.

	"Handle negative indices"
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [
		idx := size perform: #+ env: 0 withArguments: {idx}
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx perform: #< env: 0 withArguments: {0}) or: [
		idx perform: #>= env: 0 withArguments: {size}
	]) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'range object index out of range'}
	].

	"Convert to 1-based Smalltalk index and get value"
	^ self perform: #at: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}
%

category: 'Python-Sequence Protocol'
method: range
__bool__
	"Test if range is non-empty"

	| size |
	size := self perform: #size env: 0.
	^ size perform: #> env: 0 withArguments: {0}
%

category: 'Python-Sequence Protocol'
method: range
__contains__: value
	"Test if value is in the range"

	^ self perform: #includes: env: 0 withArguments: {value}
%

category: 'Python-Comparison'
method: range
__eq__: other
	"Test equality with another range"

	| otherClass selfSize otherSize selfStart otherStart selfStep otherStep |
	otherClass := other perform: #class env: 0.
	(otherClass perform: #= env: 0 withArguments: {range}) ifFalse: [ ^ false ].

	"Two ranges are equal if they produce the same sequence"
	selfSize := self perform: #size env: 0.
	otherSize := other perform: #size env: 0.

	"Empty ranges are equal"
	(selfSize perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ otherSize perform: #= env: 0 withArguments: {0}
	].

	"Non-empty ranges must have same start, stop, and step"
	selfStart := self perform: #start env: 2.
	otherStart := other perform: #start env: 2.
	(selfStart perform: #= env: 0 withArguments: {otherStart}) ifFalse: [ ^ false ].

	selfStep := self perform: #step env: 2.
	otherStep := other perform: #step env: 2.
	(selfStep perform: #= env: 0 withArguments: {otherStep}) ifFalse: [ ^ false ].

	^ selfSize perform: #= env: 0 withArguments: {otherSize}
%

category: 'Python-Comparison'
method: range
__ne__: other
	"Test inequality with another range"

	| eq |
	eq := self perform: #__eq__: env: 2 withArguments: {other}.
	^ eq perform: #not env: 0
%

category: 'Python-Hashing'
method: range
__hash__
	"Return hash of the range"

	^ self perform: #hash env: 0
%

category: 'Python-String Representation'
method: range
__repr__
	"Return string representation of the range"

	| stream |
	stream := WriteStream perform: #on: env: 0 withArguments: {Unicode7 perform: #new env: 0}.

	stream perform: #nextPutAll: env: 0 withArguments: {'range('}.

	"If start is 0 and step is 1, just show stop"
	((from perform: #= env: 0 withArguments: {0}) and: [
		by perform: #= env: 0 withArguments: {1}
	]) ifTrue: [
		stream perform: #nextPutAll: env: 0 withArguments: {(to perform: #+ env: 0 withArguments: {1}) perform: #printString env: 0}
	] ifFalse: [
		"Show start and stop"
		stream perform: #nextPutAll: env: 0 withArguments: {from perform: #printString env: 0}.
		stream perform: #nextPutAll: env: 0 withArguments: {', '}.
		stream perform: #nextPutAll: env: 0 withArguments: {(to perform: #+ env: 0 withArguments: {1}) perform: #printString env: 0}.

		"If step is not 1, show it too"
		(by perform: #= env: 0 withArguments: {1}) ifFalse: [
			stream perform: #nextPutAll: env: 0 withArguments: {', '}.
			stream perform: #nextPutAll: env: 0 withArguments: {by perform: #printString env: 0}.
		].
	].

	stream perform: #nextPut: env: 0 withArguments: {$)}.
	^ stream perform: #contents env: 0
%

category: 'Python-Sequence Methods'
method: range
count: value
	"Return the number of times value appears in the range (0 or 1)"

	| contains |
	contains := self perform: #__contains__: env: 2 withArguments: {value}.
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
	(self perform: #__contains__: env: 2 withArguments: {value}) ifFalse: [
		ValueError perform: #signal: env: 0 withArguments: {(value perform: #printString env: 0) perform: #, env: 0 withArguments: {' is not in range'}}
	].

	"Calculate index: (value - start) / step"
	idx := (value perform: #- env: 0 withArguments: {fromVal}) perform: #// env: 0 withArguments: {byVal}.
	^ idx
%

category: 'Python-Iteration'
method: range
__reversed__
	"Return a reversed range"

	| size startVal stepVal newStart newStop newStep |
	size := self perform: #size env: 0.

	"Empty range returns empty range"
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ range perform: #__new__:_:_:_: env: 2 withArguments: {range. 0. 0. 1}
	].

	startVal := self perform: #start env: 2.
	stepVal := self perform: #step env: 2.

	"Calculate new start: original start + (size - 1) * step"
	newStart := startVal perform: #+ env: 0 withArguments: {
		(size perform: #- env: 0 withArguments: {1}) perform: #* env: 0 withArguments: {stepVal}
	}.

	"New step is negated"
	newStep := stepVal perform: #negated env: 0.

	"New stop is original start + newStep (exclusive)"
	newStop := startVal perform: #+ env: 0 withArguments: {newStep}.

	^ range perform: #__new__:_:_:_: env: 2 withArguments: {range. newStart. newStop. newStep}
%

set compile_env: 0

