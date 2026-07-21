! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- list_iterator class (Python 'list_iterator' type)
expectvalue /Class
doit
iterator subclass: 'list_iterator'
  instVarNames: #( collection position reverse exhausted)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
list_iterator comment:
'Python list_iterator type.

An iterator over a list (OrderedCollection). Created by calling iter() on a list.

Instance variables:
  collection - the list being iterated over
  position - current position (0-based Python index)
'
%

expectvalue /Class
doit
list_iterator category: 'Grail-Collections-Iterators'
%

! ===============================================================================
! List Iterator Methods (Python 'list_iterator' type)
! ===============================================================================
! This file contains method implementations for the list_iterator class.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from list_iterator
expectvalue /Metaclass3
doit
list_iterator removeAllMethods: 1.
list_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: list_iterator
___on: aCollection
	"Create a FORWARD list_iterator over the collection (position 0)."

	^ self _new_from: aCollection _: 0 _: false _: false
%

category: 'Grail-Instance Creation'
classmethod: list_iterator
___onReverse: aCollection
	"Create a REVERSE list_iterator over the collection, sharing it (so a
	later mutation of the list is reflected, matching CPython's
	list_reverseiterator).  Position starts at the last index."

	^ self _new_from: aCollection _: (aCollection @env0:size @env0:- 1)
		_: true _: (aCollection @env0:size @env0:= 0)
%

category: 'Grail-Instance Creation'
classmethod: list_iterator
_new_from: aCollection _: pos _: rev _: exh
	"Reconstruct a list_iterator with an explicit state (used by iter()/
	reversed() and by pickle round-trip -- see pickle.py's iterator tags)."

	| instance |
	instance := self ___new___.
	instance ___setState: aCollection _: pos _: rev _: exh.
	^ instance
%

category: 'Grail-Private'
method: list_iterator
___setState: aCollection _: pos _: rev _: exh
	"Set the full iterator state (collection, 0-based next index, reverse
	flag, exhausted flag)."

	collection := aCollection.
	position := pos.
	reverse := rev.
	exhausted := exh
%

category: 'Grail-Private'
method: list_iterator
_getstate
	"Answer this iterator's state as a tuple (collection, position, reverse,
	exhausted) for pickling -- see pickle.py's iterator tags.  A plain
	Python-visible method (no ``___'' prefix) so pickle.py can call it."

	^ tuple @env0:withAll: { collection. position. reverse. exhausted }
%

category: 'Grail-Iterator Protocol'
method: list_iterator
__length_hint__
	"Count of items not yet produced (operator.length_hint presizes with
	it).  Forward: collection size - position; reverse: position + 1.
	Zero for a spent iterator."

	exhausted ifTrue: [^ 0].
	reverse ifTrue: [^ (position @env0:+ 1) @env0:max: 0].
	^ (collection @env0:size @env0:- position) @env0:max: 0
%

category: 'Grail-Iterator Protocol'
method: list_iterator
__next__
	"Return the next item; StopIteration at the end.  A list_iterator LATCHES
	exhaustion via a flag (NOT by dropping the collection, which pickling
	needs): once spent it stays spent, so appending to the list afterwards
	does not revive it (list_tests test_exhausted_iterator,
	test_tier2_invalidates_iterator).  Reverse iteration walks the shared
	collection from the last index down (list_reverseiterator)."

	| item |
	exhausted ifTrue: [StopIteration @env0:signal].
	reverse
		ifTrue: [
			(position @env0:< 0) ifTrue: [exhausted := true. StopIteration @env0:signal].
			item := collection @env0:at: (position @env0:+ 1).
			position := position @env0:- 1.
			^ item]
		ifFalse: [
			(position @env0:>= (collection @env0:size)) ifTrue: [
				exhausted := true. StopIteration @env0:signal].
			item := collection @env0:at: (position @env0:+ 1).
			position := position @env0:+ 1.
			^ item]
%

set compile_env: 0
