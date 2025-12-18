! ------------------- Remove existing behavior from setTest
removeallmethods setTest
removeallclassmethods setTest
! ------------------- Class methods for setTest
! ------------------- Instance methods for setTest
category: 'done'
method: setTest
test__add__

	"Python 3 set does not support + operator"
	| a b |
	a := self set: { 'a'. 'b' }.
	b := self set: { 'c'. 'd' }.

	self
		should: [a __add__: b]
		raise: TypeError
		withExceptionDo: [:exception |
			self assert: (exception messageText includesString: 'unsupported operand type')];
		yourself
%
category: 'done'
method: setTest
test__add__Unsupported
	"set does not support + operator"

	| a b |
	a := self set: { 'a' }.
	b := self set: { 'b' }.
	self should: [a __add__: b] raise: TypeError.
%
category: 'done'
method: setTest
test__and__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __and__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: (self str: 'e'));
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: (self str: 'e'));
		assert: (c __contains__: (self str: 'd'));
		yourself
%
category: 'done'
method: setTest
test__contains__onEmptyList

	self
		deny: (self targetInstance __contains__: (self str: 'x'));
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

   "Methods inherited from Container that should NOT be in set/frozenset"
   self deny: (dir __contains__: (self str: '__getitem__')).
   self deny: (dir __contains__: (self str: '__mul__')).
   self deny: (dir __contains__: (self str: '__rmul__')).
   self deny: (dir __contains__: (self str: '__imul__')).
   self deny: (dir __contains__: (self str: '__iadd__')).
   self deny: (dir __contains__: (self str: 'count')).
   self deny: (dir __contains__: (self str: 'index')).
%
category: 'done'
method: setTest
test__doc__
	"set.__doc__ should return a str"

	| doc |
	doc := set __call__ __doc__.
	self assert: (doc isKindOf: str).
%
category: 'done'
method: setTest
test__eq__

	| s |
	s := self set: { '1'. '2'. '3' }.

	self
		deny:   (s __eq__: (self set: { '1'. '2' }));
		assert: (s __eq__: (self set: { '1'. '2'. '3' }));
		assert: (s __eq__: (self set: { '1'. '2'. '3'. '1' }));
		deny:   (s __eq__: (self set: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: setTest
test__ge__

	| a b c bb |
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.


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
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

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
test__hash__Unhashable
	"set is mutable and should not be hashable"

	| s |
	s := self set: { 'a'. 'b'. 'c' }.
	self should: [s __hash__] raise: TypeError.
%
category: 'done'
method: setTest
test__iand__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __iand__: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: (self str: 'e'));
		assert: (c __contains__: (self str: 'd'));
		yourself
%
category: 'done'
method: setTest
test__ior__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __ior__: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: (self str: 'e'));
		yourself
%
category: 'done'
method: setTest
test__isub__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __isub__: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 1);
		deny:   (c __contains__: (self str: 'e'));
		assert: (c __contains__: (self str: 'a'));
		yourself
%
category: 'done'
method: setTest
test__ixor__

	| a b c bb |
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

	self
		assert: (a copy __ixor__: b) __len__ equals: (self int: 1);
		assert: ((a copy __ixor__: b) __contains__: (self str: 'a'));
		assert: (b copy __ixor__: a) __len__ equals: (self int: 1);
		assert: ((b copy __ixor__: a) __contains__: (self str: 'a'));
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
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

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
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

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

	| s |
	s := self set: { '1'. '2'. '3' }.

	self
		assert: (s __ne__: (self set: { '1'. '2' }));
		deny:   (s __ne__: (self set: { '1'. '2'. '3' }));
		deny:   (s __ne__: (self set: { '1'. '2'. '3'. '2' }));
		assert: (s __ne__: (self set: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: setTest
test__or__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __or__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: (self str: 'e'));
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: (self str: 'e'));
		yourself
%
category: 'done'
method: setTest
test__rand__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __rand__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: (self str: 'e'));
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: (self str: 'e'));
		assert: (c __contains__: (self str: 'd'));
		yourself
%
category: 'done'
method: setTest
test__repr__

	| s |
	s := self set: { 'a' }.

	self
		assert: s __repr__ ___value equals: '{''a''}';
		yourself
%
category: 'done'
method: setTest
test__ror__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __ror__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: (self str: 'e'));
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: (self str: 'e'));
		yourself
%
category: 'done'
method: setTest
test__rsub__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __rsub__: b.

	self
		assert: b __len__ equals: (self int: 4);
		deny:   (b __contains__: (self str: 'a'));
		assert: (b __contains__: (self str: 'e'));
		assert: c __len__ equals: (self int: 1);
		deny:   (c __contains__: (self str: 'a'));
		assert: (c __contains__: (self str: 'e'));
		yourself
%
category: 'done'
method: setTest
test__rxor__

	| a b c bb |
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

	self
		assert: (a __rxor__: b) __len__ equals: (self int: 1);
		assert: ((a __rxor__: b) __contains__: (self str: 'a'));
		assert: (b __rxor__: a) __len__ equals: (self int: 1);
		assert: ((b __rxor__: a) __contains__: (self str: 'a'));
		assert: (b __rxor__: bb) __len__ equals: (self int: 0);
		assert: (bb __rxor__: b) __len__ equals: (self int: 0);
		assert: (b __rxor__: c) equals: (b union: c);
		yourself
