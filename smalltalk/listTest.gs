! ------------------- Remove existing behavior from listTest
removeallmethods listTest
removeallclassmethods listTest
! ------------------- Class methods for listTest
! ------------------- Instance methods for listTest
category: 'done'
method: listTest
test__add__
   | list lost |
	list := self targetInstance __add__: { 'o' }.

	lost := self targetInstance __add__: { '1'. '2' }.

	self
		assert: (list __add__: self targetInstance) __len__ equals: (self int: 1);
		assert: (list __add__: lost) __len__ equals: (self int: 3);
		assert: (list __add__: lost) __len__ equals: (self int: 3);   " still the same lenght"
 		assert: ((list __add__: lost) __getitem__: (self int: -1)) equals: '2';
		yourself
%
category: 'done'
method: listTest
test__add__anElement

	self
		should: [self targetInstance __add__: 23]
		raise: TypeError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'can only concatenate list (not "SmallInteger") to list'];
		yourself.
%
category: 'done'
method: listTest
test__contains__onEmptyList
   	self
		deny: (self targetInstance __contains__: 'x');
		yourself.
%
category: 'done'
method: listTest
test__delitem__
   | list |
	list := self targetInstance __add__: { 'o' }.
	list __delitem__: 0.

	self
		deny:(list __contains__: 'o');
		assert: list __len__ equals: (self int: 0);
		yourself
%
category: 'done'
method: listTest
test__delitem__negative
   | list |
	list := self targetInstance __add__: { 'o' }.
	list __delitem__: -1.

	self
		assert: list __len__ equals: (self int: 0);
		deny: (list __contains__: 'o');
		yourself
%
category: 'done'
method: listTest
test__delitem__outOfRange

	self
		should: [self targetInstance __delitem__: 0]
		raise: IndexError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'list assignment index out of range'];
		yourself.
%
category: 'done'
method: listTest
test__delslice__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	list __delslice__: 1 _: 2.

	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: 0)) equals: 'a';
		assert: (list __getitem__: (self int: 1)) equals: 'c';
		assert: (list __getitem__: (self int: 2)) equals: 'd';
		yourself
%
category: 'done'
method: listTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__add__' '__class__' '__class_getitem__' '__contains__' '__delattr__' '__delitem__' '__dir__' '__doc__' '__eq__' '__format__' '__ge__' '__getattribute__' '__getitem__' '__gt__' '__hash__' '__iadd__' '__imul__' '__init__' '__init_subclass__' '__iter__' '__le__' '__len__' '__lt__' '__mul__' '__ne__' '__new__' '__reduce__' '__reduce_ex__' '__repr__' '__reversed__' '__rmul__' '__setattr__' '__setitem__' '__sizeof__' '__str__' '__subclasshook__' 'append' 'clear' 'copy' 'count' 'extend' 'index' 'insert' 'pop' 'remove' 'reverse' 'sort')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: (self int: 47)."
   self assert: (dir __contains__: (self str: '__add__')).
   self assert: (dir __contains__: (self str: '__class__')).
   #pyTodo. "self assert: (dir __contains__: #__class_getitem__)."
   self assert: (dir __contains__: (self str: '__contains__')).
   self assert: (dir __contains__: (self str: '__delattr__')).
   self assert: (dir __contains__: (self str: '__delitem__')).
   self assert: (dir __contains__: (self str: '__dir__')).
   self assert: (dir __contains__: (self str: '__doc__')).
   self assert: (dir __contains__: (self str: '__eq__')).
   self assert: (dir __contains__: (self str: '__format__')).
   self assert: (dir __contains__: (self str: '__ge__')).
   self assert: (dir __contains__: (self str: '__getattribute__')).
   self assert: (dir __contains__: (self str: '__getitem__')).
   self assert: (dir __contains__: (self str: '__gt__')).
   self assert: (dir __contains__: (self str: '__hash__')).
   #pyTodo. "self assert: (dir __contains__: #__iadd__)."
   self assert: (dir __contains__: (self str: '__imul__')).
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
   self assert: (dir __contains__: (self str: '__reversed__')).
   #pyTodo. "self assert: (dir __contains__: #__rmul__)."
   self assert: (dir __contains__: (self str: '__setattr__')).
   self assert: (dir __contains__: (self str: '__setitem__')).
   self assert: (dir __contains__: (self str: '__sizeof__')).
   self assert: (dir __contains__: (self str: '__str__')).
   self assert: (dir __contains__: (self str: '__subclasshook__')).
   self assert: (dir __contains__: (self str: 'append')).
   self assert: (dir __contains__: (self str: 'clear')).
   self assert: (dir __contains__: (self str: 'copy')).
   self assert: (dir __contains__: (self str: 'count')).
   self assert: (dir __contains__: (self str: 'extend')).
   self assert: (dir __contains__: (self str: 'index')).
   self assert: (dir __contains__: (self str: 'insert')).
   self assert: (dir __contains__: (self str: 'pop')).
   self assert: (dir __contains__: (self str: 'remove')).
   self assert: (dir __contains__: (self str: 'reverse')).
   self assert: (dir __contains__: (self str: 'sort')).
