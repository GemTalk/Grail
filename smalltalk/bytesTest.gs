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
		(self bytes: 'j') __add__: 3.
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: (ex messageText beginsWith: 'can''t concat').
	].
%
category: 'done'
method: bytesTest
test__contains__

	| ab |
	ab := self bytes: 'ab'.
	self deny: (bytes __call__ __contains__: ab).
	self deny: ((bytes __call__: (int ___value: 3)) __contains__: ab).
	self assert: ((self bytes: 'aba') __contains__: ab)
%
category: 'done'
method: bytesTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__add__' '__class__' '__contains__' '__delattr__' '__dir__' '__doc__' '__eq__' '__format__' '__ge__' '__getattribute__' '__getitem__' '__getnewargs__' '__gt__' '__hash__' '__init__' '__init_subclass__' '__iter__' '__le__' '__len__' '__lt__' '__mod__' '__mul__' '__ne__' '__new__' '__reduce__' '__reduce_ex__' '__repr__' '__rmod__' '__rmul__' '__setattr__' '__sizeof__' '__str__' '__subclasshook__' 'capitalize' 'center' 'count' 'decode' 'endswith' 'expandtabs' 'find' 'fromhex' 'hex' 'index' 'isalnum' 'isalpha' 'isascii' 'isdigit' 'islower' 'isspace' 'istitle' 'isupper' 'join' 'ljust' 'lower' 'lstrip' 'maketrans' 'partition' 'removeprefix' 'removesuffix' 'replace' 'rfind' 'rindex' 'rjust' 'rpartition' 'rsplit' 'rstrip' 'split' 'splitlines' 'startswith' 'strip' 'swapcase' 'title' 'translate' 'upper' 'zfill')
	"
	| dir |
		dir := bytes __call__ __dir__.
	self assert: dir __class__ equals: list.

	#pyTodo. "self assert: dir __len__ equals: (self int: 75)."
	self assert: (dir __contains__: (str ___value: '__add__')).
	self assert: (dir __contains__: (str ___value: '__class__')).
	self assert: (dir __contains__: (str ___value: '__contains__')).
	self assert: (dir __contains__: (str ___value: '__delattr__')).
	self assert: (dir __contains__: (str ___value: '__dir__')).
	self assert: (dir __contains__: (str ___value: '__doc__')).
	self assert: (dir __contains__: (str ___value: '__eq__')).
	self assert: (dir __contains__: (str ___value: '__format__')).
	self assert: (dir __contains__: (str ___value: '__ge__')).
	self assert: (dir __contains__: (str ___value: '__getattribute__')).
	self assert: (dir __contains__: (str ___value: '__getitem__')).
	#pyTodo. "self assert: (dir __contains__: #__getnewargs__)."
	self assert: (dir __contains__: (str ___value: '__gt__')).
	self assert: (dir __contains__: (str ___value: '__hash__')).
	self assert: (dir __contains__: (str ___value: '__init__')).
	#pyTodo. "self assert: (dir __contains__: #__init_subclass__)."
	#pyTodo. "self assert: (dir __contains__: #__iter__)."
	self assert: (dir __contains__: (str ___value: '__le__')).
	self assert: (dir __contains__: (str ___value: '__len__')).
	self assert: (dir __contains__: (str ___value: '__lt__')).
	self assert: (dir __contains__: (str ___value: '__mod__')).
	self assert: (dir __contains__: (str ___value: '__mul__')).
	self assert: (dir __contains__: (str ___value: '__ne__')).
	self assert: (dir __contains__: (str ___value: '__new__')).
	#pyTodo. "self assert: (dir __contains__: #__reduce__)."
	#pyTodo. "self assert: (dir __contains__: #__reduce_ex__)."
	self assert: (dir __contains__: (str ___value: '__repr__')).
	self assert: (dir __contains__: (str ___value: '__rmod__')).
	self assert: (dir __contains__: (str ___value: '__rmul__')).
	self assert: (dir __contains__: (str ___value: '__setattr__')).
	self assert: (dir __contains__: (str ___value: '__sizeof__')).
	self assert: (dir __contains__: (str ___value: '__str__')).
	self assert: (dir __contains__: (str ___value: '__subclasshook__')).
	self assert: (dir __contains__: (str ___value: 'capitalize')).
	self assert: (dir __contains__: (str ___value: 'center')).
	self assert: (dir __contains__: (str ___value: 'count')).
	#pyTodo. "self assert: (dir __contains__: #decode)."
	self assert: (dir __contains__: (str ___value: 'endswith')).
	self assert: (dir __contains__: (str ___value: 'expandtabs')).
	self assert: (dir __contains__: (str ___value: 'find')).
	#pyTodo. "self assert: (dir __contains__: #fromhex)."
	#pyTodo. "self assert: (dir __contains__: #hex)."
	self assert: (dir __contains__: (str ___value: 'index')).
	self assert: (dir __contains__: (str ___value: 'isalnum')).
	self assert: (dir __contains__: (str ___value: 'isalpha')).
	self assert: (dir __contains__: (str ___value: 'isascii')).
	self assert: (dir __contains__: (str ___value: 'isdigit')).
	self assert: (dir __contains__: (str ___value: 'islower')).
	self assert: (dir __contains__: (str ___value: 'isspace')).
	self assert: (dir __contains__: (str ___value: 'istitle')).
	self assert: (dir __contains__: (str ___value: 'isupper')).
	#pyTodo. "self assert: (dir __contains__: #join)."
	self assert: (dir __contains__: (str ___value: 'ljust')).
	self assert: (dir __contains__: (str ___value: 'lower')).
	self assert: (dir __contains__: (str ___value: 'lstrip')).
	#pyTodo. "self assert: (dir __contains__: #maketrans)."
	self assert: (dir __contains__: (str ___value: 'partition')).
	self assert: (dir __contains__: (str ___value: 'removeprefix')).
	self assert: (dir __contains__: (str ___value: 'removesuffix')).
	self assert: (dir __contains__: (str ___value: 'replace')).
	self assert: (dir __contains__: (str ___value: 'rfind')).
	#pyTodo. "self assert: (dir __contains__: #rindex)."
	#pyTodo. "self assert: (dir __contains__: #rjust)."
	#pyTodo. "self assert: (dir __contains__: #rpartition)."
	#pyTodo. "self assert: (dir __contains__: #rsplit)."
	#pyTodo. "self assert: (dir __contains__: #rstrip)."
	#pyTodo. "self assert: (dir __contains__: #split)."
	#pyTodo. "self assert: (dir __contains__: #splitlines)."
	self assert: (dir __contains__: (str ___value: 'startswith')).
	#pyTodo. "self assert: (dir __contains__: #strip).'"
	#pyTodo. "self assert: (dir __contains__: #swapcase)."
	self assert: (dir __contains__: (str ___value: 'title')).
	#pyTodo. "self assert: (dir __contains__: #translate)."
	self assert: (dir __contains__: (str ___value: 'upper')).
	#pyTodo. "self assert: (dir __contains__: #zfill)."
