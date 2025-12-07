! ------------------- Remove existing behavior from dictTest
removeallmethods dictTest
removeallclassmethods dictTest
! ------------------- Class methods for dictTest
! ------------------- Instance methods for dictTest
category: 'done'
method: dictTest
test__contains__onEmptyList

   	self
		deny: (self targetInstance __contains__: 'x');
		yourself.
%
category: 'done'
method: dictTest
test__delitem__

   | list |
	list := self targetInstance: { #a -> 1. #b -> 2. #c -> 3. #b -> 4 }.
	list __delitem__: #b.

	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __contains__: #a);
		assert: (list __contains__: #c);
		yourself
%
category: 'done'
method: dictTest
test__delitem__IfAbsent

   | list |
	list := self targetInstance.

	self
		should: [list __delitem__: 'e']
		raise: KeyError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: '''e'''];
		yourself
%
category: 'done'
method: dictTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__class__' '__class_getitem__' '__contains__' '__delattr__' '__delitem__' '__dir__' '__doc__' '__eq__' '__format__' '__ge__' '__getattribute__' '__getitem__' '__gt__' '__hash__' '__init__' '__init_subclass__' '__ior__' '__iter__' '__le__' '__len__' '__lt__' '__ne__' '__new__' '__or__' '__reduce__' '__reduce_ex__' '__repr__' '__reversed__' '__ror__' '__setattr__' '__setitem__' '__sizeof__' '__str__' '__subclasshook__' 'clear' 'copy' 'fromkeys' 'get' 'items' 'keys' 'pop' 'popitem' 'setdefault' 'update' 'values')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 45."
   self assert: (dir __contains__: (self str: '__class__')).
   #pyTodo. "self assert: (dir __contains__: #__class_getitem__)."
   #pyTodo. "self assert: (dir __contains__: #__contains__)."
   self assert: (dir __contains__: (self str: '__delattr__')).
   #pyTodo. "self assert: (dir __contains__: #__delitem__)."
   self assert: (dir __contains__: (self str: '__dir__')).
   self assert: (dir __contains__: (self str: '__doc__')).
   self assert: (dir __contains__: (self str: '__eq__')).
   self assert: (dir __contains__: (self str: '__format__')).
   self assert: (dir __contains__: (self str: '__ge__')).
   self assert: (dir __contains__: (self str: '__getattribute__')).
   #pyTodo. "self assert: (dir __contains__: #__getitem__)."
   self assert: (dir __contains__: (self str: '__gt__')).
   self assert: (dir __contains__: (self str: '__hash__')).
   #pyTodo. "self assert: (dir __contains__: #__init__)."
   #pyTodo. "self assert: (dir __contains__: #__init_subclass__)."
   #pyTodo. "self assert: (dir __contains__: #__ior__)."
   #pyTodo. "self assert: (dir __contains__: #__iter__)."
   self assert: (dir __contains__: (self str: '__le__')).
   #pyTodo. "self assert: (dir __contains__: #__len__)."
   self assert: (dir __contains__: (self str: '__lt__')).
   self assert: (dir __contains__: (self str: '__ne__')).
   self assert: (dir __contains__: (self str: '__new__')).
   #pyTodo. "self assert: (dir __contains__: #__or__)."
   #pyTodo. "self assert: (dir __contains__: #__reduce__)."
   #pyTodo. "self assert: (dir __contains__: #__reduce_ex__)."
   self assert: (dir __contains__: (self str: '__repr__')).
   #pyTodo. "self assert: (dir __contains__: #__reversed__)."
   #pyTodo. "self assert: (dir __contains__: #__ror__)."
   self assert: (dir __contains__: (self str: '__setattr__')).
   #pyTodo. "self assert: (dir __contains__: #__setitem__)."
   self assert: (dir __contains__: (self str: '__sizeof__')).
   self assert: (dir __contains__: (self str: '__str__')).
   self assert: (dir __contains__: (self str: '__subclasshook__')).
   #pyTodo. "self assert: (dir __contains__: #clear)."
   #pyTodo. "self assert: (dir __contains__: #copy)."
   #pyTodo. "self assert: (dir __contains__: #fromkeys)."
   #pyTodo. "self assert: (dir __contains__: #get)."
   #pyTodo. "self assert: (dir __contains__: #items)."
   #pyTodo. "self assert: (dir __contains__: #keys)."
   #pyTodo. "self assert: (dir __contains__: #pop)."
   #pyTodo. "self assert: (dir __contains__: #popitem)."
   #pyTodo. "self assert: (dir __contains__: #setdefault)."
   #pyTodo. "self assert: (dir __contains__: #update)."
   #pyTodo. "self assert: (dir __contains__: #values)."
%
category: 'done'
method: dictTest
test__eq__

   | list |
	list := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c' }.

	self
		deny:   (list __eq__: (self targetInstance: { 1 -> 'a'. 2 -> 'b' }));
		assert: (list __eq__: (self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c' }));
		deny:   (list __eq__: (self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'e' }));
		deny:   (list __eq__: (self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c'. 4 -> '0' }));
		yourself
%
category: 'done'
method: dictTest
test__ge__

   | list |
	#pyElaborate. "this is an aproximated implementation"

	list := self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }.

	self
		assert: (list __ge__: (self targetInstance: { 1 -> '1'. 2 -> '2' }));
		assert: (list __ge__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }));
		deny:   (list __ge__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3'. 4 -> '0' }));
		assert: (list __ge__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '2' }));
		deny:   (list __ge__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '4' }));
		yourself
