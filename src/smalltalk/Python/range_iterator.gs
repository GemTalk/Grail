! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- range_iterator class (Python 'range_iterator' type)
expectvalue /Class
doit
iterator subclass: 'range_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
range_iterator comment:
'Python range_iterator type.

An iterator over a range (Interval). Created by calling iter() on a range.

Instance variables:
  collection - the range being iterated over
  position - current position (0-based Python index)
'
%

expectvalue /Class
doit
range_iterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! Range Iterator Methods (Python 'range_iterator' type)
! ===============================================================================
! This file contains method implementations for the range_iterator class.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from range_iterator
expectvalue /Metaclass3
doit
range_iterator removeAllMethods: 1.
range_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: range_iterator
___on: aCollection
	"Create a new range_iterator for the given range (Interval).
	This is a Grail-internal method (triple underscore).
	Position starts at 0 (Python 0-based indexing)."

	| instance |
	instance := self ___new___.
	instance ___collection: aCollection.
	instance ___position: 0.
	^ instance
%

category: 'Grail-Private'
method: range_iterator
___collection: aCollection
	"Set the collection being iterated over.
	This is a Grail-internal method (triple underscore)."

	collection := aCollection
%

category: 'Grail-Private'
method: range_iterator
___position: anInteger
	"Set the current position.
	This is a Grail-internal method (triple underscore)."

	position := anInteger
%

category: 'Grail-Iterator Protocol'
method: range_iterator
__next__
	"Return the next item from the range.
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
%

category: 'Grail-Iterator Protocol'
method: range_iterator
__length_hint__
	"Items not yet produced -- CPython's rangeiter_len.  operator.length_hint
	presizes with it, and the invariant it must satisfy is
	len(it) == len(list(it)), so the hint has to DECREASE with every __next__.
	len() on the underlying range is NOT the same thing: it stays at the
	original size forever (test_iterlen TestXrange/TestList test_invariant
	reported 0 here, because with no __length_hint__ at all
	operator.length_hint fell through to its default)."

	^ (collection @env0:size @env0:- position) @env0:max: 0
%

category: 'Grail-Pickle Protocol'
method: range_iterator
_getstate
	"Answer (start, stop, step, position) for pickling -- see pickle.py's
	range-iterator ``G'' tag.  CPython's range_iterator __reduce__ is
	(iter, (range(start, stop, step),), index); the four Smalltalk Integers
	let pickle.py rebuild range(start, stop, step) and resume at `position'.
	A plain Python-visible method (no ___ prefix) so pickle.py can call it,
	the same convention as list_iterator/seq_iterator _getstate."

	^ tuple @env0:withAll: { collection start. collection stop. collection step. position }
%

category: 'Grail-Instance Creation'
classmethod: range_iterator
_new_from: aRange _: pos
	"Reconstruct a range_iterator over aRange resuming at position `pos' --
	the pickle round-trip (pickle.py's ``G'' tag).  `pos' may point at or past
	the end, in which case the next __next__ stops immediately (position >=
	size), matching CPython's spent-iterator __reduce__ == (iter, (range,), n)."

	| instance |
	instance := self ___new___.
	instance ___collection: aRange.
	instance ___position: pos.
	^ instance
%

set compile_env: 0
