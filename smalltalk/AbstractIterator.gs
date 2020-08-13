! ------------------- Remove existing behavior from AbstractIterator
expectvalue /Metaclass3       
doit
AbstractIterator removeAllMethods.
AbstractIterator class removeAllMethods.
%
! ------------------- Class methods for AbstractIterator
set compile_env: 0
category: 'other'
classmethod: AbstractIterator
on: anIterable

	^self basicNew
		initialize: anIterable;
		yourself
%
! ------------------- Instance methods for AbstractIterator
set compile_env: 0
category: 'other'
method: AbstractIterator
__iter__

	^[self]
%
category: 'other'
method: AbstractIterator
__next__

	^[stream atEnd ifTrue: [StopIteration signal]. self next]
%
category: 'other'
method: AbstractIterator
initialize: anIterable

	stream := ReadStream on: anIterable.
%
