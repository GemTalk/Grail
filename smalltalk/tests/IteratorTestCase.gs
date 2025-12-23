! ===============================================================================
! IteratorTestCase - Tests for Python iterator protocol
! ===============================================================================
! This file contains tests for Python's iterator protocol and iterator types.
! Tests cover the base iterator class and specific iterator implementations
! (list_iterator, tuple_iterator, str_iterator, range_iterator}.
! ===============================================================================

! ------------------- Remove existing Python methods from IteratorTestCase
expectvalue /Metaclass3
doit
IteratorTestCase removeAllMethods: 0.
%

set compile_env: 0

category: 'Tests - Iterator Protocol'
method: IteratorTestCase
testIteratorTypes
	"Test that iter() creates distinct iterator types for each collection type"

	| lst tpl str rng s fs d lstIter tplIter strIter rngIter sIter fsIter dIter |
	lst := list perform: #withAll: env: 0 withArguments: {#(1 2 3)}.
	tpl := tuple perform: #withAll: env: 0 withArguments: {#(1 2 3)}.
	str := 'abc'.
	rng := range from: 0 to: 2 by: 1.
	s := set perform: #new env: 0.
	s perform: #add: env: 2 withArguments: {1}.
	fs := frozenset perform: #new env: 0.
	fs perform: #add: env: 0 withArguments: {1}.
	d := dict perform: #new env: 0.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.

	lstIter := lst perform: #__iter__ env: 2.
	tplIter := tpl perform: #__iter__ env: 2.
	strIter := str perform: #__iter__ env: 2.
	rngIter := rng perform: #__iter__ env: 2.
	sIter := s perform: #__iter__ env: 2.
	fsIter := fs perform: #__iter__ env: 2.
	dIter := d perform: #__iter__ env: 2.

	self assert: lstIter class name equals: #'list_iterator'.
	self assert: tplIter class name equals: #'tuple_iterator'.
	self assert: strIter class name equals: #'str_iterator'.
	self assert: rngIter class name equals: #'range_iterator'.
	self assert: sIter class name equals: #'set_iterator'.
	self assert: fsIter class name equals: #'set_iterator'.
	self assert: dIter class name equals: #'dict_keyiterator'.
%

