! ------------------- Remove existing behavior from strTest
expectvalue /Metaclass3
doit
strTest removeAllMethods.
strTest class removeAllMethods.
%
! ------------------- Class methods for strTest
! ------------------- Instance methods for strTest
set compile_env: 0
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
test__getslice__
	| object |
	object := self str: 'abcdefg'.

	self
		assert: (object __getslice__: (self int: 0) _: (self int: 2)) equals: (self str: ('ab'));
		assert: (object __getslice__: (self int: 2) _: (self int: 3)) equals: (self str: ('c'));
		assert: (object __getslice__: (self int: 2) _: (self int: 2)) equals: (self str: (''));
		assert: (object __getslice__: (self int: -3) _: (self int: -2)) equals: (self str: ('e'));
		yourself.
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

		assert: (ModuleAst evaluate: '"%s" % (1)')
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
testcenter
   #pyTodo
%
category: 'todo'
method: strTest
testcount
   #pyTodo
%
category: 'todo'
method: strTest
testencode
   #pyTodo
%
category: 'todo'
method: strTest
testendswith
   #pyTodo
%
category: 'todo'
method: strTest
testexpandtabs
   #pyTodo
%
category: 'todo'
method: strTest
testfind
   #pyTodo
%
category: 'todo'
method: strTest
testformat
   #pyTodo
%
category: 'todo'
method: strTest
testindex
   #pyTodo
%
category: 'todo'
method: strTest
testisalnum
   #pyTodo
%
category: 'todo'
method: strTest
testisalpha
   #pyTodo
%
category: 'todo'
method: strTest
testisdigit
   #pyTodo
%
category: 'todo'
method: strTest
testislower
   #pyTodo
%
category: 'todo'
method: strTest
testisspace
   #pyTodo
%
category: 'todo'
method: strTest
testistitle
   #pyTodo
%
category: 'todo'
method: strTest
testisupper
   #pyTodo
%
category: 'todo'
method: strTest
testjoin
   #pyTodo
%
category: 'todo'
method: strTest
testljust
   #pyTodo
%
category: 'todo'
method: strTest
testlower
   #pyTodo
%
category: 'todo'
method: strTest
testlstrip
   #pyTodo
%
category: 'todo'
method: strTest
testpartition
   #pyTodo
%
category: 'todo'
method: strTest
testreplace
   #pyTodo
%
category: 'todo'
method: strTest
testrfind
   #pyTodo
%
category: 'todo'
method: strTest
testrindex
   #pyTodo
%
category: 'todo'
method: strTest
testrjust
   #pyTodo
%
category: 'todo'
method: strTest
testrpartition
   #pyTodo
%
category: 'todo'
method: strTest
testrsplit
   #pyTodo
%
category: 'todo'
method: strTest
testrstrip
   #pyTodo
%
category: 'todo'
method: strTest
testsplit
   #pyTodo
%
category: 'todo'
method: strTest
testsplitlines
   #pyTodo
%
category: 'todo'
method: strTest
teststartswith
   #pyTodo
%
category: 'todo'
method: strTest
teststrip
   #pyTodo
%
category: 'todo'
method: strTest
testswapcase
   #pyTodo
%
category: 'todo'
method: strTest
testtitle
   #pyTodo
%
category: 'todo'
method: strTest
testtranslate
   #pyTodo
%
category: 'todo'
method: strTest
testupper
   #pyTodo
%
category: 'todo'
method: strTest
testzfill
   #pyTodo
%
