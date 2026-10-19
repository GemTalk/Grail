Extension { #name : 'str_iterator' }

{ #category : 'Grail-Instance Creation' }
str_iterator class >> ___on: aCollection [
	"Create a new str_iterator for the given string.
	This is a Grail-internal method (triple underscore).
	Position starts at 0 (Python 0-based indexing)."

	| instance |
	instance := self ___new___.
	instance ___collection: aCollection.
	instance ___position: 0.
	^ instance

]

{ #category : 'Grail-Private' }
str_iterator >> ___collection: aCollection [
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection

]

{ #category : 'Grail-Private' }
str_iterator >> ___position: anInteger [
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger

]

{ #category : 'Grail-Iterator Protocol' }
str_iterator >> __length_hint__ [
	"Characters not yet produced -- CPython's unicodeiter_len.  A str is
	immutable, so the count is exact."

	^ (collection @env0:size @env0:- position) @env0:max: 0

]

{ #category : 'Grail-Iterator Protocol' }
str_iterator >> __next__ [
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

]

{ #category : 'Grail-Pickle Protocol' }
str_iterator >> _getstate [
	"Answer this iterator's state as a tuple (collection, position) for
	pickling -- the same (source, index) shape as tuple_iterator/seq_iterator,
	consumed by pickle.py's positional iterator path (save_iterator ->
	(iter, (collection,), position), with the index re-applied by BUILD).
	A str is immutable, so there is no reverse/exhausted flag.  A plain
	Python-visible method (no ``___'' prefix) so pickle.py can call it."

	^ tuple @env0:withAll: { collection. position }

]
