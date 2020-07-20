! ------------------- Remove existing behavior from ByteLiteralsTestCase
expectvalue /Metaclass3       
doit
ByteLiteralsTestCase removeAllMethods.
ByteLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for ByteLiteralsTestCase
set compile_env: 0
category: 'other'
classmethod: ByteLiteralsTestCase
filename

	^'StringLiterals.py'
%
! ------------------- Instance methods for ByteLiteralsTestCase
set compile_env: 0
category: 'other'
method: ByteLiteralsTestCase
testBackspace

	| x |
	x := self statementsAt: 16.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x.line == 36;
		assert: x.column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BytesAst);
		assert: x.line == 36;
		assert: x.column == 0;
		yourself.
	x := x.s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[100 101 102 8].
%
category: 'other'
method: ByteLiteralsTestCase
testBell

	| x |
	x := self statementsAt: 15.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x.line == 35;
		assert: x.column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BytesAst);
		assert: x.line == 35;
		assert: x.column == 0;
		yourself.
	x := x.s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[ 97 98 99 7 ].
%
category: 'other'
method: ByteLiteralsTestCase
testHexHigh

	| x |
	x := self statementsAt: 20.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x.line == 44;
		assert: x.column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BytesAst);
		assert: x.line == 44;
		assert: x.column == 0;
		yourself.
	x := x.s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[100 101 102 255].
%
category: 'other'
method: ByteLiteralsTestCase
testHexLow

	| x |
	x := self statementsAt: 19.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x.line == 43;
		assert: x.column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BytesAst);
		assert: x.line == 43;
		assert: x.column == 0;
		yourself.
	x := x.s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[97 98 99 0].
%
category: 'other'
method: ByteLiteralsTestCase
testNewline

	| x |
	x := self statementsAt: 13.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x.line == 31;
		assert: x.column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BytesAst);
		assert: x.line == 31;
		assert: x.column == 0;
		yourself.
	x := x.s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = 'abc
' asByteArray.
%
category: 'other'
method: ByteLiteralsTestCase
testOctalHigh

	| x |
	x := self statementsAt: 18.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x.line == 40;
		assert: x.column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BytesAst);
		assert: x.line == 40;
		assert: x.column == 0;
		yourself.
	x := x.s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[100 101 102 255].
%
category: 'other'
method: ByteLiteralsTestCase
testOctalLow

	| x |
	x := self statementsAt: 17.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x.line == 39;
		assert: x.column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BytesAst);
		assert: x.line == 39;
		assert: x.column == 0;
		yourself.
	x := x.s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[ 97 98 99 0].
%
category: 'other'
method: ByteLiteralsTestCase
testSlash

	| x |
	x := self statementsAt: 14.
	self 
		assert: (x isKindOf: ExprAst);
		assert: x.line == 32;
		assert: x.column == 0;
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BytesAst);
		assert: x.line == 32;
		assert: x.column == 0;
		yourself.
	x := x.s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = 'def\' asByteArray.
%