%
category: 'done'
method: bytesTest
test__eq__
   | list |
	list := self bytes: '123'.

	self
		deny:   (list __eq__: (self bytes: '12'));
		assert: (list __eq__: (self bytes: '123'));
		deny:   (list __eq__: (self bytes: '1231'));
		deny:   (list __eq__: (self bytes: '1230'));
		yourself
%
category: 'done'
method: bytesTest
test__ge__
	"r'abc'.__ge__(r'bc')"
	| a b c bb |
	a := self bytes:  'abc'.
	b := self bytes:  'bc'.
	bb := self bytes: 'bc'.
	c := self bytes:  'a'.


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
	list := self bytes: '1234'.

	self
		assert: list __len__ equals: (self int: 4);
		assert: (list __getitem__: 0) equals: '1';
		yourself
%
category: 'done'
method: bytesTest
test__getitem__negative
   | list |
	list := self bytes: 'o'.

	self
		assert: (list __getitem__: -1) equals: 'o';
		yourself
%
category: 'done'
method: bytesTest
test__getslice__

	| x |
	x := self bytes: 'abcdefg'.

	self
		assert: (x __getslice__: (self int: 0) _: (self int: 2)) equals: (self bytes: ('ab'));
		assert: (x __getslice__: (self int: 2) _: (self int: 3)) equals: (self bytes: ('c'));
		assert: (x __getslice__: (self int: 2) _: (self int: 2)) equals: (self bytes: (''));
		assert: (x __getslice__: (self int: -3) _: (self int: -2)) equals: (self bytes: ('e'));
		yourself.
%
category: 'done'
method: bytesTest
test__init__

	| w x y z |

	w := bytes __call__: (range __call__: (int ___value: 0) _: (int ___value: 10)).
	x := bytes __call__: (int ___value: 3).
	y := self bytes: 'abc'.
	z := bytes __call__: (list ___value: { 0. 10. 9 }).

	self 
		assert: w ___value size equals: 10;
		assert: w ___value equals: { 0. 1. 2. 3. 4. 5. 6. 7. 8. 9 };
		assert: x ___value size equals: 3;
		assert: x ___value equals: { 0. 0. 0 };
		assert: y ___value size equals: 3;
		assert: y ___value equals: {	97. 98. 99 };
		assert: z ___value size equals: 3;
		assert: z ___value equals: { 0. 10. 9 };
		yourself.

	w := self bytes: 'abc'.

	self 
		assert: w ___value size equals: 3;
		assert: w ___value equals: { 97. 98. 99. };
		yourself.
%
category: 'done'
method: bytesTest
test__le__
   | list |
	#pyElaborate. "this is an aproximated implementation"

	list := self bytes: '123'.

	self
		deny:   (list __le__: (self bytes: '12'));
		assert: (list __le__: (self bytes: '123'));
		assert: (list __le__: (self bytes: '1230'));
		deny:   (list __le__: (self bytes: '122'));
		assert: (list __le__: (self bytes: '124'));
		yourself
%
category: 'done'
method: bytesTest
test__len__
	self assert: bytes __call__ __len__ equals: (self int: 0).
	self assert: (bytes __call__: (int ___value: 3)) __len__ equals: (self int: 3).

	self assert: (self bytes: 'aba') __len__ equals: (self int: 3).
%
category: 'done'
method: bytesTest
test__lt__
   | list |
	#pyElaborate. "this is an aproximated implementation"

	list := self bytes: '123'.

	self
		deny:   (list __lt__: (self bytes: '12'));
		deny:   (list __lt__: (self bytes: '123'));
		assert: (list __lt__: (self bytes: '1230'));
		deny:   (list __lt__: (self bytes: '122'));
		assert: (list __lt__: (self bytes: '124'));
		yourself
%
category: 'done'
method: bytesTest
test__mod__
   self should: [(self bytes: 'j') __mod__: 3 ]
			raise: TypeError
			withExceptionDo: [:exception |
				self assert: exception messageText equals: 'not all arguments converted during bytes formatting'].
