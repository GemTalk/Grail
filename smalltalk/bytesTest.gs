! ------------------- Remove existing behavior from bytesTest
removeAllMethods bytesTest
removeAllClassMethods bytesTest
! ------------------- Class methods for bytesTest
! ------------------- Instance methods for bytesTest
set compile_env: 0
category: 'done'
method: bytesTest
test__add__

	[
		(self targetInstance: 'j') __add__: 3.
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: (ex messageText beginsWith: 'can''t concat').
	].
%
category: 'done'
method: bytesTest
test__contains__

	| ab |
	ab := self targetInstance: 'ab' _: 'utf-8'.
	self deny: (self targetInstance __contains__: ab).
	self deny: ((self targetInstance: 3) __contains__: ab).
	self assert: ((self targetInstance: 'aba' _: 'utf-8') __contains__: ab)
%
category: 'done'
method: bytesTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__add__' '__class__' '__contains__' '__delattr__' '__dir__' '__doc__' '__eq__' '__format__' '__ge__' '__getattribute__' '__getitem__' '__getnewargs__' '__gt__' '__hash__' '__init__' '__init_subclass__' '__iter__' '__le__' '__len__' '__lt__' '__mod__' '__mul__' '__ne__' '__new__' '__reduce__' '__reduce_ex__' '__repr__' '__rmod__' '__rmul__' '__setattr__' '__sizeof__' '__str__' '__subclasshook__' 'capitalize' 'center' 'count' 'decode' 'endswith' 'expandtabs' 'find' 'fromhex' 'hex' 'index' 'isalnum' 'isalpha' 'isascii' 'isdigit' 'islower' 'isspace' 'istitle' 'isupper' 'join' 'ljust' 'lower' 'lstrip' 'maketrans' 'partition' 'removeprefix' 'removesuffix' 'replace' 'rfind' 'rindex' 'rjust' 'rpartition' 'rsplit' 'rstrip' 'split' 'splitlines' 'startswith' 'strip' 'swapcase' 'title' 'translate' 'upper' 'zfill')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 75.
"   self assert: (dir __contains__: #__add__).
   self assert: (dir __contains__: #__class__).
   self assert: (dir __contains__: #__contains__).
   self assert: (dir __contains__: #__delattr__).
   self assert: (dir __contains__: #__dir__).
   self assert: (dir __contains__: #__doc__).
   self assert: (dir __contains__: #__eq__).
   self assert: (dir __contains__: #__format__).
   self assert: (dir __contains__: #__ge__).
   self assert: (dir __contains__: #__getattribute__).
   self assert: (dir __contains__: #__getitem__).
   #pyTodo. "self assert: (dir __contains__: #__getnewargs__).
"   self assert: (dir __contains__: #__gt__).
   self assert: (dir __contains__: #__hash__).
   self assert: (dir __contains__: #__init__).
   #pyTodo. "self assert: (dir __contains__: #__init_subclass__).
"   #pyTodo. "self assert: (dir __contains__: #__iter__).
"   self assert: (dir __contains__: #__le__).
   self assert: (dir __contains__: #__len__).
   self assert: (dir __contains__: #__lt__).
   self assert: (dir __contains__: #__mod__).
   self assert: (dir __contains__: #__mul__).
   self assert: (dir __contains__: #__ne__).
   self assert: (dir __contains__: #__new__).
   #pyTodo. "self assert: (dir __contains__: #__reduce__).
"   #pyTodo. "self assert: (dir __contains__: #__reduce_ex__).
"   self assert: (dir __contains__: #__repr__).
   self assert: (dir __contains__: #__rmod__).
   self assert: (dir __contains__: #__rmul__).
   self assert: (dir __contains__: #__setattr__).
   self assert: (dir __contains__: #__sizeof__).
   self assert: (dir __contains__: #__str__).
   self assert: (dir __contains__: #__subclasshook__).
   self assert: (dir __contains__: #capitalize).
   self assert: (dir __contains__: #center).
   self assert: (dir __contains__: #count).
   #pyTodo. "self assert: (dir __contains__: #decode).
"   self assert: (dir __contains__: #endswith).
   self assert: (dir __contains__: #expandtabs).
   self assert: (dir __contains__: #find).
   #pyTodo. "self assert: (dir __contains__: #fromhex).
"   #pyTodo. "self assert: (dir __contains__: #hex).
"   self assert: (dir __contains__: #index).
   self assert: (dir __contains__: #isalnum).
   self assert: (dir __contains__: #isalpha).
   self assert: (dir __contains__: #isascii).
   self assert: (dir __contains__: #isdigit).
   self assert: (dir __contains__: #islower).
   self assert: (dir __contains__: #isspace).
   self assert: (dir __contains__: #istitle).
   self assert: (dir __contains__: #isupper).
   #pyTodo. "self assert: (dir __contains__: #join).
"   self assert: (dir __contains__: #ljust).
   self assert: (dir __contains__: #lower).
   self assert: (dir __contains__: #lstrip).
   #pyTodo. "self assert: (dir __contains__: #maketrans).
"   self assert: (dir __contains__: #partition).
   self assert: (dir __contains__: #removeprefix).
   self assert: (dir __contains__: #removesuffix).
   self assert: (dir __contains__: #replace).
   self assert: (dir __contains__: #rfind).
   #pyTodo. "self assert: (dir __contains__: #rindex).
"   #pyTodo. "self assert: (dir __contains__: #rjust).
"   #pyTodo. "self assert: (dir __contains__: #rpartition).
"   #pyTodo. "self assert: (dir __contains__: #rsplit).
"   #pyTodo. "self assert: (dir __contains__: #rstrip).
"   #pyTodo. "self assert: (dir __contains__: #split).
"   #pyTodo. "self assert: (dir __contains__: #splitlines).
"   self assert: (dir __contains__: #startswith).
   #pyTodo. "self assert: (dir __contains__: #strip).
"   #pyTodo. "self assert: (dir __contains__: #swapcase).
"   self assert: (dir __contains__: #title).
   #pyTodo. "self assert: (dir __contains__: #translate).
"   self assert: (dir __contains__: #upper).
   #pyTodo. "self assert: (dir __contains__: #zfill).
"
%
category: 'done'
method: bytesTest
test__eq__
   | list |
	list := self targetInstance: '123'.

	self
		deny:   (list __eq__: (self targetInstance: '12'));
		assert: (list __eq__: (self targetInstance: '123'));
		deny:   (list __eq__: (self targetInstance: '1231'));
		deny:   (list __eq__: (self targetInstance: '1230'));
		yourself
%
category: 'done'
method: bytesTest
test__ge__
	"r'abc'.__ge__(r'bc')"
	| a b c bb |
	a := self targetInstance:  'abc'.
	b := self targetInstance:  'bc'.
	bb := self targetInstance: 'bc'.
	c := self targetInstance:  'a'.


	self
		deny:   (a __ge__: b);
		assert: (b __ge__: a);
		assert: (bb __ge__: b);
		assert: (b __ge__: bb);
		deny:   (c __ge__: b);
		assert: (b __ge__: c);
		yourself
%
category: 'done'
method: bytesTest
test__getitem__
   | list |
	list := self targetInstance: '1234'.

	self
		assert: list __len__ equals: 4;
		assert: (list __getitem__: 0) equals: '1';
		yourself
%
category: 'done'
method: bytesTest
test__getitem__negative
   | list |
	list := self targetInstance: 'o'.

	self
		assert: (list __getitem__: -1) equals: 'o';
		yourself
%
category: 'done'
method: bytesTest
test__le__
   | list |
	#pyElaborate. "this is an aproximated implementation"

	list := self targetInstance: '123'.

	self
		deny:   (list __le__: (self targetInstance: '12'));
		assert: (list __le__: (self targetInstance: '123'));
		assert: (list __le__: (self targetInstance: '1230'));
		deny:   (list __le__: (self targetInstance: '122'));
		assert: (list __le__: (self targetInstance: '124'));
		yourself
%
category: 'done'
method: bytesTest
test__len__
   self assert: self targetInstance __len__ equals: 0.
	self assert: (self targetInstance: 3) __len__ equals: 3.

	self assert: (self targetInstance: 'aba' _: 'utf-8') __len__ equals: 3.
%
category: 'done'
method: bytesTest
test__lt__
   | list |
	#pyElaborate. "this is an aproximated implementation"

	list := self targetInstance: '123'.

	self
		deny:   (list __lt__: (self targetInstance: '12'));
		deny:   (list __lt__: (self targetInstance: '123'));
		assert: (list __lt__: (self targetInstance: '1230'));
		deny:   (list __lt__: (self targetInstance: '122'));
		assert: (list __lt__: (self targetInstance: '124'));
		yourself
%
category: 'done'
method: bytesTest
test__mod__
   self should: [(self targetInstance: 'j') __mod__: 3 ]
			raise: TypeError
			withExceptionDo: [:exception |
				self assert: exception messageText equals: 'not all arguments converted during bytes formatting'].
%
category: 'done'
method: bytesTest
test__mul__
	| j ja |
	j :=  self targetInstance: 'j'.
	ja :=  self targetInstance: 'ja'.

   self assert: (j __mul__: 3) __len__ equals: 3.
   self assert: (ja __mul__: 3) __len__ equals: 6.

   self assert: ((j __mul__: 3) __contains__: (self targetInstance: 'jj')).
   self assert: ((j __mul__: 3) __contains__: (self targetInstance: 'jjj')).
	self assert: ((ja __mul__: 3) __contains__: (self targetInstance: 'aja')).
%
category: 'done'
method: bytesTest
test__ne__
   | list |
	list := self targetInstance: 'abc'.

	self
		assert: (list __ne__: (self targetInstance: 'ab'));
		deny:   (list __ne__: (self targetInstance: 'abc'));
		assert: (list __ne__: (self targetInstance: 'abe'));
		assert: (list __ne__: (self targetInstance: 'abc0'));
		yourself
%
category: 'done'
method: bytesTest
test__rmod__
   self  assert: (self targetInstance __rmod__: 'x') == NotImplementedType singleton.
%
category: 'done'
method: bytesTest
test__rmul__
	| j ja |
	j :=  self targetInstance: 'j'.
	ja :=  self targetInstance: 'ja'.

   self assert: (j __rmul__: 3) __len__ equals: 3.
   self assert: (ja __rmul__: 3) __len__ equals: 6.

   self assert: ((j __rmul__: 3) __contains__: (self targetInstance: 'jj')).
   self assert: ((j __rmul__: 3) __contains__: (self targetInstance: 'jjj')).
	self assert: ((ja __rmul__: 3) __contains__: (self targetInstance: 'aja')).
%
category: 'done'
method: bytesTest
test__str__
   | list |
	list := self targetInstance: 'abcd'.

	self
		assert: list __str__ equals: 'abcd';
		yourself
%
category: 'done'
method: bytesTest
testcapitalize
	| Abcd |
	Abcd := self targetInstance: 'Abcd'.

	self
		assert: (self targetInstance: 'abcd') capitalize equals: Abcd ;
		assert: (self targetInstance: 'ABCD') capitalize equals: Abcd ;
		assert: (self targetInstance: 'aBCD') capitalize equals: Abcd ;
		assert: (self targetInstance: 'Abcd') capitalize equals: Abcd ;
		yourself
%
category: 'done'
method: bytesTest
testcenter
"
r'abc'.center(2)  >> 'abc'
r'abc'.center(3)  >> 'abc'
r'abc'.center(4)  >> 'abc '
r'abc'.center(5)  >> ' abc '
r'abcd'.center(5)  >> ' abcd'
"

	| abc abcd |
	abc  := self targetInstance: 'abc'.
	abcd := self targetInstance: 'abcd'.

	self
		assert: (abc center: 2) equals: (self targetInstance: 'abc');
		assert: (abc center: 3) equals: (self targetInstance: 'abc');
		assert: (abc center: 4) equals: (self targetInstance: 'abc ');
		assert: (abc center: 5) equals: (self targetInstance: ' abc ');
		assert: (abcd center: 5) equals: (self targetInstance: ' abcd');
		assert: (abcd center: 6) equals: (self targetInstance: ' abcd ');
		assert: (abcd center: 5 _: $*) equals: (self targetInstance: '*abcd');
		assert: (abcd center: 6 _: $*) equals: (self targetInstance: '*abcd*');
		yourself
%
category: 'done'
method: bytesTest
testcount
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list count: 'a') equals: 1;
		assert: (list count: 'b') equals: 2;
		assert: (list count: 'z') equals: 0;
		yourself.

	list := self targetInstance: 'aaaa'.

	self
		assert: (list count: 'a') equals: 4;
		yourself
%
category: 'done'
method: bytesTest
testcountWithEnd
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list count: 'ab' _: 1 _: 5) equals: 0;
		assert: (list count: 'ab' _: 1 _: 6) equals: 1;
		yourself
%
category: 'done'
method: bytesTest
testcountWithStart
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list count: 'ab' _: 0) equals: 2;
		assert: (list count: 'ab' _: 1) equals: 1;
		assert: (list count: 'ab' _: 4) equals: 1;
		assert: (list count: 'ab' _: 5) equals: 0;
		yourself
%
category: 'done'
method: bytesTest
testendswith
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list endswith: 'a') equals: false;
		assert: (list endswith: 'b') equals: true;
		assert: (list endswith: 'z') equals: false;
		yourself.

	list := self targetInstance: 'aaaa'.

	self
		assert: (list endswith: 'a') equals: true;
		yourself
%
category: 'done'
method: bytesTest
testendswithWithEnd
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list endswith: 'ab' _: 0 _: 2) equals: true;
		assert: (list endswith: 'ab' _: 0 _: 3) equals: false;
		yourself
%
category: 'done'
method: bytesTest
testendswithWithStart
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list endswith: 'cb' _: 1) equals: true;
		assert: (list endswith: 'ab' _: 4) equals: false;
		assert: (list endswith: 'cb' _: 5) equals: true;
		yourself
%
category: 'done'
method: bytesTest
testexpandtabs
   | list |
	list := self targetInstance: 'cb', String tab, 'e'.

	self
		assert: list __len__ equals: 4;
		assert: list expandtabs __len__ equals: 11;
		assert: list expandtabs equals: (self targetInstance: 'cb        e');
		assert: (list expandtabs: 4) equals: (self targetInstance: 'cb    e');
		yourself
%
category: 'done'
method: bytesTest
testfind
   self
		testfindByOne
		testfindByTwo
		testfindWithEnd
		testfindWithStart
		yourself.
%
category: 'done'
method: bytesTest
testfindByOne
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list find: 'a') equals: 0;
		assert: (list find: 'b') equals: 1;
		assert: (list find: 'z') equals: -1;
		yourself
%
category: 'done'
method: bytesTest
testfindByTwo
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list find: 'ab') equals: 0;
		assert: (list find: 'bc') equals: 1;
		assert: (list find: 'cb') equals: 2;
		assert: (list find: 'cbz') equals: -1;
		assert: (list find: 'zab') equals: -1;
		assert: (list find: 'az') equals: -1;
		yourself
%
category: 'done'
method: bytesTest
testfindWithEnd
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list find: 'ab' _: 1 _: 5) equals: -1;
		assert: (list find: 'ab' _: 1 _: 6) equals: 4;
		yourself
%
category: 'done'
method: bytesTest
testfindWithStart
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list find: 'ab' _: 1) equals: 4;
		assert: (list find: 'ab' _: 4) equals: 4;
		assert: (list find: 'ab' _: 5) equals: -1;
		yourself
%
category: 'done'
method: bytesTest
testindexByOne
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list index: 'a') equals: 0;
		assert: (list index: 'b') equals: 1;
		should: [list index: 'z'] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testindexByTwo
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list index: 'ab') equals: 0;
		assert: (list index: 'bc') equals: 1;
		assert: (list index: 'cb') equals: 2;
		should: [list index: 'cbz'] raise: ValueError;
		should: [list index: 'zab'] raise: ValueError;
		should: [list index: 'az'] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testindexWithEnd
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		should: [list index: 'ab' _: 1 _: 5] raise: ValueError;
		assert: (list index: 'ab' _: 1 _: 6) equals: 4;
		yourself
%
category: 'done'
method: bytesTest
testindexWithStart
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list index: 'ab' _: 1) equals: 4;
		assert: (list index: 'ab' _: 4) equals: 4;
		should: [list index: 'ab' _: 5] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testisalnum

	self
		deny:    self targetInstance isalnum;
		assert: (self targetInstance: '12') isalnum;
		assert: (self targetInstance: 'ho') isalnum;
		assert: (self targetInstance: 'a2') isalnum;
		deny:   (self targetInstance: '12.') isalnum;
		deny:   (self targetInstance: ',12') isalnum;
		deny:   (self targetInstance: '1:2') isalnum;
		yourself
%
category: 'done'
method: bytesTest
testisalpha

	self
		deny:    self targetInstance isalpha;
		deny:   (self targetInstance: '12') isalpha;
		assert: (self targetInstance: 'ho') isalpha;
		deny:   (self targetInstance: 'a2') isalpha;
		deny:   (self targetInstance: '12.') isalpha;
		deny:   (self targetInstance: ',12') isalpha;
		deny:   (self targetInstance: '1:2') isalpha;
		yourself
%
category: 'done'
method: bytesTest
testisascii

	self
		assert:  self targetInstance isascii;
		assert: (self targetInstance: '12') isascii;
		assert: (self targetInstance: '  ') isascii;
		assert: (self targetInstance: 'HO') isascii;
		assert: (self targetInstance: 'hO ') isascii;
		assert: (self targetInstance: ' a2') isascii;
		assert: (self targetInstance: '12.') isascii;
		assert: (self targetInstance: ',12') isascii;
		assert: (self targetInstance: '1:2') isascii;
		yourself
%
category: 'done'
method: bytesTest
testisdigit

	self
		deny:    self targetInstance isdigit;
		assert: (self targetInstance: '12') isdigit;
		deny:   (self targetInstance: 'ho') isdigit;
		deny:   (self targetInstance: 'a2') isdigit;
		deny:   (self targetInstance: '12.') isdigit;
		deny:   (self targetInstance: ',12') isdigit;
		deny:   (self targetInstance: '1:2') isdigit;
		yourself
%
category: 'done'
method: bytesTest
testislower

	self
		deny:    self targetInstance islower;
		deny:   (self targetInstance: '12') islower;
		assert: (self targetInstance: 'ho') islower;
		deny:   (self targetInstance: 'HO') islower;
		deny:   (self targetInstance: 'hO') islower;
		deny:   (self targetInstance: 'a2') islower;
		deny:   (self targetInstance: '12.') islower;
		deny:   (self targetInstance: ',12') islower;
		deny:   (self targetInstance: '1:2') islower;
		yourself
%
category: 'done'
method: bytesTest
testisspace

	self
		deny:    self targetInstance isspace;
		deny:   (self targetInstance: '12') isspace;
		assert: (self targetInstance: '  ') isspace;
		deny:   (self targetInstance: 'HO') isspace;
		deny:   (self targetInstance: 'hO ') isspace;
		deny:   (self targetInstance: ' a2') isspace;
		deny:   (self targetInstance: '12.') isspace;
		deny:   (self targetInstance: ',12') isspace;
		deny:   (self targetInstance: '1:2') isspace;
		yourself
%
category: 'done'
method: bytesTest
testistitle

	self
		assert: (self targetInstance: 'A man, a plan, a canal, panama') title istitle;
		deny:   (self targetInstance: 'A man') istitle;
		assert: (self targetInstance: 'A Man') istitle;
		deny:     self targetInstance istitle;
		yourself
%
category: 'done'
method: bytesTest
testisupper

	self
		deny:    self targetInstance isupper;
		deny:   (self targetInstance: '12') isupper;
		deny:   (self targetInstance: '  ') isupper;
		assert: (self targetInstance: 'HO') isupper;
		deny:   (self targetInstance: 'hO ') isupper;
		deny:   (self targetInstance: ' a2') isupper;
		deny:   (self targetInstance: '12.') isupper;
		deny:   (self targetInstance: ',12') isupper;
		deny:   (self targetInstance: '1:2') isupper;
		yourself
%
category: 'done'
method: bytesTest
testljust
"
r'abc'.ljust(2)  >> 'abc'
"
	| abc |
	abc  := self targetInstance: 'abc'.

	self
		assert: (abc ljust: 2) equals: abc;
		assert: (abc ljust: 3) equals: abc;
		assert: (abc ljust: 4) equals: (self targetInstance: 'abc ');
		assert: (abc ljust: 4 _: $*) equals: (self targetInstance: 'abc*');
		yourself
%
category: 'done'
method: bytesTest
testlower
	| abcd |
	abcd := self targetInstance: 'abcd'.

	self
		assert: (self targetInstance: 'abcd') lower equals: abcd ;
		assert: (self targetInstance: 'ABCD') lower equals: abcd ;
		assert: (self targetInstance: 'aBCD') lower equals: abcd ;
		assert: (self targetInstance: 'Abcd') lower equals: abcd ;
		yourself
%
category: 'done'
method: bytesTest
testlstrip

	self
		assert: self targetInstance lstrip equals: (self targetInstance: '');
		assert: (self targetInstance: '') lstrip equals: (self targetInstance: '');
		assert: (self targetInstance: '  bcd') lstrip equals: (self targetInstance: 'bcd');
		assert: (self targetInstance: 'abcd') lstrip equals: (self targetInstance: 'abcd');
		assert: ((self targetInstance: 'aabcd') lstrip: 'a') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'aabcd') lstrip: 'ba') equals: (self targetInstance: 'cd');
		assert: ((self targetInstance: 'aabcd') lstrip: 'ab') equals: (self targetInstance: 'cd');
		assert: ((self targetInstance: 'aabcd') lstrip: 'ca') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'aabcd') lstrip: 'ac') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'aabcd') lstrip: 'c') equals: (self targetInstance: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testpartition

	self
		assert: ((self targetInstance: '  bcd') partition: 'a')
		equals: (tuple ___new__init__: { self targetInstance: '  bcd'. self targetInstance. self targetInstance });
		assert: ((self targetInstance: '  bcd') partition: '  ')
		equals: (tuple ___new__init__: { self targetInstance. self targetInstance: '  '. self targetInstance: 'bcd' });
		assert: ((self targetInstance: '  bcd') partition: 'bc')
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance: 'bc'. self targetInstance: 'd' });
		assert: ((self targetInstance: '  bcbcd') partition: 'bc')
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance: 'bc'. self targetInstance: 'bcd' });
		yourself
%
category: 'done'
method: bytesTest
testremoveprefix

	self
		assert: ((self targetInstance: 'aabcd') removeprefix: 'a') equals: (self targetInstance: 'abcd');
		assert: ((self targetInstance: 'aabcd') removeprefix: 'aa') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'aabcd') removeprefix: 'ab') equals: (self targetInstance: 'aabcd');
		assert: ((self targetInstance: 'aabcd') removeprefix: 'c') equals: (self targetInstance: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testremovesuffix

	self
		assert: ((self targetInstance: 'aabcd') removesuffix: 'd') equals: (self targetInstance: 'aabc');
		assert: ((self targetInstance: 'aabcd') removesuffix: 'cd') equals: (self targetInstance: 'aab');
		assert: ((self targetInstance: 'aabcd') removesuffix: 'dc') equals: (self targetInstance: 'aabcd');
		assert: ((self targetInstance: 'aabcd') removesuffix: 'c') equals: (self targetInstance: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testreplace

	self
		assert: ((self targetInstance: 'aabcd') replace: 'a' _: 'x') equals: (self targetInstance: 'xxbcd');
		assert: ((self targetInstance: 'aabcd') replace: 'z' _: 'x') equals: (self targetInstance: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testrfind
   self
		testrfindByOne
		testrfindByTwo
		testrfindWithEnd
		testrfindWithStart
		yourself.
%
category: 'done'
method: bytesTest
testrfindByOne
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list rfind: 'a') equals: 0;
		assert: (list rfind: 'b') equals: 3;
		assert: (list rfind: 'z') equals: -1;
		yourself
%
category: 'done'
method: bytesTest
testrfindByTwo
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list rfind: 'ab') equals: 0;
		assert: (list rfind: 'bc') equals: 1;
		assert: (list rfind: 'cb') equals: 2;
		assert: (list rfind: 'cbz') equals: -1;
		assert: (list rfind: 'zab') equals: -1;
		assert: (list rfind: 'az') equals: -1;
		yourself
%
category: 'done'
method: bytesTest
testrfindWithEnd
   | list |
	list := self targetInstance: 'abceabcb'.

	self
		assert: (list rfind: 'ab' _: 1 _: 5) equals: -1;
		assert: (list rfind: 'ab' _: 1 _: 5) equals: -1;
		assert: (list rfind: 'ab' _: 1 _: 6) equals: 4;
		yourself
%
category: 'done'
method: bytesTest
testrfindWithStart
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list rfind: 'ab' _: 1) equals: 4;
		assert: (list rfind: 'ab' _: 4) equals: 4;
		assert: (list rfind: 'ab' _: 5) equals: -1;
		yourself
%
category: 'done'
method: bytesTest
testrindex
   self
		testrindexByOne
		testrindexByTwo
		testrindexWithEnd
		testrindexWithStart
		yourself.
%
category: 'done'
method: bytesTest
testrindexByOne
   | list |
	list := self targetInstance: 'bcba'.

	self
		assert: (list rindex: 'a') equals: 3;
		assert: (list rindex: 'b') equals: 2;
		should: [list rindex: 'z'] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testrindexByTwo
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list rindex: 'ab') equals: 0;
		assert: (list rindex: 'bc') equals: 1;
		assert: (list rindex: 'cb') equals: 2;
		should: [list rindex: 'cbz'] raise: ValueError;
		should: [list rindex: 'zab'] raise: ValueError;
		should: [list rindex: 'az'] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testrindexWithEnd
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		should: [list rindex: 'ab' _: 1 _: 5] raise: ValueError;
		assert: (list rindex: 'ab' _: 1 _: 6) equals: 4;
		yourself
%
category: 'done'
method: bytesTest
testrindexWithStart
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list rindex: 'ab' _: 1) equals: 4;
		assert: (list rindex: 'ab' _: 4) equals: 4;
		should: [list rindex: 'ab' _: 5] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testrjust
"
r'abc'.ljust(2)  >> 'abc'
"
	| abc |
	abc  := self targetInstance: 'abc'.

	self
		assert: (abc rjust: 2) equals: abc;
		assert: (abc rjust: 3) equals: abc;
		assert: (abc rjust: 4) equals: (self targetInstance: ' abc');
		assert: (abc rjust: 4 _: $*) equals: (self targetInstance: '*abc');
		yourself
%
category: 'done'
method: bytesTest
testrpartition

	self
		assert: ((self targetInstance: '  bcd') rpartition: 'a')
		equals: (tuple ___new__init__: { self targetInstance. self targetInstance. self targetInstance: '  bcd' });
		assert: ((self targetInstance: '  bcd') rpartition: '  ')
		equals: (tuple ___new__init__: { self targetInstance. self targetInstance: '  '. self targetInstance: 'bcd' });
		assert: ((self targetInstance: '  bcd') rpartition: 'bc')
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance: 'bc'. self targetInstance: 'd' });
		assert: ((self targetInstance: '  bcbcd') rpartition: 'bc')
		equals: (tuple ___new__init__: { self targetInstance: '  bc'. self targetInstance: 'bc'. self targetInstance: 'd' });
		yourself
%
category: 'done'
method: bytesTest
testrsplitOnSep

	self
		assert: ((self targetInstance: '  bcd') rsplit: 'a')
		equals: (tuple ___new__init__: { self targetInstance: '  bcd' });
		assert: ((self targetInstance: '  bcd') rsplit: ' ')
		equals: (tuple ___new__init__: { self targetInstance. self targetInstance. self targetInstance: 'bcd' });
		assert: ((self targetInstance: '  bcd') rsplit: '  ')
		equals: (tuple ___new__init__: { self targetInstance. self targetInstance: 'bcd' });
		assert: ((self targetInstance: '  bcd') rsplit: 'bc')
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance: 'd' });
		assert: ((self targetInstance: '  bcbcd') rsplit: 'bc')
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance. self targetInstance: 'd' });
		yourself
%
category: 'done'
method: bytesTest
testrsplitOnSepAndMaxSplit

	self
		assert: ((self targetInstance: '  bcbcd') rsplit: 'bc' _: 2)
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance. self targetInstance: 'd' });
		assert: ((self targetInstance: '  bcbcd') rsplit: 'bc' _: 1)
		equals: (tuple ___new__init__: { self targetInstance: '  bc'. self targetInstance: 'd' });
		assert: ((self targetInstance: '  bcbcd') rsplit: 'bc' _: 0)
		equals: (tuple ___new__init__: { self targetInstance: '  bcbcd' });
		yourself
%
category: 'done'
method: bytesTest
testrstrip

	self
		assert: (self targetInstance: 'bcd  ') rstrip equals: (self targetInstance: 'bcd');
		assert: (self targetInstance: 'abcd') rstrip equals: (self targetInstance: 'abcd');
		assert: ((self targetInstance: 'bcdaa') rstrip: 'a') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'bcdaa') rstrip: 'ad') equals: (self targetInstance: 'bc');
		assert: ((self targetInstance: 'bcdaa') rstrip: 'da') equals: (self targetInstance: 'bc');
		assert: ((self targetInstance: 'bcdaa') rstrip: 'ac') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'bcdaa') rstrip: 'ca') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'aabcd') rstrip: 'c') equals: (self targetInstance: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testsplitOnSep

	self
		assert: ((self targetInstance: '  bcd') split: 'a')
		equals: (tuple ___new__init__: { self targetInstance: '  bcd' });
		assert: ((self targetInstance: '  bcd') split: ' ')
		equals: (tuple ___new__init__: { self targetInstance. self targetInstance. self targetInstance: 'bcd' });
		assert: ((self targetInstance: '  bcd') split: '  ')
		equals: (tuple ___new__init__: { self targetInstance. self targetInstance: 'bcd' });
		assert: ((self targetInstance: '  bcd') split: 'bc')
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance: 'd' });
		assert: ((self targetInstance: '  bcbcd') split: 'bc')
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance. self targetInstance: 'd' });
		yourself
%
category: 'done'
method: bytesTest
testsplitOnSepAndMaxSplit

	self
		assert: ((self targetInstance: '  bcbcd') split: 'bc' _: 2)
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance. self targetInstance: 'd' });
		assert: ((self targetInstance: '  bcbcd') split: 'bc' _: 1)
		equals: (tuple ___new__init__: { self targetInstance: '  '. self targetInstance: 'bcd' });
		assert: ((self targetInstance: '  bcbcd') split: 'bc' _: 0)
		equals: (tuple ___new__init__: { self targetInstance: '  bcbcd' });
		yourself
%
category: 'done'
method: bytesTest
teststartswith
   | list |
	list := self targetInstance: 'abcb'.

	self
		assert: (list startswith: 'a') equals: true;
		assert: (list startswith: 'b') equals: false;
		assert: (list startswith: 'z') equals: false;
		yourself.

	list := self targetInstance: 'aaaa'.

	self
		assert: (list startswith: 'a') equals: true;
		yourself
%
category: 'done'
method: bytesTest
teststartswithWithEnd
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list startswith: 'ab' _: 1 _: 5) equals: false;
		assert: (list startswith: 'ab' _: 4 _: 5) equals: false;
		assert: (list startswith: 'ab' _: 4 _: 6) equals: true;
		yourself
%
category: 'done'
method: bytesTest
teststartswithWithStart
   | list |
	list := self targetInstance: 'abcbabcb'.

	self
		assert: (list startswith: 'ab' _: 1) equals: false;
		assert: (list startswith: 'ab' _: 4) equals: true;
		assert: (list startswith: 'ab' _: 5) equals: false;
		yourself
%
category: 'done'
method: bytesTest
teststrip

	self
		assert: self targetInstance strip equals: (self targetInstance: '');
		assert: (self targetInstance: '') strip equals: (self targetInstance: '');
		assert: (self targetInstance: 'bcd  ') strip equals: (self targetInstance: 'bcd');
		assert: (self targetInstance: 'abcd') strip equals: (self targetInstance: 'abcd');
		assert: ((self targetInstance: 'bcdaa') strip: 'a') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'bcdaa') strip: 'ad') equals: (self targetInstance: 'bc');
		assert: ((self targetInstance: 'aabcd') strip: 'c') equals: (self targetInstance: 'aabcd');
		assert: (self targetInstance: '  bcd') strip equals: (self targetInstance: 'bcd');
		assert: (self targetInstance: 'abcd') strip equals: (self targetInstance: 'abcd');
		assert: ((self targetInstance: 'aabcd') strip: 'a') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'aabcd') strip: 'ba') equals: (self targetInstance: 'cd');
		assert: ((self targetInstance: 'aabcd') strip: 'ac') equals: (self targetInstance: 'bcd');
		assert: ((self targetInstance: 'aabcd') strip: 'ad') equals: (self targetInstance: 'bc');
		yourself
%
category: 'done'
method: bytesTest
testswapcase

	self
		assert: (self targetInstance: 'aAbCd') swapcase equals: (self targetInstance: 'AaBcD');
		assert: (self targetInstance: 'aA#b;Cd') swapcase equals: (self targetInstance: 'Aa#B;cD');
		yourself
%
category: 'done'
method: bytesTest
testtitle

	self assert: (self targetInstance: 'A man, a plan, a canal, panama') title
		equals: ( self targetInstance: 'A Man, A Plan, A Canal, Panama')
%
category: 'done'
method: bytesTest
testupper
	| abcd |
	abcd := self targetInstance: 'ABCD'.

	self
		assert: (self targetInstance: 'abcd') upper equals: abcd ;
		assert: (self targetInstance: 'ABCD') upper equals: abcd ;
		assert: (self targetInstance: 'aBCD') upper equals: abcd ;
		assert: (self targetInstance: 'Abcd') upper equals: abcd ;
		yourself
%
set compile_env: 0
category: 'todo'
method: bytesTest
test__getnewargs__
   #pyTodo
%
category: 'todo'
method: bytesTest
test__iter__
   #pyTodo
%
category: 'todo'
method: bytesTest
testdecode
   #pyTodo
%
category: 'todo'
method: bytesTest
testfromhex
   #pyTodo
%
category: 'todo'
method: bytesTest
testhex
   #pyTodo
%
category: 'todo'
method: bytesTest
testjoin
   #pyTodo
%
category: 'todo'
method: bytesTest
testmaketrans
   #pyTodo
%
category: 'todo'
method: bytesTest
testrsplit
   #pyTodo
%
category: 'todo'
method: bytesTest
testsplit
   #pyTodo.
	self
"		assert: ((self targetInstance: '  bcd') split)
		equals: (tuple ___new__init__: { self targetInstance: 'bcd' });
		assert: ((self targetInstance: '  bcb cd') split)
		equals: (tuple ___new__init__: { self targetInstance: 'bcb'. self targetInstance: 'cd' });
"		yourself
%
category: 'todo'
method: bytesTest
testsplitlines
   #pyTodo
%
category: 'todo'
method: bytesTest
testtranslate
   #pyTodo
%
category: 'todo'
method: bytesTest
testzfill
   #pyTodo
%
