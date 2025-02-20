! ------------------- Remove existing behavior from rangeTest
removeallmethods rangeTest
removeallclassmethods rangeTest
! ------------------- Class methods for rangeTest
! ------------------- Instance methods for rangeTest
category: 'done'
method: rangeTest
test__bool__

	self
		deny:   (self targetInstance: (int ___value: 1) _: (int ___value: 1)) __bool__;
		deny:   (self targetInstance: (int ___value: 0) _: (int ___value: 0)) __bool__;
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 1)) __bool__;
		yourself.
%
category: 'done'
method: rangeTest
test__contains__

	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __contains__: 3).
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __contains__: 5).
	self deny: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __contains__: 0).
	self deny: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __contains__: 10).
	self deny: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __contains__: 0).
	self deny: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __contains__: 10)
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
test__getitem__
   	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __getItem__: 1) equals: 2.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) __getItem__: 3) equals: 4.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __getItem__: 1) equals: 3.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) __getItem__: 3) equals: 7
%
category: 'done'
method: rangeTest
test__len__

	self
		assert: (self targetInstance: (int ___value: 1) _: (int ___value: 1)) __len__ equals: 0;
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 0)) __len__ equals: 0;
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 1)) __len__ equals: 1;
		assert: (self targetInstance: (int ___value: -1) _: (int ___value: -3) _: (int ___value: -1)) __len__ equals: 2;
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
testcount

	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) count: 3)       equals: 1.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) count: 5)  equals: 1.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) count: 0)       equals: 0.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) count: 10)      equals: 0.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) count: 0)  equals: 0.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) count: 10) equals: 0
%
category: 'done'
method: rangeTest
testindex
   	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) index: 1) equals: 1.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10)) index: 3) equals: 3.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) index: 1) equals: 1.
	self assert: ((self targetInstance: (int ___value: 1) _: (int ___value: 10) _: (int ___value: 2)) index: 3) equals: 2
%
category: 'done'
method: rangeTest
testSSS

	self
		assert: (self targetInstance: (int ___value: 0)  _: (int ___value: 2)) start equals: 0;
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 2)) stop equals: 2;
		assert: (self targetInstance: (int ___value: 0) _: (int ___value: 2)) step equals: 1;
		assert: (self targetInstance: (int ___value: -1) _: (int ___value: 1) _: (int ___value: -1)) step equals: -1;
		yourself.
%
category: 'todo'
method: rangeTest
test__iter__
   #pyTodo
%
category: 'todo'
method: rangeTest
test__reversed__
   #pyTodo
%
