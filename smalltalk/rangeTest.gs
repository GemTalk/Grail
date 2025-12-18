! ------------------- Remove existing behavior from rangeTest
removeallmethods rangeTest
removeallclassmethods rangeTest
! ------------------- Class methods for rangeTest
! ------------------- Instance methods for rangeTest
category: 'done'
method: rangeTest
test__bool__

	self
		assert: (self targetInstance: (int ___value: 1) _: (int ___value: 1)) __bool__ equals: False;
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 0)) __bool__ equals: False;
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 1)) __bool__ equals: True;
		yourself.
%
category: 'done'
method: rangeTest
test__contains__

	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __contains__: (int ___value: 3)) equals: True.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __contains__: (int ___value: 5)) equals: True.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __contains__: (int ___value: 0)) equals: False.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __contains__: (int ___value: 10)) equals: False.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __contains__: (int ___value: 0)) equals: False.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __contains__: (int ___value: 10)) equals: False.
%
category: 'done'
method: rangeTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__bool__' '__contains__' '__getitem__' '__iter__' '__len__' '__reversed__' 'count' 'index' 'start' 'step' 'stop')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 11."
   self assert: (dir __contains__: (self str: '__bool__')).
   #pyTodo. "self assert: (dir __contains__: #__contains__)."
   #pyTodo. "self assert: (dir __contains__: #__getitem__)."
   #pyTodo. "self assert: (dir __contains__: #__iter__)."
   self assert: (dir __contains__: (self str: '__len__')).
   #pyTodo. "self assert: (dir __contains__: #__reversed__)."
   #pyTodo. "self assert: (dir __contains__: #count)."
   #pyTodo. "self assert: (dir __contains__: #index)."
   self assert: (dir __contains__: (self str: 'start')).
   self assert: (dir __contains__: (self str: 'step')).
   self assert: (dir __contains__: (self str: 'stop')).
%
category: 'done'
method: rangeTest
test__doc__
	"range.__doc__ should return a str"

	| doc |
	doc := (range __call__: (int ___value: 10)) __doc__.
	self assert: (doc isKindOf: str).
%
category: 'done'
method: rangeTest
test__eq__

	"Test range equality"
	| r1 r2 r3 |
	r1 := self targetInstance: (int ___value: 0) _: (int ___value: 10).
	r2 := self targetInstance: (int ___value: 0) _: (int ___value: 10) _: (int ___value: 1).
	r3 := self targetInstance: (int ___value: 0) _: (int ___value: 10) _: (int ___value: 2).

	"Same effective range should be equal"
	self assert: (r1 __eq__: r2) equals: True.

	"Different ranges should not be equal"
	self assert: (r1 __eq__: r3) equals: False.

	"Empty ranges are equal"
	self assert: ((self targetInstance: (int ___value: 0) _: (int ___value: 0)) __eq__: (self targetInstance: (int ___value: 5) _: (int ___value: 5))) equals: True.
%
category: 'done'
method: rangeTest
test__getitem__

	"Test basic indexing"
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __getitem__: (int ___value: 1)) equals: (int ___value: 2).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __getitem__: (int ___value: 3)) equals: (int ___value: 4).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __getitem__: (int ___value: 1)) equals: (int ___value: 3).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __getitem__: (int ___value: 3)) equals: (int ___value: 7).
%
category: 'done'
method: rangeTest
test__getitem__negative

	"Test negative indexing"
	| r |
	r := self targetInstance: (int ___value: 0) _: (int ___value: 10) _: (int ___value: 2).
	self assert: (r __getitem__: (int ___value: -1)) equals: (int ___value: 8).
	self assert: (r __getitem__: (int ___value: -2)) equals: (int ___value: 6).
%
category: 'done'
method: rangeTest
test__getitem__outOfRange

	"Test index out of range"
	| r |
	r := self targetInstance: (int ___value: 0) _: (int ___value: 5).
	self should: [r __getitem__: (int ___value: 10)] raise: IndexError.
	self should: [r __getitem__: (int ___value: -10)] raise: IndexError.
%
category: 'done'
method: rangeTest
test__getitem__slice

	"Test slicing a range: r[1:3]"
	| r sliced s |
	r := self targetInstance: (int ___value: 0) _: (int ___value: 10) _: (int ___value: 2).
	"r = range(0, 10, 2) -> [0, 2, 4, 6, 8]"

	s := slice __call__: (int ___value: 1) _: (int ___value: 3) _: None.
	sliced := r __getitem__: s.
	"r[1:3] -> range(2, 6, 2) -> [2, 4]"
	self assert: sliced start equals: (int ___value: 2).
	self assert: sliced stop equals: (int ___value: 6).
	self assert: sliced step equals: (int ___value: 2).
