! ------------------- Remove existing behavior from range
removeallmethods range
removeallclassmethods range
! ------------------- Class methods for range
category: 'Python'
classmethod: range
__call__: aPythonInt

	^(self __new__: aPythonInt) __init__: aPythonInt; yourself
%
category: 'Python'
classmethod: range
__call__: aPythonInt1 _: aPythonInt2

	^(self __new__: aPythonInt1 _: aPythonInt2) __init__: aPythonInt1 _: aPythonInt2; yourself
%
category: 'Python'
classmethod: range
__call__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	^(self __new__: aPythonInt1 _: aPythonInt2 _: aPythonInt3) __init__: aPythonInt1 _: aPythonInt2 _: aPythonInt3; yourself
%
category: 'Python'
classmethod: range
__new__: aPythonInt

	^self basicNew
%
category: 'Python'
classmethod: range
__new__: aPythonInt1 _: aPythonInt2

	^self basicNew
%
category: 'Python'
classmethod: range
__new__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	^self basicNew
%
category: 'Smalltalk'
classmethod: range
___containerClass

	^Interval
%
! ------------------- Instance methods for range
category: '(as yet unclassified)'
method: range
__init__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	container  := self class ___containerClass
		from: aPythonInt1 ___value
		to: aPythonInt2 ___value + (aPythonInt3 ___value > 0 ifTrue: [-1] ifFalse: [1])
		by: aPythonInt3 ___value.
	begin := aPythonInt1.
	end := aPythonInt2.
%
category: 'Python'
method: range
__bool__

	^self __len__ ___value > 0 ifTrue: [True] ifFalse: [False]
%
category: 'Python'
method: range
__contains__: anElement

	^(container includes: anElement ___value) ifTrue: [True] ifFalse: [False]
%
category: 'Python'
method: range
__doc__

	^str ___value: 'range(stop) -> range object\n' ,
		'range(start, stop[, step]) -> range object\n' ,
		'\n' ,
		'Return an object that produces a sequence of integers from start (inclusive)\n' ,
		'to stop (exclusive) by step.  range(i, j) produces i, i+1, i+2, ..., j-1.\n' ,
		'start defaults to 0, and stop is omitted!  range(4) produces 0, 1, 2, 3.\n' ,
		'These are exactly the valid indices for a list of 4 elements.\n' ,
		'When step is given, it specifies the increment (or decrement).'
%
category: 'Python'
method: range
__eq__: other

	"Two ranges are equal if they produce the same sequence of values"
	(other isKindOf: range) ifFalse: [^False].
	self __len__ ___value = 0 ifTrue: [
		^other __len__ ___value = 0 ifTrue: [True] ifFalse: [False]
	].
	(self start ___value = other start ___value and: [
		self stop ___value = other stop ___value and: [
			self step ___value = other step ___value]])
		ifTrue: [^True] ifFalse: [^False]
%
category: 'Python'
method: range
__getitem__: aPyIndex

	"Handle slice object"
	| idx size |
	(aPyIndex isKindOf: slice) ifTrue: [
		^self ___getslice: aPyIndex start _: aPyIndex stop _: aPyIndex step
	].

	"Integer indexing with negative index support"
	idx := aPyIndex ___value.
	size := container size.

	"Handle negative index"
	idx < 0 ifTrue: [idx := size + idx].

	"Check bounds"
	(idx < 0 or: [idx >= size]) ifTrue: [
		IndexError signal: 'range object index out of range'
	].

	^int ___value: (container at: idx + 1)
%
category: 'Python'
method: range
__getItem__: index
	"Deprecated: use __getitem__: instead"

	^self __getitem__: (int ___value: index)
%
category: 'Python'
method: range
__hash__

	"Hash based on length, start, step - empty ranges hash the same"
	| len |
	len := self __len__ ___value.
	len = 0 ifTrue: [^int ___value: (0 hash bitXor: None hash)].
	^int ___value: ((self start ___value hash bitXor: self step ___value hash) bitXor: len hash)
%
category: 'Python'
method: range
__init__: aPythonInt

	container  := self class ___containerClass from: 0 to: aPythonInt ___value -1.
	begin := None.
	end := aPythonInt.
%
category: 'Python'
method: range
__init__: aPythonInt1 _: aPythonInt2

	container  := self class ___containerClass from: aPythonInt1 ___value to: (aPythonInt2 ___value - 1).
	begin := aPythonInt1.
	end := aPythonInt2.
%
category: 'Python'
method: range
__len__

	^int ___value: self ___size
%
category: 'Python'
method: range
__ne__: other

	^(self __eq__: other) __not__
%
category: 'Python'
method: range
__reversed__

	"Return a reversed range"
	| len newStart newStop newStep |
	len := self __len__ ___value.
	len = 0 ifTrue: [
		^range __call__: (int ___value: 0) _: (int ___value: 0)
	].
	newStep := self step ___value negated.
	newStart := self start ___value + ((len - 1) * self step ___value).
	newStop := self start ___value + newStep.
	^range __call__: (int ___value: newStart) _: (int ___value: newStop) _: (int ___value: newStep)
%
category: 'Python'
method: range
begin

	^begin
%
category: 'Python'
method: range
count: anElement

	^(self __contains__: anElement) == True ifTrue: [int ___value: 1] ifFalse: [int ___value: 0]
%
category: 'Python'
method: range
end

	^end
%
category: 'Python'
method: range
index: anElement

	| idx val |
	val := anElement ___value.
	idx := container indexOf: val.
	idx = 0 ifTrue: [ValueError signal: val printString, ' is not in range'].
	^int ___value: idx - 1  "Python uses 0-based indexing"