%
category: 'done'
method: bytesTest
test__mul__
	| j ja |
	j :=  self bytes: 'j'.
	ja :=  self bytes: 'ja'.

   self assert: (j __mul__: 3) __len__ equals: (self int: 3).
   self assert: (ja __mul__: 3) __len__ equals: (self int: 6).

   self assert: ((j __mul__: 3) __contains__: (self bytes: 'jj')).
   self assert: ((j __mul__: 3) __contains__: (self bytes: 'jjj')).
	self assert: ((ja __mul__: 3) __contains__: (self bytes: 'aja')).
%
category: 'done'
method: bytesTest
test__ne__
   | list |
	list := self bytes: 'abc'.

	self
		assert: (list __ne__: (self bytes: 'ab'));
		deny:   (list __ne__: (self bytes: 'abc'));
		assert: (list __ne__: (self bytes: 'abe'));
		assert: (list __ne__: (self bytes: 'abc0'));
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
	j :=  self bytes: 'j'.
	ja :=  self bytes: 'ja'.

   self assert: (j __rmul__: 3) __len__ equals: (self int: 3).
   self assert: (ja __rmul__: 3) __len__ equals: (self int: 6).

   self assert: ((j __rmul__: 3) __contains__: (self bytes: 'jj')).
   self assert: ((j __rmul__: 3) __contains__: (self bytes: 'jjj')).
	self assert: ((ja __rmul__: 3) __contains__: (self bytes: 'aja')).
%
category: 'done'
method: bytesTest
test__str__
   | bytes1 bytes2 bytes3 string1 string2 string3 |
	bytes1 := bytes new ___value: #(97 98 99 100).
	bytes2 := bytes new ___value: (0 to: 30) asArray.
	bytes3 := bytes new ___value: (128 to: 139) asArray.
	string1 := bytes1 __str__.
	string2 := bytes2 __str__.
	string3 := bytes3 __str__.
	self
		assert: string1 class equals: str;
		assert: string1 ___value equals: 'b''abcd''';
		assert: string2 ___value equals: 'b''\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e''';
		assert: string3 ___value equals: 'b''\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x8b''';
		yourself
%
category: 'done'
method: bytesTest
testcapitalize
	| Abcd |
	Abcd := self bytes: 'Abcd'.

	self
		assert: (self bytes: 'abcd') capitalize equals: Abcd ;
		assert: (self bytes: 'ABCD') capitalize equals: Abcd ;
		assert: (self bytes: 'aBCD') capitalize equals: Abcd ;
		assert: (self bytes: 'Abcd') capitalize equals: Abcd ;
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
	abc  := self bytes: 'abc'.
	abcd := self bytes: 'abcd'.

	self
		assert: (abc center: (self int: 2)) equals: (self bytes: 'abc');
		assert: (abc center: (self int: 3)) equals: (self bytes: 'abc');
		assert: (abc center: (self int: 4)) equals: (self bytes: 'abc ');
		assert: (abc center: (self int: 5)) equals: (self bytes: ' abc ');
		assert: (abcd center: (self int: 5)) equals: (self bytes: ' abcd');
		assert: (abcd center: (self int: 6)) equals: (self bytes: ' abcd ');
		assert: (abcd center: (self int: 5) _: (self bytes: '*')) equals: (self bytes: '*abcd');
		assert: (abcd center: (self int: 6) _: (self bytes: '*')) equals: (self bytes: '*abcd*');
		yourself.

	self should: [abcd center: (self int: 5) _: (self bytes: '12')]
			raise: TypeError
			withExceptionDo: [:exception |
				self assert: exception messageText equals: 'center() argument 2 must be a byte string of length 1, not bytes'].
%
category: 'done'
method: bytesTest
testcount
   | list |
	list := self bytes: 'abcb'.

	self
		assert: (list count: (self bytes: 'a')) equals: (self int: 1);
		assert: (list count: (self bytes: 'b')) equals: (self int: 2);
		assert: (list count: (self bytes: 'z')) equals: (self int: 0);
		yourself.

	list := self bytes: 'aaaa'.

	self
		assert: (list count: (self bytes: 'a')) equals: (self int: 4);
		yourself.

	self
		should: [list endswith: (self str: 'a')]
		raise: TypeError
		withExceptionDo: [ :exception | self assert: exception messageText equals: 'endswith first arg must be bytes or a tuple of bytes, not str']
%
category: 'done'
method: bytesTest
testcountWithEnd
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list count: (self bytes: 'ab') _: (self int: 1) _: (self int: 5)) equals: (self int: 0);
		assert: (list count: (self bytes: 'ab') _: (self int: 1) _: (self int: 6)) equals: (self int: 1);
		yourself
%
category: 'done'
method: bytesTest
testcountWithStart
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list count: (self bytes: 'ab') _: (self int: 0)) equals: (self int: 2);
		assert: (list count: (self bytes: 'ab') _: (self int: 1)) equals: (self int: 1);
		assert: (list count: (self bytes: 'ab') _: (self int: 4)) equals: (self int: 1);
		assert: (list count: (self bytes: 'ab') _: (self int: 5)) equals: (self int: 0);
		yourself
