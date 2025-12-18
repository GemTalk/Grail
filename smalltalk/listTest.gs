! ------------------- Remove existing behavior from listTest
removeallmethods listTest
removeallclassmethods listTest
! ------------------- Class methods for listTest
! ------------------- Instance methods for listTest
category: 'done'
method: listTest
test__add__

	| list lost |
	list := self list: { 'o' }.
	lost := self list: { '1'. '2' }.

	self
		assert: (list __add__: self targetInstance) __len__ equals: (self int: 1);
		assert: (list __add__: lost) __len__ equals: (self int: 3);
		assert: (list __add__: lost) __len__ equals: (self int: 3);   " still the same length"
		assert: ((list __add__: lost) __getitem__: (self int: -1)) equals: (self str: '2');
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
		deny: (self targetInstance __contains__: (self str: 'x'));
		yourself.
%
category: 'done'
method: listTest
test__delitem__

	| list |
	list := self list: { 'o' }.
	list __delitem__: 0.

	self
		deny: (list __contains__: (self str: 'o'));
		assert: list __len__ equals: (self int: 0);
		yourself
%
category: 'done'
method: listTest
test__delitem__negative

	| list |
	list := self list: { 'o' }.
	list __delitem__: -1.

	self
		assert: list __len__ equals: (self int: 0);
		deny: (list __contains__: (self str: 'o'));
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
	list := self list: { 'a'. 'b'. 'c'. 'd' }.

	list __delslice__: 1 _: 2.

	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: 0)) equals: (self str: 'a');
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'c');
		assert: (list __getitem__: (self int: 2)) equals: (self str: 'd');
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
test__doc__
	"list.__doc__ should return a str"

	| doc |
	doc := list __call__ __doc__.
	self assert: (doc isKindOf: str).
%
category: 'done'
method: listTest
test__eq__

	| list |
	list := self list: { '1'. '2'. '3' }.

	self
		deny:   (list __eq__: (self list: { '1'. '2' }));
		assert: (list __eq__: (self list: { '1'. '2'. '3' }));
		deny:   (list __eq__: (self list: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: listTest
test__ge__

	| list |
	list := self list: { '1'. '2'. '3' }.

	self
		assert: (list __ge__: (self list: { '1'. '2' }));
		assert: (list __ge__: (self list: { '1'. '2'. '3' }));
		deny:   (list __ge__: (self list: { '1'. '2'. '3'. '0' }));
		assert: (list __ge__: (self list: { '1'. '2'. '2' }));
		deny:   (list __ge__: (self list: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: listTest
test__getitem__negative

	| list |
	list := self list: { 'o' }.

	self
		assert: (list __getitem__: (self int: -1)) equals: (self str: 'o');
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
test__getitem__slice

	| myList s |
	myList := self list: { 'a'. 'b'. 'c'. 'd' }.

	"list[1:2]"
	s := slice __call__: (self int: 1) _: (self int: 2) _: None.
	self assert: (myList __getitem__: s) __len__ equals: (self int: 1).
	self assert: ((myList __getitem__: s) __getitem__: (self int: 0)) equals: (self str: 'b').

	"list[1:3]"
	s := slice __call__: (self int: 1) _: (self int: 3) _: None.
	self assert: (myList __getitem__: s) __len__ equals: (self int: 2).
	self assert: ((myList __getitem__: s) __getitem__: (self int: 1)) equals: (self str: 'c').

	"list[1:10] - out of bounds is OK for slices"
	s := slice __call__: (self int: 1) _: (self int: 10) _: None.
	self assert: (myList __getitem__: s) __len__ equals: (self int: 3).
%
category: 'done'
method: listTest
test__getitem__sliceStepZeroError
	"Slice step of 0 should raise ValueError"

	| x s |
	x := list ___value: ((0 to: 9) collect: [:each | int ___value: each]).
	s := slice __call__: None _: None _: (self int: 0).

	self should: [x __getitem__: s] raise: ValueError.
%
category: 'done'
method: listTest
test__getitem__sliceWithNegativeStep
	"Test slice with negative step: x[::-1] reverses the list"

	| x result s |
	"x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
	x := list ___value: ((0 to: 9) collect: [:each | int ___value: each]).

	"x[::-1] = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]"
	s := slice __call__: None _: None _: (self int: -1).
	result := x __getitem__: s.
	self assert: result __len__ equals: (self int: 10).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 9).
	self assert: (result __getitem__: (self int: 9)) equals: (self int: 0).

	"x[::-2] = [9, 7, 5, 3, 1]"
	s := slice __call__: None _: None _: (self int: -2).
	result := x __getitem__: s.
	self assert: result __len__ equals: (self int: 5).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 9).
	self assert: (result __getitem__: (self int: 4)) equals: (self int: 1).

	"x[8:2:-1] = [8, 7, 6, 5, 4, 3]"
	s := slice __call__: (self int: 8) _: (self int: 2) _: (self int: -1).
	result := x __getitem__: s.
	self assert: result __len__ equals: (self int: 6).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 8).
	self assert: (result __getitem__: (self int: 5)) equals: (self int: 3).

	"x[8:2:-2] = [8, 6, 4]"
	s := slice __call__: (self int: 8) _: (self int: 2) _: (self int: -2).
	result := x __getitem__: s.
	self assert: result __len__ equals: (self int: 3).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 8).
	self assert: (result __getitem__: (self int: 1)) equals: (self int: 6).
	self assert: (result __getitem__: (self int: 2)) equals: (self int: 4).
