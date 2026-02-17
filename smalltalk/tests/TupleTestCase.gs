! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TupleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TupleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TupleTestCase category: 'SUnit'
%

! ===============================================================================
! TupleTestCase - Tests for Python tuple (InvariantArray)
! ===============================================================================
! This file contains tests for Python's tuple type implemented as InvariantArray.
! Tests cover shared sequence methods and tuple-specific immutability/hashing.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TupleTestCase removeAllMethods.
TupleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests - Sequence Operations'
method: TupleTestCase
test__add__
	"Test tuple.__add__(other) - concatenation"

	| tup1 tup2 result |
	tup1 := InvariantArray withAll: #(1 2).
	tup2 := InvariantArray withAll: #(3 4).
	
	result := tup1 perform: #__add__: env: 2 withArguments: {tup2}.
	
	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 4) equals: 4.
	
	"Original tuples unchanged"
	self assert: tup1 size equals: 2.
	self assert: tup2 size equals: 2.
%

category: 'Tests - Sequence Protocol'
method: TupleTestCase
test__contains__
	"Test tuple.__contains__(item)"

	| tup |
	tup := InvariantArray withAll: #(1 2 3).
	
	self assert: (tup ___contains___: 2).
	self deny: (tup ___contains___: 4).
%

category: 'Tests - Immutability'
method: TupleTestCase
test__delitem__RaisesError
	"Test that tuple.__delitem__ raises TypeError (tuples are immutable)"

	| tup |
	tup := InvariantArray withAll: #(10 20 30).
	
	self should: [tup perform: #__delitem__: env: 2 withArguments: {0}] raise: TypeError.
%

category: 'Tests - Comparison'
method: TupleTestCase
test__eq__
	"Test tuple.__eq__(other)"

	| tup1 tup2 tup3 lst |
	tup1 := InvariantArray withAll: #(1 2 3).
	tup2 := InvariantArray withAll: #(1 2 3).
	tup3 := InvariantArray withAll: #(1 2 4).
	lst := OrderedCollection withAll: #(1 2 3).
	
	"Same contents"
	self assert: (tup1 perform: #__eq__: env: 2 withArguments: {tup2}).
	
	"Different contents"
	self deny: (tup1 perform: #__eq__: env: 2 withArguments: {tup3}).
	
	"Different types (tuple vs list)"
	self deny: (tup1 perform: #__eq__: env: 2 withArguments: {lst}).
%

category: 'Tests - Sequence Protocol'
method: TupleTestCase
test__getitem__
	"Test tuple.__getitem__(index)"

	| tup |
	tup := InvariantArray withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (tup perform: #__getitem__: env: 2 withArguments: {0}) equals: 10.
	self assert: (tup perform: #__getitem__: env: 2 withArguments: {2}) equals: 30.
	self assert: (tup perform: #__getitem__: env: 2 withArguments: {4}) equals: 50.
	
	"Negative indices"
	self assert: (tup perform: #__getitem__: env: 2 withArguments: {-1}) equals: 50.
	self assert: (tup perform: #__getitem__: env: 2 withArguments: {-5}) equals: 10.
	
	"Out of bounds"
	self should: [tup perform: #__getitem__: env: 2 withArguments: {5}] raise: IndexError.
	self should: [tup perform: #__getitem__: env: 2 withArguments: {-6}] raise: IndexError.
%

category: 'Tests - Hashing'
method: TupleTestCase
test__hash__
	"Test tuple.__hash__() - tuples are hashable"

	| tup hash |
	tup := InvariantArray withAll: #(1 2 3).

	hash := tup perform: #__hash__ env: 2.

	"Hash should be an integer"
	self assert: hash class == SmallInteger.
%

category: 'Tests - Sequence Protocol'
method: TupleTestCase
test__len__
	"Test tuple.__len__()"

	| tup |
	tup := InvariantArray new.
	self assert: tup size equals: 0.
	
	tup := InvariantArray withAll: #(1 2 3).
	self assert: tup size equals: 3.
%

category: 'Tests - Sequence Operations'
method: TupleTestCase
test__mul__
	"Test tuple.__mul__(n) - repetition"

	| tup result |
	tup := InvariantArray withAll: #(1 2).

	result := tup perform: #__mul__: env: 2 withArguments: {3}.

	self assert: result size equals: 6.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 3) equals: 1.
	self assert: (result at: 5) equals: 1.

	"Original tuple unchanged"
	self assert: tup size equals: 2.
%

category: 'Tests - String Representation'
method: TupleTestCase
test__repr__
	"Test tuple.__repr__()"

	| tup result |

	"Regular tuple"
	tup := InvariantArray withAll: #(1 2 3).
	result := tup perform: #__repr__ env: 2.
	self assert: (result includesString: '(').
	self assert: (result includesString: ')').

	"Single element tuple (should have trailing comma)"
	tup := InvariantArray withAll: #(1).
	result := tup perform: #__repr__ env: 2.
	self assert: (result includesString: ',').

	"Empty tuple"
	tup := InvariantArray new.
	result := tup perform: #__repr__ env: 2.
	self assert: result equals: '()'.
%

category: 'Tests - Immutability'
method: TupleTestCase
test__setitem__RaisesError
	"Test that tuple.__setitem__ raises TypeError (tuples are immutable)"

	| tup |
	tup := InvariantArray withAll: #(10 20 30).
	
	self should: [tup perform: #__setitem__:_: env: 2 withArguments: {0. 100}] raise: TypeError.
%

category: 'Tests - Tuple Methods'
method: TupleTestCase
testCount
	"Test tuple.count(value)"

	| tup result |
	tup := InvariantArray withAll: #(1 2 2 3 2).

	result := tup perform: #count: env: 2 withArguments: {2}.
	self assert: result equals: 3.

	result := tup perform: #count: env: 2 withArguments: {4}.
	self assert: result equals: 0.
%

category: 'Tests - Eval - Tuple Creation'
method: TupleTestCase
testEvalEmptyTuple
	"Test empty tuple creation via Python source"

	| result |
	result := self eval: '()'.
	self assert: (result isKindOf: InvariantArray).
	self assert: result size equals: 0.
%

category: 'Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleConcatenation
	"Test tuple + tuple via Python source"

	| result |
	result := self eval: '(1, 2) + (3, 4)'.
	self assert: result size equals: 4.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {0}) equals: 1.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {3}) equals: 4.
%

category: 'Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleContains
	"Test in operator for tuples via Python source"

	self assert: (self eval: '2 in (1, 2, 3)').
	self deny: (self eval: '4 in (1, 2, 3)').
%

category: 'Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleIndexing
	"Test tuple indexing via Python source"

	self assert: (self eval: '(10, 20, 30)[0]') equals: 10.
	self assert: (self eval: '(10, 20, 30)[2]') equals: 30.
	self assert: (self eval: '(10, 20, 30)[-1]') equals: 30.
%

category: 'Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleLen
	"Test len() on tuples via Python source"

	self assert: (self eval: 'len((1, 2, 3))') equals: 3.
	self assert: (self eval: 'len(())') equals: 0.
%

category: 'Tests - Eval - Tuple Creation'
method: TupleTestCase
testEvalTupleLiteral
	"Test tuple literal creation via Python source"

	| result |
	result := self eval: '(1, 2, 3)'.
	self assert: (result isKindOf: InvariantArray).
	self assert: result size equals: 3.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {0}) equals: 1.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {2}) equals: 3.
%

category: 'Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleRepetition
	"Test tuple * n via Python source"

	| result |
	result := self eval: '(1, 2) * 3'.
	self assert: result size equals: 6.
%

category: 'Tests - Tuple Methods'
method: TupleTestCase
testIndex
	"Test tuple.index(value)"

	| tup result |
	tup := InvariantArray withAll: #(1 2 3 2).

	"Find first occurrence"
	result := tup perform: #index: env: 2 withArguments: {2}.
	self assert: result equals: 1.  "0-based index"

	"Not found"
	self should: [tup perform: #index: env: 2 withArguments: {4}] raise: ValueError.
%
