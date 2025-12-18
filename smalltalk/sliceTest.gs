! ------------------- Remove existing behavior from sliceTest
removeallmethods sliceTest
removeallclassmethods sliceTest
! ------------------- Class methods for sliceTest
! ------------------- Instance methods for sliceTest
category: 'done'
method: sliceTest
test__call__oneArg

	"slice(stop) creates slice(None, stop, None)"
	| s |
	s := slice __call__: (int ___value: 5).
	self assert: s start equals: None.
	self assert: s stop equals: (int ___value: 5).
	self assert: s step equals: None.
%
category: 'done'
method: sliceTest
test__call__threeArgs

	"slice(start, stop, step) creates slice(start, stop, step)"
	| s |
	s := slice __call__: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2).
	self assert: s start equals: (int ___value: 1).
	self assert: s stop equals: (int ___value: 10).
	self assert: s step equals: (int ___value: 2).
%
category: 'done'
method: sliceTest
test__call__twoArgs

	"slice(start, stop) creates slice(start, stop, None)"
	| s |
	s := slice __call__: (int ___value: 1) _: (int ___value: 5).
	self assert: s start equals: (int ___value: 1).
	self assert: s stop equals: (int ___value: 5).
	self assert: s step equals: None.
%
category: 'done'
method: sliceTest
test__eq__

	"Test slice equality"
	| s1 s2 s3 |
	s1 := slice __call__: (int ___value: 1) _: (int ___value: 5) _: (int ___value: 2).
	s2 := slice __call__: (int ___value: 1) _: (int ___value: 5) _: (int ___value: 2).
	s3 := slice __call__: (int ___value: 1) _: (int ___value: 5) _: (int ___value: 3).

	self assert: (s1 __eq__: s2) equals: True.
	self assert: (s1 __eq__: s3) equals: False.
%
category: 'done'
method: sliceTest
test__hash__unhashable

	"Slices are not hashable"
	| s |
	s := slice __call__: (int ___value: 5).
	self should: [s __hash__] raise: TypeError.
%
category: 'done'
method: sliceTest
test__repr__

	"Test slice repr"
	| s |
	s := slice __call__: (int ___value: 1) _: (int ___value: 5) _: (int ___value: 2).
	self assert: s __repr__ equals: (str ___value: 'slice(1, 5, 2)').

	s := slice __call__: None _: (int ___value: 5) _: None.
	self assert: s __repr__ equals: (str ___value: 'slice(None, 5, None)').
%
category: 'done'
method: sliceTest
testindices

	"Test slice.indices(length)"
	| s indices |
	s := slice __call__: (int ___value: 1) _: (int ___value: 5) _: (int ___value: 2).
	indices := s indices: (int ___value: 10).
	self assert: (indices ___value at: 1) equals: (int ___value: 1).
	self assert: (indices ___value at: 2) equals: (int ___value: 5).
	self assert: (indices ___value at: 3) equals: (int ___value: 2).
%
category: 'done'
method: sliceTest
testindicesNegativeStep

	"Test slice.indices with negative step"
	| s indices |
	s := slice __call__: None _: None _: (int ___value: -1).
	indices := s indices: (int ___value: 5).
	"slice(None, None, -1).indices(5) = (4, -1, -1)"
	self assert: (indices ___value at: 1) equals: (int ___value: 4).
	self assert: (indices ___value at: 2) equals: (int ___value: -1).
	self assert: (indices ___value at: 3) equals: (int ___value: -1).
%
category: 'done'
method: sliceTest
testListWithSliceObject

	"Test using a slice object with list.__getitem__:"
	| myList s result |
	myList := list ___value: #(0 1 2 3 4 5 6 7 8 9).
	s := slice __call__: None _: None _: (int ___value: 2).
	result := myList __getitem__: s.
	self assert: (result isKindOf: list).
	self assert: result __len__ equals: (int ___value: 5).
	self assert: (result __getitem__: (int ___value: 0)) equals: 0.
	self assert: (result __getitem__: (int ___value: 1)) equals: 2.
	self assert: (result __getitem__: (int ___value: 2)) equals: 4.
%
category: 'done'
method: sliceTest
teststart

	| s |
	s := slice __call__: (int ___value: 1) _: (int ___value: 5) _: (int ___value: 2).
	self assert: s start equals: (int ___value: 1).

	s := slice __call__: (int ___value: 5).
	self assert: s start equals: None.
%
category: 'done'
method: sliceTest
teststep

	| s |
	s := slice __call__: (int ___value: 1) _: (int ___value: 5) _: (int ___value: 2).
	self assert: s step equals: (int ___value: 2).

	s := slice __call__: (int ___value: 1) _: (int ___value: 5).
	self assert: s step equals: None.
%
category: 'done'
method: sliceTest
teststop

	| s |
	s := slice __call__: (int ___value: 1) _: (int ___value: 5) _: (int ___value: 2).
	self assert: s stop equals: (int ___value: 5).

	s := slice __call__: (int ___value: 5).
	self assert: s stop equals: (int ___value: 5).
%
category: 'done'
method: sliceTest
testStrWithSliceObject

	"Test using a slice object with str.__getitem__:"
	| myStr s result |
	myStr := str ___value: 'hello'.
	s := slice __call__: (int ___value: 1) _: (int ___value: 4).
	result := myStr __getitem__: s.
	self assert: (result isKindOf: str).
	self assert: result equals: (str ___value: 'ell').
%
category: 'done'
method: sliceTest
testTupleWithSliceObject

	"Test using a slice object with tuple.__getitem__:"
	| myTuple s result |
	myTuple := tuple ___value: #(0 1 2 3 4).
	s := slice __call__: (int ___value: 1) _: (int ___value: 4).
	result := myTuple __getitem__: s.
	self assert: (result isKindOf: tuple).
	self assert: result __len__ equals: (int ___value: 3).
%
