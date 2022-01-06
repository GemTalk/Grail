! ------------------- Remove existing behavior from setTest
removeAllMethods setTest
removeAllClassMethods setTest
! ------------------- Class methods for setTest
! ------------------- Instance methods for setTest
set compile_env: 0
category: 'done'
method: setTest
test__and__
	| a b c |
	a := set ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __and__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: setTest
test__contains__onEmptyList
   	self
		deny: (self targetInstance __contains__: 'x');
		yourself.
%
category: 'done'
method: setTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__and__' '__class__' '__class_getitem__' '__contains__' '__delattr__' '__dir__' '__doc__' '__eq__' '__format__' '__ge__' '__getattribute__' '__gt__' '__hash__' '__iand__' '__init__' '__init_subclass__' '__ior__' '__isub__' '__iter__' '__ixor__' '__le__' '__len__' '__lt__' '__ne__' '__new__' '__or__' '__rand__' '__reduce__' '__reduce_ex__' '__repr__' '__ror__' '__rsub__' '__rxor__' '__setattr__' '__sizeof__' '__str__' '__sub__' '__subclasshook__' '__xor__' 'add' 'clear' 'copy' 'difference' 'difference_update' 'discard' 'intersection' 'intersection_update' 'isdisjoint' 'issubset' 'issuperset' 'pop' 'remove' 'symmetric_difference' 'symmetric_difference_update' 'union' 'update')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: (self int: 56)."
   self assert: (dir __contains__: (self str: '__and__')).
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
   self assert: (dir __contains__: (self str: '__gt__')).
   self assert: (dir __contains__: (self str: '__hash__')).
   self assert: (dir __contains__: (self str: '__iand__')).
   #pyTodo. "self assert: (dir __contains__: #__init__)."
   #pyTodo. "self assert: (dir __contains__: #__init_subclass__)."
   self assert: (dir __contains__: (self str: '__ior__')).
   self assert: (dir __contains__: (self str: '__isub__')).
   #pyTodo. "self assert: (dir __contains__: #__iter__)."
   self assert: (dir __contains__: (self str: '__ixor__')).
   self assert: (dir __contains__: (self str: '__le__')).
   self assert: (dir __contains__: (self str: '__len__')).
   self assert: (dir __contains__: (self str: '__lt__')).
   self assert: (dir __contains__: (self str: '__ne__')).
   self assert: (dir __contains__: (self str: '__new__')).
   self assert: (dir __contains__: (self str: '__or__')).
   self assert: (dir __contains__: (self str: '__rand__')).
   #pyTodo. "self assert: (dir __contains__: #__reduce__)."
   #pyTodo. "self assert: (dir __contains__: #__reduce_ex__)."
   self assert: (dir __contains__: (self str: '__repr__')).
   self assert: (dir __contains__: (self str: '__ror__')).
   self assert: (dir __contains__: (self str: '__rsub__')).
   self assert: (dir __contains__: (self str: '__rxor__')).
   self assert: (dir __contains__: (self str: '__setattr__')).
   self assert: (dir __contains__: (self str: '__sizeof__')).
   self assert: (dir __contains__: (self str: '__str__')).
   self assert: (dir __contains__: (self str: '__sub__')).
   self assert: (dir __contains__: (self str: '__subclasshook__')).
   self assert: (dir __contains__: (self str: '__xor__')).
   self assert: (dir __contains__: (self str: 'add')).
   self assert: (dir __contains__: (self str: 'clear')).
   self assert: (dir __contains__: (self str: 'copy')).
   self assert: (dir __contains__: (self str: 'difference')).
   self assert: (dir __contains__: (self str: 'difference_update')).
   self assert: (dir __contains__: (self str: 'discard')).
   self assert: (dir __contains__: (self str: 'intersection')).
   self assert: (dir __contains__: (self str: 'intersection_update')).
   self assert: (dir __contains__: (self str: 'isdisjoint')).
   self assert: (dir __contains__: (self str: 'issubset')).
   self assert: (dir __contains__: (self str: 'issuperset')).
   self assert: (dir __contains__: (self str: 'pop')).
   self assert: (dir __contains__: (self str: 'remove')).
   self assert: (dir __contains__: (self str: 'symmetric_difference')).
   self assert: (dir __contains__: (self str: 'symmetric_difference_update')).
   self assert: (dir __contains__: (self str: 'union')).
   self assert: (dir __contains__: (self str: 'update')).