%
category: 'done'
method: listTest
test__getitem__sliceWithStep
	"Test slice with step: s[i:j:k]"

	| x result s |
	"x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
	x := list ___value: ((0 to: 9) collect: [:each | int ___value: each]).

	"x[::2] = [0, 2, 4, 6, 8]"
	s := slice __call__: None _: None _: (self int: 2).
	result := x __getitem__: s.
	self assert: result __len__ equals: (self int: 5).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 0).
	self assert: (result __getitem__: (self int: 2)) equals: (self int: 4).
	self assert: (result __getitem__: (self int: 4)) equals: (self int: 8).

	"x[1::2] = [1, 3, 5, 7, 9]"
	s := slice __call__: (self int: 1) _: None _: (self int: 2).
	result := x __getitem__: s.
	self assert: result __len__ equals: (self int: 5).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 1).
	self assert: (result __getitem__: (self int: 4)) equals: (self int: 9).

	"x[::3] = [0, 3, 6, 9]"
	s := slice __call__: None _: None _: (self int: 3).
	result := x __getitem__: s.
	self assert: result __len__ equals: (self int: 4).
	self assert: (result __getitem__: (self int: 1)) equals: (self int: 3).

	"x[1:7:2] = [1, 3, 5]"
	s := slice __call__: (self int: 1) _: (self int: 7) _: (self int: 2).
	result := x __getitem__: s.
	self assert: result __len__ equals: (self int: 3).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 1).
	self assert: (result __getitem__: (self int: 1)) equals: (self int: 3).
	self assert: (result __getitem__: (self int: 2)) equals: (self int: 5).
%
category: 'done'
method: listTest
test__gt__

	| list |
	list := self list: { '1'. '2'. '3' }.

	self
		assert: (list __gt__: (self list: { '1'. '2' }));
		deny:   (list __gt__: (self list: { '1'. '2'. '3' }));
		deny:   (list __gt__: (self list: { '1'. '2'. '3'. '0' }));
		assert: (list __gt__: (self list: { '1'. '2'. '2' }));
		deny:   (list __gt__: (self list: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: listTest
test__hash__unhashable
	"Lists are not hashable in Python"

	self
		should: [(self list: { 'a'. 'b' }) __hash__]
		raise: TypeError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'unhashable type: ''list'''];
		yourself.
%
category: 'done'
method: listTest
test__iadd__

	| list lost |
	list := self list: { 'o' }.
	lost := self list: { '1'. '2' }.

	self
		assert: (list __iadd__: lost) __len__ equals: (self int: 3);
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: -1)) equals: (self str: '2');
		yourself
