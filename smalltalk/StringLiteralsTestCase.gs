! ------------------- Remove existing behavior from StringLiteralsTestCase
expectvalue /Metaclass3       
doit
StringLiteralsTestCase removeAllMethods.
StringLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for StringLiteralsTestCase
! ------------------- Instance methods for StringLiteralsTestCase
set compile_env: 0
category: 'other'
method: StringLiteralsTestCase
filename

	^'StringLiterals.py'
%
category: 'other'
method: StringLiteralsTestCase
testEmbeddedStringDoubleQuotes

	| x |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 16;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 16;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'a''bc'.
%
category: 'other'
method: StringLiteralsTestCase
testEmbeddedStringSingleQuotes

	| x |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 15;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 15;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'x"yz'.
%
category: 'other'
method: StringLiteralsTestCase
testEscapeCharacterStringNewline

	| x |
	x := statements at: 8.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 20;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 20;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'newline\n'.
%
category: 'other'
method: StringLiteralsTestCase
testEscapeCharacterStringSlash

	| x |
	x := statements at: 7.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 19;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 19;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'slash\\'.
%
category: 'other'
method: StringLiteralsTestCase
testJoinedStrWithFormattedValueNum

	| x child |
	x := statements at: 12.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 28;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyJoinedStr);
		assert: x line == 28;
		assert: x column == 0;
		yourself.
	child := x _values at: 1.
	self
		assert: (child isKindOf: PyStr);
		assert: child _s = '123';
		yourself.
	child := x _values at: 2.
	self
		assert: (child isKindOf: PyFormattedValue);
		assert: child _value _n = 456;
		yourself.
	child := x _values at: 3.
	self
		assert: (child isKindOf: PyStr);
		assert: child _s = '789';
		yourself.
	self assert: x _values size = 3.
%
category: 'other'
method: StringLiteralsTestCase
testJoinedStrWithFormattedValueStr

	| x child |
	x := statements at: 11.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 27;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyJoinedStr);
		assert: x line == 27;
		assert: x column == 0;
		yourself.
	child := x _values at: 1.
	self
		assert: (child isKindOf: PyStr);
		assert: child _s = 'abc';
		yourself.
	child := x _values at: 2.
	self
		assert: (child isKindOf: PyFormattedValue);
		assert: child _value _s = 'def';
		yourself.
	child := x _values at: 3.
	self
		assert: (child isKindOf: PyStr);
		assert: child _s = 'ghi';
		yourself.
	self assert: x _values size = 3.
%
category: 'other'
method: StringLiteralsTestCase
testLongStringDoubleQuotes

	| x |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 12;
		assert: x column == -1;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 12;
		assert: x column == -1;
		yourself.
	x := x _s.
	self assert: x = 'poiu
;lkj'.
%
category: 'other'
method: StringLiteralsTestCase
testLongStringSingleQuotes

	| x |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 10;
		assert: x column == -1;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 10;
		assert: x column == -1;
		yourself.
	x := x _s.
	self assert: x = 'qwer
asdf'.
%
category: 'other'
method: StringLiteralsTestCase
testNonEscapeCharacterStringNewline

	| x |
	x := statements at: 10.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 24;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 24;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'newline
'.
%
category: 'other'
method: StringLiteralsTestCase
testNonEscapeCharacterStringSlash

	| x |
	x := statements at: 9.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 23;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 23;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'slash\'.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringDoubleQuotes

	| x |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 6;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 6;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'vwxyz'.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringSingleQuotes

	| x |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 5;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 5;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'abcde'.
%
