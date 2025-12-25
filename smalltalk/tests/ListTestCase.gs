! ===============================================================================
! ListTestCase - Tests for Python list (OrderedCollection)
! ===============================================================================
! This file contains tests for Python's list type implemented as OrderedCollection.
! Tests cover both shared sequence methods (from SequenceableCollection) and
! list-specific mutating methods.
! ===============================================================================

! ------------------- Remove existing test class
expectvalue /Class
doit
(PythonTests includesKey: #'ListTestCase') ifTrue: [
	PythonTests removeKey: #'ListTestCase'
].
%

! ------------------- Define ListTestCase class
expectvalue /Class
doit
PythonTestCase subclass: 'ListTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

set compile_env: 0

category: 'Tests - Sequence Protocol'
method: ListTestCase
test__len__
	"Test list.__len__()"

	| lst |
	lst := OrderedCollection new.
	self assert: (lst ___len___) equals: 0.
	
	lst add: 1; add: 2; add: 3.
	self assert: (lst ___len___) equals: 3.
%

category: 'Tests - Sequence Protocol'
method: ListTestCase
test__getitem__
	"Test list.__getitem__(index)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {0}) equals: 10.
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {2}) equals: 30.
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {4}) equals: 50.
	
	"Negative indices"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {-1}) equals: 50.
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {-5}) equals: 10.
	
	"Out of bounds"
	self should: [lst perform: #__getitem__: env: 2 withArguments: {5}] raise: IndexError.
	self should: [lst perform: #__getitem__: env: 2 withArguments: {-6}] raise: IndexError.
%

category: 'Tests - Sequence Protocol'
method: ListTestCase
test__setitem__
	"Test list.__setitem__(index, value)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30).
	
	"Positive indices"
	lst perform: #__setitem__:_: env: 2 withArguments: {0. 100}.
	self assert: (lst at: 1) equals: 100.
	
	"Negative indices"
	lst perform: #__setitem__:_: env: 2 withArguments: {-1. 300}.
	self assert: (lst at: 3) equals: 300.
	
	"Out of bounds"
	self should: [lst perform: #__setitem__:_: env: 2 withArguments: {3. 400}] raise: IndexError.
%

category: 'Tests - Sequence Protocol'
method: ListTestCase
test__delitem__
	"Test list.__delitem__(index)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40).
	
	"Delete by positive index"
	lst perform: #__delitem__: env: 2 withArguments: {1}.
	self assert: lst size equals: 3.
	self assert: (lst at: 2) equals: 30.
	
	"Delete by negative index"
	lst perform: #__delitem__: env: 2 withArguments: {-1}.
	self assert: lst size equals: 2.
	self assert: (lst at: 2) equals: 30.
%

category: 'Tests - Sequence Protocol'
method: ListTestCase
test__contains__
	"Test list.__contains__(item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).
	
	self assert: (lst ___contains___: 2).
	self deny: (lst ___contains___: 4).
%

category: 'Tests - Comparison'
method: ListTestCase
test__eq__
	"Test list.__eq__(other)"

	| lst1 lst2 lst3 tup |
	lst1 := OrderedCollection withAll: #(1 2 3).
	lst2 := OrderedCollection withAll: #(1 2 3).
	lst3 := OrderedCollection withAll: #(1 2 4).
	tup := InvariantArray withAll: #(1 2 3).
	
	"Same contents"
	self assert: (lst1 perform: #__eq__: env: 2 withArguments: {lst2}).
	
	"Different contents"
	self deny: (lst1 perform: #__eq__: env: 2 withArguments: {lst3}).
	
	"Different types (list vs tuple)"
	self deny: (lst1 perform: #__eq__: env: 2 withArguments: {tup}).
%

category: 'Tests - Sequence Operations'
method: ListTestCase
test__add__
	"Test list.__add__(other) - concatenation"

	| lst1 lst2 result |
	lst1 := OrderedCollection withAll: #(1 2).
	lst2 := OrderedCollection withAll: #(3 4).

	result := lst1 perform: #__add__: env: 2 withArguments: {lst2}.

	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 4) equals: 4.

	"Original lists unchanged"
	self assert: lst1 size equals: 2.
	self assert: lst2 size equals: 2.
%

category: 'Tests - Sequence Operations'
method: ListTestCase
test__mul__
	"Test list.__mul__(n) - repetition"

	| lst result |
	lst := OrderedCollection withAll: #(1 2).

	result := lst perform: #__mul__: env: 2 withArguments: {3}.

	self assert: result size equals: 6.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 3) equals: 1.
	self assert: (result at: 5) equals: 1.

	"Original list unchanged"
	self assert: lst size equals: 2.
%

category: 'Tests - Sequence Operations'
method: ListTestCase
test__iadd__
	"Test list.__iadd__(other) - in-place concatenation"

	| lst original |
	lst := OrderedCollection withAll: #(1 2).
	original := lst.

	lst := lst perform: #__iadd__: env: 2 withArguments: {OrderedCollection withAll: #(3 4)}.

	"Returns same object"
	self assert: lst == original.

	"Modified in place"
	self assert: lst size equals: 4.
	self assert: (lst at: 4) equals: 4.
%

category: 'Tests - Sequence Operations'
method: ListTestCase
test__imul__
	"Test list.__imul__(n) - in-place repetition"

	| lst original |
	lst := OrderedCollection withAll: #(1 2).
	original := lst.

	lst := lst perform: #__imul__: env: 2 withArguments: {3}.

	"Returns same object"
	self assert: lst == original.

	"Modified in place"
	self assert: lst size equals: 6.
%

category: 'Tests - List Methods'
method: ListTestCase
testAppend
	"Test list.append(item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).

	lst perform: #append: env: 2 withArguments: {4}.

	self assert: lst size equals: 4.
	self assert: (lst at: 4) equals: 4.
%

category: 'Tests - List Methods'
method: ListTestCase
testClear
	"Test list.clear()"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).

	lst perform: #clear env: 2.

	self assert: lst size equals: 0.
%

category: 'Tests - List Methods'
method: ListTestCase
testExtend
	"Test list.extend(iterable)"

	| lst |
	lst := OrderedCollection withAll: #(1 2).

	lst perform: #extend: env: 2 withArguments: {OrderedCollection withAll: #(3 4 5)}.

	self assert: lst size equals: 5.
	self assert: (lst at: 5) equals: 5.
%

category: 'Tests - List Methods'
method: ListTestCase
testInsert
	"Test list.insert(index, item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 4).

	"Insert in middle"
	lst perform: #insert:_: env: 2 withArguments: {2. 3}.
	self assert: lst size equals: 4.
	self assert: (lst at: 3) equals: 3.

	"Insert at beginning"
	lst perform: #insert:_: env: 2 withArguments: {0. 0}.
	self assert: (lst at: 1) equals: 0.
%

category: 'Tests - List Methods'
method: ListTestCase
testPop
	"Test list.pop() and list.pop(index)"

	| lst result |
	lst := OrderedCollection withAll: #(1 2 3 4 5).

	"Pop last"
	result := lst perform: #pop env: 2.
	self assert: result equals: 5.
	self assert: lst size equals: 4.

	"Pop by index"
	result := lst perform: #pop: env: 2 withArguments: {1}.
	self assert: result equals: 2.
	self assert: lst size equals: 3.

	"Pop from empty list"
	lst size: 0.
	self should: [lst perform: #pop env: 2] raise: IndexError.
%

category: 'Tests - List Methods'
method: ListTestCase
testRemove
	"Test list.remove(value)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3 2 4).

	"Remove first occurrence"
	lst perform: #remove: env: 2 withArguments: {2}.
	self assert: lst size equals: 4.
	self assert: (lst at: 2) equals: 3.

	"Remove non-existent"
	self should: [lst perform: #remove: env: 2 withArguments: {99}] raise: ValueError.
%

category: 'Tests - List Methods'
method: ListTestCase
testReverse
	"Test list.reverse()"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3 4 5).

	lst perform: #reverse env: 2.

	self assert: (lst at: 1) equals: 5.
	self assert: (lst at: 5) equals: 1.
%

category: 'Tests - List Methods'
method: ListTestCase
testCount
	"Test list.count(value)"

	| lst result |
	lst := OrderedCollection withAll: #(1 2 2 3 2).

	result := lst perform: #count: env: 2 withArguments: {2}.
	self assert: result equals: 3.

	result := lst perform: #count: env: 2 withArguments: {4}.
	self assert: result equals: 0.
%

category: 'Tests - List Methods'
method: ListTestCase
testIndex
	"Test list.index(value)"

	| lst result |
	lst := OrderedCollection withAll: #(1 2 3 2).

	"Find first occurrence"
	result := lst perform: #index: env: 2 withArguments: {2}.
	self assert: result equals: 1.  "0-based index"

	"Not found"
	self should: [lst perform: #index: env: 2 withArguments: {4}] raise: ValueError.
%

category: 'Tests - String Representation'
method: ListTestCase
test__repr__
	"Test list.__repr__()"

	| lst result |
	lst := OrderedCollection withAll: #(1 2 3).

	result := lst perform: #__repr__ env: 2.

	"Should contain brackets and commas"
	self assert: (result includesString: '[').
	self assert: (result includesString: ']').
%