%
category: 'done'
method: bytesTest
testendswith
   | list |
	list := self bytes: 'abcb'.

	self
		assert: (list endswith: (self bytes: 'a')) equals: (self bool: false);
		assert: (list endswith: (self bytes: 'b')) equals: (self bool: true);
		assert: (list endswith: (self bytes: 'z')) equals: (self bool: false);
		yourself.

	list := self bytes: 'aaaa'.

	self
		assert: (list endswith: (self bytes: 'a')) equals: (self bool: true);
		yourself.

	self
		assert: (list endswith: (tuple ___value: {self bytes: 'aa'. self bytes: 'a'})) equals: (self bool: true);
		assert: (list endswith: (tuple ___value: {self bytes: 'bb'. self bytes: 'a'})) equals: (self bool: true);		
		assert: (list endswith: (tuple ___value: {self bytes: 'aa'. self bytes: 'b'})) equals: (self bool: true);
		assert: (list endswith: (tuple ___value: {self bytes: 'bb'. self bytes: 'b'})) equals: (self bool: false);
		yourself.

	self
		should: [list endswith: (self str: 'a')]
		raise: TypeError
		withExceptionDo: [:exception | self assert: exception messageText equals: 'TypeError: endswith first arg must be bytes or a tuple of bytes, not str']
%
category: 'done'
method: bytesTest
testendswithWithEnd
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list endswith: (self bytes: 'ab') _: (self int: 0) _: (self int: 2)) equals: (self bool: true);
		assert: (list endswith: (self bytes: 'ab') _: (self int: 0) _: (self int: 3)) equals: (self bool: false);
		yourself
%
category: 'done'
method: bytesTest
testendswithWithStart
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list endswith: (self bytes: 'cb') _: (self int: 1)) equals: (self bool: true);
		assert: (list endswith: (self bytes: 'ab') _: (self int: 4)) equals: (self bool: false);
		assert: (list endswith: (self bytes: 'cb') _: (self int: 5)) equals: (self bool: true);
		yourself
%
category: 'done'
method: bytesTest
testexpandtabs
   | x |
	x := bytes __call__: (str ___value: ('cb', (String with: Character tab), 'e')) _: (str ___value: 'ascii').

	self
		assert: x __len__ equals: (self int: 4);
		assert: x expandtabs __len__ equals: (self int: 9);
		assert: x expandtabs equals: (bytes __call__: (str ___value: 'cb      e') _: (str ___value: 'ascii'));
		assert: (x expandtabs: (int ___value: 4)) equals: (bytes __call__: (str ___value: 'cb  e') _: (str ___value: 'ascii'));
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
	list := self bytes: 'abcb'.

	self
		assert: (list find: (self bytes: 'a')) equals: (self int: 0);
		assert: (list find: (self bytes: 'b')) equals: (self int: 1);
		assert: (list find: (self bytes: 'z')) equals: (self int: -1);
		assert: (list find: (self int: 97)) equals: (self int: 0);
		yourself.

	self should: [list find: (self str: 'a')] 
			raise: TypeError 
			withExceptionDo: [ :exception |
				self assert: exception messageText equals: 'argument should be integer or bytes-like object, not ''str'''
			].
%
category: 'done'
method: bytesTest
testfindByTwo
   | list |
	list := self bytes: 'abcb'.

	self
		assert: (list find: (self bytes: 'ab')) equals: (self int: 0);
		assert: (list find: (self bytes: 'bc')) equals: (self int: 1);
		assert: (list find: (self bytes: 'cb')) equals: (self int: 2);
		assert: (list find: (self bytes: 'cbz')) equals: (self int: -1);
		assert: (list find: (self bytes: 'zab')) equals: (self int: -1);
		assert: (list find: (self bytes: 'az')) equals: (self int: -1);
		yourself
%
category: 'done'
method: bytesTest
testfindWithEnd
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list find: (self bytes: 'ab') _: (self int: 1) _: (self int: 5)) equals: (self int: -1);
		assert: (list find: (self bytes: 'ab') _: (self int: 1) _: (self int: 6)) equals: (self int: 4);
		assert: (list find: (self bytes: 'ab') _: (self int: 1) _: (self int: -2)) equals: (self int: 4);
		yourself
%
category: 'done'
method: bytesTest
testfindWithStart
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list find: (self bytes: 'ab') _: (self int: 1)) equals: (self int: 4);
		assert: (list find: (self bytes: 'ab') _: (self int: 4)) equals: (self int: 4);
		assert: (list find: (self bytes: 'ab') _: (self int: -4)) equals: (self int: 4);
		assert: (list find: (self bytes: 'ab') _: (self int: 5)) equals: (self int: -1);
		yourself
%
category: 'done'
method: bytesTest
testindexByOne
   | list |
	list := self bytes: 'abcb'.

	self
		assert: (list index: (self bytes: 'a')) equals: (self int: 0);
		assert: (list index: (self bytes: 'b')) equals: (self int: 1);
		should: [list index: (self bytes: 'z')] raise: ValueError;
		yourself.

	self
		should: [list index: (self str: 'a')]
		raise: TypeError
		withExceptionDo: [:exception | self assert: exception messageText equals: 'argument should be integer or bytes-like object, not ''str''']
%
category: 'done'
method: bytesTest
testindexByTwo
   | list |
	list := self bytes: 'abcb'.

	self
		assert: (list index: (self bytes: 'ab')) equals: (self int: 0);
		assert: (list index: (self bytes: 'bc')) equals: (self int: 1);
		assert: (list index: (self bytes: 'cb')) equals: (self int: 2);
		should: [list index: (self bytes: 'cbz')] raise: ValueError;
		should: [list index: (self bytes: 'zab')] raise: ValueError;
		should: [list index: (self bytes: 'az')] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testindexWithEnd
   | list |
	list := self bytes: 'abcbabcb'.

	self
		should: [list index: (self bytes: 'ab') _: (self int: 1) _: (self int: 5)] raise: ValueError;
		assert: (list index: (self bytes: 'ab') _: (self int: 1) _: (self int: 6)) equals: (self int: 4);
		yourself