%
category: 'done'
method: listTest
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
method: listTest
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
method: listTest
test__getitem__negative
   | list |
	list := self targetInstance __add__: { 'o' }.

	self
		assert: (list __getitem__: (self int: -1)) equals: 'o';
		yourself
%
category: 'done'
method: listTest
test__getitem__outOfRange

	self
		should: [self targetInstance __getitem__: (self int: 0)]
		raise: IndexError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'list index out of range'];
		yourself.
%
category: 'done'
method: listTest
test__getslice__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: (list __getslice__: (self int: 1) _: (self int: 2)) __len__ equals: (self int: 1);
		assert: ((list __getslice__: (self int: 1) _: (self int: 2)) __getitem__: (self int: 0)) equals: 'b';
		assert: (list __getslice__: (self int: 1) _: (self int: 3)) __len__ equals: (self int: 2);
		assert: ((list __getslice__: (self int: 1) _: (self int: 3)) __getitem__: (self int: 1)) equals: 'c';
		assert: (list __getslice__: (self int: 1) _: (self int: 10)) __len__ equals: (self int: 3);
		yourself
%
category: 'done'
method: listTest
test__gt__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		assert: (list __gt__: (self targetInstance __add__: { '1'. '2' }));
		deny:   (list __gt__: (self targetInstance __add__: { '1'. '2'. '3' }));
		deny:   (list __gt__: (self targetInstance __add__: { '1'. '2'. '3'. '0' }));
		assert: (list __gt__: (self targetInstance __add__: { '1'. '2'. '2' }));
		deny:   (list __gt__: (self targetInstance __add__: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: listTest
test__iadd__
   | list lost |
	list := self targetInstance: { 'o' }.

	lost := self targetInstance: { '1'. '2' }.

	self
		assert: (list __iadd__: lost) __len__ equals: (self int: 3);
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: -1)) equals: '2';
		yourself
%
category: 'done'
method: listTest
test__imul__
   | list |
	list := self targetInstance __add__: { 'a'. 'b' }.

	self
		assert: (list __imul__: 1) equals: (self targetInstance __add__: { 'a'. 'b' });
		assert: (list __imul__: 2) equals: (self targetInstance __add__: { 'a'. 'b'. 'a'. 'b'  });
		assert: (list __imul__: 2) equals: list;
		yourself
