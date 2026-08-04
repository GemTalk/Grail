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
RangeTestCase category: 'Grail-SUnit'
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

category: 'Grail-Tests - Sequence Protocol'
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

category: 'Grail-Tests - Sequence Protocol'
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

category: 'Grail-Tests - Comparison'
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

category: 'Grail-Tests - Sequence Protocol'
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

category: 'Grail-Tests - Sequence Protocol'
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

category: 'Grail-Tests - Sequence Protocol'
method: RangeTestCase
test__getitem__outOfRange
	"Test index out of range raises IndexError"

	| r |
	r := Interval @env1:__new__: 0 _: 5.
	self should: [r @env1:__getitem__: 10] raise: IndexError.
	self should: [r @env1:__getitem__: -10] raise: IndexError.
%

category: 'Grail-Tests - Hashing'
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

category: 'Grail-Tests - Sequence Protocol'
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

category: 'Grail-Tests - Comparison'
method: RangeTestCase
test__ne__
	"Test range inequality"

	| r1 r2 |
	r1 := Interval @env1:__new__: 0 _: 10.
	r2 := Interval @env1:__new__: 0 _: 10 _: 2.

	self assert: (r1 @env1:__ne__: r2).
	self deny: (r1 @env1:__ne__: r1).
%

category: 'Grail-Tests - Initialization'
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

category: 'Grail-Tests - Initialization'
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

category: 'Grail-Tests - Initialization'
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

category: 'Grail-Tests - Initialization'
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

category: 'Grail-Tests - Initialization'
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

category: 'Grail-Tests - Initialization'
method: RangeTestCase
test__new__zeroStepRaisesError
	"Test that step=0 raises ValueError"

	self 
		should: [Interval @env1:__new__: 0 _: 10 _: 0]
		raise: ValueError.
%

category: 'Grail-Tests - String Representation'
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

category: 'Grail-Tests - Iteration'
method: RangeTestCase
test__reversed__
	"Test reversed(range(...)).  CPython answers an ITERATOR, not the reversed
	range -- a range's len() (and so its length_hint) is static, an iterator's
	hint decreases as it is consumed.  This test used to assert start/stop/step
	on a returned range; it now asserts the iterator shape."

	| r rev collected |
	r := Interval @env1:__new__: 0 _: 5.
	rev := r @env1:__reversed__.

	self assert: (rev @env1:__class__) equals: (Python at: #range_iterator).
	self assert: (rev @env1:__length_hint__) equals: 5.
	self assert: (rev @env1:__next__) equals: 4.
	self assert: (rev @env1:__length_hint__) equals: 4.

	collected := OrderedCollection new.
	[[true] whileTrue: [collected add: rev @env1:__next__]]
		on: (Python at: #StopIteration) do: [:ex | ex return: nil].
	self assert: collected asArray equals: #(3 2 1 0).
	self assert: (rev @env1:__length_hint__) equals: 0.
%

category: 'Grail-Tests - Iteration'
method: RangeTestCase
test__reversed__empty
	"Test reversed() on empty range -- an already-exhausted iterator."

	| r rev |
	r := Interval @env1:__new__: 0 _: 0.
	rev := r @env1:__reversed__.

	self assert: (rev @env1:__length_hint__) equals: 0.
	self should: [rev @env1:__next__] raise: (Python at: #StopIteration).
%

category: 'Grail-Tests - Sequence Methods'
method: RangeTestCase
test_count
	"Test range.count(x)"

	| r |
	r := Interval @env1:__new__: 0 _: 10.
	self assert: (r @env1:count: 5) equals: 1.
	self assert: (r @env1:count: 10) equals: 0.
	self assert: (r @env1:count: -1) equals: 0.
%

category: 'Grail-Tests - Sequence Methods'
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

category: 'Grail-Tests - Sequence Methods'
method: RangeTestCase
test_indexNotFound
	"Test range.index(x) raises ValueError when not found"

	| r |
	r := Interval @env1:__new__: 0 _: 10.
	self should: [r @env1:index: 10] raise: ValueError.
	self should: [r @env1:index: -1] raise: ValueError.
%

category: 'Grail-Tests - Attributes'
method: RangeTestCase
test_startStopStep
	"Test start, stop, step attributes"

	| r |
	r := Interval @env1:__new__: 1 _: 10 _: 2.
	self assert: (r @env1:start) equals: 1.
	self assert: (r @env1:stop) equals: 10.
	self assert: (r @env1:step) equals: 2.
%

category: 'Grail-Tests - Attributes'
method: RangeTestCase
testStartStopStepAreValuesNotBoundMethods
	"CPython's range exposes start/stop/step as read-only ATTRIBUTES:
	``range(10).start'' is 0, not a bound method.  Grail answered a BoundMethod,
	so any arithmetic or comparison on ``r.start'' silently operated on the
	method object rather than the integer.

	Asserted through PYTHON attribute access (``self eval:''), not an
	``@env1:start'' send.  The other tests in this class use the Smalltalk send,
	which resolves to the same value either way -- which is exactly why this bug
	survived: only the Python attribute path distinguishes a value from a
	BoundMethod, and that path needs the class-side ___pythonValueAttrs___
	whitelist (compiled in env 0, since ___pyAttrLoad___ consults it through an
	env-0 respondsTo:)."

	self assert: (self eval: 'range(2, 20, 3).start') equals: 2.
	self assert: (self eval: 'range(2, 20, 3).stop') equals: 20.
	self assert: (self eval: 'range(2, 20, 3).step') equals: 3.
	self assert: (self eval: 'range(10).start') equals: 0.
	self assert: (self eval: 'range(10).step') equals: 1.
	"The point of them being values: arithmetic must work."
	self assert: (self eval: 'range(2, 20, 3).start + 1') equals: 3.
	self assert: (self eval: 'range(2, 20, 3).stop - range(2, 20, 3).start') equals: 18.
	self assert: (self eval: 'range(0, 10, 2).step * 5') equals: 10
%
