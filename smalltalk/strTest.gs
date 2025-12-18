! ------------------- Remove existing behavior from strTest
removeallmethods strTest
removeallclassmethods strTest
! ------------------- Class methods for strTest
! ------------------- Instance methods for strTest
category: 'done'
method: strTest
test__doc__
	"str.__doc__ should return a str"

	| doc |
	doc := (self str: 'hello') __doc__.
	self assert: (doc isKindOf: str).
%
category: 'done'
method: strTest
test__getitem__slice

	| object s |
	object := self str: 'abcdefg'.

	"s[0:2]"
	s := slice __call__: (self int: 0) _: (self int: 2) _: None.
	self assert: (object __getitem__: s) equals: (self str: 'ab').

	"s[2:3]"
	s := slice __call__: (self int: 2) _: (self int: 3) _: None.
	self assert: (object __getitem__: s) equals: (self str: 'c').

	"s[2:2] - empty slice"
	s := slice __call__: (self int: 2) _: (self int: 2) _: None.
	self assert: (object __getitem__: s) equals: (self str: '').

	"s[-3:-2] - negative indices"
	s := slice __call__: (self int: -3) _: (self int: -2) _: None.
	self assert: (object __getitem__: s) equals: (self str: 'e').
%
category: 'done'
method: strTest
testcenter

	| abc abcd |
	abc := self str: 'abc'.
	abcd := self str: 'abcd'.

	self
		assert: (abc center: (self int: 2)) equals: (self str: 'abc');
		assert: (abc center: (self int: 3)) equals: (self str: 'abc');
		assert: (abc center: (self int: 4)) equals: (self str: 'abc ');
		assert: (abc center: (self int: 5)) equals: (self str: ' abc ');
		assert: (abcd center: (self int: 5)) equals: (self str: ' abcd');
		assert: (abcd center: (self int: 6)) equals: (self str: ' abcd ');
		assert: (abcd center: (self int: 5) _: (self str: '*')) equals: (self str: '*abcd');
		assert: (abcd center: (self int: 6) _: (self str: '*')) equals: (self str: '*abcd*');
		yourself.

	self should: [abcd center: (self int: 5) _: (self str: '12')]
			raise: TypeError
			withExceptionDo: [:exception |
				self assert: exception messageText equals: 'The fill character must be exactly one character long'].
%
category: 'done'
method: strTest
testcount

	| s |
	s := self str: 'abcbabcb'.

	self
		assert: (s count: (self str: 'a')) equals: (self int: 2);
		assert: (s count: (self str: 'b')) equals: (self int: 4);
		assert: (s count: (self str: 'ab')) equals: (self int: 2);
		assert: (s count: (self str: 'z')) equals: (self int: 0);
		yourself
%
category: 'done'
method: strTest
testcountWithStartEnd

	| s |
	s := self str: 'abcbabcb'.

	self
		assert: (s count: (self str: 'ab') _: (self int: 1) _: (self int: 5)) equals: (self int: 0);
		assert: (s count: (self str: 'ab') _: (self int: 1) _: (self int: 6)) equals: (self int: 1);
		assert: (s count: (self str: 'ab') _: (self int: 0)) equals: (self int: 2);
		yourself