%
category: 'done'
method: dictTest
test__getitem__

   | object |
	object := dict ___value: (Dictionary new
		at: (self str: 'a') put: (self int: 1);
		at: (self str: 'b') put: (self int: 2);
		at: (self str: 'c') put: (self int: 3); 
		at: (self str: 'd') put: (self int: 4);
		yourself).

	self
		assert: object keys __len__ equals: (self int: 4);
		assert: (object keys __contains__: (str ___value: 'a'));
		assert: (object __getitem__: (str ___value: 'a')) equals: (int ___value: 1);
		yourself
%
category: 'done'
method: dictTest
test__gt__

   | list |
	#pyElaborate. "this is an aproximated implementation"

	list := self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }.

	self
		assert: (list __gt__: (self targetInstance: { 1 -> '1'. 2 -> '2' }));
		deny:   (list __gt__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }));
		deny:   (list __gt__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3'. 4 -> '0' }));
		assert: (list __gt__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '2' }));
		deny:   (list __gt__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '4' }));
		yourself
%
category: 'done'
method: dictTest
test__ior__

	| a b c |
	a := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c'. 4 -> 'd' }.
	b := self targetInstance: { 2 -> 'b'. 3 -> 'c'. 4 -> 'd'. 5 -> 'e' }.

	c := a __ior__: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: 5);
		yourself
%
category: 'done'
method: dictTest
test__le__

   | list |
	#pyElaborate. "this is an aproximated implementation"

	list := self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }.

	self
		deny:   (list __le__: (self targetInstance: { 1 -> '1'. 2 -> '2' }));
		assert: (list __le__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }));
		assert: (list __le__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3'. 4 -> '0' }));
		deny:   (list __le__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '2' }));
		assert: (list __le__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '4' }));
		yourself
%
category: 'done'
method: dictTest
test__len__onEmptyList

   	self
		assert: self targetInstance __len__ equals: (self int: 0);
		yourself.
%
category: 'done'
method: dictTest
test__lt__

   | list |
	#pyElaborate. "this is an aproximated implementation"

	list := self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }.

	self
		deny:   (list __lt__: (self targetInstance: { 1 -> '1'. 2 -> '2' }));
		deny:   (list __lt__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }));
		assert: (list __lt__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3'. 4 -> '0' }));
		deny:   (list __lt__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '2' }));
		assert: (list __lt__: (self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '4' }));
		yourself
%
category: 'done'
method: dictTest
test__ne__

   | list |
	list := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c' }.

	self
		assert: (list __ne__: (self targetInstance: { 1 -> 'a'. 2 -> 'b' }));
		deny:   (list __ne__: (self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c' }));
		assert: (list __ne__: (self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'e' }));
		assert: (list __ne__: (self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c'. 4 -> '0' }));
		yourself
%
category: 'done'
method: dictTest
test__or__

	| a b c |
	a := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c'. 4 -> 'd' }.
	b := self targetInstance: { 2 -> 'b'. 3 -> 'c'. 4 -> 'd'. 5 -> 'e' }.

	c := a __or__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 5);
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: 5);
		yourself
%
category: 'done'
method: dictTest
test__ror__

	| a b c |
	a := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c'. 4 -> 'd' }.
	b := self targetInstance: { 2 -> 'b'. 3 -> 'c'. 4 -> 'd'. 5 -> 'e' }.

	c := a __ror__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 5);
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: 5);
		yourself
