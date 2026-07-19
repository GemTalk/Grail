! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ListTestCase
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

expectvalue /Class
doit
ListTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ListTestCase - Tests for Python list (OrderedCollection)
! ===============================================================================
! This file contains tests for Python's list type implemented as OrderedCollection.
! Tests cover both shared sequence methods (from SequenceableCollection) and
! list-specific mutating methods.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ListTestCase removeAllMethods.
ListTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Sequence Operations'
method: ListTestCase
test__add__
	"Test list.__add__(other) - concatenation"

	| lst1 lst2 result |
	lst1 := OrderedCollection withAll: #(1 2).
	lst2 := OrderedCollection withAll: #(3 4).

	result := lst1 @env1:__add__: lst2.

	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 4) equals: 4.

	"Original lists unchanged"
	self assert: lst1 size equals: 2.
	self assert: lst2 size equals: 2.
%

category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__contains__
	"Test list.__contains__(item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).
	
	self assert: (lst @env1:__contains__: 2).
	self deny: (lst @env1:__contains__: 4).
%

category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__delitem__
	"Test list.__delitem__(index)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40).

	"Delete by positive index"
	lst @env1:__delitem__: 1.
	self assert: lst size equals: 3.
	self assert: (lst at: 2) equals: 30.

	"Delete by negative index"
	lst @env1:__delitem__: -1.
	self assert: lst size equals: 2.
	self assert: (lst at: 2) equals: 30.
%

category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__delitem__slice
	"``del lst[:]`` and friends — slice deletion.  Used by
	re._parser.parse_template's addliteral to reset the literal
	buffer.  Step=1 paths remove a contiguous range; extended-step
	paths remove the indexed elements only."

	| lst |
	"del lst[:] — clear all."
	lst := OrderedCollection withAll: #(10 20 30 40).
	lst @env1:__delitem__: (slice ___newStart: None stop: None step: None).
	self assert: lst size equals: 0.

	"del lst[1:3] — remove indices 1..2 inclusive."
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	lst @env1:__delitem__: (slice ___newStart: 1 stop: 3 step: None).
	self assert: lst asArray equals: #(10 40 50).

	"del lst[::2] — step=2."
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	lst @env1:__delitem__: (slice ___newStart: None stop: None step: 2).
	self assert: lst asArray equals: #(20 40).
%

category: 'Grail-Tests - Comparison'
method: ListTestCase
test__eq__
	"Test list.__eq__(other)"

	| lst1 lst2 lst3 tup |
	lst1 := OrderedCollection withAll: #(1 2 3).
	lst2 := OrderedCollection withAll: #(1 2 3).
	lst3 := OrderedCollection withAll: #(1 2 4).
	tup := tuple withAll: #(1 2 3).
	
	"Same contents"
	self assert: (lst1 @env1:__eq__: lst2).
	
	"Different contents"
	self deny: (lst1 @env1:__eq__: lst3).
	
	"Different types (list vs tuple)"
	self deny: (lst1 @env1:__eq__: tup).
%

category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__getitem__
	"Test list.__getitem__(index)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (lst @env1:__getitem__: 0) equals: 10.
	self assert: (lst @env1:__getitem__: 2) equals: 30.
	self assert: (lst @env1:__getitem__: 4) equals: 50.
	
	"Negative indices"
	self assert: (lst @env1:__getitem__: -1) equals: 50.
	self assert: (lst @env1:__getitem__: -5) equals: 10.
	
	"Out of bounds"
	self should: [lst @env1:__getitem__: 5] raise: IndexError.
	self should: [lst @env1:__getitem__: -6] raise: IndexError.
%

category: 'Grail-Tests - Sequence Operations'
method: ListTestCase
test__iadd__
	"Test list.__iadd__(other) - in-place concatenation"

	| lst original |
	lst := OrderedCollection withAll: #(1 2).
	original := lst.

	lst := lst @env1:__iadd__: (OrderedCollection withAll: #(3 4)).

	"Returns same object"
	self assert: lst == original.

	"Modified in place"
	self assert: lst size equals: 4.
	self assert: (lst at: 4) equals: 4.
%

category: 'Grail-Tests - Sequence Operations'
method: ListTestCase
test__imul__
	"Test list.__imul__(n) - in-place repetition"

	| lst original |
	lst := OrderedCollection withAll: #(1 2).
	original := lst.

	lst := lst @env1:__imul__: 3.

	"Returns same object"
	self assert: lst == original.

	"Modified in place"
	self assert: lst size equals: 6.
%

category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__len__
	"Test list.__len__()"

	| lst |
	lst := OrderedCollection new.
	self assert: lst size equals: 0.
	
	lst add: 1; add: 2; add: 3.
	self assert: lst size equals: 3.
%

category: 'Grail-Tests - Sequence Operations'
method: ListTestCase
test__mul__
	"Test list.__mul__(n) - repetition"

	| lst result |
	lst := OrderedCollection withAll: #(1 2).

	result := lst @env1:__mul__: 3.

	self assert: result size equals: 6.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 3) equals: 1.
	self assert: (result at: 5) equals: 1.

	"Original list unchanged"
	self assert: lst size equals: 2.
