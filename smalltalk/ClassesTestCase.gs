! ------------------- Remove existing behavior from ClassesTestCase
expectvalue /Metaclass3       
doit
ClassesTestCase removeAllMethods.
ClassesTestCase class removeAllMethods.
%
! ------------------- Class methods for ClassesTestCase
set compile_env: 0
category: 'other'
classmethod: ClassesTestCase
filename

	^'Classes.py'
%
! ------------------- Instance methods for ClassesTestCase
set compile_env: 0
category: 'other'
method: ClassesTestCase
test
"
MyClass>>foo(<__main__.MyClass object at 0x7fd647210438>, B) - 1 - A
MyClass>>bar1(<__main__.MyClass object at 0x7fd647210438>, B)
MyClass>>bar1(<class '__main__.MyClass'>, C)
MyClass>>bar1(C, D)
MyClass>>bar1(<class '__main__.MyClass'>, C)
MyClass>>bar3(<class '__main__.MyClass'>, C)
"
	| x |
	module evaluate.
	stdout := ReadStream on: stdout contents.
	self
"1"	assert: ((x := stdout nextLine) beginsWith: 'MyClass>>foo(<__main__.MyClass object at 0x');
		assert: (x endsWith: '>, B) - 1 - A');
"2"	assert: ((x := stdout nextLine) beginsWith: 'MyClass>>bar1(<__main__.MyClass object at 0x');
		assert: (x endsWith: '>, B)');
"3"	assert: ((x := stdout nextLine) = 'MyClass>>bar1(<class ''__main__.MyClass''>, C)');
"4"	assert: ((x := stdout nextLine) = 'MyClass>>bar1(C, D)');
"5"	assert: ((x := stdout nextLine) = 'MyClass>>bar1(<class ''__main__.MyClass''>, C)');
"6"	assert: ((x := stdout nextLine) = 'MyClass>>bar3(<class ''__main__.MyClass''>, C)');
"7"	assert: ((x := stdout nextLine) = 'fun foo fun foo 1 1 2 3 4 5');
		assert: (x := stdout nextLine) isNil;
		yourself.
%
