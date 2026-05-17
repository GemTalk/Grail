! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- range_iterator class (Python 'range_iterator' type)
expectvalue /Class
doit
iterator subclass: 'range_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
range_iterator comment:
'Python range_iterator type.

An iterator over a range (Interval). Created by calling iter() on a range.

Instance variables:
  collection - the range being iterated over
  position - current position (0-based Python index)
'
%

expectvalue /Class
doit
range_iterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! Range Iterator Methods (Python 'range_iterator' type)
! ===============================================================================
! This file contains method implementations for the range_iterator class.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from range_iterator
expectvalue /Metaclass3
doit
range_iterator removeAllMethods: 1.
range_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: range_iterator
___on: aCollection
	"Create a new range_iterator for the given range (Interval).
	This is a Grail-internal method (triple underscore).
	Position starts at 0 (Python 0-based indexing)."

	| instance |
	instance := self ___new___.
	instance ___collection: aCollection.
	instance ___position: 0.
	^ instance
%

category: 'Grail-Private'
method: range_iterator
___collection: aCollection
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection
%

category: 'Grail-Private'
method: range_iterator
___position: anInteger
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger
%

category: 'Grail-Iterator Protocol'
method: range_iterator
__next__
	"Return the next item from the range.
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