%

category: 'Grail-Tests - String Representation'
method: ListTestCase
test__repr__
	"Test list.__repr__()"

	| lst result |
	lst := OrderedCollection withAll: #(1 2 3).

	result := lst @env1:__repr__.

	"Should contain brackets and commas"
	self assert: (result includesString: '[').
	self assert: (result includesString: ']').
%

category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__setitem__
	"Test list.__setitem__(index, value)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30).
	
	"Positive indices"
	lst @env1:__setitem__: 0 _: 100.
	self assert: (lst at: 1) equals: 100.
	
	"Negative indices"
	lst @env1:__setitem__: -1 _: 300.
	self assert: (lst at: 3) equals: 300.
	
	"Out of bounds"
	self should: [lst @env1:__setitem__: 3 _: 400] raise: IndexError.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testAppend
	"Test list.append(item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).

	lst @env1:append: 4.

	self assert: lst size equals: 4.
	self assert: (lst at: 4) equals: 4.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testClear
	"Test list.clear()"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).

	lst @env1:clear.

	self assert: lst size equals: 0.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testCount
	"Test list.count(value)"

	| lst result |
	lst := OrderedCollection withAll: #(1 2 2 3 2).

	result := lst @env1:count: 2.
	self assert: result equals: 3.

	result := lst @env1:count: 4.
	self assert: result equals: 0.
%

category: 'Grail-Tests - Eval - List Creation'
method: ListTestCase
testEvalEmptyList
	"Test empty list creation via Python source"

	| result |
	result := self eval: '[]'.
	self assert: result size equals: 0.
%

category: 'Grail-Tests - Eval - List Operations'
method: ListTestCase
testEvalListConcatenation
	"Test list + list via Python source"

	| result |
	result := self eval: '[1, 2] + [3, 4]'.
	self assert: result size equals: 4.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 3) equals: 4.
%

category: 'Grail-Tests - Eval - List Operations'
method: ListTestCase
testEvalListContains
	"Test in operator via Python source"

	self assert: (self eval: '2 in [1, 2, 3]').
	self deny: (self eval: '4 in [1, 2, 3]').
%

category: 'Grail-Tests - Eval - List Operations'
method: ListTestCase
testEvalListIndexing
	"Test list indexing via Python source"

	self assert: (self eval: '[10, 20, 30][0]') equals: 10.
	self assert: (self eval: '[10, 20, 30][2]') equals: 30.
	self assert: (self eval: '[10, 20, 30][-1]') equals: 30.
%

category: 'Grail-Tests - Eval - List Creation'
method: ListTestCase
testEvalListLiteral
	"Test list literal creation via Python source"

	| result |
	result := self eval: '[1, 2, 3]'.
	self assert: result size equals: 3.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 3.
%

category: 'Grail-Tests - Eval - List Operations'
method: ListTestCase
testEvalListRepetition
	"Test list * n via Python source"

	| result |
	result := self eval: '[1, 2] * 3'.
	self assert: result size equals: 6.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testExtend
	"Test list.extend(iterable)"

	| lst |
	lst := OrderedCollection withAll: #(1 2).

	lst @env1:extend: (OrderedCollection withAll: #(3 4 5)).

	self assert: lst size equals: 5.
	self assert: (lst at: 5) equals: 5.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testIndex
	"Test list.index(value)"

	| lst result |
	lst := OrderedCollection withAll: #(1 2 3 2).

	"Find first occurrence"
	result := lst @env1:index: 2.
	self assert: result equals: 1.  "0-based index"

	"Not found"
	self should: [lst @env1:index: 4] raise: ValueError.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testInsert
	"Test list.insert(index, item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 4).

	"Insert in middle"
	lst @env1:insert: 2 _: 3.
	self assert: lst size equals: 4.
	self assert: (lst at: 3) equals: 3.

	"Insert at beginning"
	lst @env1:insert: 0 _: 0.
	self assert: (lst at: 1) equals: 0.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testPop
	"Test list.pop() and list.pop(index)"

	| lst result |
	lst := OrderedCollection withAll: #(1 2 3 4 5).

	"Pop last"
	result := lst @env1:pop.
	self assert: result equals: 5.
	self assert: lst size equals: 4.

	"Pop by index"
	result := lst @env1:pop: 1.
	self assert: result equals: 2.
	self assert: lst size equals: 3.

	"Pop from empty list"
	lst size: 0.
	self should: [lst @env1:pop] raise: IndexError.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testRemove
	"Test list.remove(value)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3 2 4).

	"Remove first occurrence"
	lst @env1:remove: 2.
	self assert: lst size equals: 4.
	self assert: (lst at: 2) equals: 3.

	"Remove non-existent"
	self should: [lst @env1:remove: 99] raise: ValueError.
%

category: 'Grail-Tests - List Methods'
method: ListTestCase
testReverse
	"Test list.reverse()"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3 4 5).

	lst @env1:reverse.

	self assert: (lst at: 1) equals: 5.
	self assert: (lst at: 5) equals: 1.
%
