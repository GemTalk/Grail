Extension { #name : 'set_iterator' }

{ #category : 'Grail-Instance Creation' }
set_iterator class >> ___on: aSet [
	"Create a new set_iterator for the given set/frozenset.
	Convert the set to an array for indexed iteration."

	| iter elementsArray |
	iter := self ___new___.
	
	"Convert set to array for iteration"
	elementsArray := list ___new___.
	aSet @env0:do: [:each |
		elementsArray append: each
	].

	iter ___collection: aSet.
	iter ___elements: elementsArray.
	iter ___position: 0.
	^ iter

]

{ #category : 'Grail-Initialization' }
set_iterator >> ___collection: aSet [
	"Set the collection being iterated over"
	collection := aSet

]

{ #category : 'Grail-Initialization' }
set_iterator >> ___elements: anArray [
	"Set the array of elements to iterate over"
	elements := anArray

]

{ #category : 'Grail-Initialization' }
set_iterator >> ___position: anInteger [
	"Set the current position"
	position := anInteger

]

{ #category : 'Grail-Type' }
set_iterator >> __class__ [
	"Return the Python type for set_iterator"
	^ set_iterator

]

{ #category : 'Grail-Iterator Protocol' }
set_iterator >> __length_hint__ [
	"Number of items not yet produced (CPython's setiter_len; test_set's
	test_iterator_pickling asserts iter(s).__length_hint__() == len(s)).
	Iteration is over a snapshot (elements), so the hint is exact -- EXCEPT
	once the underlying set's size has changed, when it is permanently zero:
	__next__ raises RuntimeError from then on, so the iteration can never be
	completed and a remaining count would break the len(it) == len(list(it))
	invariant (test_iterlen TestSet test_immutable_during_iteration).  CPython
	compares sizes for exactly this (si_used vs set->used)."

	| remaining |
	((collection @env0:size) @env0:= (elements @env0:size)) ifFalse: [^ 0].
	remaining := elements @env0:size @env0:- position.
	^ remaining @env0:< 0 ifTrue: [0] ifFalse: [remaining]

]

{ #category : 'Grail-Iterator Protocol' }
set_iterator >> __next__ [
	"Return the next item from the set.
	If there are no further items, raise StopIteration."

	| size item |
	"CPython raises RuntimeError if the set's size changes mid-iteration."
	((collection @env0:size) @env0:= (elements @env0:size)) ifFalse: [
		RuntimeError ___signal___: 'Set changed size during iteration'].
	size := elements @env0:size.
	(position @env0:>= size) ifTrue: [
		StopIteration @env0:signal
	].
	item := elements @env0:at: (position + 1).
	position := position + 1.
	^ item

]

{ #category : 'Grail-String Representation' }
set_iterator >> __repr__ [
	"Return a string representation of the set iterator"

	| className stream |
	className := self @env0:class @env0:name.
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: $<.
	stream @env0:nextPutAll: className.
	stream @env0:nextPutAll: ' object at 0x'.
	stream @env0:nextPutAll: ((self @env0:identityHash) @env0:printString).
	stream @env0:nextPut: $>.
	^ stream @env0:contents

]

{ #category : 'Grail-Internal' }
set_iterator >> _getstate [
	"Answer (elements-snapshot, position) for pickling -- see pickle.py's
	iterator tags.  A set iterator pickles as a list_iterator over its
	elements snapshot resuming at `position' (set order is undefined, so
	CPython likewise unpickles set iterators as list iterators).  A
	single-underscore (Python-visible) name so pickle.py can call it."

	^ tuple @env0:withAll: { elements. position }

]
