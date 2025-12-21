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

! ------------------- Instance methods for iterator
set compile_env: 2

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

	self with: 'Subclass must implement __next__' perform: #error: env: 0
%

category: 'Python-String Representation'
method: iterator
__repr__
	"Return a string representation of the iterator."

	| className stream |
	className := self perform: #class env: 0.
	className := className perform: #name env: 0.
	stream := WriteStream perform: #on: env: 0 withArguments: {String perform: #new env: 0}.
	stream with: $< perform: #nextPut: env: 0.
	stream with: className perform: #nextPutAll: env: 0.
	stream with: ' object at 0x' perform: #nextPutAll: env: 0.
	stream with: (self perform: #identityHash env: 0) perform: #nextPutAll: env: 0.
	stream with: $> perform: #nextPut: env: 0.
	^ stream perform: #contents env: 0
%

category: 'Python-Type Information'
method: iterator
__class__
	"Return the class of this iterator."

	^ self perform: #class env: 0
%

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0


