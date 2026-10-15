Extension { #name : 'dict_itemiterator' }

{ #category : 'Grail-Instance Creation' }
dict_itemiterator class >> ___on: aDict [
	"Create a new dict_itemiterator for the given dictionary"

	| iter itemsArray |
	iter := self ___new___.
	itemsArray := list ___new___.
	aDict @env0:keysAndValuesDo: [:key :value |
		| pair |
		pair := tuple @env0:with: key with: value.
		itemsArray append: pair
	].
	iter ___dict: aDict.
	iter ___items: itemsArray.
	iter ___position: 0.
	iter ___startVersion: ((aDict @env0:respondsTo: #'___version___')
		ifTrue: [aDict @env0:___version___] ifFalse: [nil]).
	^ iter

]

{ #category : 'Grail-Instance Creation' }
dict_itemiterator class >> _new_from: aDict _: pos [
	"Reconstruct a dict_itemiterator over aDict, resuming after `pos' consumed
	items.  Used by the pickle round-trip (see pickle.py's iterator tags): the
	items snapshot is re-derived from aDict (insertion order is stable) and the
	mutation-guard version re-baselined, so only (dict, position) round-trips.
	A single-underscore (Python-visible) name so pickle.py can call it."

	| iter |
	iter := self ___on: aDict.
	iter ___position: pos.
	^ iter

]

{ #category : 'Grail-Internal' }
dict_itemiterator >> ___dict: aDict [
	"Set the dictionary being iterated over"
	dict := aDict

]

{ #category : 'Grail-Internal' }
dict_itemiterator >> ___items: itemsArray [
	"Set the items array (snapshot of items at iterator creation)"
	items := itemsArray

]

{ #category : 'Grail-Internal' }
dict_itemiterator >> ___position: anInteger [
	"Set the current position in the iteration"
	position := anInteger

]

{ #category : 'Grail-Internal' }
dict_itemiterator >> ___startVersion: anIntegerOrNil [
	"Snapshot of the dict's structural-mutation version at creation (nil for
	a non-PyDict dict that has no version counter)."
	startVersion := anIntegerOrNil

]

{ #category : 'Grail-Type' }
dict_itemiterator >> __class__ [
	"Return the Python type for dict_itemiterator"
	^ dict_itemiterator

]

{ #category : 'Grail-Iterator Protocol' }
dict_itemiterator >> __iter__ [
	"Return self (iterators are their own iterators)"
	^ self

]

{ #category : 'Grail-Iterator Protocol' }
dict_itemiterator >> __length_hint__ [
	"Items not yet produced -- CPython's dictiter_len; see
	dict_keyiterator>>__length_hint__ for why a size change zeroes it
	permanently and why the same-size version guard is not consulted."

	((dict @env0:size) @env0:= (items @env0:size)) ifFalse: [^ 0].
	^ ((items @env0:size) @env0:- position) @env0:max: 0

]

{ #category : 'Grail-Iterator Protocol' }
dict_itemiterator >> __next__ [
	"Return the next (key, value) pair from the dictionary"

	| size nextItem |
	((dict @env0:size) @env0:= (items @env0:size)) ifFalse: [
		RuntimeError ___signal___: 'dictionary changed size during iteration'].
	(startVersion @env0:notNil @env0:and: [((dict @env0:___version___) @env0:= startVersion) @env0:not]) ifTrue: [
		RuntimeError ___signal___: 'dictionary changed size during iteration'].
	size := items @env0:size.
	position := position @env0:+ 1.
	
	(position @env0:> size) ifTrue: [
		StopIteration @env0:signal
	].
	
	nextItem := items @env0:at: position.
	^ nextItem

]

{ #category : 'Grail-Internal' }
dict_itemiterator >> _getstate [
	"Answer (dict, position) for pickling -- see pickle.py's iterator tags.
	A single-underscore (Python-visible) name so pickle.py can call it."

	^ tuple @env0:withAll: { dict. position }

]
