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
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $<.
	stream @env0:nextPutAll: className.
	stream @env0:nextPutAll: ' object at 0x'.
	stream @env0:nextPutAll: (self @env0:identityHash) @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

category: 'Grail-Private'
method: iterator
___strictExhausted___: anIndex sources: srcs name: aName
	"CPython's ``check:'' label in zip_next (bltinmodule.c), shared by zip
	and map -- both grew a ``strict='' keyword and both implement it the
	same way.  anIndex is the 1-based position of the source that just
	raised StopIteration.

	If it is NOT the first source, the earlier ones supplied an item this
	round, so this one is short.  If it IS the first, the zip may simply be
	over -- but only if every OTHER source is also exhausted, so each is
	pulled once to find out.  Anything that is not StopIteration (a source
	raising its own error) propagates untouched, which is what
	test_builtin''s test_zip_strict_error_handling checks: it interleaves a
	deliberately-raising iterator with short ones and pins which exception
	wins at each length.

	Answers nothing -- every path signals."

	| stopped |
	anIndex @env0:> 1 ifTrue: [
		ValueError ___signal___:
			(self ___strictMessage___: aName argument: anIndex relation: 'shorter')].
	2 @env0:to: srcs @env0:size do: [:j |
		stopped := false.
		[(srcs @env0:at: j) __next__] @env0:on: StopIteration do: [:ex |
			stopped := true.
			ex @env0:return: nil].
		stopped ifFalse: [
			ValueError ___signal___:
				(self ___strictMessage___: aName argument: j relation: 'longer')]].
	StopIteration ___signal___: nil
%

category: 'Grail-Private'
method: iterator
___strictMessage___: aName argument: anIndex relation: aRelation
	"CPython's wording, down to the singular/plural of the reference
	argument: ``zip() argument 2 is shorter than argument 1'' but
	``zip() argument 3 is shorter than arguments 1-2''."

	| prev |
	prev := anIndex @env0:- 1.
	^ aName @env0:, '() argument ' @env0:, anIndex @env0:printString
		@env0:, ' is ' @env0:, aRelation @env0:, ' than argument'
		@env0:, (prev @env0:= 1 ifTrue: [' '] ifFalse: ['s 1-'])
		@env0:, prev @env0:printString
%

set compile_env: 0
