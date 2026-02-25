! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- tuple_iterator class (Python 'tuple_iterator' type)
expectvalue /Class
doit
iterator subclass: 'tuple_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
tuple_iterator comment:
'Python tuple_iterator type.

An iterator over a tuple (InvariantArray). Created by calling iter() on a tuple.

Instance variables:
  collection - the tuple being iterated over
  position - current position (0-based Python index)
'
%

expectvalue /Class
doit
tuple_iterator category: 'Collections-Iterators'
%

! ===============================================================================
! Tuple Iterator Methods (Python 'tuple_iterator' type)
! ===============================================================================
! This file contains method implementations for the tuple_iterator class.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from tuple_iterator
expectvalue /Metaclass3
doit
tuple_iterator removeAllMethods: 1.
tuple_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Instance Creation'
classmethod: tuple_iterator
___on: aCollection
	"Create a new tuple_iterator for the given collection.
	This is a Grail-internal method (triple underscore).
	Position starts at 0 (Python 0-based indexing)."

	| instance |
	instance := self ___new___.
	instance ___collection: aCollection.
	instance ___position: 0.
	^ instance
%

category: 'Python-Private'
method: tuple_iterator
___collection: aCollection
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection
%

category: 'Python-Private'
method: tuple_iterator
___position: anInteger
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger
%

category: 'Python-Iterator Protocol'
method: tuple_iterator
__next__
	"Return the next item from the tuple.
	If there are no further items, raise StopIteration."

	| size item |
	size := collection ___size___.

	"Check if we've reached the end"
	(position ___ge___: size) ifTrue: [
		StopIteration ___signal___
	].

	"Get the item at current position (convert to 1-based Smalltalk index)"
	item := collection ___at___: (position ___plus___: 1).

	"Increment position"
	position := position ___plus___: 1.

	^ item
%

set compile_env: 0
