Extension { #name : 'dict_keyiterator' }

{ #category : 'Grail-Instance Creation' }
dict_keyiterator class >> ___on: aDict [
	"Create a new dict_keyiterator for the given dictionary"

	| iter keysArray |
	iter := self ___new___.
	keysArray := list ___new___.
	aDict @env0:keysDo: [:key |
		keysArray append: key
	].
	iter ___dict: aDict.
	iter ___keys: keysArray.
	iter ___position: 0.
	iter ___startVersion: ((aDict @env0:respondsTo: #'___version___')
		ifTrue: [aDict @env0:___version___] ifFalse: [nil]).
	^ iter

]

{ #category : 'Grail-Instance Creation' }
dict_keyiterator class >> _new_from: aDict _: pos [
	"Reconstruct a dict_keyiterator over aDict, resuming after `pos' consumed
	keys.  Used by the pickle round-trip (see pickle.py's iterator tags): the
	keys snapshot is re-derived from aDict (insertion order is stable) and the
	mutation-guard version re-baselined, so only (dict, position) round-trips.
	A single-underscore (Python-visible) name so pickle.py can call it."

	| iter |
	iter := self ___on: aDict.
	iter ___position: pos.
	^ iter

]

{ #category : 'Grail-Internal' }
dict_keyiterator >> ___dict: aDict [
	"Set the dictionary being iterated over"
	dict := aDict

]

{ #category : 'Grail-Internal' }
dict_keyiterator >> ___keys: keysArray [
	"Set the keys array (snapshot of keys at iterator creation)"
	keys := keysArray

]

{ #category : 'Grail-Internal' }
dict_keyiterator >> ___position: anInteger [
	"Set the current position in the iteration"
	position := anInteger

]

{ #category : 'Grail-Internal' }
dict_keyiterator >> ___startVersion: anIntegerOrNil [
	"Snapshot of the dict's structural-mutation version at creation (nil for
	a non-PyDict dict that has no version counter)."
	startVersion := anIntegerOrNil

]

{ #category : 'Grail-Type' }
dict_keyiterator >> __class__ [
	"Return the Python type for dict_keyiterator"
	^ dict_keyiterator

]

{ #category : 'Grail-Iterator Protocol' }
dict_keyiterator >> __iter__ [
	"Return self (iterators are their own iterators)"
	^ self

]

{ #category : 'Grail-Iterator Protocol' }
dict_keyiterator >> __length_hint__ [
	"Keys not yet produced -- CPython's dictiter_len.  ZERO once the dict's
	SIZE has changed, permanently: __next__ raises RuntimeError from then on,
	so the iteration can never be completed and reporting a remaining count
	would break the len(it) == len(list(it)) invariant (test_iterlen
	TestDictKeys test_immutable_during_iteration).

	CPython compares SIZES only (di_used vs ma_used), so the same-size version
	guard __next__ also applies is deliberately NOT consulted here: a
	``del d[k]; d[k] = v'' still raises from __next__ but keeps reporting a
	count, and matching CPython is the point."

	((dict @env0:size) @env0:= (keys @env0:size)) ifFalse: [^ 0].
	^ ((keys @env0:size) @env0:- position) @env0:max: 0

]

{ #category : 'Grail-Iterator Protocol' }
dict_keyiterator >> __next__ [
	"Return the next key from the dictionary"

	| size nextKey |
	"CPython raises RuntimeError if the dict is structurally changed
	mid-iteration.  Two guards: (1) a live-size divergence from the fixed
	`keys' snapshot catches net grow/shrink on ANY dict; (2) a version-tag
	divergence catches a PyDict ``del d[k]; d[k]=v'' that leaves size
	unchanged (test_mutating_iteration_delete)."
	((dict @env0:size) @env0:= (keys @env0:size)) ifFalse: [
		RuntimeError ___signal___: 'dictionary changed size during iteration'].
	(startVersion @env0:notNil @env0:and: [((dict @env0:___version___) @env0:= startVersion) @env0:not]) ifTrue: [
		RuntimeError ___signal___: 'dictionary changed size during iteration'].
	size := keys @env0:size.
	position := position @env0:+ 1.
	
	(position @env0:> size) ifTrue: [
		StopIteration @env0:signal
	].
	
	nextKey := keys @env0:at: position.
	^ nextKey

]

{ #category : 'Grail-Internal' }
dict_keyiterator >> _getstate [
	"Answer (dict, position) for pickling -- see pickle.py's iterator tags.
	A single-underscore (Python-visible) name so pickle.py can call it."

	^ tuple @env0:withAll: { dict. position }

]
