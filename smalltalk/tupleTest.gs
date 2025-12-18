! ------------------- Remove existing behavior from tupleTest
removeallmethods tupleTest
removeallclassmethods tupleTest
! ------------------- Class methods for tupleTest
! ------------------- Instance methods for tupleTest
category: 'done'
method: tupleTest
test__add__

	| tup lost |
	tup := self tuple: { 'o' }.
	lost := self tuple: { '1'. '2' }.

	self
		assert: (tup __add__: self targetInstance) __len__ equals: (self int: 1);
		assert: (tup __add__: lost) __len__ equals: (self int: 3);
		assert: (tup __add__: lost) __len__ equals: (self int: 3);   " still the same length"
		assert: ((tup __add__: lost) __getitem__: (self int: -1)) equals: (self str: '2');
		yourself
%
category: 'done'
method: tupleTest
test__add__TypeError

	"Tuples can only be concatenated with other tuples, not with lists or other types"
	| tup |
	tup := self tuple: { 'a'. 'b' }.

	self
		should: [tup __add__: (self list: { 'c' })]
		raise: TypeError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'can only concatenate tuple (not "list") to tuple'];
		yourself.
%
category: 'done'
method: tupleTest
test__contains__onEmptyList

	self
		deny: (self targetInstance __contains__: (self str: 'x'));
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
test__doc__
	"tuple.__doc__ should return a str"

	| doc |
	doc := tuple __call__ __doc__.
	self assert: (doc isKindOf: str).
%
category: 'done'
method: tupleTest
test__eq__

	| tup |
	tup := self tuple: { '1'. '2'. '3' }.

	self
		deny:   (tup __eq__: (self tuple: { '1'. '2' }));
		assert: (tup __eq__: (self tuple: { '1'. '2'. '3' }));
		deny:   (tup __eq__: (self tuple: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: tupleTest
test__ge__

	| tup |
	tup := self tuple: { '1'. '2'. '3' }.

	self
		assert: (tup __ge__: (self tuple: { '1'. '2' }));
		assert: (tup __ge__: (self tuple: { '1'. '2'. '3' }));
		deny:   (tup __ge__: (self tuple: { '1'. '2'. '3'. '0' }));
		assert: (tup __ge__: (self tuple: { '1'. '2'. '2' }));
		deny:   (tup __ge__: (self tuple: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: tupleTest
test__getitem__negative

	| tup |
	tup := self tuple: { 'o' }.

	self
		assert: (tup __getitem__: (self int: -1)) equals: (self str: 'o');
		yourself
%
category: 'done'
method: tupleTest
test__getitem__outOfRange

	self
		should: [self targetInstance __getitem__: (self int: 0)]
		raise: IndexError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'tuple index out of range'];
		yourself.
%
category: 'done'
method: tupleTest
test__getitem__slice

	| tup s |
	tup := self tuple: { 'a'. 'b'. 'c'. 'd' }.

	"t[1:2]"
	s := slice __call__: (self int: 1) _: (self int: 2) _: None.
	self assert: (tup __getitem__: s) __len__ equals: (self int: 1).
	self assert: ((tup __getitem__: s) __getitem__: (self int: 0)) equals: (self str: 'b').

	"t[1:3]"
	s := slice __call__: (self int: 1) _: (self int: 3) _: None.
	self assert: (tup __getitem__: s) __len__ equals: (self int: 2).
	self assert: ((tup __getitem__: s) __getitem__: (self int: 1)) equals: (self str: 'c').

	"t[1:10] - out of bounds is OK for slices"
	s := slice __call__: (self int: 1) _: (self int: 10) _: None.
	self assert: (tup __getitem__: s) __len__ equals: (self int: 3).
%
category: 'done'
method: tupleTest
test__getitem__sliceWithStep
	"Test slice with step: t[i:j:k]"

	| t result s |
	"t = (0, 1, 2, 3, 4, 5, 6, 7, 8, 9)"
	t := tuple ___value: ((0 to: 9) collect: [:each | int ___value: each]).

	"t[::2] = (0, 2, 4, 6, 8)"
	s := slice __call__: None _: None _: (self int: 2).
	result := t __getitem__: s.
	self assert: result __len__ equals: (self int: 5).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 0).
	self assert: (result __getitem__: (self int: 4)) equals: (self int: 8).

	"t[1::2] = (1, 3, 5, 7, 9)"
	s := slice __call__: (self int: 1) _: None _: (self int: 2).
	result := t __getitem__: s.
	self assert: result __len__ equals: (self int: 5).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 1).

	"t[::-1] = (9, 8, 7, 6, 5, 4, 3, 2, 1, 0)"
	s := slice __call__: None _: None _: (self int: -1).
	result := t __getitem__: s.
	self assert: result __len__ equals: (self int: 10).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 9).
	self assert: (result __getitem__: (self int: 9)) equals: (self int: 0).

	"t[8:2:-2] = (8, 6, 4)"
	s := slice __call__: (self int: 8) _: (self int: 2) _: (self int: -2).
	result := t __getitem__: s.
	self assert: result __len__ equals: (self int: 3).
	self assert: (result __getitem__: (self int: 0)) equals: (self int: 8).
	self assert: (result __getitem__: (self int: 2)) equals: (self int: 4).
%
category: 'done'
method: tupleTest
test__getnewargs__
	"Test __getnewargs__ returns a tuple containing this tuple"

	| t args |
	t := self tuple: { 'a'. 'b'. 'c' }.
	args := t __getnewargs__.

	self assert: (args isKindOf: tuple).
	self assert: args __len__ equals: (self int: 1).
	self assert: (args __getitem__: (self int: 0)) equals: t.
