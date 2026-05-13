! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RangeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RangeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RangeTestCase category: 'SUnit'
%

! ===============================================================================
! RangeTestCase - Tests for Python range type (mapped to GemStone Interval)
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RangeTestCase removeAllMethods.
RangeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__bool__
	"Test bool(range(...))"

	| r |
	"Empty range is False"
	r := Interval @env1:__new__: 0 _: 0.
	self deny: (r @env1:__bool__).

	"Non-empty range is True"
	r := Interval @env1:__new__: 0 _: 1.
	self assert: (r @env1:__bool__).
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__contains__
	"Test membership: x in range(...)"

	| r |
	r := Interval @env1:__new__: 0 _: 10.
	self assert: (r @env1:__contains__: 5).
	self deny: (r @env1:__contains__: 10).
	self deny: (r @env1:__contains__: -1).

	"Test with step"
	r := Interval @env1:__new__: 0 _: 10 _: 2.
	self assert: (r @env1:__contains__: 4).
	self deny: (r @env1:__contains__: 5).
%

category: 'Tests - Comparison'
method: RangeTestCase
test__eq__
	"Test range equality"

	| r1 r2 r3 |
	r1 := Interval @env1:__new__: 0 _: 10.
	r2 := Interval @env1:__new__: 0 _: 10 _: 1.
	r3 := Interval @env1:__new__: 0 _: 10 _: 2.

	"Same ranges are equal"
	self assert: (r1 @env1:__eq__: r2).

	"Different ranges are not equal"
	self deny: (r1 @env1:__eq__: r3).

	"Empty ranges are equal"
	r1 := Interval @env1:__new__: 0 _: 0.
	r2 := Interval @env1:__new__: 5 _: 5.
	self assert: (r1 @env1:__eq__: r2).
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__getitem__
	"Test indexing: r[i]"

	| r |
	r := Interval @env1:__new__: 5 _: 10.
	"r = range(5, 10) -> [5, 6, 7, 8, 9]"
	self assert: (r @env1:__getitem__: 0) equals: 5.
	self assert: (r @env1:__getitem__: 1) equals: 6.
	self assert: (r @env1:__getitem__: 4) equals: 9.
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__getitem__negative
	"Test negative indexing: r[-1]"

	| r |
	r := Interval @env1:__new__: 0 _: 10.
	"r = range(0, 10) -> [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
	self assert: (r @env1:__getitem__: -1) equals: 9.
	self assert: (r @env1:__getitem__: -2) equals: 8.
	self assert: (r @env1:__getitem__: -10) equals: 0.
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__getitem__outOfRange
	"Test index out of range raises IndexError"

	| r |
	r := Interval @env1:__new__: 0 _: 5.
	self should: [r @env1:__getitem__: 10] raise: IndexError.
	self should: [r @env1:__getitem__: -10] raise: IndexError.
%

category: 'Tests - Hashing'
method: RangeTestCase
test__hash__
	"Test range hashing"

	| r1 r2 h1 h2 |
	r1 := Interval @env1:__new__: 0 _: 10.
	r2 := Interval @env1:__new__: 0 _: 10 _: 1.

	h1 := r1 @env1:__hash__.
	h2 := r2 @env1:__hash__.

	"Same ranges should have same hash"
	self assert: h1 equals: h2.
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__len__
	"Test len(range(...))"

	| r |
	r := Interval @env1:__new__: 0 _: 10.
	self assert: r size equals: 10.
	
	r := Interval @env1:__new__: 0 _: 10 _: 2.
	self assert: r size equals: 5.
	
	r := Interval @env1:__new__: 10 _: 0 _: -1.
	self assert: r size equals: 10.
%