%
category: 'done'
method: bytesTest
testindexWithStart
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list index: (self bytes: 'ab') _: (self int: 1)) equals: (self int: 4);
		assert: (list index: (self bytes: 'ab') _: (self int: 4)) equals: (self int: 4);
		should: [list index: (self bytes: 'ab') _: (self int: 5)] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testisalnum

	self
		deny:    self targetInstance isalnum;
		assert: (self bytes: '12') isalnum;
		assert: (self bytes: 'ho') isalnum;
		assert: (self bytes: 'a2') isalnum;
		deny:   (self bytes: '12.') isalnum;
		deny:   (self bytes: ',12') isalnum;
		deny:   (self bytes: '1:2') isalnum;
		yourself
%
category: 'done'
method: bytesTest
testisalpha

	self
		deny:    self targetInstance isalpha;
		deny:   (self bytes: '12') isalpha;
		assert: (self bytes: 'ho') isalpha;
		deny:   (self bytes: 'a2') isalpha;
		deny:   (self bytes: '12.') isalpha;
		deny:   (self bytes: ',12') isalpha;
		deny:   (self bytes: '1:2') isalpha;
		yourself
%
category: 'done'
method: bytesTest
testisascii

	self
		assert:  bytes __call__ isascii;
		assert: (bytes __call__: (str ___value: '12') _: (str ___value: 'ascii')) isascii;
		assert: (bytes __call__: (str ___value: '  ') _: (str ___value: 'ascii')) isascii;
		assert: (bytes __call__: (str ___value: 'HO') _: (str ___value: 'ascii')) isascii;
		assert: (bytes __call__: (str ___value: 'hO') _: (str ___value: 'ascii')) isascii;
		assert: (bytes __call__: (str ___value: ' a2') _: (str ___value: 'ascii')) isascii;
		assert: (bytes __call__: (str ___value: '12.') _: (str ___value: 'ascii')) isascii;
		assert: (bytes __call__: (str ___value: ',12') _: (str ___value: 'ascii')) isascii;
		assert: (bytes __call__: (str ___value: '1:2') _: (str ___value: 'ascii')) isascii;
		yourself
%
category: 'done'
method: bytesTest
testisdigit

	self
		deny:    self targetInstance isdigit;
		assert: (self bytes: '12') isdigit;
		deny:   (self bytes: 'ho') isdigit;
		deny:   (self bytes: 'a2') isdigit;
		deny:   (self bytes: '12.') isdigit;
		deny:   (self bytes: ',12') isdigit;
		deny:   (self bytes: '1:2') isdigit;
		yourself
%
category: 'done'
method: bytesTest
testislower

	self
		deny:    self targetInstance islower;
		deny:   (self bytes: '12') islower;
		assert: (self bytes: 'ho') islower;
		deny:   (self bytes: 'HO') islower;
		deny:   (self bytes: 'hO') islower;
		deny:   (self bytes: 'a2') islower;
		deny:   (self bytes: '12.') islower;
		deny:   (self bytes: ',12') islower;
		deny:   (self bytes: '1:2') islower;
		yourself
%
category: 'done'
method: bytesTest
testisspace

	self
		deny:    self targetInstance isspace;
		deny:   (self bytes: '12') isspace;
		assert: (self bytes: '  ') isspace;
		deny:   (self bytes: 'HO') isspace;
		deny:   (self bytes: 'hO ') isspace;
		deny:   (self bytes: ' a2') isspace;
		deny:   (self bytes: '12.') isspace;
		deny:   (self bytes: ',12') isspace;
		deny:   (self bytes: '1:2') isspace;
		yourself
%
category: 'done'
method: bytesTest
testistitle

	self
		assert: (bytes __call__: (str ___value: 'A man, a plan, a canal, panama') _: (str ___value: 'ascii')) title istitle;
		deny: (bytes __call__: (str ___value: 'A man') _: (str ___value: 'ascii')) istitle;
		assert: (bytes __call__: (str ___value: 'A Man') _: (str ___value: 'ascii')) istitle;
		deny: bytes __call__ title istitle;
		yourself
%
category: 'done'
method: bytesTest
testisupper

	self
		deny:    self targetInstance isupper;
		deny:   (self bytes: '12') isupper;
		deny:   (self bytes: '  ') isupper;
		assert: (self bytes: 'HO') isupper;
		deny:   (self bytes: 'hO ') isupper;
		deny:   (self bytes: ' a2') isupper;
		deny:   (self bytes: '12.') isupper;
		deny:   (self bytes: ',12') isupper;
		deny:   (self bytes: '1:2') isupper;
		yourself
%
category: 'done'
method: bytesTest
testljust
"
r'abc'.ljust(2)  >> 'abc'
"
	| abc |
	abc  := bytes __call__: (str ___value: 'abc') _: (str ___value: 'ascii').

	self
		assert: (abc ljust: (int ___value: 2)) equals: abc;
		assert: (abc ljust: (int ___value: 3)) equals: abc;
		assert: (abc ljust: (int ___value: 4)) equals: (bytes __call__: (str ___value: 'abc ') _: (str ___value: 'ascii'));
		assert: (abc ljust: (int ___value: 4) _: (bytes __call__: (str ___value: '*') _: (str ___value: 'ascii'))) equals: (bytes __call__: (str ___value: 'abc*') _: (str ___value: 'ascii'));
		yourself.

   self should: [abc ljust: (int ___value: 2) _: (bytes __call__: (str ___value: '12') _: (str ___value: 'ascii'))]
		raise: TypeError
		withExceptionDo: [:exception |
			self assert: exception messageText equals: 'ljust() argument 2 must be a byte string of length 1, not bytes'].
