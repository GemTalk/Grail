! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- set_iterator class (Python 'set_iterator' type)
expectvalue /Class
doit
iterator subclass: 'set_iterator'
  instVarNames: #( collection elements position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
set_iterator comment:
'Python set_iterator type.

An iterator over a set or frozenset (Set). Created by calling iter() on a set/frozenset.

Since GemStone Sets don''t have indexed access, we convert the set to an array
of elements when the iterator is created, then iterate over that array.

Instance variables:
  collection - the set/frozenset being iterated over (kept for reference)
  elements - array of elements from the set (created at initialization)
  position - current position (0-based Python index)
'
%

expectvalue /Class
doit
set_iterator category: 'Collections-Iterators'
%

! ===============================================================================
! set_iterator Methods (Python 'set_iterator' type)
! ===============================================================================
! This file contains Python method implementations for set_iterator.
! set_iterator is used to iterate over set and frozenset objects.
!
! Since GemStone Sets don't support indexed access, we convert the set to an
! array when the iterator is created, then iterate over that array.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from set_iterator
expectvalue /Metaclass3
doit
set_iterator removeAllMethods: 2.
set_iterator class removeAllMethods: 2.
%

set compile_env: 2

category: 'Python-Instance Creation'
classmethod: set_iterator
___on: aSet
	"Create a new set_iterator for the given set/frozenset.
	Convert the set to an array for indexed iteration."

	| iter elementsArray |
	iter := self ___new___.
	
	"Convert set to array for iteration"
	elementsArray := list ___new___.
	aSet ___do___: [:each |
		elementsArray append: each
	].

	iter ___collection: aSet.
	iter ___elements: elementsArray.
	iter ___position: 0.
	^ iter
%

category: 'Python-Initialization'
method: set_iterator
___collection: aSet
	"Set the collection being iterated over"
	collection := aSet
%

category: 'Python-Initialization'
method: set_iterator
___elements: anArray
	"Set the array of elements to iterate over"
	elements := anArray
%

category: 'Python-Initialization'
method: set_iterator
___position: anInteger
	"Set the current position"
	position := anInteger
%

category: 'Python-Type'
method: set_iterator
__class__
	"Return the Python type for set_iterator"
	^ set_iterator
%

category: 'Python-Iterator Protocol'
method: set_iterator
__next__
	"Return the next item from the set.
	If there are no further items, raise StopIteration."

	| size item |
	size := elements ___size___.
	(position ___ge___: size) ifTrue: [
		StopIteration ___signal___
	].
	item := elements ___at___: (position + 1).
	position := position + 1.
	^ item
%

category: 'Python-String Representation'
method: set_iterator
__repr__
	"Return a string representation of the set iterator"

	| className stream |
	className := self ___class___ ___name___.
	stream := WriteStream ___on___: (String ___new___).
	stream ___nextPut___: $<.
	stream ___nextPutAll___: className.
	stream ___nextPutAll___: ' object at 0x'.
	stream ___nextPutAll___: ((self ___identityHash___) ___printString___).
	stream ___nextPut___: $>.
	^ stream ___contents___
%

set compile_env: 0
