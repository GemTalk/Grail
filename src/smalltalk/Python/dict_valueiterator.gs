! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- dict_valueiterator class (Python 'dict_valueiterator' type)
expectvalue /Class
doit
iterator subclass: 'dict_valueiterator'
  instVarNames: #( dict values position startVersion)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
dict_valueiterator comment:
'Python dict_valueiterator type.

An iterator over dictionary values. Created by calling iter() on dict.values().

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  values - array of values from the dict (snapshot at creation)
  position - current position (0-based index)
'
%

expectvalue /Class
doit
dict_valueiterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! dict_valueiterator - Iterator for dictionary values
! ===============================================================================

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
dict_valueiterator removeAllMethods: 1.
dict_valueiterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: dict_valueiterator
___on: aDict
	"Create a new dict_valueiterator for the given dictionary"

	| iter valuesArray |
	iter := self ___new___.
	valuesArray := list ___new___.
	aDict @env0:valuesDo: [:value |
		valuesArray append: value
	].
	iter ___dict: aDict.
	iter ___values: valuesArray.
	iter ___position: 0.
	iter ___startVersion: ((aDict @env0:respondsTo: #'___version___')
		ifTrue: [aDict @env0:___version___] ifFalse: [nil]).
	^ iter
%

category: 'Grail-Internal'
method: dict_valueiterator
___dict: aDict
	"Set the dictionary being iterated over"
	dict := aDict
%

category: 'Grail-Internal'
method: dict_valueiterator
___position: anInteger
	"Set the current position in the iteration"
	position := anInteger
%

category: 'Grail-Internal'
method: dict_valueiterator
___startVersion: anIntegerOrNil
	"Snapshot of the dict's structural-mutation version at creation (nil for
	a non-PyDict dict that has no version counter)."
	startVersion := anIntegerOrNil
%

category: 'Grail-Internal'
method: dict_valueiterator
___values: valuesArray
	"Set the values array (snapshot of values at iterator creation)"
	values := valuesArray
%

category: 'Grail-Type'
method: dict_valueiterator
__class__
	"Return the Python type for dict_valueiterator"
	^ dict_valueiterator
%

category: 'Grail-Iterator Protocol'
method: dict_valueiterator
__iter__
	"Return self (iterators are their own iterators)"
	^ self
%

category: 'Grail-Iterator Protocol'
method: dict_valueiterator
__next__
	"Return the next value from the dictionary"

	| size nextValue |
	((dict @env0:size) @env0:= (values @env0:size)) ifFalse: [
		RuntimeError ___signal___: 'dictionary changed size during iteration'].
	(startVersion @env0:notNil @env0:and: [((dict @env0:___version___) @env0:= startVersion) @env0:not]) ifTrue: [
		RuntimeError ___signal___: 'dictionary changed size during iteration'].
	size := values @env0:size.
	position := position @env0:+ 1.
	
	(position @env0:> size) ifTrue: [
		StopIteration @env0:signal
	].
	
	nextValue := values @env0:at: position.
	^ nextValue
%

category: 'Grail-Instance Creation'
classmethod: dict_valueiterator
_new_from: aDict _: pos
	"Reconstruct a dict_valueiterator over aDict, resuming after `pos' consumed
	values.  Used by the pickle round-trip (see pickle.py's iterator tags): the
	values snapshot is re-derived from aDict (insertion order is stable) and the
	mutation-guard version re-baselined, so only (dict, position) round-trips.
	A single-underscore (Python-visible) name so pickle.py can call it."

	| iter |
	iter := self ___on: aDict.
	iter ___position: pos.
	^ iter
%

category: 'Grail-Internal'
method: dict_valueiterator
_getstate
	"Answer (dict, position) for pickling -- see pickle.py's iterator tags.
	A single-underscore (Python-visible) name so pickle.py can call it."

	^ tuple @env0:withAll: { dict. position }
%

set compile_env: 0
