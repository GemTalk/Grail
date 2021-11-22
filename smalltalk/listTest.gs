! ------------------- Remove existing behavior from listTest
removeAllMethods listTest
removeAllClassMethods listTest
! ------------------- Class methods for listTest
! ------------------- Instance methods for listTest
set compile_env: 0
category: 'done'
method: listTest
test__add__
   | list lost |
	list := self targetInstance __add__: { 'o' }.

	lost := self targetInstance __add__: { '1'. '2' }.

	self
		assert: ( list __add__: self targetInstance ) __len__ equals: 1;
		assert: ( list __add__: lost ) __len__ equals: 3;
		assert: ( list __add__: lost ) __len__ equals: 3;   " still the same lenght"
 		assert: ( ( list __add__: lost ) __getitem__: -1 ) equals: '2';
		yourself
%
category: 'done'
method: listTest
test__add__anElement

	self
		should: [ self targetInstance __add__: 23 ]
		raise: TypeError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'can only concatenate list (not "SmallInteger") to list' ];
		yourself.
%
category: 'done'
method: listTest
test__contains__onEmptyList
   	self
		deny: ( self targetInstance __contains__: 'x' );
		yourself.
%
category: 'done'
method: listTest
test__delitem__
   | list |
	list := self targetInstance __add__: { 'o' }.
	list __delitem__: 0.

	self
		deny:( list __contains__: 'o' );
		assert: list __len__ equals: 0;
		yourself
%
category: 'done'
method: listTest
test__delitem__negative
   | list |
	list := self targetInstance __add__: { 'o' }.
	list __delitem__: -1.

	self
		assert: list __len__ equals: 0;
		deny: ( list __contains__: 'o' );
		yourself
%
category: 'done'
method: listTest
test__delitem__outOfRange

	self
		should: [ self targetInstance __delitem__: 0 ]
		raise: IndexError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'list assignment index out of range' ];
		yourself.
%
category: 'done'
method: listTest
test__delslice__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	list __delslice__: 1 _: 2.

	self
		assert: list __len__ equals: 3;
		assert: ( list __getitem__: 0 ) equals: 'a';
		assert: ( list __getitem__: 1 ) equals: 'c';
		assert: ( list __getitem__: 2 ) equals: 'd';
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

   #pyTodo. "self assert: dir __len__ equals: 47.
