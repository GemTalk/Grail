! ------------------- Remove existing behavior from tupleTest
removeAllMethods tupleTest
removeAllClassMethods tupleTest
! ------------------- Class methods for tupleTest
! ------------------- Instance methods for tupleTest
set compile_env: 0
category: 'done'
method: tupleTest
test__add__
   | list lost |
	list := self targetInstance __add__: (tuple ___value: { 'o' }).

	lost := self targetInstance __add__: (tuple ___value: { '1'. '2' }).

	self
		assert: (list __add__: self targetInstance) __len__ equals: (self int: 1);
		assert: (list __add__: lost) __len__ equals: (self int: 3);
		assert: (list __add__: lost) __len__ equals: (self int: 3);   " still the same lenght"
 		assert: ((list __add__: lost) __getitem__: -1) equals: '2';
		yourself
%
category: 'done'
method: tupleTest
test__contains__onEmptyList
   	self
		deny: (self targetInstance __contains__: 'x');
		yourself.
%
category: 'done'
method: tupleTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__add__' '__class__' '__class_getitem__' '__contains__' '__delattr__' '__dir__' '__doc__' '__eq__' '__format__' '__ge__' '__getattribute__' '__getitem__' '__getnewargs__' '__gt__' '__hash__' '__init__' '__init_subclass__' '__iter__' '__le__' '__len__' '__lt__' '__mul__' '__ne__' '__new__' '__reduce__' '__reduce_ex__' '__repr__' '__rmul__' '__setattr__' '__sizeof__' '__str__' '__subclasshook__' 'count' 'index')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: (self int: 34)."
   self assert: (dir __contains__: (self str: '__add__')).
   self assert: (dir __contains__: (self str: '__class__')).
   #pyTodo. "self assert: (dir __contains__: #__class_getitem__)."
   self assert: (dir __contains__: (self str: '__contains__')).
   self assert: (dir __contains__: (self str: '__delattr__')).
   self assert: (dir __contains__: (self str: '__dir__')).
   self assert: (dir __contains__: (self str: '__doc__')).
   self assert: (dir __contains__: (self str: '__eq__')).
   self assert: (dir __contains__: (self str: '__format__')).
   self assert: (dir __contains__: (self str: '__ge__')).
   self assert: (dir __contains__: (self str: '__getattribute__')).
   self assert: (dir __contains__: (self str: '__getitem__')).
   #pyTodo. "self assert: (dir __contains__: #__getnewargs__)."
   self assert: (dir __contains__: (self str: '__gt__')).
   self assert: (dir __contains__: (self str: '__hash__')).
   #pyTodo. "self assert: (dir __contains__: #__init__)."
   #pyTodo. "self assert: (dir __contains__: #__init_subclass__)."
   #pyTodo. "self assert: (dir __contains__: #__iter__)."
   self assert: (dir __contains__: (self str: '__le__')).
   self assert: (dir __contains__: (self str: '__len__')).
   self assert: (dir __contains__: (self str: '__lt__')).
   self assert: (dir __contains__: (self str: '__mul__')).
   self assert: (dir __contains__: (self str: '__ne__')).
   self assert: (dir __contains__: (self str: '__new__')).
   #pyTodo. "self assert: (dir __contains__: #__reduce__)."
   #pyTodo. "self assert: (dir __contains__: #__reduce_ex__)."
   self assert: (dir __contains__: (self str: '__repr__')).
   #pyTodo. "self assert: (dir __contains__: #__rmul__)."
   self assert: (dir __contains__: (self str: '__setattr__')).
   self assert: (dir __contains__: (self str: '__sizeof__')).
   self assert: (dir __contains__: (self str: '__str__')).
   self assert: (dir __contains__: (self str: '__subclasshook__')).
   self assert: (dir __contains__: (self str: 'count')).
   self assert: (dir __contains__: (self str: 'index')).
