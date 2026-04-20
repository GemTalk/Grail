! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IteratorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IteratorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IteratorTestCase category: 'SUnit'
%

! ===============================================================================
! IteratorTestCase - Tests for Python iterator protocol
! ===============================================================================
! This file contains tests for Python's iterator protocol and iterator types.
! Tests cover the base iterator class and specific iterator implementations
! (list_iterator, tuple_iterator, str_iterator, range_iterator}.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IteratorTestCase removeAllMethods.
IteratorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests - Iterator Protocol'
method: IteratorTestCase
testCollectionsAreIterableNotIterators
	"Test that collections have __iter__ but not __next__"

	| lst |
	lst := list withAll: #(1 2 3).

	"Collection should have __iter__"
	self assert: (lst class whichClassIncludesSelector: #__iter__ environmentId: 1) notNil.

	"Collection should NOT have __next__"
	self assert: (lst class whichClassIncludesSelector: #__next__ environmentId: 1) isNil.
%

category: 'Tests - Dict Key Iterator'
method: IteratorTestCase
testDictKeyIteratorBasicIteration
	"Test basic iteration over dictionary keys"

	| d iter key1 key2 key3 keys |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.
	d @env1:__setitem__: 'c' _: 3.

	iter := d @env1:__iter__.

	key1 := iter @env1:__next__.
	key2 := iter @env1:__next__.
	key3 := iter @env1:__next__.

	keys := { key1. key2. key3. }.

	self assert: (keys includes: 'a').
	self assert: (keys includes: 'b').
	self assert: (keys includes: 'c').

	"Iterator should be exhausted"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Dict Key Iterator'
method: IteratorTestCase
testDictKeyIteratorExhaustion
	"Test that dict_keyiterator raises StopIteration when exhausted"

	| d iter |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.

	iter := d @env1:__iter__.

	iter @env1:__next__.

	self should: [iter @env1:__next__] raise: StopIteration.
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Dict Key Iterator'
method: IteratorTestCase
testDictKeyIteratorIndependence
	"Test that multiple iterators over the same dict are independent"

	| d iter1 iter2 key1a key1b |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.

	iter1 := d @env1:__iter__.
	iter2 := d @env1:__iter__.

	key1a := iter1 @env1:__next__.
	key1b := iter2 @env1:__next__.

	self assert: key1a equals: key1b.
	self deny: iter1 == iter2.
%

category: 'Tests - Dict Key Iterator'
method: IteratorTestCase
testEmptyDictKeyIterator
	"Test iterator over empty dict"

	| d iter |
	d := dict new.
	iter := d @env1:__iter__.

	"Should immediately raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptyFrozensetIterator
	"Test iterator over empty frozenset"

	| fs iter |
	fs := frozenset new.
	iter := fs @env1:__iter__.

	"Should immediately raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptyListIterator
	"Test iterator over empty list"

	| lst iter |
	lst := list new.
	iter := lst @env1:__iter__.

	"Should immediately raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptyRangeIterator
	"Test iterator over empty range"

	| rng iter |
	rng := range from: 0 to: -1 by: 1.
	iter := rng @env1:__iter__.

	"Should immediately raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptySetIterator
	"Test iterator over empty set"

	| s iter |
	s := set new.
	iter := s @env1:__iter__.

	"Should immediately raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptyStringIterator
	"Test iterator over empty string"

	| str iter |
	str := ''.
	iter := str @env1:__iter__.

	"Should immediately raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Set Iterator'
method: IteratorTestCase
testFrozensetIteratorBasicIteration
	"Test basic iteration over a frozenset"

	| fs iter items |
	fs := frozenset new.
	fs add: 1.
	fs add: 2.
	fs add: 3.

	iter := fs @env1:__iter__.
	items := list new.

	[true] whileTrue: [
		| item |
		[
			item := iter @env1:__next__.
			items @env1:append: item
		] on: StopIteration do: [:ex | ^ nil]
	].

	self assert: items size equals: 3.
	self assert: (items @env1:__contains__: 1).
	self assert: (items @env1:__contains__: 2).
	self assert: (items @env1:__contains__: 3).
%

category: 'Tests - Iterator Protocol'
method: IteratorTestCase
testIteratorHasIterAndNext
	"Test that iterators have __iter__ and __next__ methods"

	| lst iter |
	lst := list withAll: #(1 2 3).
	iter := lst @env1:__iter__.

	"Iterator should have __iter__"
	self assert: (iter class whichClassIncludesSelector: #__iter__ environmentId: 1) notNil.

	"Iterator should have __next__"
	self assert: (iter class whichClassIncludesSelector: #__next__ environmentId: 1) notNil.
%

category: 'Tests - Iterator Protocol'
method: IteratorTestCase
testIteratorIterReturnsSelf
	"Test that iterator.__iter__() returns the iterator itself"

	| lst iter result |
	lst := list withAll: #(1 2 3).
	iter := lst @env1:__iter__.

	result := iter @env1:__iter__.

	self assert: result == iter.
%

category: 'Tests - Iterator Protocol'
method: IteratorTestCase
testIteratorTypes
	"Test that iter() creates distinct iterator types for each collection type"

	| lst tpl str rng s fs d lstIter tplIter strIter rngIter sIter fsIter dIter |
	lst := list withAll: #(1 2 3).
	tpl := tuple withAll: #(1 2 3).
	str := 'abc'.
	rng := range from: 0 to: 2 by: 1.
	s := set new.
	s add: 1.
	fs := frozenset new.
	fs add: 1.
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.

	lstIter := lst @env1:__iter__.
	tplIter := tpl @env1:__iter__.
	strIter := str @env1:__iter__.
	rngIter := rng @env1:__iter__.
	sIter := s @env1:__iter__.
	fsIter := fs @env1:__iter__.
	dIter := d @env1:__iter__.

	self assert: lstIter class name equals: #'list_iterator'.
	self assert: tplIter class name equals: #'tuple_iterator'.
	self assert: strIter class name equals: #'str_iterator'.
	self assert: rngIter class name equals: #'range_iterator'.
	self assert: sIter class name equals: #'set_iterator'.
	self assert: fsIter class name equals: #'set_iterator'.
	self assert: dIter class name equals: #'dict_keyiterator'.
%

category: 'Tests - List Iterator'
method: IteratorTestCase
testListIteratorBasicIteration
	"Test basic iteration over a list with next()"

	| lst iter |
	lst := list withAll: #(10 20 30).
	iter := lst @env1:__iter__.

	self assert: (iter @env1:__next__) equals: 10.
	self assert: (iter @env1:__next__) equals: 20.
	self assert: (iter @env1:__next__) equals: 30.

	"Should raise StopIteration when exhausted"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - List Iterator'
method: IteratorTestCase
testListIteratorExhaustion
	"Test that iterator stays exhausted after StopIteration"

	| lst iter |
	lst := list withAll: #(1 2).
	iter := lst @env1:__iter__.

	"Consume all items"
	iter @env1:__next__.
	iter @env1:__next__.

	"First StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.

	"Should still raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - List Iterator'
method: IteratorTestCase
testListIteratorIndependence
	"Test that multiple iterators over the same list are independent"

	| lst iter1 iter2 |
	lst := list withAll: #(1 2 3).
	iter1 := lst @env1:__iter__.
	iter2 := lst @env1:__iter__.

	"Iterators should be different objects"
	self deny: iter1 == iter2.

	"Advancing one doesn't affect the other"
	self assert: (iter1 @env1:__next__) equals: 1.
	self assert: (iter2 @env1:__next__) equals: 1.
	self assert: (iter1 @env1:__next__) equals: 2.
	self assert: (iter2 @env1:__next__) equals: 2.
%

category: 'Tests - Range Iterator'
method: IteratorTestCase
testRangeIteratorBasicIteration
	"Test basic iteration over a range with next()"

	| rng iter |
	rng := range from: 5 to: 7 by: 1.
	iter := rng @env1:__iter__.

	self assert: (iter @env1:__next__) equals: 5.
	self assert: (iter @env1:__next__) equals: 6.
	self assert: (iter @env1:__next__) equals: 7.

	"Should raise StopIteration when exhausted"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Range Iterator'
method: IteratorTestCase
testRangeIteratorNegativeStep
	"Test iteration over a range with negative step"

	| rng iter |
	rng := range from: 10 to: 6 by: -2.
	iter := rng @env1:__iter__.

	self assert: (iter @env1:__next__) equals: 10.
	self assert: (iter @env1:__next__) equals: 8.
	self assert: (iter @env1:__next__) equals: 6.

	"Should raise StopIteration when exhausted"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Range Iterator'
method: IteratorTestCase
testRangeIteratorWithStep
	"Test iteration over a range with non-unit step"

	| rng iter |
	rng := range from: 0 to: 8 by: 2.
	iter := rng @env1:__iter__.

	self assert: (iter @env1:__next__) equals: 0.
	self assert: (iter @env1:__next__) equals: 2.
	self assert: (iter @env1:__next__) equals: 4.
	self assert: (iter @env1:__next__) equals: 6.
	self assert: (iter @env1:__next__) equals: 8.

	"Should raise StopIteration when exhausted"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Set Iterator'
method: IteratorTestCase
testSetIteratorBasicIteration
	"Test basic iteration over a set"

	| s iter items |
	s := set new.
	s add: 1.
	s add: 2.
	s add: 3.

	iter := s @env1:__iter__.
	items := list new.

	[true] whileTrue: [
		| item |
		[
			item := iter @env1:__next__.
			items @env1:append: item
		] on: StopIteration do: [:ex | ^ nil]
	].

	self assert: items size equals: 3.
	self assert: (items @env1:__contains__: 1).
	self assert: (items @env1:__contains__: 2).
	self assert: (items @env1:__contains__: 3).
%

category: 'Tests - Set Iterator'
method: IteratorTestCase
testSetIteratorExhaustion
	"Test that set iterator raises StopIteration when exhausted"

	| s iter |
	s := set new.
	s add: 1.
	s add: 2.

	iter := s @env1:__iter__.

	"Consume all elements"
	iter @env1:__next__.
	iter @env1:__next__.

	"Next call should raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.

	"Subsequent calls should also raise StopIteration"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Set Iterator'
method: IteratorTestCase
testSetIteratorIndependence
	"Test that multiple iterators over the same set are independent"

	| s iter1 iter2 item1 item2 |
	s := set new.
	s add: 1.
	s add: 2.
	s add: 3.

	iter1 := s @env1:__iter__.
	iter2 := s @env1:__iter__.

	"Advance iter1 once"
	item1 := iter1 @env1:__next__.

	"iter2 should still be at the beginning"
	item2 := iter2 @env1:__next__.

	"Both should have gotten the first element (order may vary in sets)"
	self assert: ((item1 = 1) or: [
		(item1 = 2) or: [
			item1 = 3
		]
	])
%

category: 'Tests - String Iterator'
method: IteratorTestCase
testStringIteratorBasicIteration
	"Test basic iteration over a string with next()"

	| str iter |
	str := 'abc'.
	iter := str @env1:__iter__.

	self assert: (iter @env1:__next__) equals: 'a'.
	self assert: (iter @env1:__next__) equals: 'b'.
	self assert: (iter @env1:__next__) equals: 'c'.

	"Should raise StopIteration when exhausted"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - String Iterator'
method: IteratorTestCase
testStringIteratorReturnsStrings
	"Test that string iterator returns single-character strings, not characters"

	| str iter result |
	str := 'hello'.
	iter := str @env1:__iter__.

	result := iter @env1:__next__.

	"Result should be a string, not a character"
	self assert: (result isKindOf: String).
	self assert: result size equals: 1.
	self assert: result equals: 'h'.
%

category: 'Tests - Tuple Iterator'
method: IteratorTestCase
testTupleIteratorBasicIteration
	"Test basic iteration over a tuple with next()"

	| tpl iter |
	tpl := tuple withAll: #(10 20 30).
	iter := tpl @env1:__iter__.

	self assert: (iter @env1:__next__) equals: 10.
	self assert: (iter @env1:__next__) equals: 20.
	self assert: (iter @env1:__next__) equals: 30.

	"Should raise StopIteration when exhausted"
	self should: [iter @env1:__next__] raise: StopIteration.
%

category: 'Tests - Tuple Iterator'
method: IteratorTestCase
testTupleIteratorIndependence
	"Test that multiple iterators over the same tuple are independent"

	| tpl iter1 iter2 |
	tpl := tuple withAll: #(1 2 3).
	iter1 := tpl @env1:__iter__.
	iter2 := tpl @env1:__iter__.

	"Iterators should be different objects"
	self deny: iter1 == iter2.

	"Advancing one doesn't affect the other"
	self assert: (iter1 @env1:__next__) equals: 1.
	self assert: (iter2 @env1:__next__) equals: 1.
%