category: 'Tests - Iterator Protocol'
method: IteratorTestCase
testIteratorHasIterAndNext
	"Test that iterators have __iter__ and __next__ methods"

	| lst iter |
	lst := list perform: #withAll: env: 0 withArguments: {#(1 2 3)}.
	iter := lst perform: #__iter__ env: 2.

	"Iterator should have __iter__"
	self assert: (iter class whichClassIncludesSelector: #__iter__ environmentId: 2) notNil.

	"Iterator should have __next__"
	self assert: (iter class whichClassIncludesSelector: #__next__ environmentId: 2) notNil.
%

category: 'Tests - Iterator Protocol'
method: IteratorTestCase
testIteratorIterReturnsSelf
	"Test that iterator.__iter__() returns the iterator itself"

	| lst iter result |
	lst := list perform: #withAll: env: 0 withArguments: {#(1 2 3)}.
	iter := lst perform: #__iter__ env: 2.

	result := iter perform: #__iter__ env: 2.

	self assert: result == iter.
%

category: 'Tests - Iterator Protocol'
method: IteratorTestCase
testCollectionsAreIterableNotIterators
	"Test that collections have __iter__ but not __next__"

	| lst |
	lst := list perform: #withAll: env: 0 withArguments: {#(1 2 3)}.

	"Collection should have __iter__"
	self assert: (lst class whichClassIncludesSelector: #__iter__ environmentId: 2) notNil.

	"Collection should NOT have __next__"
	self assert: (lst class whichClassIncludesSelector: #__next__ environmentId: 2) isNil.
%

category: 'Tests - List Iterator'
method: IteratorTestCase
testListIteratorBasicIteration
	"Test basic iteration over a list with next()"

	| lst iter |
	lst := list perform: #withAll: env: 0 withArguments: {#(10 20 30)}.
	iter := lst perform: #__iter__ env: 2.

	self assert: (iter perform: #__next__ env: 2) equals: 10.
	self assert: (iter perform: #__next__ env: 2) equals: 20.
	self assert: (iter perform: #__next__ env: 2) equals: 30.

	"Should raise StopIteration when exhausted"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - List Iterator'
method: IteratorTestCase
testListIteratorIndependence
	"Test that multiple iterators over the same list are independent"

	| lst iter1 iter2 |
	lst := list perform: #withAll: env: 0 withArguments: {#(1 2 3)}.
	iter1 := lst perform: #__iter__ env: 2.
	iter2 := lst perform: #__iter__ env: 2.

	"Iterators should be different objects"
	self deny: iter1 == iter2.

	"Advancing one doesn't affect the other"
	self assert: (iter1 perform: #__next__ env: 2) equals: 1.
	self assert: (iter2 perform: #__next__ env: 2) equals: 1.
	self assert: (iter1 perform: #__next__ env: 2) equals: 2.
	self assert: (iter2 perform: #__next__ env: 2) equals: 2.
%

category: 'Tests - List Iterator'
method: IteratorTestCase
testListIteratorExhaustion
	"Test that iterator stays exhausted after StopIteration"

	| lst iter |
	lst := list perform: #withAll: env: 0 withArguments: {#(1 2)}.
	iter := lst perform: #__iter__ env: 2.

	"Consume all items"
	iter perform: #__next__ env: 2.
	iter perform: #__next__ env: 2.

	"First StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.

	"Should still raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Tuple Iterator'
method: IteratorTestCase
testTupleIteratorBasicIteration
	"Test basic iteration over a tuple with next()"

	| tpl iter |
	tpl := tuple perform: #withAll: env: 0 withArguments: {#(10 20 30)}.
	iter := tpl perform: #__iter__ env: 2.

	self assert: (iter perform: #__next__ env: 2) equals: 10.
	self assert: (iter perform: #__next__ env: 2) equals: 20.
	self assert: (iter perform: #__next__ env: 2) equals: 30.

	"Should raise StopIteration when exhausted"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Tuple Iterator'
method: IteratorTestCase
testTupleIteratorIndependence
	"Test that multiple iterators over the same tuple are independent"

	| tpl iter1 iter2 |
	tpl := tuple perform: #withAll: env: 0 withArguments: {#(1 2 3)}.
	iter1 := tpl perform: #__iter__ env: 2.
	iter2 := tpl perform: #__iter__ env: 2.

	"Iterators should be different objects"
	self deny: iter1 == iter2.

	"Advancing one doesn't affect the other"
	self assert: (iter1 perform: #__next__ env: 2) equals: 1.
	self assert: (iter2 perform: #__next__ env: 2) equals: 1.
%

category: 'Tests - String Iterator'
method: IteratorTestCase
testStringIteratorBasicIteration
	"Test basic iteration over a string with next()"

	| str iter |
	str := 'abc'.
	iter := str perform: #__iter__ env: 2.

	self assert: (iter perform: #__next__ env: 2) equals: 'a'.
	self assert: (iter perform: #__next__ env: 2) equals: 'b'.
	self assert: (iter perform: #__next__ env: 2) equals: 'c'.

	"Should raise StopIteration when exhausted"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - String Iterator'
method: IteratorTestCase
testStringIteratorReturnsStrings
	"Test that string iterator returns single-character strings, not characters"

	| str iter result |
	str := 'hello'.
	iter := str perform: #__iter__ env: 2.

	result := iter perform: #__next__ env: 2.

	"Result should be a string, not a character"
	self assert: result class name equals: #'String'.
	self assert: result size equals: 1.
	self assert: result equals: 'h'.
%

category: 'Tests - Range Iterator'
method: IteratorTestCase
testRangeIteratorBasicIteration
	"Test basic iteration over a range with next()"

	| rng iter |
	rng := range from: 5 to: 7 by: 1.
	iter := rng perform: #__iter__ env: 2.

	self assert: (iter perform: #__next__ env: 2) equals: 5.
	self assert: (iter perform: #__next__ env: 2) equals: 6.
	self assert: (iter perform: #__next__ env: 2) equals: 7.

	"Should raise StopIteration when exhausted"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Range Iterator'
method: IteratorTestCase
testRangeIteratorWithStep
	"Test iteration over a range with non-unit step"

	| rng iter |
	rng := range from: 0 to: 8 by: 2.
	iter := rng perform: #__iter__ env: 2.

	self assert: (iter perform: #__next__ env: 2) equals: 0.
	self assert: (iter perform: #__next__ env: 2) equals: 2.
	self assert: (iter perform: #__next__ env: 2) equals: 4.
	self assert: (iter perform: #__next__ env: 2) equals: 6.
	self assert: (iter perform: #__next__ env: 2) equals: 8.

	"Should raise StopIteration when exhausted"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Range Iterator'
method: IteratorTestCase
testRangeIteratorNegativeStep
	"Test iteration over a range with negative step"

	| rng iter |
	rng := range from: 10 to: 6 by: -2.
	iter := rng perform: #__iter__ env: 2.

	self assert: (iter perform: #__next__ env: 2) equals: 10.
	self assert: (iter perform: #__next__ env: 2) equals: 8.
	self assert: (iter perform: #__next__ env: 2) equals: 6.

	"Should raise StopIteration when exhausted"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptyListIterator
	"Test iterator over empty list"

	| lst iter |
	lst := list new.
	iter := lst perform: #__iter__ env: 2.

	"Should immediately raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptyStringIterator
	"Test iterator over empty string"

	| str iter |
	str := ''.
	iter := str perform: #__iter__ env: 2.

	"Should immediately raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptyRangeIterator
	"Test iterator over empty range"

	| rng iter |
	rng := range from: 0 to: -1 by: 1.
	iter := rng perform: #__iter__ env: 2.

	"Should immediately raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Set Iterator'
method: IteratorTestCase
testSetIteratorBasicIteration
	"Test basic iteration over a set"

	| s iter items |
	s := set perform: #new env: 0.
	s perform: #add: env: 2 withArguments: {1}.
	s perform: #add: env: 2 withArguments: {2}.
	s perform: #add: env: 2 withArguments: {3}.

	iter := s perform: #__iter__ env: 2.
	items := list perform: #new env: 0.

	[true] perform: #whileTrue: env: 0 withArguments: {[
		| item |
		[
			item := iter perform: #__next__ env: 2.
			items perform: #append: env: 2 withArguments: {item}
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ nil]}
	]}.

	self assert: (items perform: #__len__ env: 2) equals: 3.
	self assert: (items perform: #__contains__: env: 2 withArguments: {1}).
	self assert: (items perform: #__contains__: env: 2 withArguments: {2}).
	self assert: (items perform: #__contains__: env: 2 withArguments: {3}).
%

category: 'Tests - Set Iterator'
method: IteratorTestCase
testFrozensetIteratorBasicIteration
	"Test basic iteration over a frozenset"

	| fs iter items |
	fs := frozenset perform: #new env: 0.
	fs perform: #add: env: 0 withArguments: {1}.
	fs perform: #add: env: 0 withArguments: {2}.
	fs perform: #add: env: 0 withArguments: {3}.

	iter := fs perform: #__iter__ env: 2.
	items := list perform: #new env: 0.

	[true] perform: #whileTrue: env: 0 withArguments: {[
		| item |
		[
			item := iter perform: #__next__ env: 2.
			items perform: #append: env: 2 withArguments: {item}
		] perform: #on:do: env: 0 withArguments: {StopIteration. [:ex | ^ nil]}
	]}.

	self assert: (items perform: #__len__ env: 2) equals: 3.
	self assert: (items perform: #__contains__: env: 2 withArguments: {1}).
	self assert: (items perform: #__contains__: env: 2 withArguments: {2}).
	self assert: (items perform: #__contains__: env: 2 withArguments: {3}).
%

category: 'Tests - Set Iterator'
method: IteratorTestCase
testSetIteratorIndependence
	"Test that multiple iterators over the same set are independent"

	| s iter1 iter2 item1 item2 |
	s := set perform: #new env: 0.
	s perform: #add: env: 2 withArguments: {1}.
	s perform: #add: env: 2 withArguments: {2}.
	s perform: #add: env: 2 withArguments: {3}.

	iter1 := s perform: #__iter__ env: 2.
	iter2 := s perform: #__iter__ env: 2.

	"Advance iter1 once"
	item1 := iter1 perform: #__next__ env: 2.

	"iter2 should still be at the beginning"
	item2 := iter2 perform: #__next__ env: 2.

	"Both should have gotten the first element (order may vary in sets)"
	self assert: ((item1 perform: #= env: 0 withArguments: {1}) or: [
		(item1 perform: #= env: 0 withArguments: {2}) or: [
			item1 perform: #= env: 0 withArguments: {3}
		]
	])
%

category: 'Tests - Set Iterator'
method: IteratorTestCase
testSetIteratorExhaustion
	"Test that set iterator raises StopIteration when exhausted"

	| s iter |
	s := set perform: #new env: 0.
	s perform: #add: env: 2 withArguments: {1}.
	s perform: #add: env: 2 withArguments: {2}.

	iter := s perform: #__iter__ env: 2.

	"Consume all elements"
	iter perform: #__next__ env: 2.
	iter perform: #__next__ env: 2.

	"Next call should raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.

	"Subsequent calls should also raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptySetIterator
	"Test iterator over empty set"

	| s iter |
	s := set perform: #new env: 0.
	iter := s perform: #__iter__ env: 2.

	"Should immediately raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Empty Iterators'
method: IteratorTestCase
testEmptyFrozensetIterator
	"Test iterator over empty frozenset"

	| fs iter |
	fs := frozenset perform: #new env: 0.
	iter := fs perform: #__iter__ env: 2.

	"Should immediately raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Dict Key Iterator'
method: IteratorTestCase
testDictKeyIteratorBasicIteration
	"Test basic iteration over dictionary keys"

	| d iter key1 key2 key3 keys |
	d := dict perform: #new env: 0.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.
	d perform: #__setitem__:_: env: 2 withArguments: {'c'. 3}.

	iter := d perform: #__iter__ env: 2.

	key1 := iter perform: #__next__ env: 2.
	key2 := iter perform: #__next__ env: 2.
	key3 := iter perform: #__next__ env: 2.

	keys := Array perform: #with:with:with: env: 0 withArguments: {key1. key2. key3}.

	self assert: (keys perform: #includes: env: 0 withArguments: {'a'}).
	self assert: (keys perform: #includes: env: 0 withArguments: {'b'}).
	self assert: (keys perform: #includes: env: 0 withArguments: {'c'}).

	"Iterator should be exhausted"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Dict Key Iterator'
method: IteratorTestCase
testDictKeyIteratorIndependence
	"Test that multiple iterators over the same dict are independent"

	| d iter1 iter2 key1a key1b |
	d := dict perform: #new env: 0.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.

	iter1 := d perform: #__iter__ env: 2.
	iter2 := d perform: #__iter__ env: 2.

	key1a := iter1 perform: #__next__ env: 2.
	key1b := iter2 perform: #__next__ env: 2.

	self assert: key1a equals: key1b.
	self deny: iter1 == iter2.
%

category: 'Tests - Dict Key Iterator'
method: IteratorTestCase
testDictKeyIteratorExhaustion
	"Test that dict_keyiterator raises StopIteration when exhausted"

	| d iter |
	d := dict perform: #new env: 0.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.

	iter := d perform: #__iter__ env: 2.

	iter perform: #__next__ env: 2.

	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%

category: 'Tests - Dict Key Iterator'
method: IteratorTestCase
testEmptyDictKeyIterator
	"Test iterator over empty dict"

	| d iter |
	d := dict perform: #new env: 0.
	iter := d perform: #__iter__ env: 2.

	"Should immediately raise StopIteration"
	self should: [iter perform: #__next__ env: 2] raise: StopIteration.
%


