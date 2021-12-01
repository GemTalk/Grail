! ------------------- Remove existing behavior from frozensetTest
removeAllMethods frozensetTest
removeAllClassMethods frozensetTest
! ------------------- Class methods for frozensetTest
! ------------------- Instance methods for frozensetTest
set compile_env: 0
category: 'done'
method: frozensetTest
test__and__
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := frozenset ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __and__: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: 3;
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: frozensetTest
test__and__Set
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __and__: b.

	self
		assert: c __class__ equals: self targetClass;
		yourself
%
category: 'done'
method: frozensetTest
test__contains__onEmptyList
   	self
		deny: (self targetInstance __contains__: 'x');
		yourself.
%
category: 'done'
method: frozensetTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__and__' '__class__' '__class_getitem__' '__contains__' '__delattr__' '__dir__' '__doc__' '__eq__' '__format__' '__ge__' '__getattribute__' '__gt__' '__hash__' '__init__' '__init_subclass__' '__iter__' '__le__' '__len__' '__lt__' '__ne__' '__new__' '__or__' '__rand__' '__reduce__' '__reduce_ex__' '__repr__' '__ror__' '__rsub__' '__rxor__' '__setattr__' '__sizeof__' '__str__' '__sub__' '__subclasshook__' '__xor__' 'copy' 'difference' 'intersection' 'isdisjoint' 'issubset' 'issuperset' 'symmetric_difference' 'union')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 43."
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
   #pyTodo. "self assert: (dir __contains__: #__init__)."
   #pyTodo. "self assert: (dir __contains__: #__init_subclass__)."
   #pyTodo. "self assert: (dir __contains__: #__iter__)."
   self assert: (dir __contains__: (self str: '__le__')).
   self assert: (dir __contains__: (self str: '__len__')).
   self assert: (dir __contains__: (self str: '__lt__')).
   self assert: (dir __contains__: (self str: '__ne__')).
   self assert: (dir __contains__: (self str: '__new__')).
   self assert: (dir __contains__: (self str: '__or__')).
   #pyTodo. "self assert: (dir __contains__: #__rand__)."
   #pyTodo. "self assert: (dir __contains__: #__reduce__)."
   #pyTodo. "self assert: (dir __contains__: #__reduce_ex__)."
   self assert: (dir __contains__: (self str: '__repr__')).
   #pyTodo. "self assert: (dir __contains__: #__ror__)."
   #pyTodo. "self assert: (dir __contains__: #__rsub__)."
   #pyTodo. "self assert: (dir __contains__: #__rxor__)."
   self assert: (dir __contains__: (self str: '__setattr__')).
   self assert: (dir __contains__: (self str: '__sizeof__')).
   self assert: (dir __contains__: (self str: '__str__')).
   self assert: (dir __contains__: (self str: '__sub__')).
   self assert: (dir __contains__: (self str: '__subclasshook__')).
   self assert: (dir __contains__: (self str: '__xor__')).
   self assert: (dir __contains__: (self str: 'copy')).
   self assert: (dir __contains__: (self str: 'difference')).
   self assert: (dir __contains__: (self str: 'intersection')).
   self assert: (dir __contains__: (self str: 'isdisjoint')).
   self assert: (dir __contains__: (self str: 'issubset')).
   self assert: (dir __contains__: (self str: 'issuperset')).
   self assert: (dir __contains__: (self str: 'symmetric_difference')).
   self assert: (dir __contains__: (self str: 'union')).
