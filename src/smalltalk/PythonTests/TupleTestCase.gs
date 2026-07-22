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
TupleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TupleTestCase - Tests for Python tuple
! ===============================================================================
! This file contains tests for Python's tuple type (an Array subclass whose
! instances are frozen via immediateInvariant by every constructor).
! Tests cover shared sequence methods and tuple-specific immutability/hashing.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TupleTestCase removeAllMethods.
TupleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Sequence Operations'
method: TupleTestCase
testMulByOneReturnsSelf
	"t * 1 returns the SAME tuple object when t's type is exactly tuple
	(CPython identity optimization -- seq_tests test_repeat: id(s)==id(s*1));
	other multipliers build a fresh tuple."

	self assert: (self eval: 't = (1, 2, 3)
(t * 1) is t and (t * 2) == (1, 2, 3, 1, 2, 3) and (t * 0) == ()')
%

category: 'Grail-Tests - Sequence Operations'
method: TupleTestCase
test__add__
	"Test tuple.__add__(other) - concatenation"

	| tup1 tup2 result |
	tup1 := tuple withAll: #(1 2).
	tup2 := tuple withAll: #(3 4).
	
	result := tup1 @env1:__add__: tup2.
	
	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 4) equals: 4.
	
	"Original tuples unchanged"
	self assert: tup1 size equals: 2.
	self assert: tup2 size equals: 2.
%

category: 'Grail-Tests - Sequence Protocol'
method: TupleTestCase
test__contains__
	"Test tuple.__contains__(item)"

	| tup |
	tup := tuple withAll: #(1 2 3).
	
	self assert: (tup @env1:__contains__: 2).
	self deny: (tup @env1:__contains__: 4).
%

category: 'Grail-Tests - Immutability'
method: TupleTestCase
test__delitem__RaisesError
	"Test that tuple.__delitem__ raises TypeError (tuples are immutable)"

	| tup |
	tup := tuple withAll: #(10 20 30).
	
	self should: [tup @env1:__delitem__: 0] raise: TypeError.
%

category: 'Grail-Tests - Comparison'
method: TupleTestCase
test__eq__
	"Test tuple.__eq__(other)"

	| tup1 tup2 tup3 lst |
	tup1 := tuple withAll: #(1 2 3).
	tup2 := tuple withAll: #(1 2 3).
	tup3 := tuple withAll: #(1 2 4).
	lst := OrderedCollection withAll: #(1 2 3).
	
	"Same contents"
	self assert: (tup1 @env1:__eq__: tup2).
	
	"Different contents"
	self deny: (tup1 @env1:__eq__: tup3).
	
	"Different types (tuple vs list)"
	self deny: (tup1 @env1:__eq__: lst).
%

category: 'Grail-Tests - Sequence Protocol'
method: TupleTestCase
test__getitem__
	"Test tuple.__getitem__(index)"

	| tup |
	tup := tuple withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (tup @env1:__getitem__: 0) equals: 10.
	self assert: (tup @env1:__getitem__: 2) equals: 30.
	self assert: (tup @env1:__getitem__: 4) equals: 50.
	
	"Negative indices"
	self assert: (tup @env1:__getitem__: -1) equals: 50.
	self assert: (tup @env1:__getitem__: -5) equals: 10.
	
	"Out of bounds"
	self should: [tup @env1:__getitem__: 5] raise: IndexError.
	self should: [tup @env1:__getitem__: -6] raise: IndexError.
%

category: 'Grail-Tests - Hashing'
method: TupleTestCase
test__hash__
	"Test tuple.__hash__() - tuples are hashable"

	| tup hash |
	tup := tuple withAll: #(1 2 3).

	hash := tup @env1:__hash__.

	"Hash should be an integer"
	self assert: hash class == SmallInteger.
%

category: 'Grail-Tests - Sequence Protocol'
method: TupleTestCase
test__len__
	"Test tuple.__len__()"

	| tup |
	tup := tuple new.
	self assert: tup size equals: 0.
	
	tup := tuple withAll: #(1 2 3).
	self assert: tup size equals: 3.
%

category: 'Grail-Tests - Sequence Operations'
method: TupleTestCase
test__mul__
	"Test tuple.__mul__(n) - repetition"

	| tup result |
	tup := tuple withAll: #(1 2).

	result := tup @env1:__mul__: 3.

	self assert: result size equals: 6.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 3) equals: 1.
	self assert: (result at: 5) equals: 1.

	"Original tuple unchanged"
	self assert: tup size equals: 2.
%