%
category: 'done'
method: tupleTest
test__gt__

	| tup |
	tup := self tuple: { '1'. '2'. '3' }.

	self
		assert: (tup __gt__: (self tuple: { '1'. '2' }));
		deny:   (tup __gt__: (self tuple: { '1'. '2'. '3' }));
		deny:   (tup __gt__: (self tuple: { '1'. '2'. '3'. '0' }));
		assert: (tup __gt__: (self tuple: { '1'. '2'. '2' }));
		deny:   (tup __gt__: (self tuple: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: tupleTest
test__hash__
	"Test tuple hashing - tuples with same content should have same hash"

	| t1 t2 t3 |
	t1 := self tuple: { '1'. '2'. '3' }.
	t2 := self tuple: { '1'. '2'. '3' }.
	t3 := self tuple: { '1'. '2'. '4' }.

	"Same content should have same hash"
	self assert: t1 __hash__ equals: t2 __hash__.

	"Different content should (usually) have different hash"
	self deny: t1 __hash__ equals: t3 __hash__.

	"Empty tuple should be hashable"
	self assert: ((tuple ___value: #()) __hash__ isKindOf: int).
%
category: 'done'
method: tupleTest
test__hash__unhashable
	"Tuple containing unhashable element should raise TypeError"

	| t |
	"A tuple containing a list is not hashable"
	t := tuple ___value: { int ___value: 1. list ___value: #() }.

	self should: [t __hash__] raise: TypeError.
%
category: 'done'
method: tupleTest
test__iadd__

	"Tuples are immutable, so += creates a new tuple instead of modifying in place"
	| tup1 tup2 result |
	tup1 := self tuple: { 'a'. 'b' }.
	tup2 := self tuple: { 'c'. 'd' }.

	result := tup1 __iadd__: tup2.

	self
		assert: result __len__ equals: (self int: 4);
		assert: (result __getitem__: (self int: 0)) equals: (self str: 'a');
		assert: (result __getitem__: (self int: 3)) equals: (self str: 'd');
		deny: result == tup1;  "Should be a new tuple, not the same object"
		assert: tup1 __len__ equals: (self int: 2);  "Original tuple unchanged"
		yourself
%
category: 'done'
method: tupleTest
test__le__

	| x |
	x := self tuple: { '1'. '2'. '3' }.

	self
		deny:   (x __le__: (self tuple: { '1'. '2' }));
		assert: (x __le__: (self tuple: { '1'. '2'. '3' }));
		assert: (x __le__: (self tuple: { '1'. '2'. '3'. '0' }));
		deny:   (x __le__: (self tuple: { '1'. '2'. '2' }));
		assert: (x __le__: (self tuple: { '1'. '2'. '4' }));
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
	x := self tuple: { '1'. '2'. '3' }.

	self
		deny:   (x __lt__: (self tuple: { '1'. '2' }));
		deny:   (x __lt__: (self tuple: { '1'. '2'. '3' }));
		assert: (x __lt__: (self tuple: { '1'. '2'. '3'. '0' }));
		deny:   (x __lt__: (self tuple: { '1'. '2'. '2' }));
		assert: (x __lt__: (self tuple: { '1'. '2'. '4' }));
		yourself
%
category: 'done'
method: tupleTest
test__mul__

	| x |
	x := self tuple: { 'a'. 'b' }.

	self
		assert: (x __mul__: (self int: 1)) equals: (self tuple: { 'a'. 'b' });
		assert: (x __mul__: (self int: 2)) equals: (self tuple: { 'a'. 'b'. 'a'. 'b' });
		deny:   (x __mul__: (self int: 2)) equals: x;
		yourself
%
category: 'done'
method: tupleTest
test__ne__

	| tup |
	tup := self tuple: { '1'. '2'. '3' }.

	self
		assert: (tup __ne__: (self tuple: { '1'. '2' }));
		deny:   (tup __ne__: (self tuple: { '1'. '2'. '3' }));
		assert: (tup __ne__: (self tuple: { '1'. '2'. '3'. '0' }));
		yourself
%
category: 'done'
method: tupleTest
test__repr__

	| tup |
	tup := self tuple: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: tup __repr__ ___value equals: '(''a'', ''b'', ''c'', ''d'')';
		yourself.
	#pyElaborate  " should be something like 'tuple new __add__: { ''a''. ''b''. ''c''. ''d'' }' ?"
%
category: 'done'
method: tupleTest
test__rmul__

	| tup |
	tup := self tuple: { 'a'. 'b' }.

	self
		assert: (tup __rmul__: (self int: 1)) equals: (self tuple: { 'a'. 'b' });
		assert: (tup __rmul__: (self int: 2)) equals: (self tuple: { 'a'. 'b'. 'a'. 'b' });
		deny:   (tup __rmul__: (self int: 3)) equals: tup;
		yourself
%
category: 'done'
method: tupleTest
test__str__

	| tup |
	tup := self tuple: { 'a'. 'b'. 'c'. 'd' }.

	self
		assert: tup __str__ ___value equals: '(''a'', ''b'', ''c'', ''d'')';
		yourself
%
category: 'done'
method: tupleTest
testcount

	| tup |
	tup := self tuple: { 'a'. 'b'. 'c'. 'b' }.

	self
		assert: (tup count: (self str: 'a')) equals: 1;
		assert: (tup count: (self str: 'b')) equals: 2;
		assert: (tup count: (self str: 'z')) equals: 0;
		yourself
%
category: 'done'
method: tupleTest
testindex

	| x |
	x := self tuple: { 'a'. 'b'. 'c'. 'b' }.

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
