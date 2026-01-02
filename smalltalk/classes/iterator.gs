! ===============================================================================
! Iterator Methods (Python 'iterator' type)
! ===============================================================================
! This file contains method implementations for the iterator class, which is
! the base class for all Python iterators.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from iterator
expectvalue /Metaclass3
doit
iterator removeAllMethods: 2.
iterator class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Instance methods for iterator

category: 'Python-Iterator Protocol'
method: iterator
__iter__
	"Return the iterator object itself.
	This is required to allow iterators to be used with the for statement."

	^ self
%

category: 'Python-Iterator Protocol'
method: iterator
__next__
	"Return the next item from the iterator.
	If there are no further items, raise StopIteration.
	This is an abstract method that must be overridden by subclasses."

	self ___error___: 'Subclass must implement __next__'
%

category: 'Python-String Representation'
method: iterator
__repr__
	"Return a string representation of the iterator."

	| className stream |
	className := self ___class___.
	className := className ___name___.
	stream := WriteStream ___on___: (String ___new___).
	stream ___nextPut___: $<.
	stream ___nextPutAll___: className.
	stream ___nextPutAll___: ' object at 0x'.
	stream ___nextPutAll___: (self ___identityHash___).
	stream ___nextPut___: $>.
	^ stream ___contents___
%

category: 'Python-Type Information'
method: iterator
__class__
	"Return the class of this iterator."

	^ self ___class___
%

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0