%
category: 'done'
method: setTest
test__str__

	| s |
	s := self set: { 'a' }.

	self
		assert: s __str__ ___value equals: '{''a''}';
		yourself
%
category: 'done'
method: setTest
test__sub__

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a __sub__: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: (self str: 'e'));
		assert: (a __contains__: (self str: 'b'));
		assert: c __len__ equals: (self int: 1);
		deny:   (c __contains__: (self str: 'e'));
		assert: (c __contains__: (self str: 'a'));
		yourself
%
category: 'done'
method: setTest
test__xor__

	| a b c bb |
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

	self
		assert: (a __xor__: b) __len__ equals: (self int: 1);
		assert: ((a __xor__: b) __contains__: (self str: 'a'));
		assert: (b __xor__: a) __len__ equals: (self int: 1);
		assert: ((b __xor__: a) __contains__: (self str: 'a'));
		assert: (b __xor__: bb) __len__ equals: (self int: 0);
		assert: (bb __xor__: b) __len__ equals: (self int: 0);
		assert: (b __xor__: c) equals: (b union: c);
		yourself
%
category: 'done'
method: setTest
testadd

	| s |
	s := self set: { 'a'. 'b'. 'c' }.

	s add: (self str: 'o').

	self
		assert: s __len__ equals: (self int: 4);
		assert: (s __contains__: (self str: 'o'));
		yourself
%
category: 'done'
method: setTest
testBooleanReturnTypes
	"Verify that comparison methods return Python bool objects"

	| a b |
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.

	self
		assert: (a issubset: b) class equals: bool;
		assert: (a issuperset: b) class equals: bool;
		assert: (a isdisjoint: b) class equals: bool;
		assert: (a __le__: b) class equals: bool;
		assert: (a __lt__: b) class equals: bool;
		assert: (a __ge__: b) class equals: bool;
		assert: (a __gt__: b) class equals: bool;
		yourself
%
category: 'done'
method: setTest
testclear

	| s |
	s := self set: { 'a'. 'b'. 'c' }.
	s clear.
	self
		assert: s __len__ equals: (self int: 0);
		yourself
%
category: 'done'
method: setTest
testcopy

	| s copy |
	s := self set: { 'a'. 'b'. 'c' }.

	copy := s copy.
	s remove: (self str: 'a').
	self
		assert: copy __len__ equals: (self int: 3);
		assert: (copy __contains__: (self str: 'a'));
		assert: (copy __contains__: (self str: 'c'));
		yourself
%
category: 'done'
method: setTest
testdifference

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a difference: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: (self str: 'e'));
		assert: (a __contains__: (self str: 'b'));
		assert: c __len__ equals: (self int: 1);
		assert: (c __contains__: (self str: 'a'));
		yourself
%
category: 'done'
method: setTest
testdifference_update

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a difference_update: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 1);
		deny:   (c __contains__: (self str: 'e'));
		assert: (c __contains__: (self str: 'a'));
		yourself
%
category: 'done'
method: setTest
testdifferenceVariadic
	"Test difference with multiple sets"

	| a b c d result |
	a := self set: { 'a'. 'b'. 'c'. 'd'. 'e' }.
	b := self set: { 'b' }.
	c := self set: { 'c' }.
	d := self set: { 'd' }.

	result := a difference: (tuple ___value: {b. c. d}).

	self
		assert: result __len__ equals: (self int: 2);
		assert: (result __contains__: (self str: 'a'));
		assert: (result __contains__: (self str: 'e'));
		deny:   (result __contains__: (self str: 'b'));
		deny:   (result __contains__: (self str: 'c'));
		deny:   (result __contains__: (self str: 'd'));
		yourself
%
category: 'done'
method: setTest
testdiscard

	| s |
	s := self set: { 'a'. 'b'. 'c'. 'b' }.
	s discard: (self str: 'b').

	self
		assert: s __len__ equals: (self int: 2);
		assert: (s __contains__: (self str: 'a'));
		assert: (s __contains__: (self str: 'c'));
		yourself
%
category: 'done'
method: setTest
testdiscardIfAbsent

	self targetInstance discard: (self str: 'e')
%
category: 'done'
method: setTest
testInheritsFromFrozenset
	"Verify that set properly inherits from frozenset"

	| s |
	s := self set: { 'a'. 'b'. 'c' }.
	self
		assert: (s isKindOf: frozenset);
		assert: (s isKindOf: set);
		yourself
%
category: 'done'
method: setTest
testintersection

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a intersection: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: (self str: 'e'));
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: (self str: 'e'));
		assert: (c __contains__: (self str: 'd'));
		yourself
%
category: 'done'
method: setTest
testintersection_update

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a intersection_update: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 3);
		deny:   (c __contains__: (self str: 'e'));
		assert: (c __contains__: (self str: 'd'));
		yourself
