! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- iterator class (Python base iterator type)
expectvalue /Class
doit
object subclass: 'iterator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
iterator comment:
'Python iterator base type.

An iterator is an object representing a stream of data. Repeated calls to the
iterator''s __next__() method return successive items in the stream. When no
more data are available, a StopIteration exception is raised.

Iterators are required to have an __iter__() method that returns the iterator
object itself, so every iterator is also iterable.

This is the abstract base class for all Python iterators. Concrete iterator
types (list_iterator, tuple_iterator, etc.) inherit from this class.
'
%

expectvalue /Class
doit
iterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! Iterator Methods (Python 'iterator' type)
! ===============================================================================
! This file contains method implementations for the iterator class, which is
! the base class for all Python iterators.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from iterator
expectvalue /Metaclass3
doit
iterator removeAllMethods: 1.
iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Type Information'
method: iterator
__class__
	"Return the class of this iterator."

	^ self @env0:class
%

category: 'Grail-Iterator Protocol'
method: iterator
__iter__
	"Return the iterator object itself.
	This is required to allow iterators to be used with the for statement."

	^ self
%

category: 'Grail-Iterator Protocol'
method: iterator
__next__
	"Return the next item from the iterator.
	If there are no further items, raise StopIteration.
	This is an abstract method that must be overridden by subclasses."

	self @env0:error: 'Subclass must implement __next__'
%

category: 'Grail-String Representation'
method: iterator
__repr__
	"Return a string representation of the iterator."

	| className stream |
	className := self @env0:class.
	className := className @env0:name.
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: $<.
	stream @env0:nextPutAll: className.
	stream @env0:nextPutAll: ' object at 0x'.
	stream @env0:nextPutAll: (self @env0:identityHash) @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

set compile_env: 0
