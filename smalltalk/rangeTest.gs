! ------------------- Remove existing behavior from rangeTest
removeAllMethods rangeTest
removeAllClassMethods rangeTest
! ------------------- Class methods for rangeTest
! ------------------- Instance methods for rangeTest
set compile_env: 0
category: 'done'
method: rangeTest
test__bool__

	self
		deny:   (self targetInstance: 1 _: 1) __bool__;
		deny:   (self targetInstance: 0 _: 0) __bool__;
		assert: (self targetInstance: 0 _: 1) __bool__;
		yourself.
%
category: 'done'
method: rangeTest
test__contains__

	self assert: ((self targetInstance: 1 _: 10) __contains__: 3).
	self assert: ((self targetInstance: 1 _: 10 _: 2) __contains__: 5).
	self deny: ((self targetInstance: 1 _: 10) __contains__: 0).
	self deny: ((self targetInstance: 1 _: 10) __contains__: 10).
	self deny: ((self targetInstance: 1 _: 10 _: 2) __contains__: 0).
	self deny: ((self targetInstance: 1 _: 10 _: 2) __contains__: 10)
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
   	self assert: ((self targetInstance: 1 _: 10) __getItem__: 1) equals: 2.
	self assert: ((self targetInstance: 1 _: 10) __getItem__: 3) equals: 4.
	self assert: ((self targetInstance: 1 _: 10 _: 2) __getItem__: 1) equals: 3.
	self assert: ((self targetInstance: 1 _: 10 _: 2) __getItem__: 3) equals: 7
%
category: 'done'
method: rangeTest
test__len__

	self
		assert: (self targetInstance: 1 _: 1) __len__ equals: 0;
		assert: (self targetInstance: 0 _: 0) __len__ equals: 0;
		assert: (self targetInstance: 0 _: 1) __len__ equals: 1;
		assert: (self targetInstance: -1 _: -3 _:-1) __len__ equals: 2;
		yourself.
%
category: 'done'
method: rangeTest
testcount

	self assert: ((self targetInstance: 1 _: 10) count: 3)       equals: 1.
	self assert: ((self targetInstance: 1 _: 10 _: 2) count: 5)  equals: 1.
	self assert: ((self targetInstance: 1 _: 10) count: 0)       equals: 0.
	self assert: ((self targetInstance: 1 _: 10) count: 10)      equals: 0.
	self assert: ((self targetInstance: 1 _: 10 _: 2) count: 0)  equals: 0.
	self assert: ((self targetInstance: 1 _: 10 _: 2) count: 10) equals: 0
%
category: 'done'
method: rangeTest
testindex
   	self assert: ((self targetInstance: 1 _: 10) index: 1) equals: 1.
	self assert: ((self targetInstance: 1 _: 10) index: 3) equals: 3.
	self assert: ((self targetInstance: 1 _: 10 _: 2) index: 1) equals: 1.
	self assert: ((self targetInstance: 1 _: 10 _: 2) index: 3) equals: 2
%
category: 'done'
method: rangeTest
testSSS

	self
		assert: (self targetInstance: 0 _: 2) start equals: 0;
		assert: (self targetInstance: 0 _: 2) stop equals: 2;
		assert: (self targetInstance: 0 _: 2) step equals: 1;
		assert: (self targetInstance: -1 _: 1 _:-1) step equals: -1;
		yourself.
%
set compile_env: 0
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
