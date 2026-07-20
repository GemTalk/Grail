! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- list_iterator class (Python 'list_iterator' type)
expectvalue /Class
doit
iterator subclass: 'list_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
list_iterator comment:
'Python list_iterator type.

An iterator over a list (OrderedCollection). Created by calling iter() on a list.

Instance variables:
  collection - the list being iterated over
  position - current position (0-based Python index)
'
%

expectvalue /Class
doit
list_iterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! List Iterator Methods (Python 'list_iterator' type)
! ===============================================================================
! This file contains method implementations for the list_iterator class.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from list_iterator
expectvalue /Metaclass3
doit
list_iterator removeAllMethods: 1.
list_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: list_iterator
___on: aCollection
	"Create a new list_iterator for the given collection.
	This is a Grail-internal method (triple underscore).
	Position starts at 0 (Python 0-based indexing)."

	| instance |
	instance := self ___new___.
	instance ___collection: aCollection.
	instance ___position: 0.
	^ instance
%

category: 'Grail-Private'
method: list_iterator
___collection: aCollection
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection
%

category: 'Grail-Private'
method: list_iterator
___position: anInteger
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger
%

category: 'Grail-Iterator Protocol'
method: list_iterator
__length_hint__
	"Python ``__length_hint__'' — the (here exact) count of items still to be
	produced.  ``operator.length_hint(iter(seq))'' consumes it, and CPython
	uses it to presize containers built from an iterator.  Remaining items are
	``collection size - position'' (position is the 0-based next index),
	clamped at 0 for a spent iterator."

	| remaining |
	remaining := collection @env0:size @env0:- position.
	remaining @env0:< 0 ifTrue: [^ 0].
	^ remaining
%

category: 'Grail-Iterator Protocol'
method: list_iterator
__next__
	"Return the next item from the list.
	If there are no further items, raise StopIteration."

	| size item |
	size := collection @env0:size.

	"Check if we've reached the end"
	(position @env0:>= size) ifTrue: [
		StopIteration @env0:signal
	].

	"Get the item at current position (convert to 1-based Smalltalk index)"
	item := collection @env0:at: (position @env0:+ 1).

	"Increment position"
	position := position @env0:+ 1.

	^ item
%

set compile_env: 0
