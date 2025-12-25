! ===============================================================================
! RangeTestCase - Tests for Python range type (mapped to GemStone Interval)
! ===============================================================================

set compile_env: 0

category: 'Tests - Initialization'
method: RangeTestCase
test__new__oneArg
	"Test range(stop)"

	| result |
	"range(5) creates 0, 1, 2, 3, 4"
	result := Interval ___new___: Interval _: 5.
	self assert: (result perform: #start env: 2) equals: 0.
	self assert: (result perform: #stop env: 2) equals: 5.
	self assert: (result perform: #step env: 2) equals: 1.
	self assert: (result ___len___) equals: 5.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__twoArgs
	"Test range(start, stop)"

	| result |
	"range(2, 7) creates 2, 3, 4, 5, 6"
	result := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 2. 7}.
	self assert: (result perform: #start env: 2) equals: 2.
	self assert: (result perform: #stop env: 2) equals: 7.
	self assert: (result perform: #step env: 2) equals: 1.
	self assert: (result ___len___) equals: 5.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__threeArgs
	"Test range(start, stop, step)"

	| result |
	"range(0, 10, 2) creates 0, 2, 4, 6, 8"
	result := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 2}.
	self assert: (result perform: #start env: 2) equals: 0.
	self assert: (result perform: #stop env: 2) equals: 10.
	self assert: (result perform: #step env: 2) equals: 2.
	self assert: (result ___len___) equals: 5.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__negativeStep
	"Test range with negative step"

	| result |
	"range(10, 0, -2) creates 10, 8, 6, 4, 2"
	result := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 10. 0. -2}.
	self assert: (result perform: #start env: 2) equals: 10.
	self assert: (result perform: #stop env: 2) equals: 0.
	self assert: (result perform: #step env: 2) equals: -2.
	self assert: (result ___len___) equals: 5.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__emptyRange
	"Test empty ranges"

	| result |
	"range(0, 0) is empty"
	result := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 0}.
	self assert: (result ___len___) equals: 0.
	
	"range(5, 5) is empty"
	result := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 5. 5}.
	self assert: (result ___len___) equals: 0.
%

category: 'Tests - Initialization'
method: RangeTestCase
test__new__zeroStepRaisesError
	"Test that step=0 raises ValueError"

	self 
		should: [Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 0}]
		raise: ValueError.
%

category: 'Tests - Attributes'
method: RangeTestCase
test_startStopStep
	"Test start, stop, step attributes"

	| r |
	r := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 1. 10. 2}.
	self assert: (r perform: #start env: 2) equals: 1.
	self assert: (r perform: #stop env: 2) equals: 10.
	self assert: (r perform: #step env: 2) equals: 2.
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__len__
	"Test len(range(...))"

	| r |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 10}.
	self assert: (r ___len___) equals: 10.
	
	r := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 2}.
	self assert: (r ___len___) equals: 5.
	
	r := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 10. 0. -1}.
	self assert: (r ___len___) equals: 10.
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__getitem__
	"Test indexing: r[i]"

	| r |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 5. 10}.
	"r = range(5, 10) -> [5, 6, 7, 8, 9]"
	self assert: (r perform: #__getitem__: env: 2 withArguments: {0}) equals: 5.
	self assert: (r perform: #__getitem__: env: 2 withArguments: {1}) equals: 6.
	self assert: (r perform: #__getitem__: env: 2 withArguments: {4}) equals: 9.
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__getitem__negative
	"Test negative indexing: r[-1]"

	| r |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 10}.
	"r = range(0, 10) -> [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
	self assert: (r perform: #__getitem__: env: 2 withArguments: {-1}) equals: 9.
	self assert: (r perform: #__getitem__: env: 2 withArguments: {-2}) equals: 8.
	self assert: (r perform: #__getitem__: env: 2 withArguments: {-10}) equals: 0.
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__getitem__outOfRange
	"Test index out of range raises IndexError"

	| r |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 5}.
	self should: [r perform: #__getitem__: env: 2 withArguments: {10}] raise: IndexError.
	self should: [r perform: #__getitem__: env: 2 withArguments: {-10}] raise: IndexError.
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__contains__
	"Test membership: x in range(...)"

	| r |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 10}.
	self assert: (r ___contains___: 5).
	self deny: (r ___contains___: 10).
	self deny: (r ___contains___: -1).

	"Test with step"
	r := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 2}.
	self assert: (r ___contains___: 4).
	self deny: (r ___contains___: 5).
%

category: 'Tests - Sequence Protocol'
method: RangeTestCase
test__bool__
	"Test bool(range(...))"

	| r |
	"Empty range is False"
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 0}.
	self deny: (r perform: #__bool__ env: 2).

	"Non-empty range is True"
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 1}.
	self assert: (r perform: #__bool__ env: 2).
%

category: 'Tests - Comparison'
method: RangeTestCase
test__eq__
	"Test range equality"

	| r1 r2 r3 |
	r1 := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 10}.
	r2 := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 1}.
	r3 := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 2}.

	"Same ranges are equal"
	self assert: (r1 perform: #__eq__: env: 2 withArguments: {r2}).

	"Different ranges are not equal"
	self deny: (r1 perform: #__eq__: env: 2 withArguments: {r3}).

	"Empty ranges are equal"
	r1 := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 0}.
	r2 := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 5. 5}.
	self assert: (r1 perform: #__eq__: env: 2 withArguments: {r2}).
%

category: 'Tests - Comparison'
method: RangeTestCase
test__ne__
	"Test range inequality"

	| r1 r2 |
	r1 := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 10}.
	r2 := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 2}.

	self assert: (r1 perform: #__ne__: env: 2 withArguments: {r2}).
	self deny: (r1 perform: #__ne__: env: 2 withArguments: {r1}).
%

category: 'Tests - Hashing'
method: RangeTestCase
test__hash__
	"Test range hashing"

	| r1 r2 h1 h2 |
	r1 := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 10}.
	r2 := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 1}.

	h1 := r1 perform: #__hash__ env: 2.
	h2 := r2 perform: #__hash__ env: 2.

	"Same ranges should have same hash"
	self assert: h1 equals: h2.
%

category: 'Tests - String Representation'
method: RangeTestCase
test__repr__
	"Test repr(range(...))"

	| r result |
	"range(5) shows just stop"
	r := Interval ___new___: Interval _: 5.
	result := r perform: #__repr__ env: 2.
	self assert: result equals: 'range(5)'.

	"range(1, 5) shows start and stop"
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 1. 5}.
	result := r perform: #__repr__ env: 2.
	self assert: result equals: 'range(1, 5)'.

	"range(0, 10, 2) shows all three"
	r := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 0. 10. 2}.
	result := r perform: #__repr__ env: 2.
	self assert: result equals: 'range(0, 10, 2)'.
%

category: 'Tests - Sequence Methods'
method: RangeTestCase
test_count
	"Test range.count(x)"

	| r |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 10}.
	self assert: (r perform: #count: env: 2 withArguments: {5}) equals: 1.
	self assert: (r perform: #count: env: 2 withArguments: {10}) equals: 0.
	self assert: (r perform: #count: env: 2 withArguments: {-1}) equals: 0.
%

category: 'Tests - Sequence Methods'
method: RangeTestCase
test_index
	"Test range.index(x)"

	| r |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 5. 10}.
	"r = range(5, 10) -> [5, 6, 7, 8, 9]"
	self assert: (r perform: #index: env: 2 withArguments: {5}) equals: 0.
	self assert: (r perform: #index: env: 2 withArguments: {7}) equals: 2.
	self assert: (r perform: #index: env: 2 withArguments: {9}) equals: 4.
%

category: 'Tests - Sequence Methods'
method: RangeTestCase
test_indexNotFound
	"Test range.index(x) raises ValueError when not found"

	| r |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 10}.
	self should: [r perform: #index: env: 2 withArguments: {10}] raise: ValueError.
	self should: [r perform: #index: env: 2 withArguments: {-1}] raise: ValueError.
%

category: 'Tests - Iteration'
method: RangeTestCase
test__reversed__
	"Test reversed(range(...))"

	| r rev |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 5}.
	rev := r perform: #__reversed__ env: 2.

	"reversed(range(0, 5)) -> range(4, -1, -1)"
	self assert: (rev perform: #start env: 2) equals: 4.
	self assert: (rev perform: #stop env: 2) equals: -1.
	self assert: (rev perform: #step env: 2) equals: -1.
	self assert: (rev ___len___) equals: 5.
%

category: 'Tests - Iteration'
method: RangeTestCase
test__reversed__empty
	"Test reversed() on empty range"

	| r rev |
	r := Interval perform: #__new__:_:_: env: 2 withArguments: {Interval. 0. 0}.
	rev := r perform: #__reversed__ env: 2.

	self assert: (rev ___len___) equals: 0.
%

