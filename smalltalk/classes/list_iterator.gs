! ===============================================================================
! List Iterator Methods (Python 'list_iterator' type)
! ===============================================================================
! This file contains method implementations for the list_iterator class.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from list_iterator
expectvalue /Metaclass3
doit
list_iterator removeAllMethods: 2.
list_iterator class removeAllMethods: 2.
%

! ------------------- Class methods for list_iterator
set compile_env: 2

category: 'Python-Instance Creation'
classmethod: list_iterator
___on: aCollection
	"Create a new list_iterator for the given collection.
	This is a Grail-internal method (triple underscore).
	Position starts at 0 (Python 0-based indexing)."

	| instance |
	instance := self perform: #new env: 0.
	instance perform: #___collection: env: 2 withArguments: {aCollection}.
	instance perform: #___position: env: 2 withArguments: {0}.
	^ instance
%

! ------------------- Instance methods for list_iterator
set compile_env: 2

category: 'Python-Iterator Protocol'
method: list_iterator
__next__
	"Return the next item from the list.
	If there are no further items, raise StopIteration."

	| size item |
	size := collection perform: #size env: 0.

	"Check if we've reached the end"
	(position perform: #>= env: 0 withArguments: {size}) ifTrue: [
		StopIteration perform: #signal env: 0
	].

	"Get the item at current position (convert to 1-based Smalltalk index)"
	item := collection perform: #at: env: 0 withArguments: {
		position perform: #+ env: 0 withArguments: {1}
	}.

	"Increment position"
	position := position perform: #+ env: 0 withArguments: {1}.

	^ item
%

category: 'Python-Private'
method: list_iterator
___collection: aCollection
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection
%

category: 'Python-Private'
method: list_iterator
___position: anInteger
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger
%

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0


