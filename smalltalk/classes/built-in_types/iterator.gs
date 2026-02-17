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
iterator category: 'Collections-Iterators'
%

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

category: 'Python-Type Information'
method: iterator
__class__
	"Return the class of this iterator."

	^ self ___class___
%

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

set compile_env: 0
