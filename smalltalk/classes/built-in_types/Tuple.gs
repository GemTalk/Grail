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
tuple removeAllMethods: 1.
tuple class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Sequence Protocol'
method: tuple
__delitem__: index
	"Tuples are immutable - raise TypeError."

	TypeError ___signal___: '''tuple'' object doesn''t support item deletion'
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

category: 'Python-Serialization'
method: tuple
__getnewargs__
	"Return arguments for unpickling.
	For tuples, this is just the tuple itself as an argument."

	^ tuple ___with___: self
%

category: 'Python-Hashing'
method: tuple
__hash__
	"Return a hash value for the tuple.
	Tuples are hashable (unlike lists) because they are immutable."

	| hash |
	hash := self ___hash___.
	^ hash
%

category: 'Python-Sequence Protocol'
method: tuple
__iter__
	"Return an iterator over the tuple."

	^ tuple_iterator ___on: self
%

category: 'Python-String Representation'
method: tuple
__repr__
	"Return a string representation of the tuple: (item1, item2, ...)
	Special case: single-element tuples need a trailing comma."

	| stream size |
	size := self ___size___.
	stream := WriteStream ___on___: (String ___new___).
	stream ___nextPut___: $(.

	size == 1 ifTrue: [
		"Single element tuple needs trailing comma"
		| reprStr |
		reprStr := (self ___at___: 1) __repr__.
		stream ___nextPutAll___: reprStr.
		stream ___nextPutAll___: ','.
	] ifFalse: [
		self perform: #do:separatedBy: env: 0 withArguments: {
			[:each |
				| reprStr |
				reprStr := each __repr__.
				stream ___nextPutAll___: reprStr
			].
			[stream ___nextPutAll___: ', ']
		}
	].

	stream ___nextPut___: $).
	^ stream ___contents___
%

category: 'Python-Sequence Protocol'
method: tuple
__setitem__: index _: value
	"Tuples are immutable - raise TypeError."

	TypeError ___signal___: '''tuple'' object does not support item assignment'
%

set compile_env: 0