%
category: 'done'
method: setTest
test__eq__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		deny:   (list __eq__: (self targetInstance __add__: { '1'. '2' }));
		assert: (list __eq__: (self targetInstance __add__: { '1'. '2'. '3' }));
		assert: (list __eq__: (self targetInstance __add__: { '1'. '2'. '3'. '1' }));
		deny:   (list __eq__: (self targetInstance __add__: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: setTest
test__ge__
	| a b c bb |
	a := set ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.
	bb := set ___value: { 'b'. 'c' }.
	c := set ___value: { 'a' }.


	self
		assert: (a __ge__: b);
		deny:   (b __ge__: a);
		assert: (bb __ge__: b);
		assert: (b __ge__: bb);
		deny:   (c __ge__: b);
		deny:   (b __ge__: c);
		yourself
%
category: 'done'
method: setTest
test__gt__
	| a b c bb |
	a := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	b := self targetInstance __add__: { 'b'. 'c' }.
	bb := self targetInstance __add__: { 'b'. 'c' }.
	c := self targetInstance __add__: { 'a' }.


	self
		assert: (a __gt__: b);
		deny:   (b __gt__: a);
		deny:   (bb __gt__: b);
		deny:   (b __gt__: bb);
		deny:   (c __gt__: b);
		deny:   (b __gt__: c);
		yourself
%
category: 'done'
method: setTest
test__iand__
	| a b c |
	a := set ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __iand__: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: setTest
test__ior__
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a __ior__: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: setTest
test__isub__
	| a b c |
	a := set ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __isub__: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 1);
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'a');
		yourself
%
category: 'done'
method: setTest
test__ixor__
	| a b c bb |
	a := set ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.
	bb := set ___value: { 'b'. 'c' }.
	c := set ___value: { 'a' }.

	self
		assert: (a copy __ixor__: b) __len__ equals: (self int: 1);
		assert: ((a copy __ixor__: b) __contains__: 'a');
		assert: (b copy __ixor__: a) __len__ equals: (self int: 1);
		assert: ((b copy __ixor__: a) __contains__: 'a');
		assert: (b copy __ixor__: bb) __len__ equals: (self int: 0);
		assert: (bb copy __ixor__: b) __len__ equals: (self int: 0);
		assert: (b copy __ixor__: c) equals: (b union: c);
		assert: (a __ixor__: b) equals: a;
		yourself
%
category: 'done'
method: setTest
test__le__
	| a b c bb |
	a := set ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.
	bb := set ___value: { 'b'. 'c' }.
	c := set ___value: { 'a' }.


	self
		deny:   (a __le__: b);
		assert: (b __le__: a);
		assert: (bb __le__: b);
		assert: (b __le__: bb);
		deny:   (c __le__: b);
		deny:   (b __le__: c);
		yourself
%
category: 'done'
method: setTest
test__len__onEmptyList
   	self
		assert: self targetInstance __len__ equals: (self int: 0);
		yourself.
%
category: 'done'
method: setTest
test__lt__
	| a b c bb |
	a := set ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.
	bb := set ___value: { 'b'. 'c' }.
	c := set ___value: { 'a' }.


	self
		deny:   (a __lt__: b);
		assert: (b __lt__: a);
		deny:   (bb __lt__: b);
		deny:   (b __lt__: bb);
		deny:   (c __lt__: b);
		deny:   (b __lt__: c);
		yourself