%
category: 'done'
method: bytesTest
testlower
	| abcd |
	abcd := self bytes: 'abcd'.

	self
		assert: (self bytes: 'abcd') lower equals: abcd ;
		assert: (self bytes: 'ABCD') lower equals: abcd ;
		assert: (self bytes: 'aBCD') lower equals: abcd ;
		assert: (self bytes: 'Abcd') lower equals: abcd ;
		yourself
%
category: 'done'
method: bytesTest
testlstrip
"https://docs.python.org/3/library/stdtypes.html?highlight=lstrip#bytes.lstrip"
	self
		assert: self targetInstance lstrip equals: (self bytes: '');
		assert: (self bytes: '') lstrip equals: (self bytes: '');
		assert: (self bytes: '  bcd') lstrip equals: (self bytes: 'bcd');
		assert: (self bytes: 'abcd') lstrip equals: (self bytes: 'abcd');
		assert: ((self bytes: 'aabcd') lstrip: 'a') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'aabcd') lstrip: 'ba') equals: (self bytes: 'cd');
		assert: ((self bytes: 'aabcd') lstrip: 'ab') equals: (self bytes: 'cd');
		assert: ((self bytes: 'aabcd') lstrip: 'ca') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'aabcd') lstrip: 'ac') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'aabcd') lstrip: 'c') equals: (self bytes: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testpartition

	self
		assert: ((self bytes: '  bcd') partition: (self bytes: ' a'))
		equals: (tuple ___value: { self bytes: '  bcd'. bytes __call__. bytes __call__ });
		assert: ((self bytes: '  bcd') partition: (self bytes: '  '))
		equals: (tuple ___value: { bytes __call__. self bytes: '  '. self bytes: 'bcd' });
		assert: ((self bytes: '  bcd') partition: (self bytes: 'bc'))
		equals: (tuple ___value: { self bytes: '  '. self bytes: 'bc'. self bytes: 'd' });
		assert: ((self bytes: '  bcbcd') partition: (self bytes: 'bc'))
		equals: (tuple ___value: { self bytes: '  '. self bytes: 'bc'. self bytes: 'bcd' });
		yourself
%
category: 'done'
method: bytesTest
testremoveprefix

	self
		assert: ((self bytes: 'aabcd') removeprefix: 'a') equals: (self bytes: 'abcd');
		assert: ((self bytes: 'aabcd') removeprefix: 'aa') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'aabcd') removeprefix: 'ab') equals: (self bytes: 'aabcd');
		assert: ((self bytes: 'aabcd') removeprefix: 'c') equals: (self bytes: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testremovesuffix

	self
		assert: ((self bytes: 'aabcd') removesuffix: 'd') equals: (self bytes: 'aabc');
		assert: ((self bytes: 'aabcd') removesuffix: 'cd') equals: (self bytes: 'aab');
		assert: ((self bytes: 'aabcd') removesuffix: 'dc') equals: (self bytes: 'aabcd');
		assert: ((self bytes: 'aabcd') removesuffix: 'c') equals: (self bytes: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testreplace

	self
		assert: ((self bytes: 'aabcd') replace: 'a' _: 'x') equals: (self bytes: 'xxbcd');
		assert: ((self bytes: 'aabcd') replace: 'z' _: 'x') equals: (self bytes: 'aabcd');
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
	list := self bytes: 'abcb'.

	self
		assert: (list rfind: (self bytes: 'a')) equals: (self int: 0);
		assert: (list rfind: (self bytes: 'b')) equals: (self int: 3);
		assert: (list rfind: (self bytes: 'z')) equals: (self int: -1);
		should: [list rfind: (self str: 'a')] 
			raise: TypeError 
			withExceptionDo: [ :exception | 
				self assert: exception messageText equals: 'argument should be integer or bytes-like object, not ''str'''
			];
		yourself
%
category: 'done'
method: bytesTest
testrfindByTwo
   | list |
	list := self bytes: 'abcb'.

	self
		assert: (list rfind: (self bytes: 'ab')) equals: (self int: 0);
		assert: (list rfind: (self bytes: 'bc')) equals: (self int: 1);
		assert: (list rfind: (self bytes: 'cb')) equals: (self int: 2);
		assert: (list rfind: (self bytes: 'cbz')) equals: (self int: -1);
		assert: (list rfind: (self bytes: 'zab')) equals: (self int: -1);
		assert: (list rfind: (self bytes: 'az')) equals: (self int: -1);
		yourself
%
category: 'done'
method: bytesTest
testrfindWithEnd
   | list |
	list := self bytes: 'abceabcb'.

	self
		assert: (list rfind: (self bytes: 'ab') _: (self int: 1) _: (self int: 5)) equals: (self int: -1);
		assert: (list rfind: (self bytes: 'ab') _: (self int: 1) _: (self int: 5)) equals: (self int: -1);
		assert: (list rfind: (self bytes: 'ab') _: (self int: 1) _: (self int: 6)) equals: (self int: 4);
		yourself
%
category: 'done'
method: bytesTest
testrfindWithStart
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list rfind: (self bytes: 'ab') _: (self int: 1)) equals: (self int: 4);
		assert: (list rfind: (self bytes: 'ab') _: (self int: 4)) equals: (self int: 4);
		assert: (list rfind: (self bytes: 'ab') _: (self int: 5)) equals: (self int: -1);
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
	list := self bytes: 'bcba'.

	self
		assert: (list rindex: (self bytes: 'a')) equals: (self int: 3);
		assert: (list rindex: (self bytes: 'b')) equals: (self int: 2);
		should: [list rindex: (self bytes: 'z')] raise: ValueError withExceptionDo: [ :exception | self assert: exception messageText == 'subsection not found'];
		yourself
%
category: 'done'
method: bytesTest
testrindexByTwo
   | list |
	list := self bytes: 'abcb'.

	self
		assert: (list rindex: (self bytes: 'ab')) equals: (self int: 0);
		assert: (list rindex: (self bytes: 'bc')) equals: (self int: 1);
		assert: (list rindex: (self bytes: 'cb')) equals: (self int: 2);
		should: [list rindex: (self bytes: 'cbz')] raise: ValueError;
		should: [list rindex: (self bytes: 'zab')] raise: ValueError;
		should: [list rindex: (self bytes: 'az')] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testrindexWithEnd
   | list |
	list := self bytes: 'abcbabcb'.

	self
		should: [list rindex: (self bytes: 'ab') _: (self int: 1) _: (self int: 5)] raise: ValueError;
		assert: (list rindex: (self bytes: 'ab') _: (self int: 1) _: (self int: 6)) equals: (self int: 4);
		yourself
%
category: 'done'
method: bytesTest
testrindexWithStart
   | list |
	list := self bytes: 'abcbabcb'.

	self
		assert: (list rindex: (self bytes: 'ab') _: (self int: 1)) equals: (self int: 4);
		assert: (list rindex: (self bytes: 'ab') _: (self int: 4)) equals: (self int: 4);
		should: [list rindex: (self bytes: 'ab') _: (self int: 5)] raise: ValueError;
		yourself
%
category: 'done'
method: bytesTest
testrjust
"
r'abc'.ljust(2)  >> 'abc'
"
	| abc |
	abc  := self bytes: 'abc'.

	self
		assert: (abc rjust: 2) equals: abc;
		assert: (abc rjust: 3) equals: abc;
		assert: (abc rjust: 4) equals: (self bytes: ' abc');
		assert: (abc rjust: 4 _: $*) equals: (self bytes: '*abc');
		yourself
%
category: 'done'
method: bytesTest
testrpartition

	self
		assert: ((self bytes: 'aabcd') rpartition: (self bytes: 'aa'))
		equals: (tuple ___value: { bytes __call__. self bytes: 'aa'. self bytes: 'bcd' });
		assert: ((self bytes: '  bcd') rpartition: (self bytes: 'a'))
		equals: (tuple ___value: { bytes __call__. bytes __call__. self bytes: '  bcd' });
		assert: ((self bytes: '  bcd') rpartition: (self bytes: '  '))
		equals: (tuple ___value: { bytes __call__. self bytes: '  '. self bytes: 'bcd' });
		assert: ((self bytes: '  bcd') rpartition: (self bytes: 'bc'))
		equals: (tuple ___value: { self bytes: '  '. self bytes: 'bc'. self bytes: 'd' });
		assert: ((self bytes: '  bcbcd') rpartition: (self bytes: 'bc'))
		equals: (tuple ___value: { self bytes: '  bc'. self bytes: 'bc'. self bytes: 'd' });
		yourself
%
category: 'done'
method: bytesTest
testrsplitOnSep

	self
		assert: ((self bytes: '  bcd') rsplit: (self bytes: 'a'))
		equals: (tuple ___value: { self bytes: '  bcd' });
		assert: ((self bytes: '  bcd') rsplit: (self bytes: ' '))
		equals: (tuple ___value: { bytes __call__. bytes __call__. self bytes: 'bcd' });
		assert: ((self bytes: '  bcd') rsplit: (self bytes: '  '))
		equals: (tuple ___value: { bytes __call__. self bytes: 'bcd' });
		assert: ((self bytes: '  bcd') rsplit: (self bytes: 'bc'))
		equals: (tuple ___value: { self bytes: '  '. self bytes: 'd' });
		assert: ((self bytes: '  bcbcd') rsplit: (self bytes: 'bc'))
		equals: (tuple ___value: { self bytes: '  '. bytes __call__. self bytes: 'd' });
		yourself
%
category: 'done'
method: bytesTest
testrsplitOnSepAndMaxSplit

	self
		assert: ((self bytes: '  bcbcd') rsplit: (self bytes: 'bc') _: (self int: 2))
		equals: (tuple ___value: { self bytes: '  '. bytes __call__. self bytes: 'd' });
		assert: ((self bytes: '  bcbcd') rsplit: (self bytes: 'bc') _: (self int: 1))
		equals: (tuple ___value: { self bytes: '  bc'. self bytes: 'd' });
		assert: ((self bytes: '  bcbcd') rsplit: (self bytes: 'bc') _: (self int: 0))
		equals: (tuple ___value: { self bytes: '  bcbcd' });
		yourself
%
category: 'done'
method: bytesTest
testrstrip

	self
		assert: (self bytes: 'bcd  ') rstrip equals: (self bytes: 'bcd');
		assert: (self bytes: 'abcd') rstrip equals: (self bytes: 'abcd');
		assert: ((self bytes: 'bcdaa') rstrip: 'a') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'bcdaa') rstrip: 'ad') equals: (self bytes: 'bc');
		assert: ((self bytes: 'bcdaa') rstrip: 'da') equals: (self bytes: 'bc');
		assert: ((self bytes: 'bcdaa') rstrip: 'ac') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'bcdaa') rstrip: 'ca') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'aabcd') rstrip: 'c') equals: (self bytes: 'aabcd');
		yourself
