! ===============================================================================
! InvariantArray Methods (Python 'tuple' type)
! ===============================================================================
! This file contains Python method implementations for InvariantArray
! to make it behave like Python's tuple type.
!
! InvariantArray inherits shared sequence methods from SequenceableCollection.
! This file adds tuple-specific methods (mainly __hash__ and immutability).
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from tuple
expectvalue /Metaclass3
doit
tuple removeAllMethods: 2.
tuple class removeAllMethods: 2.
%

! ------------------- Instance methods for tuple
set compile_env: 2

category: 'Python-Sequence Protocol'
method: tuple
__iter__
	"Return an iterator over the tuple."

	^ tuple_iterator ___on: self
%


category: 'Python-Sequence Protocol'
method: tuple
__setitem__: index _: value
	"Tuples are immutable - raise TypeError."

	TypeError perform: #signal: env: 0 withArguments: {'''tuple'' object does not support item assignment'}
%

category: 'Python-Sequence Protocol'
method: tuple
__delitem__: index
	"Tuples are immutable - raise TypeError."

	TypeError perform: #signal: env: 0 withArguments: {'''tuple'' object doesn''t support item deletion'}
%

category: 'Python-Hashing'
method: tuple
__hash__
	"Return a hash value for the tuple.
	Tuples are hashable (unlike lists) because they are immutable."

	| hash |
	hash := self perform: #hash env: 0.
	^ hash
%

category: 'Python-Serialization'
method: tuple
__getnewargs__
	"Return arguments for unpickling.
	For tuples, this is just the tuple itself as an argument."

	^ Array perform: #with: env: 0 withArguments: {self}
%

category: 'Python-String Representation'
method: tuple
__repr__
	"Return a string representation of the tuple: (item1, item2, ...)
	Special case: single-element tuples need a trailing comma."

	| stream size |
	size := self perform: #size env: 0.
	stream := WriteStream perform: #on: env: 0 withArguments: {String perform: #new env: 0}.
	stream with: $( perform: #nextPut: env: 0.

	size == 1 ifTrue: [
		"Single element tuple needs trailing comma"
		| reprStr |
		reprStr := (self perform: #at: env: 0 withArguments: {1}) __repr__.
		stream with: reprStr perform: #nextPutAll: env: 0.
		stream with: ',' perform: #nextPutAll: env: 0.
	] ifFalse: [
		self perform: #do:separatedBy: env: 0 withArguments: {
			[:each |
				| reprStr |
				reprStr := each __repr__.
				stream with: reprStr perform: #nextPutAll: env: 0
			].
			[stream with: ', ' perform: #nextPutAll: env: 0]
		}
	].

	stream with: $) perform: #nextPut: env: 0.
	^ stream perform: #contents env: 0
%

category: 'Python-Other'
method: tuple
__doc__
	"Return the docstring for tuple."

	^ 'Built-in immutable sequence.

If no argument is given, the constructor returns an empty tuple.
If iterable is specified the tuple is initialized from iterable''s items.

If the argument is a tuple, the return value is the same object.'
%

! ------------------- Reset compile environment
set compile_env: 0