%
category: 'done'
method: setTest
test__ne__
   | list |
	list := self targetInstance __add__: { '1'. '2'. '3' }.

	self
		assert: (list __ne__: (self targetInstance __add__: { '1'. '2' }));
		deny:   (list __ne__: (self targetInstance __add__: { '1'. '2'. '3' }));
		deny:   (list __ne__: (self targetInstance __add__: { '1'. '2'. '3'. '2' }));
		assert: (list __ne__: (self targetInstance __add__: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: setTest
test__or__
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a __or__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: setTest
test__rand__
	| a b c |
	a := set ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __rand__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: setTest
test__ror__
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a __ror__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: setTest
test__rsub__
	| a b c |
	a := set ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __rsub__: b.

	self
		assert: b __len__ equals: (self int: 4);
		deny:   (b __contains__: 'a');
		assert: (b __contains__: 'e');
		assert: c __len__ equals: (self int: 1);
		deny:   (c __contains__: 'a');
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: setTest
test__rxor__
	| a b c bb |
	a := set ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.
	bb := set ___value: { 'b'. 'c' }.
	c := set ___value: { 'a' }.

	self
		assert: (a __rxor__: b) __len__ equals: (self int: 1);
		assert: ((a __rxor__: b) __contains__: 'a');
		assert: (b __rxor__: a) __len__ equals: (self int: 1);
		assert: ((b __rxor__: a) __contains__: 'a');
		assert: (b __rxor__: bb) __len__ equals: (self int: 0);
		assert: (bb __rxor__: b) __len__ equals: (self int: 0);
		assert: (b __rxor__: c) equals: (b union: c);
		yourself
%
category: 'done'
method: setTest
test__str__
   | list |
	list := self targetInstance __add__: { 'a' }.

	self
		assert: list __str__ equals: '{''a''}';
		yourself
%
category: 'done'
method: setTest
test__sub__
	| a b c |
	a := set ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __sub__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 'e');
		assert: (a __contains__: 'b');
		assert: c __len__ equals: (self int: 1);
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'a');
		yourself
%
category: 'done'
method: setTest
test__xor__
	| a b c bb |
	a := set ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.
	bb := set ___value: { 'b'. 'c' }.
	c := set ___value: { 'a' }.

	self
		assert: (a __xor__: b) __len__ equals: (self int: 1);
		assert: ((a __xor__: b) __contains__: 'a');
		assert: (b __xor__: a) __len__ equals: (self int: 1);
		assert: ((b __xor__: a) __contains__: 'a');
		assert: (b __xor__: bb) __len__ equals: (self int: 0);
		assert: (bb __xor__: b) __len__ equals: (self int: 0);
		assert: (b __xor__: c) equals: (b union: c);
		yourself
%
category: 'done'
method: setTest
testadd
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	list add: 'o'.

	self
		assert: list __len__ equals: (self int: 4);
		assert: (list __contains__: 'o');
		yourself
%
category: 'done'
method: setTest
testclear
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	list clear.
	self
		assert: list __len__ equals: (self int: 0);
		yourself
%
category: 'done'
method: setTest
testcopy
   | list lost |
	list := self targetInstance __add__: { 'a'. 'b'. 'c' }.

	lost := list copy.
   list remove: 'a'.
	self
		assert: lost __len__ equals: (self int: 3);
		assert: (lost __contains__: 'a');
		assert: (lost __contains__: 'c');
		yourself
%
category: 'done'
method: setTest
testdifference
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a difference: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 'e');
		assert: (a __contains__: 'b');
		assert: c __len__ equals: (self int: 1);
		assert: (c __contains__: 'a');
		yourself
%
category: 'done'
method: setTest
testdifference_update
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a difference_update: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 1);
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'a');
		yourself
%
category: 'done'
method: setTest
testdiscard
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'b' }.
	list discard: 'b'.

	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __contains__: 'a');
		assert: (list __contains__: 'c');
		yourself
%
category: 'done'
method: setTest
testdiscardIfAbsent

	self targetInstance discard: 'e'
%
category: 'done'
method: setTest
testintersection
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a intersection: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: setTest
testintersection_update
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a intersection_update: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: setTest
testisdisjoint
	| a b c bb |
	a := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	b := self targetInstance __add__: { 'b'. 'c' }.
	bb := self targetInstance __add__: { 'b'. 'c' }.
	c := self targetInstance __add__: { 'a' }.


	self
		deny:   (a isdisjoint: b);
		deny:   (b isdisjoint: a);
		deny:   (bb isdisjoint: b);
		deny:   (b isdisjoint: bb);
		assert: (c isdisjoint: b);
		assert: (b isdisjoint: c);
		yourself