%
category: 'done'
method: listTest
test__le__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		deny:   (list __le__: (self targetInstance __add__: { '1'. '2' }));
		assert: (list __le__: (self targetInstance __add__: { '1'. '2'. '3' }));
		assert: (list __le__: (self targetInstance __add__: { '1'. '2'. '3'. '0' }));
		deny:   (list __le__: (self targetInstance __add__: { '1'. '2'. '2' }));
		assert: (list __le__: (self targetInstance __add__: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: listTest
test__len__onEmptyList
   	self
		assert: self targetInstance __len__ equals: (self int: 0);
		yourself.
%
category: 'done'
method: listTest
test__lt__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		deny:   (list __lt__: (self targetInstance __add__: { '1'. '2' }));
		deny:   (list __lt__: (self targetInstance __add__: { '1'. '2'. '3' }));
		assert: (list __lt__: (self targetInstance __add__: { '1'. '2'. '3'. '0' }));
		deny:   (list __lt__: (self targetInstance __add__: { '1'. '2'. '2' }));
		assert: (list __lt__: (self targetInstance __add__: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: listTest
test__mul__
   | list |
	list := self targetInstance __add__: { 'a'. 'b' }.

	self
		assert: (list __mul__: (self int: 1)) equals: (self targetInstance __add__: { 'a'. 'b' });
		assert: (list __mul__: (self int: 2)) equals: (self targetInstance __add__: { 'a'. 'b'. 'a'. 'b'  });
		deny:   (list __mul__: (self int: 3)) equals: list;
		yourself
%
category: 'done'
method: listTest
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
method: listTest
test__repr__
   | list |
	list := self targetInstance __add__: {str ___value: 'a'. str ___value: 'b'. str ___value: 'c'. str ___value: 'd' }.

	self
		assert: list __repr__ ___value equals: '[''a'', ''b'', ''c'', ''d'']';
		yourself.

	#pyElaborate  " should be somesthing like 'list new __add__: { ''a''. ''b''. ''c''. ''d'' }' ?"
%
category: 'done'
method: listTest
test__reversed__
   | x |
	x := list ___value: { 'a'. 'b'. 'c' }.

	self
		assert: x __reversed__ __len__ equals: (self int: 3);
		assert: (x __reversed__ __getitem__:  (self int: 0)) equals: 'c';
		assert: (x __reversed__ __getitem__: (self int: -1)) equals: 'a';
		assert: (x __getitem__:  (self int: 0)) equals: 'a';
		assert: (x __getitem__: (self int: -1)) equals: 'c';
		yourself
%
category: 'done'
method: listTest
test__rmul__
   | x |
	x := list ___value: { 'a'. 'b' }.

	self
		assert: (x __rmul__: (self int: 1)) equals: (list ___value: { 'a'. 'b' });
		assert: (x __rmul__: (self int: 2)) equals: (list ___value: { 'a'. 'b'. 'a'. 'b' });
		deny:   (x __rmul__: (self int: 2)) equals: x;
		yourself
%
category: 'done'
method: listTest
test__setitem__
   | x |
	x := list ___value: { self str: 'o' }.
	x __setitem__: (self str: 'u') _: (self int: 0).

	self
		deny:(x __contains__: (self str: 'o'));
		assert:(x __contains__: (self str: 'u'));
		assert: x __len__ equals: (self int: 1);
		yourself
%
category: 'done'
method: listTest
test__setitem__negative
   | list |
	list := self targetInstance __add__: { self str:'o' }.
	list __setitem__: (self str: 'u') _: (self int: -1).

	self
		deny:(list __contains__: (self str: 'o'));
		assert:(list __contains__: (self str: 'u'));
		assert: list __len__ equals: (self int: 1);
		yourself
%
category: 'done'
method: listTest
test__setslice__replacing
	| list |
	list := self targetInstance __add__: {'a' . 'b' . 'c' . 'd'}.
	list __setslice__: 1 _: 2 _: 'y'.
	self
		assert: list __len__ equals: (self int: 4);
		assert: (list __getitem__: (self int: 1)) equals: 'y';
		yourself
%
category: 'done'
method: listTest
test__setslice__withOneSpot
	| list |
	list := self targetInstance __add__: {'a' . 'b' . 'c' . 'd'}.
	list __setslice__: 1 _: 1 _: 'y'.
	self
		assert: list __len__ equals: (self int: 5);
		assert: (list __getitem__: (self int: 1)) equals: 'y';
		yourself
%
category: 'done'
method: listTest
test__setslice__zipping
	| list |
	list := self targetInstance __add__: {'a' . 'b' . 'c' . 'd'}.
	list __setslice__: 1 _: 3 _: 'y'.
	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: 1)) equals: 'y';
		yourself
%
category: 'done'
method: listTest
test__str__
   | list |
	list := self targetInstance __add__: {str ___value: 'a'. str ___value: 'b'. str ___value: 'c'. str ___value: 'd' }.

	self
		assert: list __str__ ___value equals: '[''a'', ''b'', ''c'', ''d'']';
		yourself
%
category: 'done'
method: listTest
testappend
   | list |
	list := self targetInstance __add__: { self str: 'a'. self str: 'b'. self str: 'c' }.

	list append: (self str: 'o').

	self
		assert: list __len__ equals: (self int: 4);
		assert: (list __contains__: (self str: 'o'));
		assert: (list __getitem__: (self int: -1)) equals: (self str: 'o');
		yourself
%
category: 'done'
method: listTest
testclear
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	list clear.
	self
		assert: list __len__ equals: (self int: 0);
		yourself
%
category: 'done'
method: listTest
testcopy
   | list lost |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	lost := list copy.
   list __delitem__: 0.
	self
		assert: lost __len__ equals: (self int: 3);
		assert: (lost __getitem__:  (self int: 0)) equals: 'a';
		assert: (lost __getitem__: (self int: -1)) equals: 'c';
		yourself
%
category: 'done'
method: listTest
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
method: listTest
testextendWithElement
   | list |
	list := self targetInstance __add__: { 'o' }.

	self
		assert: (list extend: self targetInstance) __len__ equals: (self int: 1);
		assert: (list extend: '2') __len__ equals: (self int: 2);
		assert: (list extend: 'lost') __len__ equals: (self int: 3);
		yourself
%
category: 'done'
method: listTest
testextendWithList
   | list lost |
	list := self targetInstance __add__: { 'o' }.

	lost := self targetInstance __add__: { '1'. '2' }.

	self
		assert: (list extend: self targetInstance) __len__ equals: (self int: 1);
		assert: (list extend: lost) __len__ equals: (self int: 3);
		assert: (list extend: lost) __len__ equals: (self int: 5);
		yourself
%
category: 'done'
method: listTest
testindex
   | list |
	list := self targetInstance __add__: { (self str: 'a'). (self str: 'b'). (self str: 'c'). (self str: 'b') }.

	self
		assert: (list index: (self str: 'b')) equals: (self int: 1);
		assert: (list index: (self str: 'b') from: (self int: 2)) equals: (self int: 3);
		assert: (list index: (self str: 'b') from: (self int: 3)) equals: (self int: 3);
		should: [list index: (self str: 'b') from: (self int: 2) to: (self int: 2)]
		raise: ValueError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: '''b'' is not in list'];
		should: [list index: (self str: 'b') from: (self int: 3) to: (self int: 3)]
		raise: ValueError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: '''b'' is not in list'];
		yourself
%
category: 'done'
method: listTest
testinsertBeforeLast
	| list |
	list := self targetInstance __add__: {'a'}.
	list insert: -1 _: 'c'.
	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __getitem__: (self int: 0)) equals: 'c';
		assert: (list __getitem__: (self int: 1)) equals: 'a';
		yourself
%
category: 'done'
method: listTest
testinsertBeforeRange
	| list |
	list := self targetInstance __add__: {'a'}.
	list insert: -5 _: 'c'.
	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __getitem__: (self int: 0)) equals: 'c';
		assert: (list __getitem__: (self int: 1)) equals: 'a';
		yourself