category: 'Tests - Comparison'
method: RangeTestCase
test__ne__
	"Test range inequality"

	| r1 r2 |
	r1 := Interval @env1:__new__: 0 _: 10.
	r2 := Interval @env1:__new__: 0 _: 10 _: 2.

	self assert: (r1 @env1:__ne__: r2).
	self deny: (r1 @env1:__ne__: r1).
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__emptyRange
	"Test empty ranges"

	| result |
	"range(0, 0) is empty"
	result := Interval @env1:__new__: 0 _: 0.
	self assert: result size equals: 0.
	
	"range(5, 5) is empty"
	result := Interval @env1:__new__: 5 _: 5.
	self assert: result size equals: 0.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__negativeStep
	"Test range with negative step"

	| result |
	"range(10, 0, -2) creates 10, 8, 6, 4, 2"
	result := Interval @env1:__new__: 10 _: 0 _: -2.
	self assert: (result @env1:start) equals: 10.
	self assert: (result @env1:stop) equals: 0.
	self assert: (result @env1:step) equals: -2.
	self assert: result size equals: 5.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__oneArg
	"Test range(stop)"

	| result |
	"range(5) creates 0, 1, 2, 3, 4"
	result := Interval ___new___: 5.
	self assert: (result @env1:start) equals: 0.
	self assert: (result @env1:stop) equals: 5.
	self assert: (result @env1:step) equals: 1.
	self assert: result size equals: 5.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__threeArgs
	"Test range(start, stop, step)"

	| result |
	"range(0, 10, 2) creates 0, 2, 4, 6, 8"
	result := Interval @env1:__new__: 0 _: 10 _: 2.
	self assert: (result @env1:start) equals: 0.
	self assert: (result @env1:stop) equals: 10.
	self assert: (result @env1:step) equals: 2.
	self assert: result size equals: 5.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__twoArgs
	"Test range(start, stop)"

	| result |
	"range(2, 7) creates 2, 3, 4, 5, 6"
	result := Interval @env1:__new__: 2 _: 7.
	self assert: (result @env1:start) equals: 2.
	self assert: (result @env1:stop) equals: 7.
	self assert: (result @env1:step) equals: 1.
	self assert: result size equals: 5.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__zeroStepRaisesError
	"Test that step=0 raises ValueError"

	self 
		should: [Interval @env1:__new__: 0 _: 10 _: 0]
		raise: ValueError.
%

category: 'Tests - String Representation'
method: RangeTestCase
test__repr__
	"Test repr(range(...))"

	| r result |
	"range(5) shows just stop"
	r := Interval ___new___: 5.
	result := r @env1:__repr__.
	self assert: result equals: 'range(5)'.

	"range(1, 5) shows start and stop"
	r := Interval @env1:__new__: 1 _: 5.
	result := r @env1:__repr__.
	self assert: result equals: 'range(1, 5)'.

	"range(0, 10, 2) shows all three"
	r := Interval @env1:__new__: 0 _: 10 _: 2.
	result := r @env1:__repr__.
	self assert: result equals: 'range(0, 10, 2)'.
%

category: 'Tests - Iteration'
method: RangeTestCase
test__reversed__
	"Test reversed(range(...))"

	| r rev |
	r := Interval @env1:__new__: 0 _: 5.
	rev := r @env1:__reversed__.

	"reversed(range(0, 5)) -> range(4, -1, -1)"
	self assert: (rev @env1:start) equals: 4.
	self assert: (rev @env1:stop) equals: -1.
	self assert: (rev @env1:step) equals: -1.
	self assert: rev size equals: 5.
%

category: 'Tests - Iteration'
method: RangeTestCase
test__reversed__empty
	"Test reversed() on empty range"

	| r rev |
	r := Interval @env1:__new__: 0 _: 0.
	rev := r @env1:__reversed__.

	self assert: rev size equals: 0.
%

category: 'Tests - Sequence Methods'
method: RangeTestCase
test_count
	"Test range.count(x)"

	| r |
	r := Interval @env1:__new__: 0 _: 10.
	self assert: (r @env1:count: 5) equals: 1.
	self assert: (r @env1:count: 10) equals: 0.
	self assert: (r @env1:count: -1) equals: 0.
%

category: 'Tests - Sequence Methods'
method: RangeTestCase
test_index
	"Test range.index(x)"

	| r |
	r := Interval @env1:__new__: 5 _: 10.
	"r = range(5, 10) -> [5, 6, 7, 8, 9]"
	self assert: (r @env1:index: 5) equals: 0.
	self assert: (r @env1:index: 7) equals: 2.
	self assert: (r @env1:index: 9) equals: 4.
%

category: 'Tests - Sequence Methods'
method: RangeTestCase
test_indexNotFound
	"Test range.index(x) raises ValueError when not found"

	| r |
	r := Interval @env1:__new__: 0 _: 10.
	self should: [r @env1:index: 10] raise: ValueError.
	self should: [r @env1:index: -1] raise: ValueError.
%

category: 'Tests - Attributes'
method: RangeTestCase
test_startStopStep
	"Test start, stop, step attributes"

	| r |
	r := Interval @env1:__new__: 1 _: 10 _: 2.
	self assert: (r @env1:start) equals: 1.
	self assert: (r @env1:stop) equals: 10.
	self assert: (r @env1:step) equals: 2.
%
