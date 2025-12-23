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

! ------------------- Class methods for set_iterator
set compile_env: 2

category: 'Python-Instance Creation'
classmethod: set_iterator
___on: aSet
	"Create a new set_iterator for the given set/frozenset.
	Convert the set to an array for indexed iteration."

	| iter elementsArray |
	iter := self perform: #new env: 0.
	
	"Convert set to array for iteration"
	elementsArray := Array perform: #new env: 0.
	aSet perform: #do: env: 0 withArguments: {[:each |
		elementsArray perform: #add: env: 0 withArguments: {each}
	]}.

	iter ___collection: aSet.
	iter ___elements: elementsArray.
	iter ___position: 0.
	^ iter
%

! ------------------- Instance methods for set_iterator
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

category: 'Python-Iterator Protocol'
method: set_iterator
__next__
	"Return the next item from the set.
	If there are no further items, raise StopIteration."

	| size item |
	size := elements perform: #size env: 0.
	(position perform: #>= env: 0 withArguments: {size}) ifTrue: [
		StopIteration perform: #signal env: 0
	].
	item := elements perform: #at: env: 0 withArguments: {position + 1}.
	position := position + 1.
	^ item
%

category: 'Python-Type'
method: set_iterator
__class__
	"Return the Python type for set_iterator"
	^ set_iterator
%

category: 'Python-String Representation'
method: set_iterator
__repr__
	"Return a string representation of the set iterator"

	| className stream |
	className := self perform: #class env: 0 perform: #name env: 0.
	stream := WriteStream perform: #on: env: 0 withArguments: {String perform: #new env: 0}.
	stream with: '<' perform: #nextPut: env: 0.
	stream with: className perform: #nextPutAll: env: 0.
	stream with: ' object at 0x' perform: #nextPutAll: env: 0.
	stream with: (self perform: #identityHash env: 0) perform: #printString env: 0 perform: #nextPutAll: env: 0.
	stream with: '>' perform: #nextPut: env: 0.
	^ stream perform: #contents env: 0
%

set compile_env: 0

