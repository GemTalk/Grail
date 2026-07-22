! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- dict_keyiterator class (Python 'dict_keyiterator' type)
expectvalue /Class
doit
iterator subclass: 'dict_keyiterator'
  instVarNames: #( dict keys position startVersion)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
dict_keyiterator comment:
'Python dict_keyiterator type.

An iterator over dictionary keys. Created by calling iter() on a dict.

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  keys - array of keys from the dict (snapshot at creation)
  position - current position (0-based index)
'
%

expectvalue /Class
doit
dict_keyiterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! dict_keyiterator - Iterator for dictionary keys
! ===============================================================================

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
dict_keyiterator removeAllMethods: 1.
dict_keyiterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: dict_keyiterator
___on: aDict
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
%

category: 'Grail-Internal'
method: dict_keyiterator
___dict: aDict
	"Set the dictionary being iterated over"
	dict := aDict
%

category: 'Grail-Internal'
method: dict_keyiterator
___keys: keysArray
	"Set the keys array (snapshot of keys at iterator creation)"
	keys := keysArray
%

category: 'Grail-Internal'
method: dict_keyiterator
___position: anInteger
	"Set the current position in the iteration"
	position := anInteger
%

category: 'Grail-Internal'
method: dict_keyiterator
___startVersion: anIntegerOrNil
	"Snapshot of the dict's structural-mutation version at creation (nil for
	a non-PyDict dict that has no version counter)."
	startVersion := anIntegerOrNil
%

category: 'Grail-Type'
method: dict_keyiterator
__class__
	"Return the Python type for dict_keyiterator"
	^ dict_keyiterator
%

category: 'Grail-Iterator Protocol'
method: dict_keyiterator
__iter__
	"Return self (iterators are their own iterators)"
	^ self
%

category: 'Grail-Iterator Protocol'
method: dict_keyiterator
__next__
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
%

category: 'Grail-Instance Creation'
classmethod: dict_keyiterator
_new_from: aDict _: pos
	"Reconstruct a dict_keyiterator over aDict, resuming after `pos' consumed
	keys.  Used by the pickle round-trip (see pickle.py's iterator tags): the
	keys snapshot is re-derived from aDict (insertion order is stable) and the
	mutation-guard version re-baselined, so only (dict, position) round-trips.
	A single-underscore (Python-visible) name so pickle.py can call it."

	| iter |
	iter := self ___on: aDict.
	iter ___position: pos.
	^ iter
%

category: 'Grail-Internal'
method: dict_keyiterator
_getstate
	"Answer (dict, position) for pickling -- see pickle.py's iterator tags.
	A single-underscore (Python-visible) name so pickle.py can call it."

	^ tuple @env0:withAll: { dict. position }
%

set compile_env: 0