category: 'Grail-Tests - String Representation'
method: TupleTestCase
test__repr__
	"Test tuple.__repr__()"

	| tup result |

	"Regular tuple"
	tup := tuple withAll: #(1 2 3).
	result := tup @env1:__repr__.
	self assert: (result includesString: '(').
	self assert: (result includesString: ')').

	"Single element tuple (should have trailing comma)"
	tup := tuple withAll: #(1).
	result := tup @env1:__repr__.
	self assert: (result includesString: ',').

	"Empty tuple"
	tup := tuple new.
	result := tup @env1:__repr__.
	self assert: result equals: '()'.
%

category: 'Grail-Tests - Immutability'
method: TupleTestCase
test__setitem__RaisesError
	"Test that tuple.__setitem__ raises TypeError (tuples are immutable)"

	| tup |
	tup := tuple withAll: #(10 20 30).
	
	self should: [tup @env1:__setitem__: 0 _: 100] raise: TypeError.
%

category: 'Grail-Tests - Tuple Methods'
method: TupleTestCase
testCount
	"Test tuple.count(value)"

	| tup result |
	tup := tuple withAll: #(1 2 2 3 2).

	result := tup @env1:count: 2.
	self assert: result equals: 3.

	result := tup @env1:count: 4.
	self assert: result equals: 0.
%

category: 'Grail-Tests - Eval - Tuple Creation'
method: TupleTestCase
testEvalEmptyTuple
	"Test empty tuple creation via Python source"

	| result |
	result := self eval: '()'.
	self assert: (result isKindOf: tuple).
	self assert: result size equals: 0.
%

category: 'Grail-Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleConcatenation
	"Test tuple + tuple via Python source"

	| result |
	result := self eval: '(1, 2) + (3, 4)'.
	self assert: result size equals: 4.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 3) equals: 4.
%

category: 'Grail-Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleContains
	"Test in operator for tuples via Python source"

	self assert: (self eval: '2 in (1, 2, 3)').
	self deny: (self eval: '4 in (1, 2, 3)').
%

category: 'Grail-Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleIndexing
	"Test tuple indexing via Python source"

	self assert: (self eval: '(10, 20, 30)[0]') equals: 10.
	self assert: (self eval: '(10, 20, 30)[2]') equals: 30.
	self assert: (self eval: '(10, 20, 30)[-1]') equals: 30.
%

category: 'Grail-Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleLen
	"Test len() on tuples via Python source"

	self assert: (self eval: 'len((1, 2, 3))') equals: 3.
	self assert: (self eval: 'len(())') equals: 0.
%

category: 'Grail-Tests - Eval - Tuple Creation'
method: TupleTestCase
testEvalTupleLiteral
	"Test tuple literal creation via Python source"

	| result |
	result := self eval: '(1, 2, 3)'.
	self assert: (result isKindOf: tuple).
	self assert: result size equals: 3.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 3.
%

category: 'Grail-Tests - Eval - Tuple Operations'
method: TupleTestCase
testEvalTupleRepetition
	"Test tuple * n via Python source"

	| result |
	result := self eval: '(1, 2) * 3'.
	self assert: result size equals: 6.
%

category: 'Grail-Tests - Tuple Methods'
method: TupleTestCase
testIndex
	"Test tuple.index(value)"

	| tup result |
	tup := tuple withAll: #(1 2 3 2).

	"Find first occurrence"
	result := tup @env1:index: 2.
	self assert: result equals: 1.  "0-based index"

	"Not found"
	self should: [tup @env1:index: 4] raise: ValueError.
%

category: 'Grail-Tests - Pickle'
method: TupleTestCase
testIteratorPickleRoundtrip
	"A forward tuple iterator pickles and unpickles, resuming at its saved
	position -- fresh, mid-iteration, and exhausted (test_tuple
	test_iterator_pickle).  Grail pickles it via pickle.py's explicit
	tuple_iterator tag (tuple_iterator _getstate/_new_from), since builtin
	reconstructors like iter() are not picklable-as-globals."

	self assert: (self eval: 'import pickle
ok = []
data = (4, 5, 6, 7)
it = iter(data)
it2 = pickle.loads(pickle.dumps(it))
ok.append(type(it2) is type(it))
ok.append(tuple(it2) == data)
it = iter(data)
next(it)
it3 = pickle.loads(pickle.dumps(it))
ok.append(tuple(it3) == data[1:])
e = iter(data)
list(e)
e2 = pickle.loads(pickle.dumps(e))
ok.append(list(e2) == [])
all(ok)').
%
