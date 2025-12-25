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
	instance := self ___new___.
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
	size := collection ___size___.

	"Check if we've reached the end"
	(position ___ge___: size) ifTrue: [
		StopIteration ___signal___
	].

	"Get the character at current position (convert to 1-based Smalltalk index)"
	char := collection ___at___: (position ___plus___: 1).

	"Convert character to a single-character string"
	charString := String ___new___: 1.
	charString ___at___: 1 put: char.

	"Increment position"
	position := position ___plus___: 1.

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


