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
		___initialize: anIterable;
		yourself
%
! ------------------- Instance methods for AbstractIterator
set compile_env: 0
category: 'other'
method: AbstractIterator
___initialize: anIterable

	container := anIterable.
	index := 0.
%
category: 'other'
method: AbstractIterator
__iter__

	^[self]
%
category: 'other'
method: AbstractIterator
__next__

	^[container ___size <= index ifTrue: [StopIteration signal]. container ___at: (index := index + 1)]
%
category: 'other'
method: AbstractIterator
do: aBlock

	container do: aBlock
%