%
category: 'done'
method: rangeTest
test__getitem__sliceReverse

	"Test reverse slicing: r[::-1]"
	| r sliced s |
	r := self targetInstance: (int ___value: 0) _: (int ___value: 5).
	"r = range(0, 5) -> [0, 1, 2, 3, 4]"

	s := slice __call__: None _: None _: (int ___value: -1).
	sliced := r __getitem__: s.
	"r[::-1] -> range(4, -1, -1) -> [4, 3, 2, 1, 0]"
	self assert: sliced start equals: (int ___value: 4).
	self assert: sliced stop equals: (int ___value: -1).
	self assert: sliced step equals: (int ___value: -1).
%
category: 'done'
method: rangeTest
test__getitem__sliceWithStep

	"Test slicing with step: r[::2]"
	| r sliced s |
	r := self targetInstance: (int ___value: 0) _: (int ___value: 10) _: (int ___value: 2).
	"r = range(0, 10, 2) -> [0, 2, 4, 6, 8]"

	s := slice __call__: (int ___value: 0) _: None _: (int ___value: 2).
	sliced := r __getitem__: s.
	"r[::2] -> range(0, 10, 4) -> [0, 4, 8]"
	self assert: sliced start equals: (int ___value: 0).
	self assert: sliced step equals: (int ___value: 4).
%
category: 'done'
method: rangeTest
test__hash__

	"Test range hashing"
	| r1 r2 r3 |
	r1 := self targetInstance: (int ___value: 0) _: (int ___value: 10).
	r2 := self targetInstance: (int ___value: 0) _: (int ___value: 10) _: (int ___value: 1).
	r3 := self targetInstance: (int ___value: 0) _: (int ___value: 10) _: (int ___value: 2).

	"Same ranges should have same hash"
	self assert: r1 __hash__ equals: r2 __hash__.

	"Hash should return int"
	self assert: (r1 __hash__ isKindOf: int).
%
category: 'done'
method: rangeTest
test__len__

	self
		assert: (self targetInstance: (int ___value: 1) _: (int ___value: 1)) __len__ equals: (int ___value: 0);
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 0)) __len__ equals: (int ___value: 0);
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 1)) __len__ equals: (int ___value: 1);
		assert: (self targetInstance: (int ___value: -1) _: (int ___value: -3) _: (int ___value: -1)) __len__ equals: (int ___value: 2);
		yourself.
%
category: 'done'
method: rangeTest
test__repr__

	| currentScope |
	currentScope := Variables new.
	self
		assert: (((currentScope at: #range) scope: currentScope positional: { int ___value: -2 } named: {})) __repr__ equals: (str ___value: 'range(-2)');
		assert: (self targetInstance: (int ___value: 1) _: (int ___value: 1)) __repr__ equals: (str ___value: 'range(1, 1)');
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 0)) __repr__ equals: (str ___value: 'range(0, 0)');
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 1)) __repr__ equals: (str ___value: 'range(0, 1)');
		assert: (self targetInstance: (int ___value: -5) _: (int ___value: -2)) __repr__ equals: (str ___value: 'range(-5, -2)');
		assert: (self targetInstance: (int ___value: -5) _: (int ___value: -2) _: (int ___value: 2)) __repr__ equals: (str ___value: 'range(-5, -2, 2)');
		assert: (self targetInstance: (int ___value: -1) _: (int ___value: -3) _: (int ___value: -1)) __repr__ equals: (str ___value: 'range(-1, -3, -1)');
		yourself.
%
category: 'done'
method: rangeTest
test__reversed__

	"Test reversed(range(...))"
	| r rev |
	r := self targetInstance: (int ___value: 0) _: (int ___value: 5).
	rev := r __reversed__.

	self assert: rev start equals: (int ___value: 4).
	self assert: rev stop equals: (int ___value: -1).
	self assert: rev step equals: (int ___value: -1).
%
category: 'done'
method: rangeTest
testcount

	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) count: (int ___value: 3)) equals: (int ___value: 1).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) count: (int ___value: 5)) equals: (int ___value: 1).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) count: (int ___value: 0)) equals: (int ___value: 0).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) count: (int ___value: 10)) equals: (int ___value: 0).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) count: (int ___value: 0)) equals: (int ___value: 0).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) count: (int ___value: 10)) equals: (int ___value: 0).
%
category: 'done'
method: rangeTest
testindex

	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) index: (int ___value: 1)) equals: (int ___value: 0).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) index: (int ___value: 3)) equals: (int ___value: 2).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) index: (int ___value: 1)) equals: (int ___value: 0).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) index: (int ___value: 3)) equals: (int ___value: 1).
%
category: 'done'
method: rangeTest
testindexNotFound

	self should: [(self targetInstance: (int ___value: 1) _: (int ___value: 10)) index: (int ___value: 100)] raise: ValueError.
%
category: 'done'
method: rangeTest
testSSS

	self
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 2)) start equals: (int ___value: 0);
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 2)) stop equals: (int ___value: 2);
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 2)) step equals: (int ___value: 1);
		assert: (self targetInstance: (int ___value: -1) _: (int ___value: 1) _: (int ___value: -1)) step equals: (int ___value: -1);
		yourself.
%
category: 'todo'
method: rangeTest
test__iter__

	#pyTodo
%
