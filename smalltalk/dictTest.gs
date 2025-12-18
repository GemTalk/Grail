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
   #pyTodo. "self assert: (dir __contains__: (self str: '__init__'))."
   #pyTodo. "self assert: (dir __contains__: (self str: '__init_subclass__'))."
   self assert: (dir __contains__: (self str: '__ior__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__iter__'))."
   self assert: (dir __contains__: (self str: '__le__')).
   self assert: (dir __contains__: (self str: '__len__')).
   self assert: (dir __contains__: (self str: '__lt__')).
   self assert: (dir __contains__: (self str: '__ne__')).
   self assert: (dir __contains__: (self str: '__new__')).
   self assert: (dir __contains__: (self str: '__or__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__reduce__'))."
   #pyTodo. "self assert: (dir __contains__: (self str: '__reduce_ex__'))."
   self assert: (dir __contains__: (self str: '__repr__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__reversed__'))."
   self assert: (dir __contains__: (self str: '__ror__')).
   self assert: (dir __contains__: (self str: '__setattr__')).
   self assert: (dir __contains__: (self str: '__setitem__')).
   self assert: (dir __contains__: (self str: '__sizeof__')).
   self assert: (dir __contains__: (self str: '__str__')).
   self assert: (dir __contains__: (self str: '__subclasshook__')).
   self assert: (dir __contains__: (self str: 'clear')).
   self assert: (dir __contains__: (self str: 'copy')).
   self assert: (dir __contains__: (self str: 'fromkeys')).
   self assert: (dir __contains__: (self str: 'get')).
   self assert: (dir __contains__: (self str: 'items')).
   self assert: (dir __contains__: (self str: 'keys')).
   self assert: (dir __contains__: (self str: 'pop')).
   self assert: (dir __contains__: (self str: 'popitem')).
   self assert: (dir __contains__: (self str: 'setdefault')).
   self assert: (dir __contains__: (self str: 'update')).
   self assert: (dir __contains__: (self str: 'values')).
%
category: 'done'
method: dictTest
test__doc__
	"dict.__doc__ should return a str"

	| doc |
	doc := dict __call__ __doc__.
	self assert: (doc isKindOf: str).
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
	"Python 3: dict does not support ordering comparisons"

	| d1 d2 |
	d1 := self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }.
	d2 := self targetInstance: { 1 -> '1'. 2 -> '2' }.

	self
		should: [d1 __ge__: d2]
		raise: TypeError
%
category: 'done'
method: dictTest
test__getitem__

   | object |
	object := dict ___value: (OrderedDictionary new
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
	"Python 3: dict does not support ordering comparisons"

	| d1 d2 |
	d1 := self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }.
	d2 := self targetInstance: { 1 -> '1'. 2 -> '2' }.

	self
		should: [d1 __gt__: d2]
		raise: TypeError
%
category: 'done'
method: dictTest
test__hash__Unhashable
	"dict is mutable and unhashable"

	| d |
	d := self targetInstance: { #a -> 1 }.
	self should: [d __hash__] raise: TypeError.
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
	"Python 3: dict does not support ordering comparisons"

	| d1 d2 |
	d1 := self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }.
	d2 := self targetInstance: { 1 -> '1'. 2 -> '2' }.

	self
		should: [d1 __le__: d2]
		raise: TypeError
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
	"Python 3: dict does not support ordering comparisons"

	| d1 d2 |
	d1 := self targetInstance: { 1 -> '1'. 2 -> '2'. 3 -> '3' }.
	d2 := self targetInstance: { 1 -> '1'. 2 -> '2' }.

	self
		should: [d1 __lt__: d2]
		raise: TypeError
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
testfromkeys
	"Test dict.fromkeys class method"

	| d keys |
	keys := list ___value: { self int: 1. self int: 2. self int: 3 }.

	"fromkeys with just keys - values default to None"
	d := dict fromkeys: keys.
	self
		assert: d __len__ equals: (self int: 3);
		assert: (d get: (self int: 1)) equals: None;
		assert: (d get: (self int: 2)) equals: None;
		yourself.

	"fromkeys with keys and value"
	d := dict fromkeys: keys _: (self int: 0).
	self
		assert: d __len__ equals: (self int: 3);
		assert: (d get: (self int: 1)) equals: (self int: 0);
		assert: (d get: (self int: 2)) equals: (self int: 0);
		yourself.
%
category: 'done'
method: dictTest
testget
	"Test get: with key present, missing, and with default"

	| d |
	d := dict ___value: (OrderedDictionary new
		at: (self str: 'a') put: (self int: 1);
		at: (self str: 'b') put: (self int: 2);
		yourself).

	"Key present - returns value"
	self assert: (d get: (self str: 'a')) equals: (self int: 1).

	"Key missing - returns None"
	self assert: (d get: (self str: 'x')) equals: None.

	"Key missing with default - returns default"
	self assert: (d get: (self str: 'x') _: (self str: 'default')) equals: (self str: 'default').

	"Key present with default - still returns value"
	self assert: (d get: (self str: 'a') _: (self str: 'default')) equals: (self int: 1).
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
	"Test pop: with key present, missing, and with default"

	| d |
	d := dict ___value: (OrderedDictionary new
		at: (self str: 'a') put: (self int: 1);
		at: (self str: 'b') put: (self int: 2);
		yourself).

	"Pop existing key - returns value and removes it"
	self assert: (d pop: (self str: 'a')) equals: (self int: 1).
	self assert: d __len__ equals: (self int: 1).
	self deny: (d __contains__: (self str: 'a')).

	"Pop missing key - raises KeyError"
	self should: [d pop: (self str: 'x')] raise: KeyError.

	"Pop missing key with default - returns default"
	self assert: (d pop: (self str: 'x') _: (self str: 'default')) equals: (self str: 'default').

	"Pop existing key with default - returns value"
	self assert: (d pop: (self str: 'b') _: (self str: 'default')) equals: (self int: 2).
	self assert: d __len__ equals: (self int: 0).
