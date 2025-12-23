! ===============================================================================
! String Iterator Methods (Python 'str_iterator' type)
! ===============================================================================
! This file contains method implementations for the str_iterator class.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from str_iterator
expectvalue /Metaclass3
doit
str_iterator removeAllMethods: 2.
str_iterator class removeAllMethods: 2.
%

! ------------------- Class methods for str_iterator
set compile_env: 2

category: 'Python-Instance Creation'
classmethod: str_iterator
___on: aCollection
	"Create a new str_iterator for the given string.
	This is a Grail-internal method (triple underscore).
	Position starts at 0 (Python 0-based indexing)."

	| instance |
	instance := self perform: #new env: 0.
	instance ___collection: aCollection.
	instance ___position: 0.
	^ instance
%

! ------------------- Instance methods for str_iterator
set compile_env: 2

category: 'Python-Iterator Protocol'
method: str_iterator
__next__
	"Return the next character from the string as a single-character string.
	If there are no further characters, raise StopIteration."

	| size char charString |
	size := collection perform: #size env: 0.

	"Check if we've reached the end"
	(position perform: #>= env: 0 withArguments: {size}) ifTrue: [
		StopIteration perform: #signal env: 0
	].

	"Get the character at current position (convert to 1-based Smalltalk index)"
	char := collection perform: #at: env: 0 withArguments: {
		position perform: #+ env: 0 withArguments: {1}
	}.

	"Convert character to a single-character string"
	charString := String perform: #new: env: 0 withArguments: {1}.
	charString perform: #at:put: env: 0 withArguments: {1. char}.

	"Increment position"
	position := position perform: #+ env: 0 withArguments: {1}.

	^ charString
%

category: 'Python-Private'
method: str_iterator
___collection: aCollection
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection
%

category: 'Python-Private'
method: str_iterator
___position: anInteger
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger
%

! ------------------- Reset compile environment to Smalltalk
set compile_env: 0