%
category: 'done'
method: frozensetTest
test__eq__
   | list |
	list := self targetInstance: { '1'. '2'. '3' }.

	self
		deny:   (list __eq__: (self targetInstance: { '1'. '2' }));
		assert: (list __eq__: (self targetInstance: { '1'. '2'. '3' }));
		assert: (list __eq__: (self targetInstance: { '1'. '2'. '3'. '1' }));
		deny:   (list __eq__: (self targetInstance: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: frozensetTest
test__eq__Set
   | list |
	list := self targetInstance: { '1'. '2'. '3' }.

	self
		deny:   (list __eq__: (set ___value: { '1'. '2' }));
		assert: (list __eq__: (set ___value: { '1'. '2'. '3' }));
		assert: (list __eq__: (set ___value: { '1'. '2'. '3'. '1' }));
		deny:   (list __eq__: (set ___value: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: frozensetTest
test__ge__
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.


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
method: frozensetTest
test__gt__
	"{ 'a', 'b', 'c' }.__gt__({ 'b', 'c' })"
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.


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
method: frozensetTest
test__le__
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.


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
method: frozensetTest
test__len__onEmptyList
   	self
		assert: self targetInstance __len__ equals: 0;
		yourself.
%
category: 'done'
method: frozensetTest
test__lt__
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.


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
method: frozensetTest
test__ne__
   | list |
	list := self targetInstance: { '1'. '2'. '3' }.

	self
		assert: (list __ne__: (self targetInstance: { '1'. '2' }));
		deny:   (list __ne__: (self targetInstance: { '1'. '2'. '3' }));
		deny:   (list __ne__: (self targetInstance: { '1'. '2'. '3'. '2' }));
		assert: (list __ne__: (self targetInstance: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: frozensetTest
test__ne__Set
   | list |
	list := self targetInstance: { '1'. '2'. '3' }.

	self
		assert: (list __ne__: (set ___value: { '1'. '2' }));
		deny:   (list __ne__: (set ___value: { '1'. '2'. '3' }));
		deny:   (list __ne__: (set ___value: { '1'. '2'. '3'. '2' }));
		assert: (list __ne__: (set ___value: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: frozensetTest
test__or__
	| a b c |
	a := self targetInstance: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance: { 'b'. 'c'. 'd'. 'e' }.

	c := a __or__: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: 5;
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: frozensetTest
test__or__Set
	| a b c |
	a := self targetInstance: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __or__: b.

	self
		assert: c __class__ equals: self targetClass;
		yourself
%
category: 'done'
method: frozensetTest
test__rand__
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := frozenset ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __rand__: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: 3;
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: frozensetTest
test__rand__Set
	| a b c |
	a := self targetInstance: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value:  { 'b'. 'c'. 'd'. 'e' }.

	c := a __rand__: b.

	self
		assert: c __class__ equals: set;
		yourself
%
category: 'done'
method: frozensetTest
test__ror__
	| a b c |
	a := self targetInstance: { 'a'. 'b'. 'c'. 'd' }.
	b := self targetInstance: { 'b'. 'c'. 'd'. 'e' }.

	c := a __ror__: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: 5;
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: frozensetTest
test__ror__Set
	| a b c |
	a := self targetInstance: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value:  { 'b'. 'c'. 'd'. 'e' }.

	c := a __ror__: b.

	self
		assert: c __class__ equals: set;
		yourself
%
category: 'done'
method: frozensetTest
test__rsub__
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := frozenset ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __rsub__: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: b __len__ equals: 4;
		deny:   (b __contains__: 'a');
		assert: (b __contains__: 'e');
		assert: c __len__ equals: 1;
		deny:   (c __contains__: 'a');
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: frozensetTest
test__rsub__Set
	| a b c |
	a := self targetInstance: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value:  { 'b'. 'c'. 'd'. 'e' }.

	c := a __rsub__: b.

	self
		assert: c __class__ equals: set;
		yourself
%
category: 'done'
method: frozensetTest
test__rxor__
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.

	self
		assert: (a __rxor__: b) __class__ equals: self targetClass;
		assert: (a __rxor__: b) __len__ equals: 1;
		assert: ((a __rxor__: b) __contains__: 'a');
		assert: (b __rxor__: a) __len__ equals: 1;
		assert: ((b __rxor__: a) __contains__: 'a');
		assert: (b __rxor__: bb) __len__ equals: 0;
		assert: (bb __rxor__: b) __len__ equals: 0;
		assert: (b __rxor__: c) equals: (b union: c);
		yourself
%
category: 'done'
method: frozensetTest
test__rxor__Set
	| a b |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.

	self
		assert: (a __rxor__: b) __class__ equals: set;
		assert: (b __rxor__: a) __class__ equals: self targetClass;
		yourself
%
category: 'done'
method: frozensetTest
test__str__
   | list |
	list := self targetInstance: { 'a' }.

	self
		assert: list __str__ equals: 'frozenset({''a''})';
		yourself
%
category: 'done'
method: frozensetTest
test__sub__
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := frozenset ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __sub__: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: (a __contains__: 'b');
		assert: c __len__ equals: 1;
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'a');
		yourself
%
category: 'done'
method: frozensetTest
test__sub__Set
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a __sub__: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: (a __contains__: 'b');
		assert: c __len__ equals: 1;
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'a');
		yourself
%
category: 'done'
method: frozensetTest
test__xor__
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.

	self
		assert: (a __rxor__: b) __class__ equals: self targetClass;
		assert: (a __xor__: b) __len__ equals: 1;
		assert: ((a __xor__: b) __contains__: 'a');
		assert: (b __xor__: a) __len__ equals: 1;
		assert: ((b __xor__: a) __contains__: 'a');
		assert: (b __xor__: bb) __len__ equals: 0;
		assert: (bb __xor__: b) __len__ equals: 0;
		assert: (b __xor__: c) equals: (b union: c);
		yourself
%
category: 'done'
method: frozensetTest
test__xor__Set
	| a b |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.

	self
		assert: (a __xor__: b) __class__ equals: self targetClass;
		yourself
%
category: 'done'
method: frozensetTest
testcopy
   | list lost |
	list := self targetInstance: { 'a'. 'b'. 'c' }.

	lost := list copy.
	self
		assert: lost __class__ equals: self targetClass;
		assert: lost __len__ equals: 3;
		assert: (lost __contains__: 'a');
		assert: (lost __contains__: 'c');
		yourself
%
category: 'done'
method: frozensetTest
testdifference
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := frozenset ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a difference: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: (a __contains__: 'b');
		assert: c __len__ equals: 1;
		assert: (c __contains__: 'a');
		yourself
%
category: 'done'
method: frozensetTest
testdifferenceSet
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a difference: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: (a __contains__: 'b');
		assert: c __len__ equals: 1;
		assert: (c __contains__: 'a');
		yourself
%
category: 'done'
method: frozensetTest
testintersection
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := frozenset ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a intersection: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: 3;
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: frozensetTest
testintersectionSet
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a intersection: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: 3;
		deny:   (c __contains__: 'e');
		assert: (c __contains__: 'd');
		yourself
%
category: 'done'
method: frozensetTest
testisdisjoint
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.


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
method: frozensetTest
testissubset
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.


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
method: frozensetTest
testissuperset
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.


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
method: frozensetTest
testsymmetric_difference
	| a b c bb |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := frozenset ___value: { 'b'. 'c' }.
	bb := frozenset ___value: { 'b'. 'c' }.
	c := frozenset ___value: { 'a' }.

	self
		assert: (a symmetric_difference: b) __class__ equals: self targetClass;
		assert: (a symmetric_difference: b) __len__ equals: 1;
		assert: ((a symmetric_difference: b) __contains__: 'a');
		assert: (b symmetric_difference: a) __len__ equals: 1;
		assert: ((b symmetric_difference: a) __contains__: 'a');
		assert: (b symmetric_difference: bb) __len__ equals: 0;
		assert: (bb symmetric_difference: b) __len__ equals: 0;
		assert: (b symmetric_difference: c) equals: (b union: c);
		yourself
%
category: 'done'
method: frozensetTest
testsymmetric_differenceSet
	| a b |
	a := frozenset ___value: { 'a'. 'b'. 'c' }.
	b := set ___value: { 'b'. 'c' }.

	self
		assert: (a symmetric_difference: b) __class__ equals: self targetClass;
		yourself
%
category: 'done'
method: frozensetTest
testunion
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := frozenset ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a union: b.

	self
		assert: c __class__ equals: self targetClass;
		assert: a __len__ equals: 4;
		deny:   (a __contains__: 'e');
		assert: c __len__ equals: 5;
		assert: (c __contains__: 'e');
		yourself
%
category: 'done'
method: frozensetTest
testunionSet
	| a b c |
	a := frozenset ___value: { 'a'. 'b'. 'c'. 'd' }.
	b := set ___value: { 'b'. 'c'. 'd'. 'e' }.

	c := a union: b.

	self
		assert: c __class__ equals: self targetClass;
		yourself
%
set compile_env: 0
category: 'todo'
method: frozensetTest
test__class_getitem__
   #pyTodo
%
category: 'todo'
method: frozensetTest
test__iter__
   #pyTodo
%