%
category: 'done'
method: tupleTest
test__eq__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		deny:   (list __eq__: (self targetInstance __add__: { '1'. '2' }));
		assert: (list __eq__: (self targetInstance __add__: { '1'. '2'. '3' }));
		deny:   (list __eq__: (self targetInstance __add__: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: tupleTest
test__ge__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		assert: (list __ge__: (self targetInstance __add__: { '1'. '2' }));
		assert: (list __ge__: (self targetInstance __add__: { '1'. '2'. '3' }));
		deny:   (list __ge__: (self targetInstance __add__: { '1'. '2'. '3'. '0' }));
		assert: (list __ge__: (self targetInstance __add__: { '1'. '2'. '2' }));
		deny:   (list __ge__: (self targetInstance __add__: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: tupleTest
test__getitem__negative
   | list |
	list := self targetInstance __add__: { 'o' }.

	self
		assert: (list __getitem__: -1) equals: 'o';
		yourself
%
category: 'done'
method: tupleTest
test__getitem__outOfRange

	self
		should: [self targetInstance __getitem__: 0]
		raise: IndexError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'tuple index out of range'];
		yourself.
%
category: 'done'
method: tupleTest
test__getslice__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: (  list __getslice__: (self int: 1) _: (self int: 2)) __len__ equals: (self int: 1);
		assert: ((list __getslice__: (self int: 1) _: (self int: 2)) __getitem__: 0) equals: 'b';
		assert: (  list __getslice__: (self int: 1) _: (self int: 3)) __len__ equals: (self int: 2);
		assert: ((list __getslice__: (self int: 1) _: (self int: 3)) __getitem__: 1) equals: 'c';
		assert: (  list __getslice__: (self int: 1) _: (self int: 10)) __len__ equals: (self int: 3);
		yourself
%
category: 'done'
method: tupleTest
test__gt__
   | list |
	list := tuple ___value: { '1'. '2'. '3' }.

	self
		assert: (list __gt__: (tuple ___value: { '1'. '2' }));
		deny:   (list __gt__: (tuple ___value: { '1'. '2'. '3' }));
		deny:   (list __gt__: (tuple ___value: { '1'. '2'. '3'. '0' }));
		assert: (list __gt__: (tuple ___value: { '1'. '2'. '2' }));
		deny:   (list __gt__: (tuple ___value: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: tupleTest
test__le__
   | x |
	x := tuple ___value: { '1'. '2'. '3' }.

	self
		deny:   (x __le__: (tuple ___value: { '1'. '2' }));
		assert: (x __le__: (tuple ___value: { '1'. '2'. '3' }));
		assert: (x __le__: (tuple ___value: { '1'. '2'. '3'. '0' }));
		deny:   (x __le__: (tuple ___value: { '1'. '2'. '2' }));
		assert: (x __le__: (tuple ___value: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: tupleTest
test__len__onEmptyList
   	self
		assert: self targetInstance __len__ equals: (self int: 0);
		yourself.
%
category: 'done'
method: tupleTest
test__lt__
   | x |
	x := tuple ___value: { '1'. '2'. '3' }.

	self
		deny:   (x __lt__: (tuple ___value: { '1'. '2' }));
		deny:   (x __lt__: (tuple ___value: { '1'. '2'. '3' }));
		assert: (x __lt__: (tuple ___value: { '1'. '2'. '3'. '0' }));
		deny:   (x __lt__: (tuple ___value: { '1'. '2'. '2' }));
		assert: (x __lt__: (tuple ___value: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: tupleTest
test__mul__
   | x |
	x := tuple ___value: { 'a'. 'b' }.

	self
		assert: (x __mul__: 1) equals: (tuple ___value: { 'a'. 'b' });
		assert: (x __mul__: 2) equals: (tuple ___value: { 'a'. 'b'. 'a'. 'b'  });
		deny:   (x __mul__: 2) equals: x;
		yourself
%
category: 'done'
method: tupleTest
test__ne__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		assert: (list __ne__: (self targetInstance __add__: { '1'. '2' }));
		deny:   (list __ne__: (self targetInstance __add__: { '1'. '2'. '3' }));
		assert: (list __ne__: (self targetInstance __add__: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: tupleTest
test__repr__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: list __repr__ equals: '(''a'', ''b'', ''c'', ''d'')';
		yourself.
	#pyElaborate  " should be somesthing like 'tuple new __add__: { ''a''. ''b''. ''c''. ''d'' }' ?"
%
category: 'done'
method: tupleTest
test__rmul__
   | list |
	list := self targetInstance __add__: { 'a'. 'b' }.

	self
		assert: (list __rmul__: 1) equals: (self targetInstance __add__: { 'a'. 'b' });
		assert: (list __rmul__: 2) equals: (self targetInstance __add__: { 'a'. 'b'. 'a'. 'b'  });
		deny:   (list __rmul__: 2) equals: list;
		yourself
%
category: 'done'
method: tupleTest
test__str__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: list __str__ equals: '(''a'', ''b'', ''c'', ''d'')';
		yourself
%
category: 'done'
method: tupleTest
testcount
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'b' }.

	self
		assert: (list count: 'a') equals: 1;
		assert: (list count: 'b') equals: 2;
		assert: (list count: 'z') equals: 0;
		yourself
%
category: 'done'
method: tupleTest
testindex
   | x |
	x := tuple ___value: { (self str: 'a'). (self str: 'b'). (self str: 'c'). (self str: 'b') }.

	self
		assert: (x index: (self str: 'b')) equals: (self int: 1);
		assert: (x index: (self str: 'b') from: (self int: 2)) equals: (self int: 3);
		assert: (x index: (self str: 'b') from: (self int: 3)) equals: (self int: 3);
		should: [x index: (self str: 'b') from: (self int: 2) to: (self int: 2)]
		raise: ValueError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: '''b'' is not in tuple'];
		should: [x index: (self str: 'b') from: (self int: 3) to: (self int: 3)]
		raise: ValueError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: '''b'' is not in tuple'];
		yourself
%
set compile_env: 0
category: 'todo'
method: tupleTest
test__class_getitem__
   #pyTodo
%
category: 'todo'
method: tupleTest
test__init_subclass__
   #pyTodo
%
category: 'todo'
method: tupleTest
test__iter__
   #pyTodo
%
category: 'todo'
method: tupleTest
test__reduce__
   #pyTodo
%
category: 'todo'
method: tupleTest
test__reduce_ex__
   #pyTodo
%
