! ------------------- Remove existing behavior from StringLiteralsTestCase
expectvalue /Metaclass3       
doit
StringLiteralsTestCase removeAllMethods.
StringLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for StringLiteralsTestCase
set compile_env: 0
category: 'other'
classmethod: StringLiteralsTestCase
filename

	^'StringLiterals.py'
%
! ------------------- Instance methods for StringLiteralsTestCase
set compile_env: 0
category: 'other'
method: StringLiteralsTestCase
testEmbeddedStringDoubleQuotes

	| x |
	x := self statementsAt: 6.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 16;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 16;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'a''bc'.
%
category: 'other'
method: StringLiteralsTestCase
testEmbeddedStringSingleQuotes

	| x |
	x := self statementsAt: 5.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 15;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 15;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'x"yz'.
%
category: 'other'
method: StringLiteralsTestCase
testEscapeCharacterStringNewline

	| x |
	x := self statementsAt: 8.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 20;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 20;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'newline\n'.
%
category: 'other'
method: StringLiteralsTestCase
testEscapeCharacterStringSlash

	| x |
	x := self statementsAt: 7.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 19;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 19;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'slash\\'.
%
category: 'other'
method: StringLiteralsTestCase
testJoinedStrWithFormattedValueNum

	| x child |
	x := self statementsAt: 12.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 28;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf:JoinedStrAst);
		assert: x line == 28;
		assert: x column == 0;
		yourself.
	child := x.values at: 1.
	self
		assert: (child isKindOf: ConstantAst);
		assert: child.value.container = '123';
		yourself.
	child := x.values at: 2.
	self
		assert: (child isKindOf: FormattedValueAst);
		assert: child.value.value.number = 456;
		yourself.
	child := x.values at: 3.
	self
		assert: (child isKindOf: ConstantAst);
		assert: child.value.container = '789';
		yourself.
	self assert: x.values size = 3.
%
category: 'other'
method: StringLiteralsTestCase
testJoinedStrWithFormattedValueStr

	| x child |
	x := self statementsAt: 11.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 27;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: JoinedStrAst);
		assert: x line == 27;
		assert: x column == 0;
		yourself.
	child := x.values at: 1.
	self
		assert: (child isKindOf: ConstantAst);
		assert: child.value.container = 'abc';
		yourself.
	child := x.values at: 2.
	self
		assert: (child isKindOf: FormattedValueAst);
		assert: (child.value isKindOf: ConstantAst);
		assert: (child.value.value isKindOf: str);
		assert: child.value.value.container = 'def';
		yourself.
	child := x.values at: 3.
	self
		assert: (child isKindOf: ConstantAst);
		assert: child.value.container = 'ghi';
		yourself.
	self assert: x.values size = 3.
%
category: 'other'
method: StringLiteralsTestCase
testLongStringDoubleQuotes

	| x |
	x := self statementsAt: 4.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 11;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 11;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'poiu
;lkj'.
%
category: 'other'
method: StringLiteralsTestCase
testLongStringSingleQuotes

	| x |
	x := self statementsAt: 3.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 9;
		assert: x column ==0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 9;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'qwer
asdf'.
%
category: 'other'
method: StringLiteralsTestCase
testNonEscapeCharacterStringNewline

	| x |
	x := self statementsAt: 10.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 24;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 24;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'newline
'.
%
category: 'other'
method: StringLiteralsTestCase
testNonEscapeCharacterStringSlash

	| x |
	x := self statementsAt: 9.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 23;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 23;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'slash\'.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringDoubleQuotes

	| x |
	x := self statementsAt: 2.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 6;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 6;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'vwxyz'.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringSingleQuotes

	| x |
	x := self statementsAt: 1.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x line == 5;
		assert: x column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ConstantAst);
		assert: x line == 5;
		assert: x column == 0;
		yourself.
	x := x.value.container.
	self assert: x = 'abcde'.
%
