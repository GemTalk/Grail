Extension { #name : 'tuple_iterator' }

{ #category : 'Grail-Instance Creation' }
tuple_iterator class >> ___on: aCollection [
	"Create a new tuple_iterator for the given collection.
	This is a Grail-internal method (triple underscore).
	Position starts at 0 (Python 0-based indexing)."

	| instance |
	instance := self ___new___.
	instance ___collection: aCollection.
	instance ___position: 0.
	^ instance

]

{ #category : 'Grail-Instance Creation' }
tuple_iterator class >> _new_from: aCollection _: pos [
	"Reconstruct a tuple_iterator with an explicit state (collection, 0-based
	next index).  Used by the pickle round-trip -- see pickle.py's iterator
	tags.  A single-underscore (Python-visible) method so pickle.py can call
	it on the type."

	| instance |
	instance := self ___new___.
	instance ___collection: aCollection.
	instance ___position: pos.
	^ instance

]

{ #category : 'Grail-Private' }
tuple_iterator >> ___collection: aCollection [
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection

]

{ #category : 'Grail-Private' }
tuple_iterator >> ___position: anInteger [
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger

]

{ #category : 'Grail-Iterator Protocol' }
tuple_iterator >> __length_hint__ [
	"Items not yet produced -- CPython's tupleiter_len.  A tuple is immutable,
	so the count is exact (test_iterlen TestTuple test_invariant)."

	^ (collection @env0:size @env0:- position) @env0:max: 0

]

{ #category : 'Grail-Iterator Protocol' }
tuple_iterator >> __next__ [
	"Return the next item from the tuple.
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

]

{ #category : 'Grail-Private' }
tuple_iterator >> _getstate [
	"Answer this iterator's state as a tuple (collection, position) for
	pickling -- see pickle.py's iterator tags.  A tuple is forward-only and
	immutable, so (unlike list_iterator) there is no reverse/exhausted flag.
	A plain Python-visible method (no ``___'' prefix) so pickle.py can call it."

	^ tuple @env0:withAll: { collection. position }

]