"   self assert: ( dir __contains__: #__add__ ).
   self assert: ( dir __contains__: #__class__ ).
   #pyTodo. "self assert: ( dir __contains__: #__class_getitem__ ).
"   self assert: ( dir __contains__: #__contains__ ).
   self assert: ( dir __contains__: #__delattr__ ).
   self assert: ( dir __contains__: #__delitem__ ).
   self assert: ( dir __contains__: #__dir__ ).
   self assert: ( dir __contains__: #__doc__ ).
   self assert: ( dir __contains__: #__eq__ ).
   self assert: ( dir __contains__: #__format__ ).
   self assert: ( dir __contains__: #__ge__ ).
   self assert: ( dir __contains__: #__getattribute__ ).
   self assert: ( dir __contains__: #__getitem__ ).
   self assert: ( dir __contains__: #__gt__ ).
   self assert: ( dir __contains__: #__hash__ ).
   #pyTodo. "self assert: ( dir __contains__: #__iadd__ ).
"   self assert: ( dir __contains__: #__imul__ ).
   #pyTodo. "self assert: ( dir __contains__: #__init__ ).
"   #pyTodo. "self assert: ( dir __contains__: #__init_subclass__ ).
"   #pyTodo. "self assert: ( dir __contains__: #__iter__ ).
"   self assert: ( dir __contains__: #__le__ ).
   self assert: ( dir __contains__: #__len__ ).
   self assert: ( dir __contains__: #__lt__ ).
   self assert: ( dir __contains__: #__mul__ ).
   self assert: ( dir __contains__: #__ne__ ).
   self assert: ( dir __contains__: #__new__ ).
   #pyTodo. "self assert: ( dir __contains__: #__reduce__ ).
"   #pyTodo. "self assert: ( dir __contains__: #__reduce_ex__ ).
"   self assert: ( dir __contains__: #__repr__ ).
   self assert: ( dir __contains__: #__reversed__ ).
   #pyTodo. "self assert: ( dir __contains__: #__rmul__ ).
"   self assert: ( dir __contains__: #__setattr__ ).
   self assert: ( dir __contains__: #__setitem__ ).
   self assert: ( dir __contains__: #__sizeof__ ).
   self assert: ( dir __contains__: #__str__ ).
   self assert: ( dir __contains__: #__subclasshook__ ).
   self assert: ( dir __contains__: #append ).
   self assert: ( dir __contains__: #clear ).
   self assert: ( dir __contains__: #copy ).
   self assert: ( dir __contains__: #count ).
   self assert: ( dir __contains__: #extend ).
   self assert: ( dir __contains__: #index ).
   self assert: ( dir __contains__: #insert ).
   self assert: ( dir __contains__: #pop ).
   self assert: ( dir __contains__: #remove ).
   self assert: ( dir __contains__: #reverse ).
   self assert: ( dir __contains__: #sort ).
%
category: 'done'
method: listTest
test__eq__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		deny:   ( list __eq__: (self targetInstance __add__: { '1'. '2' } ) );
		assert: ( list __eq__: (self targetInstance __add__: { '1'. '2'. '3' } ) );
		deny:   ( list __eq__: (self targetInstance __add__: { '1'. '2'. '3'. '0' } ) );
		yourself
%
category: 'done'
method: listTest
test__ge__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		assert: ( list __ge__: (self targetInstance __add__: { '1'. '2' } ) );
		assert: ( list __ge__: (self targetInstance __add__: { '1'. '2'. '3' } ) );
		deny:   ( list __ge__: (self targetInstance __add__: { '1'. '2'. '3'. '0' } ) );
		assert: ( list __ge__: (self targetInstance __add__: { '1'. '2'. '2' } ) );
		deny:   ( list __ge__: (self targetInstance __add__: { '1'. '2'. '4' } ) );
		yourself
%
category: 'done'
method: listTest
test__getitem__negative
   | list |
	list := self targetInstance __add__: { 'o' }.

	self
		assert: ( list __getitem__: -1 ) equals: 'o';
		yourself
%
category: 'done'
method: listTest
test__getitem__outOfRange

	self
		should: [ self targetInstance __getitem__: 0 ]
		raise: IndexError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'list index out of range' ];
		yourself.
%
category: 'done'
method: listTest
test__getslice__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: ( list __getslice__: 1 _: 2 ) __len__ equals: 1;
		assert: ( ( list __getslice__: 1 _: 2 ) __getitem__: 0 )equals: 'b';
		assert: ( list __getslice__: 1 _: 3) __len__ equals: 2;
		assert: ( ( list __getslice__: 1 _: 3 ) __getitem__: 1 )equals: 'c';
		assert: ( list __getslice__: 1 _: 10) __len__ equals: 3;
		yourself
%
category: 'done'
method: listTest
test__gt__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		assert: ( list __gt__: (self targetInstance __add__: { '1'. '2' } ) );
		deny:   ( list __gt__: (self targetInstance __add__: { '1'. '2'. '3' } ) );
		deny:   ( list __gt__: (self targetInstance __add__: { '1'. '2'. '3'. '0' } ) );
		assert: ( list __gt__: (self targetInstance __add__: { '1'. '2'. '2' } ) );
		deny:   ( list __gt__: (self targetInstance __add__: { '1'. '2'. '4' } ) );
		yourself
%
category: 'done'
method: listTest
test__iadd__
   | list lost |
	list := self targetInstance: { 'o' }.

	lost := self targetInstance: { '1'. '2' }.

	self
		assert: ( list __iadd__: lost ) __len__ equals: 3;
		assert: list __len__ equals: 3;
		assert: ( list __getitem__: -1 ) equals: '2';
		yourself
%
category: 'done'
method: listTest
test__imul__
   | list |
	list := self targetInstance __add__: { 'a'. 'b' }.

	self
		assert: ( list __imul__: 1 ) equals: ( self targetInstance __add__: { 'a'. 'b' } );
		assert: ( list __imul__: 2 ) equals: ( self targetInstance __add__: { 'a'. 'b'. 'a'. 'b'  } );
		assert: ( list __imul__: 2 ) equals: list;
		yourself
%
category: 'done'
method: listTest
test__le__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		deny:   ( list __le__: (self targetInstance __add__: { '1'. '2' } ) );
		assert: ( list __le__: (self targetInstance __add__: { '1'. '2'. '3' } ) );
		assert: ( list __le__: (self targetInstance __add__: { '1'. '2'. '3'. '0' } ) );
		deny:   ( list __le__: (self targetInstance __add__: { '1'. '2'. '2' } ) );
		assert: ( list __le__: (self targetInstance __add__: { '1'. '2'. '4' } ) );
		yourself
%
category: 'done'
method: listTest
test__len__onEmptyList
   	self
		assert: self targetInstance __len__ equals: 0;
		yourself.
%
category: 'done'
method: listTest
test__lt__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		deny:   ( list __lt__: (self targetInstance __add__: { '1'. '2' } ) );
		deny:   ( list __lt__: (self targetInstance __add__: { '1'. '2'. '3' } ) );
		assert: ( list __lt__: (self targetInstance __add__: { '1'. '2'. '3'. '0' } ) );
		deny:   ( list __lt__: (self targetInstance __add__: { '1'. '2'. '2' } ) );
		assert: ( list __lt__: (self targetInstance __add__: { '1'. '2'. '4' } ) );
		yourself
%
category: 'done'
method: listTest
test__mul__
   | list |
	list := self targetInstance __add__: { 'a'. 'b' }.

	self
		assert: ( list __mul__: 1 ) equals: ( self targetInstance __add__: { 'a'. 'b' } );
		assert: ( list __mul__: 2 ) equals: ( self targetInstance __add__: { 'a'. 'b'. 'a'. 'b'  } );
		deny:   ( list __mul__: 2 ) equals: list;
		yourself
%
category: 'done'
method: listTest
test__ne__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		assert: ( list __ne__: (self targetInstance __add__: { '1'. '2' } ) );
		deny:   ( list __ne__: (self targetInstance __add__: { '1'. '2'. '3' } ) );
		assert: ( list __ne__: (self targetInstance __add__: { '1'. '2'. '3'. '0' } ) );
		yourself
%
category: 'done'
method: listTest
test__repr__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: list __str__ equals: '[''a'', ''b'', ''c'', ''d'']';
		yourself.

	#pyElaborate  " should be somesthing like 'list new __add__: { ''a''. ''b''. ''c''. ''d'' }' ?"
%
category: 'done'
method: listTest
test__reversed__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	self
		assert: list __reversed__ __len__ equals: 3;
		assert: ( list __reversed__ __getitem__:  0 ) equals: 'c';
		assert: ( list __reversed__ __getitem__: -1 ) equals: 'a';
		assert: ( list __getitem__:  0 ) equals: 'a';
		assert: ( list __getitem__: -1 ) equals: 'c';
		yourself
%
category: 'done'
method: listTest
test__rmul__
   | list |
	list := self targetInstance: { 'a'. 'b' }.

	self
		assert: ( list __rmul__: 1 ) equals: ( self targetInstance: { 'a'. 'b' } );
		assert: ( list __rmul__: 2 ) equals: ( self targetInstance: { 'a'. 'b'. 'a'. 'b'  } );
		deny:   ( list __rmul__: 2 ) equals: list;
		yourself
%
category: 'done'
method: listTest
test__setitem__
   | list |
	list := self targetInstance __add__: { 'o' }.
	list __setitem__: 'u' _: 0.

	self
		deny:( list __contains__: 'o' );
		assert:( list __contains__: 'u' );
		assert: list __len__ equals: 1;
		yourself
%
category: 'done'
method: listTest
test__setitem__negative
   | list |
	list := self targetInstance __add__: { 'o' }.
	list __setitem__: 'u' _: -1.

	self
		deny:( list __contains__: 'o' );
		assert:( list __contains__: 'u' );
		assert: list __len__ equals: 1;
		yourself
%
category: 'done'
method: listTest
test__setslice__replacing
	| list |
	list := self targetInstance __add__: {'a' . 'b' . 'c' . 'd'}.
	list __setslice__: 1 _: 2 _: 'y'.
	self
		assert: list __len__ equals: 4;
		assert: (list __getitem__: 1) equals: 'y';
		yourself
%
category: 'done'
method: listTest
test__setslice__withOneSpot
	| list |
	list := self targetInstance __add__: {'a' . 'b' . 'c' . 'd'}.
	list __setslice__: 1 _: 1 _: 'y'.
	self
		assert: list __len__ equals: 5;
		assert: (list __getitem__: 1) equals: 'y';
		yourself
%
category: 'done'
method: listTest
test__setslice__zipping
	| list |
	list := self targetInstance __add__: {'a' . 'b' . 'c' . 'd'}.
	list __setslice__: 1 _: 3 _: 'y'.
	self
		assert: list __len__ equals: 3;
		assert: (list __getitem__: 1) equals: 'y';
		yourself
%
category: 'done'
method: listTest
test__str__
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: list __str__ equals: '[''a'', ''b'', ''c'', ''d'']';
		yourself
%
category: 'done'
method: listTest
testappend
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	list append: 'o'.

	self
		assert: list __len__ equals: 4;
		assert: ( list __contains__: 'o' );
		assert: ( list __getitem__: -1 ) equals: 'o';
		yourself
%
category: 'done'
method: listTest
testclear
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	list clear.
	self
		assert: list __len__ equals: 0;
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
		assert: lost __len__ equals: 3;
		assert: ( lost __getitem__:  0 ) equals: 'a';
		assert: ( lost __getitem__: -1 ) equals: 'c';
		yourself
%
category: 'done'
method: listTest
testcount
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'b' }.

	self
		assert: ( list count: 'a' ) equals: 1;
		assert: ( list count: 'b' ) equals: 2;
		assert: ( list count: 'z' ) equals: 0;
		yourself
%
category: 'done'
method: listTest
testextendWithElement
   | list |
	list := self targetInstance __add__: { 'o' }.

	self
		assert: ( list extend: self targetInstance ) __len__ equals: 1;
		assert: ( list extend: '2' ) __len__ equals: 2;
		assert: ( list extend: 'lost' ) __len__ equals: 3;
		yourself
%
category: 'done'
method: listTest
testextendWithList
   | list lost |
	list := self targetInstance __add__: { 'o' }.

	lost := self targetInstance __add__: { '1'. '2' }.

	self
		assert: ( list extend: self targetInstance ) __len__ equals: 1;
		assert: ( list extend: lost ) __len__ equals: 3;
		assert: ( list extend: lost ) __len__ equals: 5;
		yourself
%
category: 'done'
method: listTest
testindex
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'b' }.

	self
		assert: ( list index: 'b' ) equals: 1;
		assert: ( list index: 'b' from: 2 ) equals: 3;
		assert: ( list index: 'b' from: 3 ) equals: 3;
		should: [ list index: 'b' from: 2 to: 2 ]
		raise: ValueError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: '''b'' is not in list' ];
		should: [ list index: 'b' from: 3 to: 3 ]
		raise: ValueError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: '''b'' is not in list' ];
		yourself
%
category: 'done'
method: listTest
testinsertBeforeLast
	| list |
	list := self targetInstance __add__: {'a'}.
	list insert: -1 _: 'c'.
	self
		assert: list __len__ equals: 2;
		assert: (list __getitem__: 0) equals: 'c';
		assert: (list __getitem__: 1) equals: 'a';
		yourself
%
category: 'done'
method: listTest
testinsertBeforeRange
	| list |
	list := self targetInstance __add__: {'a'}.
	list insert: -5 _: 'c'.
	self
		assert: list __len__ equals: 2;
		assert: (list __getitem__: 0) equals: 'c';
		assert: (list __getitem__: 1) equals: 'a';
		yourself
%
category: 'done'
method: listTest
testinsertInRange
	| list |
	list := self targetInstance __add__: {'a' . 'b'}.
	list insert: 1 _: 'c'.
	self
		assert: list __len__ equals: 3;
		assert: (list __getitem__: 0) equals: 'a';
		assert: (list __getitem__: 1) equals: 'c';
		assert: (list __getitem__: 2) equals: 'b';
		yourself
%
category: 'done'
method: listTest
testinsertPassRange
	| list |
	list := self targetInstance __add__: {'a'}.
	list insert: 5 _: 'c'.
	self
		assert: list __len__ equals: 2;
		assert: (list __getitem__: 0) equals: 'a';
		assert: (list __getitem__: 1) equals: 'c';
		yourself
%
category: 'done'
method: listTest
testpop
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	self
		assert: ( list pop ) equals: 'c';
		assert: list __len__ equals: 2;
		yourself
%
category: 'done'
method: listTest
testpopNegaive
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	self
		assert: ( list pop: -1 ) equals: 'c';
		assert: list __len__ equals: 2;
		yourself
%
category: 'done'
method: listTest
testpopPassNegative
   | list |
	list := self targetInstance __add__: { 'a' }.

	self
		should: [ list pop: -2 ]
		raise: IndexError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'pop index out of range' ];
		yourself
%
category: 'done'
method: listTest
testpopPassPositive
   | list |
	list := self targetInstance __add__: { 'a' }.

	self
		should: [ list pop: 2 ]
		raise: IndexError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'pop index out of range' ];
		yourself
%
category: 'done'
method: listTest
testpopPositive
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	self
		assert: ( list pop: 0 ) equals: 'a';
		assert: list __len__ equals: 2;
		yourself
%
category: 'done'
method: listTest
testremove
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'b' }.
	list remove: 'b'.

	self
		assert: list __len__ equals: 3;
		assert: ( list __getitem__: 0 ) equals: 'a';
		assert: ( list __getitem__: 1 ) equals: 'c';
		assert: ( list __getitem__: 2 ) equals: 'b';
		yourself
%
category: 'done'
method: listTest
testremoveIfAbsent
   | list |
	list := self targetInstance.

	self
		should: [ list remove: 'e' ]
		raise: ValueError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'list.remove(x): x not in list' ];
		yourself
%
category: 'done'
method: listTest
testreverse
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	list reverse.

	self
		assert: list __len__ equals: 3;
		assert: ( list __getitem__: 0 ) equals: 'c';
		assert: ( list __getitem__: -1 ) equals: 'a';
		yourself
%
category: 'done'
method: listTest
testsort
   | list |
	list := self targetInstance __add__: { 'c'. 'b'. 'a' }.
	list sort.

	self
		assert: list __len__ equals: 3;
		assert: ( list __getitem__: 0 ) equals: 'a';
		assert: ( list __getitem__: -1 ) equals: 'c';
		yourself
%
category: 'done'
method: listTest
testsortWithDict
   | list |
	list := self targetInstance __add__: { 'c'. 'bb'. 'aaa' }.
	list sort: ( Dictionary with: #key -> [ :each | each size]
								  with: #reverse -> true ).

	self
		assert: list __len__ equals: 3;
		assert: ( list __getitem__:  0 ) equals: 'aaa';
		assert: ( list __getitem__: -1 ) equals: 'c';
		yourself
%
category: 'done'
method: listTest
testsortWithKey
   | list |
	list := self targetClass new __add__: { 'c'. 'bb'. 'aaa' }.
	list sort: ( Dictionary with: #key -> [ :each | each size] ).

	self
		assert: list __len__ equals: 3;
		assert: ( list __getitem__:  0 ) equals: 'c';
		assert: ( list __getitem__: -1 ) equals: 'aaa';
		yourself
%
set compile_env: 0
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