%
category: 'done'
method: dictTest
test__setitem__

   | list |
	list := self targetInstance: { #a -> 1. #b -> 2. #c -> 3. #b -> 4 }.

	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __contains__: #a);
		assert: (list __getitem__: #a) equals: 1;
		assert: (list __setitem__: #a _: 'x') equals: 'x';
		assert: (list __getitem__: #a) equals: 'x';
		yourself
%
category: 'done'
method: dictTest
testclear

   | list |
	list := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c' }.
	list clear.
	self
		assert: list __len__ equals: (self int: 0);
		yourself
%
category: 'done'
method: dictTest
testcopy

   | list lost |
	list := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c' }.

	lost := list copy.
   list __delitem__: 2.
	self
		assert: lost __len__ equals: (self int: 3);
		assert: (lost __contains__: 1);
		assert: (lost __contains__: 3);
		yourself
%
category: 'done'
method: dictTest
testget

   | list |
	list := self targetInstance: { #a -> 1. #b -> 2. #c -> 3. #b -> 4 }.

	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __contains__: #a);
		assert: (list get: #a) equals: 1;
		yourself
%
category: 'done'
method: dictTest
testitems

   | x |
	x := (dict ___value: { #a -> 1. #b -> 2 }) items.

	self
		assert: x __len__ equals: (self int: 2);
		assert: x __class__ equals: frozenset;
		assert: (x __contains__: (tuple ___value: (Array with: #a with: 1)));
		yourself
%
category: 'done'
method: dictTest
testkeys

   | list |
	list := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c' }.

	self
		assert: list keys __class__ equals: frozenset;
		assert: (list keys __eq__: (set ___value: { 1. 2. 3 }));
		yourself
%
category: 'done'
method: dictTest
testpop

   | list |
	list := self targetInstance: { #a -> 1. #b -> 2. #c -> 3. #b -> 4 }.

	self
		assert: list __len__ equals: (self int: 3);
		assert: (list __contains__: #a);
		assert: (list pop: #a) equals: 1; 
		assert: list __len__ equals: (self int: 2);
		deny: (list __contains__: #a);
		yourself
%
category: 'done'
method: dictTest
testUpdate

   | dict1 dict2 dict3|
	dict1 := (dict ___value: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) } asDictionary).
	dict2 := (dict ___value: { (str ___value: 'c') -> (int ___value: 3). (str ___value: 'd') -> (int ___value: 4) } asDictionary).
	dict3 := dict1 update: dict2.
	self
		assert: dict1 __len__ equals: (self int: 4);
		assert: dict1 == dict3;
		assert: ((dict1 get: (str ___value: 'c'))) equals: (int ___value: 3);
		assert: dict2 __len__ equals: (self int: 2);
		yourself.

	dict1 := (dict ___value: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) } asDictionary).
	dict2 := dict ___value: {} asDictionary.
	dict3 := dict1 update: dict2.
	self
		assert: dict1 __len__ equals: (self int: 2);
		assert: dict1 == dict3;
		assert: dict2 __len__ equals: (self int: 0);
		yourself.

	dict1 := (dict ___value: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) } asDictionary).
	dict2 := list ___value: { tuple ___value: { str ___value: 'c'. int ___value: 3 } asArray }.
	dict3 := dict1 update: dict2.
	self
		assert: dict1 __len__ equals: (self int: 3);
		assert: dict1 == dict3;
		assert: ((dict1 get: (str ___value: 'c'))) equals: (int ___value: 3);		
		assert: dict2 __len__ equals: (self int: 1);
		yourself.


	dict1 := (dict ___value: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) } asDictionary).
	dict2 := list ___value: { str ___value: 'ca'. }.
	dict3 := dict1 update: dict2.
	self
		assert: dict1 __len__ equals: (self int: 3);
		assert: dict1 == dict3;
		assert: ((dict1 get: (str ___value: 'c'))) equals: (str ___value: 'a');		
		assert: dict2 __len__ equals: (self int: 1);
		yourself.

	dict1 := (dict ___value: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) } asDictionary).
	dict2 := list ___value: { tuple ___value: { str ___value: 'c' } asArray }.
	dict3 := [dict1 update: dict2] on: ValueError do: [1].
	self assert: dict3 equals: 1.
%
category: 'done'
method: dictTest
testvalues

   | list |
	list := self targetInstance: { 1 -> 'a'. 2 -> 'b'. 3 -> 'c' }.

	self
		assert: list values __class__ equals: frozenset;
		assert: (list values __eq__: (set ___value: { 'a'. 'b'. 'c' }));
		yourself
%
category: 'todo'
method: dictTest
test__class_getitem__

   #pyTodo
%
category: 'todo'
method: dictTest
test__iter__

   #pyTodo
%
category: 'todo'
method: dictTest
test__reversed__

   #pyTodo
%
category: 'todo'
method: dictTest
testfromkeys

   #pyTodo
%
category: 'todo'
method: dictTest
testgetWithDefault
	"Is this a real method?"
   #pyTodo
%
category: 'todo'
method: dictTest
testpopitem

   #pyTodo
%
category: 'todo'
method: dictTest
testsetdefault

   #pyTodo
%