%
category: 'done'
method: bytesTest
testsplitOnSep

	self
		assert: ((self bytes: '  bcd') split: (self bytes: 'a'))
		equals: (tuple ___value: { self bytes: '  bcd' });
		assert: ((self bytes: '  bcd') split: (self bytes: ' '))
		equals: (tuple ___value: { bytes __call__. bytes __call__. self bytes: 'bcd' });
		assert: ((self bytes: '  bcd') split: (self bytes: '  '))
		equals: (tuple ___value: { bytes __call__. self bytes: 'bcd' });
		assert: ((self bytes: '  bcd') split: (self bytes: 'bc'))
		equals: (tuple ___value: { self bytes: '  '. self bytes: 'd' });
		assert: ((self bytes: '  bcbcd') split: (self bytes: 'bc'))
		equals: (tuple ___value: { self bytes: '  '. bytes __call__. self bytes: 'd' });
		yourself
%
category: 'done'
method: bytesTest
testsplitOnSepAndMaxSplit

	self
		assert: ((self bytes: '  bcbcd') split: (self bytes: 'bc') _: (self int: 2))
		equals: (tuple ___value: { self bytes: '  '. bytes __call__. self bytes: 'd' });
		assert: ((self bytes: '  bcbcd') split: (self bytes: 'bc') _: (self int: 1))
		equals: (tuple ___value: { self bytes: '  '. self bytes: 'bcd' });
		assert: ((self bytes: '  bcbcd') split: (self bytes: 'bc') _: (self int: 0))
		equals: (tuple ___value: { self bytes: '  bcbcd' });
		yourself