%
category: 'done'
method: setTest
testintersectionVariadic
	"Test intersection with multiple sets"

	| a b c result |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.
	c := self set: { 'c'. 'd'. 'f' }.

	result := a intersection: (tuple ___value: {b. c}).

	self
		assert: result __len__ equals: (self int: 2);
		assert: (result __contains__: (self str: 'c'));
		assert: (result __contains__: (self str: 'd'));
		deny:   (result __contains__: (self str: 'a'));
		deny:   (result __contains__: (self str: 'b'));
		yourself
%
category: 'done'
method: setTest
testisdisjoint

	| a b c bb |
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

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
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

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
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

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

	| s copy element |
	s := self set: { 'a'. 'b'. 'c' }.
	copy := s copy.
	element := s pop.

	self
		assert: (copy __contains__: element);
		deny:   (s __contains__: element);
		assert: s __len__ equals: (self int: 2);
		yourself.

	"Remove the rest of the items"
	s pop; pop.

	self should: [s pop] raise: KeyError.
%
category: 'done'
method: setTest
testremove

	| s |
	s := self set: { 'a'. 'b'. 'c'. 'b' }.
	s remove: (self str: 'b').

	self
		assert: s __len__ equals: (self int: 2);
		assert: (s __contains__: (self str: 'a'));
		assert: (s __contains__: (self str: 'c'));
		yourself
%
category: 'done'
method: setTest
testremoveIfAbsent

	| s |
	s := self targetInstance.

	self
		should: [s remove: (self str: 'e')]
		raise: KeyError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: '''e'''];
		yourself
%
category: 'done'
method: setTest
testsymmetric_difference

	| a b c bb |
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

	self
		assert: (a symmetric_difference: b) __len__ equals: (self int: 1);
		assert: ((a symmetric_difference: b) __contains__: (self str: 'a'));
		assert: (b symmetric_difference: a) __len__ equals: (self int: 1);
		assert: ((b symmetric_difference: a) __contains__: (self str: 'a'));
		assert: (b symmetric_difference: bb) __len__ equals: (self int: 0);
		assert: (bb symmetric_difference: b) __len__ equals: (self int: 0);
		assert: (b symmetric_difference: c) equals: (b union: c);
		yourself
%
category: 'done'
method: setTest
testsymmetric_difference_update

	| a b c bb |
	a := self set: { 'a'. 'b'. 'c' }.
	b := self set: { 'b'. 'c' }.
	bb := self set: { 'b'. 'c' }.
	c := self set: { 'a' }.

	self
		assert: (a copy symmetric_difference_update: b) __len__ equals: (self int: 1);
		assert: ((a copy symmetric_difference_update: b) __contains__: (self str: 'a'));
		assert: (b copy symmetric_difference_update: a) __len__ equals: (self int: 1);
		assert: ((b copy symmetric_difference_update: a) __contains__: (self str: 'a'));
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
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a union: b.

	self
		assert: a __len__ equals: (self int: 4);
		deny:   (a __contains__: (self str: 'e'));
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: (self str: 'e'));
		yourself
%
category: 'done'
method: setTest
testunionVariadic
	"Test union with multiple sets"

	| a b c result |
	a := self set: { 'a' }.
	b := self set: { 'b' }.
	c := self set: { 'c' }.

	result := a union: (tuple ___value: {b. c}).

	self
		assert: result __len__ equals: (self int: 3);
		assert: (result __contains__: (self str: 'a'));
		assert: (result __contains__: (self str: 'b'));
		assert: (result __contains__: (self str: 'c'));
		yourself
%
category: 'done'
method: setTest
testUnsupportedOperations
	"Test that set raises errors for operations it doesn't support"

	| s |
	s := self set: { self int: 1. self int: 2 }.

	"set doesn't support indexing"
	self should: [s __getitem__: (self int: 0)] raise: TypeError.

	"set doesn't support *"
	self should: [s __mul__: (self int: 2)] raise: TypeError.
	self should: [s __rmul__: (self int: 2)] raise: TypeError.
	self should: [s __imul__: (self int: 2)] raise: TypeError.

	"set doesn't support += (use update instead)"
	self should: [s __iadd__: s] raise: TypeError.

	"set doesn't have count or index"
	self should: [s count: (self int: 1)] raise: AttributeError.
	self should: [s index: (self int: 1)] raise: AttributeError.
%
category: 'done'
method: setTest
testupdate

	| a b c |
	a := self set: { 'a'. 'b'. 'c'. 'd' }.
	b := self set: { 'b'. 'c'. 'd'. 'e' }.

	c := a update: b.

	self
		assert: a == c;
		assert: c __len__ equals: (self int: 5);
		assert: (c __contains__: (self str: 'e'));
		yourself
%
category: 'done'
method: setTest
testupdateVariadic
	"Test update with multiple sets"

	| a b c |
	a := self set: { 'a' }.
	b := self set: { 'b' }.
	c := self set: { 'c' }.

	a update: (tuple ___value: {b. c}).

	self
		assert: a __len__ equals: (self int: 3);
		assert: (a __contains__: (self str: 'a'));
		assert: (a __contains__: (self str: 'b'));
		assert: (a __contains__: (self str: 'c'));
		yourself
%
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
