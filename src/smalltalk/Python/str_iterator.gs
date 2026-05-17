! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- str_iterator class (Python 'str_iterator' type)
expectvalue /Class
doit
iterator subclass: 'str_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
str_iterator comment:
'Python str_iterator type.

An iterator over a string (Unicode7). Created by calling iter() on a string.
Returns one character at a time as a single-character string.

Instance variables:
  collection - the string being iterated over
  position - current position (0-based Python index)
'
%

expectvalue /Class
doit
str_iterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! String Iterator Methods (Python 'str_iterator' type)
! ===============================================================================
! This file contains method implementations for the str_iterator class.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from str_iterator
expectvalue /Metaclass3
doit
str_iterator removeAllMethods: 1.
str_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
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

category: 'Grail-Private'
method: str_iterator
___collection: aCollection
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection
%

category: 'Grail-Private'
method: str_iterator
___position: anInteger
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger
%

category: 'Grail-Iterator Protocol'
method: str_iterator
__next__
	"Return the next character from the string as a single-character string.
	If there are no further characters, raise StopIteration."

	| size char charString |
	size := collection @env0:size.

	"Check if we've reached the end"
	(position @env0:>= size) ifTrue: [
		StopIteration @env0:signal
	].

	"Get the character at current position (convert to 1-based Smalltalk index)"
	char := collection @env0:at: (position @env0:+ 1).

	"Convert character to a single-character string"
	charString := str ___new___: 1.
	charString @env0:at: 1 put: char.

	"Increment position"
	position := position @env0:+ 1.

	^ charString
%

set compile_env: 0