%
category: 'done'
method: bytesTest
teststartswith
   | list |
	list := self bytes: 'abcb'.

	self
		assert: (list startswith: 'a') equals: true;
		assert: (list startswith: 'b') equals: false;
		assert: (list startswith: 'z') equals: false;
		yourself.

	list := self bytes: 'aaaa'.

	self
		assert: (list startswith: 'a') equals: true;
		yourself
%
category: 'done'
method: bytesTest
teststartswithWithEnd
   | list |
	list := self bytes: 'abcbabcb'.

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
	list := self bytes: 'abcbabcb'.

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
		assert: self targetInstance strip equals: (self bytes: '');
		assert: (self bytes: '') strip equals: (self bytes: '');
		assert: (self bytes: 'bcd  ') strip equals: (self bytes: 'bcd');
		assert: (self bytes: 'abcd') strip equals: (self bytes: 'abcd');
		assert: ((self bytes: 'bcdaa') strip: 'a') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'bcdaa') strip: 'ad') equals: (self bytes: 'bc');
		assert: ((self bytes: 'aabcd') strip: 'c') equals: (self bytes: 'aabcd');
		assert: (self bytes: '  bcd') strip equals: (self bytes: 'bcd');
		assert: (self bytes: 'abcd') strip equals: (self bytes: 'abcd');
		assert: ((self bytes: 'aabcd') strip: 'a') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'aabcd') strip: 'ba') equals: (self bytes: 'cd');
		assert: ((self bytes: 'aabcd') strip: 'ac') equals: (self bytes: 'bcd');
		assert: ((self bytes: 'aabcd') strip: 'ad') equals: (self bytes: 'bc');
		yourself
%
category: 'done'
method: bytesTest
testswapcase

	self
		assert: (self bytes: 'aAbCd') swapcase equals: (self bytes: 'AaBcD');
		assert: (self bytes: 'aA#b;Cd') swapcase equals: (self bytes: 'Aa#B;cD');
		yourself
%
category: 'done'
method: bytesTest
testtitle

	self 
		assert: (bytes __call__: (str ___value: 'A man, a plan, a canal, panama') _: (str ___value: 'ascii')) title
			equals: (bytes __call__: (str ___value: 'A Man, A Plan, A Canal, Panama') _: (str ___value: 'ascii'));
		assert: (bytes __call__: (str ___value: 'test Test :test $test') _: (str ___value: 'ascii')) title
			equals: (bytes __call__: (str ___value: 'Test Test :Test $Test') _: (str ___value: 'ascii'));
		assert: (bytes __call__: (str ___value: 'they''re bill''s friends from the UK') _: (str ___value: 'ascii')) title
			equals: (bytes __call__: (str ___value: 'They''Re Bill''S Friends From The Uk') _: (str ___value: 'ascii'));
		yourself.
%
category: 'done'
method: bytesTest
testupper
	| abcd |
	abcd := self bytes: 'ABCD'.

	self
		assert: (self bytes: 'abcd') upper equals: abcd ;
		assert: (self bytes: 'ABCD') upper equals: abcd ;
		assert: (self bytes: 'aBCD') upper equals: abcd ;
		assert: (self bytes: 'Abcd') upper equals: abcd ;
		yourself
%
set compile_env: 0
category: 'setup'
method: bytesTest
bytes: aString
   ^bytes __call__: (str ___value: aString) _: (str ___value: 'ascii').
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
"		assert: ((self bytes: '  bcd') split)
		equals: (tuple ___new__init__: { self bytes: 'bcd' });
		assert: ((self bytes: '  bcb cd') split)
		equals: (tuple ___new__init__: { self bytes: 'bcb'. self bytes: 'cd' });
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