%
category: 'done'
method: listTest
test__imul__

	| list |
	list := self list: { 'a'. 'b' }.

	self
		assert: (list __imul__: 1) equals: (self list: { 'a'. 'b' });
		assert: (list __imul__: 2) equals: (self list: { 'a'. 'b'. 'a'. 'b' });
		assert: (list __imul__: 2) equals: list;
		yourself
%
category: 'done'
method: listTest
test__le__

	| list |
	list := self list: { '1'. '2'. '3' }.

	self
		deny:   (list __le__: (self list: { '1'. '2' }));
		assert: (list __le__: (self list: { '1'. '2'. '3' }));
		assert: (list __le__: (self list: { '1'. '2'. '3'. '0' }));
		deny:   (list __le__: (self list: { '1'. '2'. '2' }));
		assert: (list __le__: (self list: { '1'. '2'. '4' }));
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
	list := self list: { '1'. '2'. '3' }.

	self
		deny:   (list __lt__: (self list: { '1'. '2' }));
		deny:   (list __lt__: (self list: { '1'. '2'. '3' }));
		assert: (list __lt__: (self list: { '1'. '2'. '3'. '0' }));
		deny:   (list __lt__: (self list: { '1'. '2'. '2' }));
		assert: (list __lt__: (self list: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: listTest
test__mul__

	| list |
	list := self list: { 'a'. 'b' }.

	self
		assert: (list __mul__: (self int: 1)) equals: (self list: { 'a'. 'b' });
		assert: (list __mul__: (self int: 2)) equals: (self list: { 'a'. 'b'. 'a'. 'b' });
		deny:   (list __mul__: (self int: 3)) equals: list;
		yourself
%
category: 'done'
method: listTest
test__ne__

	| list |
	list := self list: { '1'. '2'. '3' }.

	self
		assert: (list __ne__: (self list: { '1'. '2' }));
		deny:   (list __ne__: (self list: { '1'. '2'. '3' }));
		assert: (list __ne__: (self list: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: listTest
test__repr__

	| list |
	list := self list: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: list __repr__ ___value equals: '[''a'', ''b'', ''c'', ''d'']';
		yourself.

	#pyElaborate  " should be something like 'list new __add__: { ''a''. ''b''. ''c''. ''d'' }' ?"
%
category: 'done'
method: listTest
test__reversed__

	| x |
	x := self list: { 'a'. 'b'. 'c' }.

	self
		assert: x __reversed__ __len__ equals: (self int: 3);
		assert: (x __reversed__ __getitem__:  (self int: 0)) equals: (self str: 'c');
		assert: (x __reversed__ __getitem__: (self int: -1)) equals: (self str: 'a');
		assert: (x __getitem__:  (self int: 0)) equals: (self str: 'a');
		assert: (x __getitem__: (self int: -1)) equals: (self str: 'c');
		yourself
%
category: 'done'
method: listTest
test__rmul__

	| x |
	x := self list: { 'a'. 'b' }.

	self
		assert: (x __rmul__: (self int: 1)) equals: (self list: { 'a'. 'b' });
		assert: (x __rmul__: (self int: 2)) equals: (self list: { 'a'. 'b'. 'a'. 'b' });
		deny:   (x __rmul__: (self int: 2)) equals: x;
		yourself
%
category: 'done'
method: listTest
test__setitem__

	| x |
	x := self list: { 'o' }.
	x __setitem__: (self str: 'u') _: (self int: 0).

	self
		deny: (x __contains__: (self str: 'o'));
		assert: (x __contains__: (self str: 'u'));
		assert: x __len__ equals: (self int: 1);
		yourself
%
category: 'done'
method: listTest
test__setitem__negative

	| list |
	list := self list: { 'o' }.
	list __setitem__: (self str: 'u') _: (self int: -1).

	self
		deny: (list __contains__: (self str: 'o'));
		assert: (list __contains__: (self str: 'u'));
		assert: list __len__ equals: (self int: 1);
		yourself
%
category: 'done'
method: listTest
test__setslice__replacing

	| list |
	list := self list: { 'a'. 'b'. 'c'. 'd' }.
	list __setslice__: 1 _: 2 _: (self str: 'y').
	self
		assert: list __len__ equals: (self int: 4);
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'y');
		yourself
%
category: 'done'
method: listTest
test__setslice__withOneSpot

	| list |
	list := self list: { 'a'. 'b'. 'c'. 'd' }.
	list __setslice__: 1 _: 1 _: (self str: 'y').
	self
		assert: list __len__ equals: (self int: 5);
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'y');
		yourself
%
category: 'done'
method: listTest
test__setslice__zipping

	| list |
	list := self list: { 'a'. 'b'. 'c'. 'd' }.
	list __setslice__: 1 _: 3 _: (self str: 'y').
	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'y');
		yourself
%
category: 'done'
method: listTest
test__str__

	| list |
	list := self list: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: list __str__ ___value equals: '[''a'', ''b'', ''c'', ''d'']';
		yourself
%
category: 'done'
method: listTest
testappend

	| list |
	list := self list: { 'a'. 'b'. 'c' }.

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
	list := self list: { 'a'. 'b'. 'c' }.
	list clear.
	self
		assert: list __len__ equals: (self int: 0);
		yourself
%
category: 'done'
method: listTest
testcopy

	| list lost |
	list := self list: { 'a'. 'b'. 'c' }.

	lost := list copy.
	list __delitem__: 0.
	self
		assert: lost __len__ equals: (self int: 3);
		assert: (lost __getitem__:  (self int: 0)) equals: (self str: 'a');
		assert: (lost __getitem__: (self int: -1)) equals: (self str: 'c');
		yourself
%
category: 'done'
method: listTest
testcount

	| list |
	list := self list: { 'a'. 'b'. 'c'. 'b' }.

	self
		assert: (list count: (self str: 'a')) equals: 1;
		assert: (list count: (self str: 'b')) equals: 2;
		assert: (list count: (self str: 'z')) equals: 0;
		yourself
%
category: 'done'
method: listTest
testextendWithElement

	| list |
	list := self list: { 'o' }.

	self
		assert: (list extend: self targetInstance) __len__ equals: (self int: 1);
		assert: (list extend: (self str: '2')) __len__ equals: (self int: 2);
		assert: (list extend: (self str: 'lost')) __len__ equals: (self int: 3);
		yourself
%
category: 'done'
method: listTest
testextendWithList

	| list lost |
	list := self list: { 'o' }.
	lost := self list: { '1'. '2' }.

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
	list := self list: { 'a'. 'b'. 'c'. 'b' }.

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
	list := self list: { 'a' }.
	list insert: -1 _: (self str: 'c').
	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __getitem__: (self int: 0)) equals: (self str: 'c');
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'a');
		yourself
