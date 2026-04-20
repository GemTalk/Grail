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

	^ tuple @env0:with: self
%

category: 'Python-Hashing'
method: tuple
__hash__
	"Return a hash value for the tuple.
	Tuples are hashable (unlike lists) because they are immutable."

	| hash |
	hash := self @env0:hash.
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
	size := self @env0:size.
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: $(.

	size == 1 ifTrue: [
		"Single element tuple needs trailing comma"
		| reprStr |
		reprStr := (self @env0:at: 1) __repr__.
		stream @env0:nextPutAll: reprStr.
		stream @env0:nextPutAll: ','.
	] ifFalse: [
		self @env0:do: [:each |
				| reprStr |
				reprStr := each __repr__.
				stream @env0:nextPutAll: reprStr
			] separatedBy: [stream @env0:nextPutAll: ', ']
	].

	stream @env0:nextPut: $).
	^ stream @env0:contents
%

category: 'Python-Sequence Protocol'
method: tuple
__setitem__: index _: value
	"Tuples are immutable - raise TypeError."

	TypeError ___signal___: '''tuple'' object does not support item assignment'
%

set compile_env: 0
