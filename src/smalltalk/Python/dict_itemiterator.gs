! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- dict_itemiterator class (Python 'dict_itemiterator' type)
expectvalue /Class
doit
iterator subclass: 'dict_itemiterator'
  instVarNames: #( dict items position startVersion)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
dict_itemiterator comment:
'Python dict_itemiterator type.

An iterator over dictionary items (key-value pairs). Created by calling iter() on dict.items().

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  items - array of (key, value) tuples from the dict (snapshot at creation)
  position - current position (0-based index)
'
%

expectvalue /Class
doit
dict_itemiterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! dict_itemiterator - Iterator for dictionary items (key-value pairs)
! ===============================================================================

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
dict_itemiterator removeAllMethods: 1.
dict_itemiterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: dict_itemiterator
___on: aDict
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
%

category: 'Grail-Internal'
method: dict_itemiterator
___dict: aDict
	"Set the dictionary being iterated over"
	dict := aDict
%

category: 'Grail-Internal'
method: dict_itemiterator
___items: itemsArray
	"Set the items array (snapshot of items at iterator creation)"
	items := itemsArray
%

category: 'Grail-Internal'
method: dict_itemiterator
___position: anInteger
	"Set the current position in the iteration"
	position := anInteger
%

category: 'Grail-Internal'
method: dict_itemiterator
___startVersion: anIntegerOrNil
	"Snapshot of the dict's structural-mutation version at creation (nil for
	a non-PyDict dict that has no version counter)."
	startVersion := anIntegerOrNil
%

category: 'Grail-Type'
method: dict_itemiterator
__class__
	"Return the Python type for dict_itemiterator"
	^ dict_itemiterator
%

category: 'Grail-Iterator Protocol'
method: dict_itemiterator
__iter__
	"Return self (iterators are their own iterators)"
	^ self
%

category: 'Grail-Iterator Protocol'
method: dict_itemiterator
__next__
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
%

category: 'Grail-Instance Creation'
classmethod: dict_itemiterator
_new_from: aDict _: pos
	"Reconstruct a dict_itemiterator over aDict, resuming after `pos' consumed
	items.  Used by the pickle round-trip (see pickle.py's iterator tags): the
	items snapshot is re-derived from aDict (insertion order is stable) and the
	mutation-guard version re-baselined, so only (dict, position) round-trips.
	A single-underscore (Python-visible) name so pickle.py can call it."

	| iter |
	iter := self ___on: aDict.
	iter ___position: pos.
	^ iter
%

category: 'Grail-Internal'
method: dict_itemiterator
_getstate
	"Answer (dict, position) for pickling -- see pickle.py's iterator tags.
	A single-underscore (Python-visible) name so pickle.py can call it."

	^ tuple @env0:withAll: { dict. position }
%

set compile_env: 0