%
category: 'Python'
method: range
start

	^int ___value: container first
%
category: 'Python'
method: range
step

	^int ___value: container increment
%
category: 'Python'
method: range
stop

	^int ___value: (container last + container increment)
%
category: 'Smalltalk'
method: range
___container

	^container
%
category: 'Smalltalk'
method: range
___convertWithFlags: aSet precision: anObject andType: aCharacter
	"
	aSet contains the flags that are set for the input that are not used here
	anObject contains an empty string if there was no precision or an Integer if it was
	aCharacter contains the Type which will match one of the validTypes or invalidTypes
	"

	| validTypes invalidTypes return |
	validTypes := { $a. $s. $r. $c } asSet.
	invalidTypes := {
			$d->[TypeError signal: 'TypeError: %d format: a real number is required, not str'].
			$i->[TypeError signal: 'TypeError: %i format: a real number is required, not str'].
			$u->[TypeError signal: 'TypeError: %u format: a real number is required, not str'].
			$x->[TypeError signal: 'TypeError: %x format: an integer is required, not str'].
			$X->[TypeError signal: 'TypeError: %X format: an integer is required, not str'].
			$o->[TypeError signal: 'TypeError: %o format: an integer is required, not str'].
			$f->[TypeError signal: 'TypeError: must be real number, not str'].
			$F->[TypeError signal: 'TypeError: must be real number, not str'].
			$e->[TypeError signal: 'TypeError: must be real number, not str'].
			$E->[TypeError signal: 'TypeError: must be real number, not str'].
			$g->[TypeError signal: 'TypeError: must be real number, not str'].
			$G->[TypeError signal: 'TypeError: must be real number, not str'].
		} asDictionary.

	(validTypes includes: aCharacter) ifFalse: [
		(invalidTypes at: aCharacter) value.
	].

	(aCharacter == $r or: [aCharacter == $a]) ifTrue: [
		return := self __repr__ ___value
	] ifFalse: [
		return := self __str__ ___value
	].
	(anObject ~= '' and: [anObject < return size]) ifFalse: [return := return copyFrom: 1 to: return size].
	^return
%
category: 'Smalltalk'
method: range
___getslice: aPyStart _: aPyStop

	^self ___getslice: aPyStart _: aPyStop _: None
%
category: 'Smalltalk'
method: range
___getslice: aPyStart _: aPyStop _: aPyStep

	"Slice a range: r[start:stop:step] returns a new range"
	| size startVal stopVal stepVal sliceStart sliceStop sliceStep newStart newStop newStep numElements |

	size := container size.
	startVal := self start ___value.
	stopVal := self stop ___value.
	stepVal := self step ___value.

	"Get slice indices, handling None"
	sliceStep := aPyStep == None ifTrue: [1] ifFalse: [aPyStep ___value].
	sliceStep = 0 ifTrue: [ValueError signal: 'slice step cannot be zero'].

	sliceStep > 0 ifTrue: [
		aPyStart == None ifTrue: [
			sliceStart := 0.
		] ifFalse: [
			sliceStart := aPyStart ___value.
			sliceStart < 0 ifTrue: [sliceStart := (size + sliceStart) max: 0].
			sliceStart := sliceStart min: size.
		].

		aPyStop == None ifTrue: [
			sliceStop := size.
		] ifFalse: [
			sliceStop := aPyStop ___value.
			sliceStop < 0 ifTrue: [sliceStop := (size + sliceStop) max: 0].
			sliceStop := sliceStop min: size.
		].
	] ifFalse: [
		"Negative step"
		aPyStart == None ifTrue: [
			sliceStart := size - 1.
		] ifFalse: [
			sliceStart := aPyStart ___value.
			sliceStart < 0 ifTrue: [sliceStart := size + sliceStart].
			sliceStart := sliceStart min: (size - 1) max: -1.
		].

		aPyStop == None ifTrue: [
			sliceStop := -1.
		] ifFalse: [
			sliceStop := aPyStop ___value.
			sliceStop < 0 ifTrue: [sliceStop := size + sliceStop].
			sliceStop := sliceStop min: (size - 1) max: -1.
		].
	].

	"Calculate new range parameters"
	newStart := startVal + (sliceStart * stepVal).
	newStep := stepVal * sliceStep.

	"Calculate number of elements in the slice"
	sliceStep > 0
		ifTrue: [numElements := sliceStop - sliceStart - 1 // sliceStep + 1 max: 0]
		ifFalse: [numElements := sliceStart - sliceStop - 1 // sliceStep negated + 1 max: 0].

	"Calculate new stop"
	newStop := newStart + (numElements * newStep).

	^range __call__: (int ___value: newStart) _: (int ___value: newStop) _: (int ___value: newStep)
%
category: 'Smalltalk'
method: range
___size

	^self ___container size
%
category: 'Smalltalk'
method: range
___value

	^container
%
category: 'Smalltalk'
method: range
__repr__

	| stream |

	stream := WriteStream on: String new.
	
	stream nextPutAll: 'range('.
	self begin class == NoneType ifTrue: [
		stream nextPutAll: self end ___value asString.
	] ifFalse: [
		stream
			nextPutAll: self begin ___value asString;
			nextPut: $,;
			space;
			nextPutAll: self end ___value asString;
		yourself.
		

			self ___value increment == 1 ifFalse: [
				stream 
					nextPut: $,;
					space;
					nextPutAll: self ___value increment asString;
					yourself.
			].
		].
	stream nextPut: $).

	^(str ___value: stream contents)
%