%
category: 'done'
method: listTest
testinsertInRange
	| list |
	list := self targetInstance __add__: {'a' . 'b'}.
	list insert: 1 _: 'c'.
	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: 0)) equals: 'a';
		assert: (list __getitem__: (self int: 1)) equals: 'c';
		assert: (list __getitem__: (self int: 2)) equals: 'b';
		yourself
%
category: 'done'
method: listTest
testinsertPassRange
	| list |
	list := self targetInstance __add__: {'a'}.
	list insert: 5 _: 'c'.
	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __getitem__: (self int: 0)) equals: 'a';
		assert: (list __getitem__: (self int: 1)) equals: 'c';
		yourself
%
category: 'done'
method: listTest
testpop
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	self
		assert: (list pop) equals: 'c';
		assert: list __len__ equals: (self int: 2);
		yourself
%
category: 'done'
method: listTest
testpopNegaive
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	self
		assert: (list pop: -1) equals: 'c';
		assert: list __len__ equals: (self int: 2);
		yourself
%
category: 'done'
method: listTest
testpopPassNegative
   | list |
	list := self targetInstance __add__: { 'a' }.

	self
		should: [list pop: -2]
		raise: IndexError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'pop index out of range'];
		yourself
%
category: 'done'
method: listTest
testpopPassPositive
   | list |
	list := self targetInstance __add__: { 'a' }.

	self
		should: [list pop: 2]
		raise: IndexError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'pop index out of range'];
		yourself
