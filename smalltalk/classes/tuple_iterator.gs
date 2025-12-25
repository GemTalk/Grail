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
tuple_iterator removeAllMethods: 2.
tuple_iterator class removeAllMethods: 2.
%

! ------------------- Class methods for tuple_iterator
set compile_env: 2

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

! ------------------- Instance methods for tuple_iterator
set compile_env: 2

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

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0