%
category: 'done'
method: dictTest
testpopitem
	"Test popitem removes and returns a (key, value) tuple"

	| d item |
	d := dict ___value: (OrderedDictionary new
		at: (self str: 'a') put: (self int: 1);
		at: (self str: 'b') put: (self int: 2);
		yourself).

	"Pop returns a tuple - LIFO order, so 'b' is popped first"
	item := d popitem.
	self assert: (item isKindOf: tuple).
	self assert: item __len__ equals: (self int: 2).
	self assert: (item __getitem__: (self int: 0)) equals: (self str: 'b').
	self assert: (item __getitem__: (self int: 1)) equals: (self int: 2).
	self assert: d __len__ equals: (self int: 1).

	"Pop again - now 'a' is popped"
	item := d popitem.
	self assert: (item __getitem__: (self int: 0)) equals: (self str: 'a').
	self assert: (item __getitem__: (self int: 1)) equals: (self int: 1).
	self assert: d __len__ equals: (self int: 0).

	"Pop from empty dict raises KeyError"
	self should: [d popitem] raise: KeyError.
%
category: 'done'
method: dictTest
testsetdefault
	"Test setdefault: and setdefault:_:"

	| d |
	d := dict ___value: (OrderedDictionary new
		at: (self str: 'a') put: (self int: 1);
		yourself).

	"Key present - returns existing value"
	self assert: (d setdefault: (self str: 'a')) equals: (self int: 1).
	self assert: d __len__ equals: (self int: 1).

	"Key missing without default - inserts None and returns it"
	self assert: (d setdefault: (self str: 'b')) equals: None.
	self assert: d __len__ equals: (self int: 2).
	self assert: (d get: (self str: 'b')) equals: None.

	"Key missing with default - inserts default and returns it"
	self assert: (d setdefault: (self str: 'c') _: (self int: 3)) equals: (self int: 3).
	self assert: d __len__ equals: (self int: 3).
	self assert: (d get: (self str: 'c')) equals: (self int: 3).

	"Key present with default - still returns existing value"
	self assert: (d setdefault: (self str: 'a') _: (self int: 99)) equals: (self int: 1).
%
category: 'done'
method: dictTest
testUpdate
	"Test update: returns None (like Python)"

	| dict1 dict2 result |
	dict1 := (dict ___value: (OrderedDictionary fromAssociations: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) })).
	dict2 := (dict ___value: (OrderedDictionary fromAssociations: { (str ___value: 'c') -> (int ___value: 3). (str ___value: 'd') -> (int ___value: 4) })).
	result := dict1 update: dict2.
	self
		assert: dict1 __len__ equals: (self int: 4);
		assert: result equals: None;
		assert: ((dict1 get: (str ___value: 'c'))) equals: (int ___value: 3);
		assert: dict2 __len__ equals: (self int: 2);
		yourself.

	dict1 := (dict ___value: (OrderedDictionary fromAssociations: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) })).
	dict2 := dict ___value: (OrderedDictionary fromAssociations: {}).
	result := dict1 update: dict2.
	self
		assert: dict1 __len__ equals: (self int: 2);
		assert: result equals: None;
		assert: dict2 __len__ equals: (self int: 0);
		yourself.

	dict1 := (dict ___value: (OrderedDictionary fromAssociations: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) })).
	dict2 := list ___value: { tuple ___value: { str ___value: 'c'. int ___value: 3 } asArray }.
	result := dict1 update: dict2.
	self
		assert: dict1 __len__ equals: (self int: 3);
		assert: result equals: None;
		assert: ((dict1 get: (str ___value: 'c'))) equals: (int ___value: 3);
		assert: dict2 __len__ equals: (self int: 1);
		yourself.


	dict1 := (dict ___value: (OrderedDictionary fromAssociations: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) })).
	dict2 := list ___value: { str ___value: 'ca'. }.
	result := dict1 update: dict2.
	self
		assert: dict1 __len__ equals: (self int: 3);
		assert: result equals: None;
		assert: ((dict1 get: (str ___value: 'c'))) equals: (str ___value: 'a');
		assert: dict2 __len__ equals: (self int: 1);
		yourself.

	dict1 := (dict ___value: (OrderedDictionary fromAssociations: { (str ___value: 'a') -> (int ___value: 1).  (str ___value: 'b') -> (int ___value: 2) })).
	dict2 := list ___value: { tuple ___value: { str ___value: 'c' } asArray }.
	result := [dict1 update: dict2] on: ValueError do: [1].
	self assert: result equals: 1.
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