%
category: 'done'
method: listTest
testinsertBeforeRange

	| list |
	list := self list: { 'a' }.
	list insert: -5 _: (self str: 'c').
	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __getitem__: (self int: 0)) equals: (self str: 'c');
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'a');
		yourself
%
category: 'done'
method: listTest
testinsertInRange

	| list |
	list := self list: { 'a'. 'b' }.
	list insert: 1 _: (self str: 'c').
	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: 0)) equals: (self str: 'a');
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'c');
		assert: (list __getitem__: (self int: 2)) equals: (self str: 'b');
		yourself
%
category: 'done'
method: listTest
testinsertPassRange

	| list |
	list := self list: { 'a' }.
	list insert: 5 _: (self str: 'c').
	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __getitem__: (self int: 0)) equals: (self str: 'a');
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'c');
		yourself
%
category: 'done'
method: listTest
testpop

	| list |
	list := self list: { 'a'. 'b'. 'c' }.

	self
		assert: list pop equals: (self str: 'c');
		assert: list __len__ equals: (self int: 2);
		yourself
%
category: 'done'
method: listTest
testpopNegaive

	| list |
	list := self list: { 'a'. 'b'. 'c' }.

	self
		assert: (list pop: -1) equals: (self str: 'c');
		assert: list __len__ equals: (self int: 2);
		yourself