%
category: 'done'
method: setTest
testissubset
	| a b c bb |
	a := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	b := self targetInstance __add__: { 'b'. 'c' }.
	bb := self targetInstance __add__: { 'b'. 'c' }.
	c := self targetInstance __add__: { 'a' }.


	self
		deny:   (a issubset: b);
		assert: (b issubset: a);
		assert: (bb issubset: b);
		assert: (b issubset: bb);
		deny:   (c issubset: b);
		deny:   (b issubset: c);
		yourself
%
category: 'done'
method: setTest
testissuperset
	| a b c bb |
	a := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	b := self targetInstance __add__: { 'b'. 'c' }.
	bb := self targetInstance __add__: { 'b'. 'c' }.
	c := self targetInstance __add__: { 'a' }.


	self
		assert: (a issuperset: b);
		deny:   (b issuperset: a);
		assert: (bb issuperset: b);
		assert: (b issuperset: bb);
		deny:   (c issuperset: b);
		deny:   (b issuperset: c);
		yourself
%
category: 'done'
method: setTest
testpop
   | set lost element |
	set := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	lost := set copy.
	element :=  set pop.

	self
		assert: (lost __contains__: element);
		deny:   (set __contains__: element);
		assert: set __len__ equals: (self int: 2);
		yourself.

	"Remove the rest of the items"
	set pop; pop.

	self should: [ set pop ] raise: KeyError.
%
category: 'done'
method: setTest
testremove
   | list |
	list := self targetInstance __add__: { 'a'. 'b'. 'c'. 'b' }.
	list remove: 'b'.

	self
		assert: list __len__ equals: (self int: 2);
		assert: (list __contains__: 'a');
		assert: (list __contains__: 'c');
		yourself
%
category: 'done'
method: setTest
testremoveIfAbsent
   | list |
	list := self targetInstance.

	self
		should: [list remove: 'e']
		raise: KeyError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: '''e'''];
		yourself
%
category: 'done'
method: setTest
testsymmetric_difference
	| a b c bb |
	a := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	b := self targetInstance __add__: { 'b'. 'c' }.
	bb := self targetInstance __add__: { 'b'. 'c' }.
	c := self targetInstance __add__: { 'a' }.

	self
		assert: (a symmetric_difference: b) __len__ equals: (self int: 1);
		assert: ((a symmetric_difference: b) __contains__: 'a');
		assert: (b symmetric_difference: a) __len__ equals: (self int: 1);
		assert: ((b symmetric_difference: a) __contains__: 'a');
		assert: (b symmetric_difference: bb) __len__ equals: (self int: 0);
		assert: (bb symmetric_difference: b) __len__ equals: (self int: 0);
		assert: (b symmetric_difference: c) equals: (b union: c);
		yourself
%
category: 'done'
method: setTest
testsymmetric_difference_update
	| a b c bb |
	a := self targetInstance __add__: { 'a'. 'b'. 'c' }.
	b := self targetInstance __add__: { 'b'. 'c' }.
	bb := self targetInstance __add__: { 'b'. 'c' }.
	c := self targetInstance __add__: { 'a' }.

	self
		assert: (a copy symmetric_difference_update: b) __len__ equals: (self int: 1);
		assert: ((a copy symmetric_difference_update: b) __contains__: 'a');
		assert: (b copy symmetric_difference_update: a) __len__ equals: (self int: 1);
		assert: ((b copy symmetric_difference_update: a) __contains__: 'a');
		assert: (b copy symmetric_difference_update: bb) __len__ equals: (self int: 0);
		assert: (bb copy symmetric_difference_update: b) __len__ equals: (self int: 0);
		assert: (b copy symmetric_difference_update: c) equals: (b union: c);
		assert: (a symmetric_difference_update: b) equals: a;
		yourself
%
category: 'done'
method: setTest
testunion
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a union: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: setTest
testupdate
	| a b c |
	a := self targetInstance __add__: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance __add__: { 'b'. 'c'. 'd'. 'e' }.

	c := a update: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: 'e');
		yourself
%
set compile_env: 0
category: 'todo'
method: setTest
test__class_getitem__
   #pyTodo
%
category: 'todo'
method: setTest
test__iter__
   #pyTodo
%