%
category: 'done'
method: listTest
testpopPositive
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	self
		assert: (list pop: 0) equals: 'a';
		assert: list __len__ equals: (self int: 2);
		yourself
%
category: 'done'
method: listTest
testremove
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'b' }.
	list remove: 'b'.

	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: 0)) equals: 'a';
		assert: (list __getitem__: (self int: 1)) equals: 'c';
		assert: (list __getitem__: (self int: 2)) equals: 'b';
		yourself
%
category: 'done'
method: listTest
testremoveIfAbsent
   | list |
	list := self targetInstance.

	self
		should: [list remove: 'e']
		raise: ValueError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'list.remove(x): x not in list'];
		yourself
%
category: 'done'
method: listTest
testreverse
   | x |
	x := self targetInstance __add__: (list ___value: { 'a'. 'b'. 'c' }).
	x reverse.

	self
		assert: x __len__ equals: (self int: 3);
		assert: (x __getitem__: (self int: 0)) equals: 'c';
		assert: (x __getitem__: (self int: -1)) equals: 'a';
		yourself
%
category: 'done'
method: listTest
testsort
   | x |
	x := self targetInstance __add__: (list ___value: { 'c'. 'b'. 'a' }).
	x sort.

	self
		assert: x __len__ equals: (self int: 3);
		assert: (x __getitem__: (self int: 0)) equals: 'a';
		assert: (x __getitem__: (self int: -1)) equals: 'c';
		yourself
%
category: 'todo'
method: listTest
test__class_getitem__
   #pyTodo
%
category: 'todo'
method: listTest
test__init_subclass__
   #pyTodo
%
category: 'todo'
method: listTest
test__iter__
   #pyTodo
%
category: 'todo'
method: listTest
test__reduce__
   #pyTodo
%
category: 'todo'
method: listTest
test__reduce_ex__
   #pyTodo
%
category: 'todo'
method: listTest
test__sizeof__
   #pyTodo
%
category: 'todo'
method: listTest
testsortWithDict
#pyTodo
"
   | x |
	x := list ___value: { 'c'. 'bb'. 'aaa' }.
	x sort: (Dictionary with: #key -> [:each | each size]
								  with: #reverse -> true).

	self
		assert: x __len__ equals: (self int: 3);
		assert: (x __getitem__:  0) equals: 'aaa';
		assert: (x __getitem__: -1) equals: 'c';
		yourself
"
%
category: 'todo'
method: listTest
testsortWithKey
#pyTodo
"
   | x |
	x := list ___value: { 'c'. 'bb'. 'aaa' }.
	x sort: (Dictionary with: #key -> [:each | each size]).

	self
		assert: x __len__ equals: (self int: 3);
		assert: (x __getitem__:  0) equals: 'c';
		assert: (x __getitem__: -1) equals: 'aaa';
		yourself
"
%