%
category: 'done'
method: strTest
testencode

	| s |
	s := self str: 'hello'.

	self
		assert: s encode equals: (bytes ___value: #[104 101 108 108 111]);
		assert: (s encode: (self str: 'ascii')) equals: (bytes ___value: #[104 101 108 108 111]);
		yourself
%
category: 'done'
method: strTest
testendswith

	| s |
	s := self str: 'hello world'.

	self
		assert: (s endswith: (self str: 'world')) equals: True;
		assert: (s endswith: (self str: 'hello')) equals: False;
		assert: (s endswith: (self str: 'd')) equals: True;
		assert: (s endswith: (tuple ___value: { self str: 'world'. self str: 'x' })) equals: True;
		assert: (s endswith: (tuple ___value: { self str: 'x'. self str: 'y' })) equals: False;
		yourself
%
category: 'done'
method: strTest
testendswithWithStartEnd

	| s |
	s := self str: 'hello world'.

	self
		assert: (s endswith: (self str: 'lo') _: (self int: 0) _: (self int: 5)) equals: True;
		assert: (s endswith: (self str: 'lo') _: (self int: 0) _: (self int: 4)) equals: False;
		yourself
%
category: 'done'
method: strTest
testexpandtabs

	| s |
	s := str ___value: 'a', Character tab asString, 'b'.

	self
		assert: s expandtabs equals: (self str: 'a       b');
		assert: (s expandtabs: (self int: 4)) equals: (self str: 'a   b');
		yourself
%
category: 'done'
method: strTest
testfind

	| s |
	s := self str: 'hello world'.

	self
		assert: (s find: (self str: 'hello')) equals: (self int: 0);
		assert: (s find: (self str: 'world')) equals: (self int: 6);
		assert: (s find: (self str: 'o')) equals: (self int: 4);
		assert: (s find: (self str: 'xyz')) equals: (self int: -1);
		yourself
%
category: 'done'
method: strTest
testfindWithStartEnd

	| s |
	s := self str: 'hello world'.

	self
		assert: (s find: (self str: 'o') _: (self int: 5)) equals: (self int: 7);
		assert: (s find: (self str: 'o') _: (self int: 0) _: (self int: 5)) equals: (self int: 4);
		assert: (s find: (self str: 'o') _: (self int: 0) _: (self int: 4)) equals: (self int: -1);
		yourself
%
category: 'done'
method: strTest
testindex

	| s |
	s := self str: 'hello world'.

	self
		assert: (s index: (self str: 'hello')) equals: (self int: 0);
		assert: (s index: (self str: 'world')) equals: (self int: 6);
		should: [s index: (self str: 'xyz')] raise: ValueError;
		yourself
%
category: 'done'
method: strTest
testisalnum

	self
		assert: (self str: 'abc123') isalnum;
		assert: (self str: 'abc') isalnum;
		assert: (self str: '123') isalnum;
		deny: (self str: 'abc 123') isalnum;
		deny: (self str: 'abc!') isalnum;
		deny: (self str: '') isalnum;
		yourself
%
category: 'done'
method: strTest
testisalpha

	self
		assert: (self str: 'abc') isalpha;
		deny: (self str: 'abc123') isalpha;
		deny: (self str: '123') isalpha;
		deny: (self str: 'abc ') isalpha;
		deny: (self str: '') isalpha;
		yourself
%
category: 'done'
method: strTest
testisascii

	self
		assert: (self str: 'abc') isascii;
		assert: (self str: '123') isascii;
		assert: (self str: '') isascii;
		yourself
%
category: 'done'
method: strTest
testisdecimal

	self
		assert: (self str: '123') isdecimal;
		deny: (self str: '12.3') isdecimal;
		deny: (self str: 'abc') isdecimal;
		deny: (self str: '') isdecimal;
		yourself
%
category: 'done'
method: strTest
testisdigit

	self
		assert: (self str: '123') isdigit;
		deny: (self str: '12.3') isdigit;
		deny: (self str: 'abc') isdigit;
		deny: (self str: '') isdigit;
		yourself
%
category: 'done'
method: strTest
testisidentifier

	self
		assert: (self str: 'abc') isidentifier;
		assert: (self str: '_abc') isidentifier;
		assert: (self str: 'abc123') isidentifier;
		assert: (self str: '_') isidentifier;
		deny: (self str: '123abc') isidentifier;
		deny: (self str: 'abc-def') isidentifier;
		deny: (self str: '') isidentifier;
		yourself
%
category: 'done'
method: strTest
testislower

	self
		assert: (self str: 'abc') islower;
		assert: (self str: 'abc123') islower;
		deny: (self str: 'Abc') islower;
		deny: (self str: 'ABC') islower;
		deny: (self str: '') islower;
		yourself
%
category: 'done'
method: strTest
testisnumeric

	self
		assert: (self str: '123') isnumeric;
		deny: (self str: '12.3') isnumeric;
		deny: (self str: 'abc') isnumeric;
		deny: (self str: '') isnumeric;
		yourself
%
category: 'done'
method: strTest
testisprintable

	self
		assert: (self str: 'abc') isprintable;
		assert: (self str: '123') isprintable;
		assert: (self str: '') isprintable;
		assert: (self str: ' ') isprintable;
		yourself
%
category: 'done'
method: strTest
testisspace

	self
		assert: (self str: '   ') isspace;
		assert: (str ___value: ' ', Character tab asString) isspace;
		deny: (self str: 'abc') isspace;
		deny: (self str: ' abc') isspace;
		deny: (self str: '') isspace;
		yourself
%
category: 'done'
method: strTest
testistitle

	self
		assert: (self str: 'Hello World') istitle;
		assert: (self str: 'Hello') istitle;
		deny: (self str: 'hello world') istitle;
		deny: (self str: 'HELLO WORLD') istitle;
		deny: (self str: '') istitle;
		yourself
%
category: 'done'
method: strTest
testisupper

	self
		assert: (self str: 'ABC') isupper;
		assert: (self str: 'ABC123') isupper;
		deny: (self str: 'Abc') isupper;
		deny: (self str: 'abc') isupper;
		deny: (self str: '') isupper;
		yourself
%
category: 'done'
method: strTest
testjoin

	| sep |
	sep := self str: ', '.

	self
		assert: (sep join: (list ___value: { self str: 'a'. self str: 'b'. self str: 'c' })) equals: (self str: 'a, b, c');
		assert: ((self str: '') join: (list ___value: { self str: 'a'. self str: 'b' })) equals: (self str: 'ab');
		assert: (sep join: (list ___value: { self str: 'hello' })) equals: (self str: 'hello');
		assert: (sep join: (list ___value: { })) equals: (self str: '');
		yourself
%
category: 'done'
method: strTest
testljust

	| s |
	s := self str: 'abc'.

	self
		assert: (s ljust: (self int: 2)) equals: (self str: 'abc');
		assert: (s ljust: (self int: 3)) equals: (self str: 'abc');
		assert: (s ljust: (self int: 5)) equals: (self str: 'abc  ');
		assert: (s ljust: (self int: 5) _: (self str: '*')) equals: (self str: 'abc**');
		yourself
%
category: 'done'
method: strTest
testlower

	self
		assert: (self str: 'HELLO') lower equals: (self str: 'hello');
		assert: (self str: 'Hello World') lower equals: (self str: 'hello world');
		assert: (self str: 'hello') lower equals: (self str: 'hello');
		yourself
%
category: 'done'
method: strTest
testlstrip

	self
		assert: (self str: '   hello') lstrip equals: (self str: 'hello');
		assert: (self str: 'hello   ') lstrip equals: (self str: 'hello   ');
		assert: (self str: '   hello   ') lstrip equals: (self str: 'hello   ');
		assert: ((self str: 'xxxhello') lstrip: (self str: 'x')) equals: (self str: 'hello');
		yourself
%
category: 'done'
method: strTest
testpartition

	| s |
	s := self str: 'hello world hello'.

	self
		assert: (s partition: (self str: ' '))
			equals: (tuple ___value: { self str: 'hello'. self str: ' '. self str: 'world hello' });
		assert: (s partition: (self str: 'xyz'))
			equals: (tuple ___value: { self str: 'hello world hello'. self str: ''. self str: '' });
		yourself
%
category: 'done'
method: strTest
testremoveprefix

	self
		assert: ((self str: 'hello world') removeprefix: (self str: 'hello ')) equals: (self str: 'world');
		assert: ((self str: 'hello world') removeprefix: (self str: 'xyz')) equals: (self str: 'hello world');
		yourself
%
category: 'done'
method: strTest
testremovesuffix

	self
		assert: ((self str: 'hello world') removesuffix: (self str: ' world')) equals: (self str: 'hello');
		assert: ((self str: 'hello world') removesuffix: (self str: 'xyz')) equals: (self str: 'hello world');
		yourself
%
category: 'done'
method: strTest
testreplace

	self
		assert: ((self str: 'hello world') replace: (self str: 'world') _: (self str: 'there')) equals: (self str: 'hello there');
		assert: ((self str: 'aaa') replace: (self str: 'a') _: (self str: 'b')) equals: (self str: 'bbb');
		assert: ((self str: 'hello') replace: (self str: 'xyz') _: (self str: 'abc')) equals: (self str: 'hello');
		yourself
%
category: 'done'
method: strTest
testrfind

	| s |
	s := self str: 'hello world hello'.

	self
		assert: (s rfind: (self str: 'hello')) equals: (self int: 12);
		assert: (s rfind: (self str: 'o')) equals: (self int: 16);
		assert: (s rfind: (self str: 'xyz')) equals: (self int: -1);
		yourself
%
category: 'done'
method: strTest
testrindex

	| s |
	s := self str: 'hello world hello'.

	self
		assert: (s rindex: (self str: 'hello')) equals: (self int: 12);
		should: [s rindex: (self str: 'xyz')] raise: ValueError;
		yourself
%
category: 'done'
method: strTest
testrjust

	| s |
	s := self str: 'abc'.

	self
		assert: (s rjust: (self int: 2)) equals: (self str: 'abc');
		assert: (s rjust: (self int: 3)) equals: (self str: 'abc');
		assert: (s rjust: (self int: 5)) equals: (self str: '  abc');
		assert: (s rjust: (self int: 5) _: (self str: '*')) equals: (self str: '**abc');
		yourself
%
category: 'done'
method: strTest
testrpartition

	| s |
	s := self str: 'hello world hello'.

	self
		assert: (s rpartition: (self str: ' '))
			equals: (tuple ___value: { self str: 'hello world'. self str: ' '. self str: 'hello' });
		assert: (s rpartition: (self str: 'xyz'))
			equals: (tuple ___value: { self str: ''. self str: ''. self str: 'hello world hello' });
		yourself
%
category: 'done'
method: strTest
testrsplit

	| s |
	s := self str: 'a,b,c,d'.

	self
		assert: (s rsplit: (self str: ','))
			equals: (list ___value: { self str: 'a'. self str: 'b'. self str: 'c'. self str: 'd' });
		assert: (s rsplit: (self str: ',') _: (self int: 1))
			equals: (list ___value: { self str: 'a,b,c'. self str: 'd' });
		assert: (s rsplit: (self str: ',') _: (self int: 2))
			equals: (list ___value: { self str: 'a,b'. self str: 'c'. self str: 'd' });
		yourself
%
category: 'done'
method: strTest
testrstrip

	self
		assert: (self str: 'hello   ') rstrip equals: (self str: 'hello');
		assert: (self str: '   hello') rstrip equals: (self str: '   hello');
		assert: (self str: '   hello   ') rstrip equals: (self str: '   hello');
		assert: ((self str: 'helloxx') rstrip: (self str: 'x')) equals: (self str: 'hello');
		yourself
%
category: 'done'
method: strTest
testsplit

	| s |
	s := self str: 'a,b,c,d'.

	self
		assert: (s split: (self str: ','))
			equals: (list ___value: { self str: 'a'. self str: 'b'. self str: 'c'. self str: 'd' });
		assert: (s split: (self str: ',') _: (self int: 1))
			equals: (list ___value: { self str: 'a'. self str: 'b,c,d' });
		assert: (s split: (self str: ',') _: (self int: 2))
			equals: (list ___value: { self str: 'a'. self str: 'b'. self str: 'c,d' });
		yourself
%
category: 'done'
method: strTest
testsplitlines

	| s |
	s := str ___value: 'line1', Character lf asString, 'line2', Character cr asString, 'line3'.

	self
		assert: s splitlines
			equals: (list ___value: { self str: 'line1'. self str: 'line2'. self str: 'line3' });
		assert: (s splitlines: True)
			equals: (list ___value: { str ___value: 'line1', Character lf asString. str ___value: 'line2', Character cr asString. self str: 'line3' });
		yourself
%
category: 'done'
method: strTest
teststartswith

	| s |
	s := self str: 'hello world'.

	self
		assert: (s startswith: (self str: 'hello')) equals: True;
		assert: (s startswith: (self str: 'world')) equals: False;
		assert: (s startswith: (self str: 'h')) equals: True;
		assert: (s startswith: (tuple ___value: { self str: 'hello'. self str: 'x' })) equals: True;
		assert: (s startswith: (tuple ___value: { self str: 'x'. self str: 'y' })) equals: False;
		yourself
%
category: 'done'
method: strTest
teststartswithWithStartEnd

	| s |
	s := self str: 'hello world'.

	self
		assert: (s startswith: (self str: 'world') _: (self int: 6)) equals: True;
		assert: (s startswith: (self str: 'hello') _: (self int: 1)) equals: False;
		yourself
%
category: 'done'
method: strTest
teststrip

	self
		assert: (self str: '   hello   ') strip equals: (self str: 'hello');
		assert: (self str: 'hello') strip equals: (self str: 'hello');
		assert: ((self str: 'xxxhelloxxx') strip: (self str: 'x')) equals: (self str: 'hello');
		yourself
%
category: 'done'
method: strTest
testswapcase

	self
		assert: (self str: 'Hello World') swapcase equals: (self str: 'hELLO wORLD');
		assert: (self str: 'hello') swapcase equals: (self str: 'HELLO');
		assert: (self str: 'HELLO') swapcase equals: (self str: 'hello');
		yourself
%
category: 'done'
method: strTest
testtitle

	self
		assert: (self str: 'hello world') title equals: (self str: 'Hello World');
		assert: (self str: 'HELLO WORLD') title equals: (self str: 'Hello World');
		assert: (self str: 'they''re bill''s friends') title equals: (self str: 'They''Re Bill''S Friends');
		yourself
%
category: 'done'
method: strTest
testupper

	self
		assert: (self str: 'hello') upper equals: (self str: 'HELLO');
		assert: (self str: 'Hello World') upper equals: (self str: 'HELLO WORLD');
		assert: (self str: 'HELLO') upper equals: (self str: 'HELLO');
		yourself
%
category: 'done'
method: strTest
testzfill

	self
		assert: ((self str: '42') zfill: (self int: 5)) equals: (self str: '00042');
		assert: ((self str: '-42') zfill: (self int: 5)) equals: (self str: '-0042');
		assert: ((self str: '+42') zfill: (self int: 5)) equals: (self str: '+0042');
		assert: ((self str: '42') zfill: (self int: 1)) equals: (self str: '42');
		yourself
%
category: 'todo'
method: strTest
test__add__

   
	| object |
	object := self str: 'hello '.

	self 
		assert: (object __add__: (self str: 'world')) equals: (self str: 'hello world');
		assert: object ___value equals: 'hello ';
		yourself.
%
category: 'todo'
method: strTest
test__contains__

   
	| x |

	x := self str: 'hello world'.

	self
		assert: (x __contains__: (self str: 'hello')) ___value equals: true;
		assert: (x __contains__: (self str: 'x')) ___value equals: false;
		yourself.
%
category: 'todo'
method: strTest
test__eq__

	| object1 object2 |
	object1 := self str: 'abc'.
	object2 := self str:'abc'.
	
	self assert: (object1 __eq__: object2).
	object2 := self str: 'def'.
	self deny: (object1 __eq__: object2).
%
category: 'todo'
method: strTest
test__ge__

   
	self 
		assert: ((self str: 'abc') __ge__: (self str: 'abc'));
		assert: ((self str: 'abd') __ge__: (self str: 'abc'));
		assert: ((self str: 'abc') __ge__: (self str: 'Abc'));
		deny: ((self str: 'Abc') __ge__: (self str: 'abc'));
		deny: ((self str: 'abc') __ge__: (self str: '{bc'));
		assert: ((self str: 'abc') __ge__: (self str: '.bc'));
		yourself.
%
category: 'todo'
method: strTest
test__getitem__

	| object |
	object := self str: 'hello world'.

	self 
		assert: (object __getitem__: (int ___value: 0)) equals: (self str: 'h');
		assert: (object __getitem__: (int ___value: 10)) equals: (self str: 'd');
		assert: (object __getitem__: (int ___value: 5)) equals: (self str: ' ');
		yourself.
%
category: 'todo'
method: strTest
test__getnewargs__

   
	self assert: (self str: 'hello world') __getnewargs__ equals: (tuple ___value: { self str: 'hello world'. }).
%
category: 'todo'
method: strTest
test__gt__

   	self 
		deny: ((self str: 'abc') __gt__: (self str: 'abc'));
		assert: ((self str: 'abd') __gt__: (self str: 'abc'));
		assert: ((self str: 'abc') __gt__: (self str: 'Abc'));
		deny: ((self str: 'Abc') __gt__: (self str: 'abc'));
		deny: ((self str: 'abc') __gt__: (self str: '{bc'));
		assert: ((self str: 'abc') __gt__: (self str: '.bc'));
		yourself.
%
category: 'todo'
method: strTest
test__le__

	self 
		assert: ((self str: 'abc') __le__: (self str: 'abc'));
		assert: ((self str: 'abc') __le__: (self str: 'abd'));
		deny: ((self str: 'abc') __le__: (self str: 'Abc'));
		assert: ((self str: 'Abc') __le__: (self str: 'abc'));
		deny: ((self str: '{bc') __le__:(self str: 'abc'));
		assert: ((self str: '.bc') __le__: (self str: 'abc'));
		yourself.
%
category: 'todo'
method: strTest
test__len__

   
	self 
		assert: (self str: 'hello world') __len__ ___value equals: 11;
		assert: (self str: '') __len__ ___value equals: 0;
		yourself.
%
category: 'todo'
method: strTest
test__lt__

	self 
		deny: ((self str: 'abc') __lt__: (self str: 'abc'));
		assert: ((self str: 'abc') __lt__: (self str: 'abd'));
		deny: ((self str: 'abc') __lt__: (self str: 'Abc'));
		assert: ((self str: 'Abc') __lt__: (self str: 'abc'));
		deny: ((self str: '{bc') __lt__:(self str: 'abc'));
		assert: ((self str: '.bc') __lt__: (self str: 'abc'));
		yourself.
%
category: 'todo'
method: strTest
test__mod__
	" See 'printf-style String Formatting': https://docs.python.org/3/library/stdtypes.html?#printf-style-string-formatting"

	self
		assert: (ModuleAst evaluate: '''%(language)s has %(number)03d quote types.'' % {''language'': ''Python'', ''number'': 2}')
		equals: (str ___value: 'Python has 002 quote types.');

		assert: (ModuleAst evaluate: '"%d %s cost $%.2f" % (12, "apples", 3.44)')
		equals: (str ___value: '12 apples cost $3.44');

		assert: (ModuleAst evaluate: '"%e" % 10.23')
		equals: (str ___value: '1.023000e+01');

		assert: (ModuleAst evaluate: '"%g" % 10.23')
		equals: (str ___value: '10.23');

		assert: (ModuleAst evaluate: '"%g" % 10.2312343')
		equals: (str ___value: '10.2312');

		assert: (ModuleAst evaluate: '"%.7g" % 10.2312343')
		equals: (str ___value: '10.23123');

		assert: (ModuleAst evaluate: '"%.7g" % 10.2312')
		equals: (str ___value: '10.2312');

		assert: (ModuleAst evaluate: '"%.7g" % 0.0000002')
		equals: (str ___value: '2e-07');

		assert: (ModuleAst evaluate: '"%.7g" % 1.0000002')
		equals: (str ___value: '1');

		assert: (ModuleAst evaluate: '"%.7e" % 0.0000002')
		equals: (str ___value: '2.0000000e-07');

		assert: (ModuleAst evaluate: '"%.6f" % 0.0000002')
		equals: (str ___value: '0.000000');

		assert: (ModuleAst evaluate: '"%s" % [1]')
		equals: (str ___value: '[1]');

		assert: (ModuleAst evaluate: '"%s" % {1}')
		equals: (str ___value: '{1}');

		assert: (ModuleAst evaluate: '"%s" % 1')
		equals: (str ___value: '1').
%
category: 'todo'
method: strTest
test__mul__

   
	self 
		assert: ((self str: 'abc') __mul__: (self int: 3)) equals: (self str: 'abcabcabc');
		assert: ((self str: '') __mul__: (self int: 3)) equals: (self str: '');
		assert: ((self str: 'abc') __mul__: (self int: 0)) equals: (self str: '');
		yourself.
%
category: 'todo'
method: strTest
test__ne__

   
	| object1 object2 |
	object1 := self str: 'abc'.
	object2 := self str:'abc'.
	
	self deny: (object1 __ne__: object2).
	object2 := self str: 'def'.
	self assert: (object1 __ne__: object2).
%
category: 'todo'
method: strTest
test__repr__

   
	| object |
	object := self str: 'hello '.

	self assert: object __repr__ ___value equals: '''hello '''.
%
category: 'todo'
method: strTest
test__rmod__

   #pyTodo
%
category: 'todo'
method: strTest
test__rmul__

   #pyTodo
%
category: 'todo'
method: strTest
test__str__

   
	| object |
	object := self str: 'hello '.

	self assert: object __str__ ___value equals: 'hello '.
%
category: 'todo'
method: strTest
test_formatter_field_name_split

   #pyTodo
%
category: 'todo'
method: strTest
test_formatter_parser

   #pyTodo
%
category: 'todo'
method: strTest
testcapitalize

   
	self assert: (self str: 'hello World') capitalize equals: (self str: 'Hello world').
%
category: 'todo'
method: strTest
testformat

   #pyTodo
%
category: 'todo'
method: strTest
testtranslate

   #pyTodo
%