%
category: 'done'
method: listTest
testpopPassNegative

	| list |
	list := self list: { 'a' }.

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
	list := self list: { 'a' }.

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
	list := self list: { 'a'. 'b'. 'c' }.

	self
		assert: (list pop: 0) equals: (self str: 'a');
		assert: list __len__ equals: (self int: 2);
		yourself
%
category: 'done'
method: listTest
testremove

	| list |
	list := self list: { 'a'. 'b'. 'c'. 'b' }.
	list remove: (self str: 'b').

	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __getitem__: (self int: 0)) equals: (self str: 'a');
		assert: (list __getitem__: (self int: 1)) equals: (self str: 'c');
		assert: (list __getitem__: (self int: 2)) equals: (self str: 'b');
		yourself
%
category: 'done'
method: listTest
testremoveIfAbsent

	| list |
	list := self targetInstance.

	self
		should: [list remove: (self str: 'e')]
		raise: ValueError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'list.remove(x): x not in list'];
		yourself
%
category: 'done'
method: listTest
testreverse

	| x |
	x := self list: { 'a'. 'b'. 'c' }.
	x reverse.

	self
		assert: x __len__ equals: (self int: 3);
		assert: (x __getitem__: (self int: 0)) equals: (self str: 'c');
		assert: (x __getitem__: (self int: -1)) equals: (self str: 'a');
		yourself
%
category: 'done'
method: listTest
testsort

	| x |
	x := self list: { 'c'. 'b'. 'a' }.
	x sort.

	self
		assert: x __len__ equals: (self int: 3);
		assert: (x __getitem__: (self int: 0)) equals: (self str: 'a');
		assert: (x __getitem__: (self int: -1)) equals: (self str: 'c');
		yourself
%
category: 'done'
method: listTest
testsortWithKey
	"Test sort with key function (sort by length)"

	| x |
	x := self list: { 'aaa'. 'b'. 'cc' }.
	x sort: (Dictionary with: #key -> [:each | each __len__ ___value]).

	self
		assert: x __len__ equals: (self int: 3);
		assert: (x __getitem__: (self int: 0)) equals: (self str: 'b');
		assert: (x __getitem__: (self int: 1)) equals: (self str: 'cc');
		assert: (x __getitem__: (self int: 2)) equals: (self str: 'aaa');
		yourself
%
category: 'done'
method: listTest
testsortWithKeyAndReverse
	"Test sort with both key function and reverse flag"

	| x |
	x := self list: { 'c'. 'bb'. 'aaa' }.
	x sort: (Dictionary
		with: #key -> [:each | each __len__ ___value]
		with: #reverse -> true).

	self
		assert: x __len__ equals: (self int: 3);
		assert: (x __getitem__: (self int: 0)) equals: (self str: 'aaa');
		assert: (x __getitem__: (self int: -1)) equals: (self str: 'c');
		yourself
%
category: 'done'
method: listTest
testsortWithReverse
	"Test sort with reverse flag"

	| x |
	x := list ___value: ((1 to: 5) collect: [:each | int ___value: each]).
	x sort: (Dictionary with: #reverse -> true).

	self
		assert: x __len__ equals: (self int: 5);
		assert: (x __getitem__: (self int: 0)) equals: (self int: 5);
		assert: (x __getitem__: (self int: 4)) equals: (self int: 1);
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
