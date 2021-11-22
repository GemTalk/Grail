! ------------------- Remove existing behavior from ByteLiteralsTestCase
removeAllMethods ByteLiteralsTestCase
removeAllClassMethods ByteLiteralsTestCase
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
	self
		assert: ((x := self statementsAt: 16) isKindOf: ExprAst);
		assert: x line == 36;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: x line == 36;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: bytes);
		assert: ((x := x ___container) isKindOf: ByteArray);
		assert: x = #[100 101 102 8];
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testBell

	| x |
	self
		assert: ((x := self statementsAt: 15) isKindOf: ExprAst);
		assert: x line == 35;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: x line == 35;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: bytes);
		assert: ((x := x ___container) isKindOf: ByteArray);
		assert: x = #[97 98 99 7];
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testHexHigh

	| x |
	self
		assert: ((x := self statementsAt: 20) isKindOf: ExprAst);
		assert: x line == 44;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: x line == 44;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: bytes);
		assert: ((x := x ___container) isKindOf: ByteArray);
		assert: x = #[100 101 102 255];
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testHexLow

	| x |
	self
		assert: ((x := self statementsAt: 19) isKindOf: ExprAst);
		assert: x line == 43;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: x line == 43;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: bytes);
		assert: ((x := x ___container) isKindOf: ByteArray);
		assert: x = #[97 98 99 0];
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testNewline

	| x |
	self
		assert: ((x := self statementsAt: 13) isKindOf: ExprAst);
		assert: x line == 31;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: x line == 31;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: bytes);
		assert: ((x := x ___container) isKindOf: ByteArray);
		assert: x = 'abc
' asByteArray;
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testOctalHigh

	| x |
	self
		assert: ((x := self statementsAt: 18) isKindOf: ExprAst);
		assert: x line == 40;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: x line == 40;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: bytes);
		assert: ((x := x ___container) isKindOf: ByteArray);
		assert: x = #[100 101 102 255];
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testOctalLow

	| x |
	self
		assert: ((x := self statementsAt: 17) isKindOf: ExprAst);
		assert: x line == 39;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: x line == 39;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: bytes);
		assert: ((x := x ___container) isKindOf: ByteArray);
		assert: x = #[97 98 99 0];
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testSlash

	| x |
	self
		assert: ((x := self statementsAt: 14) isKindOf: ExprAst);
		assert: x line == 32;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: x line == 32;
		assert: x column == 0;
		assert: ((x := x.value) isKindOf: bytes);
		assert: ((x := x ___container) isKindOf: ByteArray);
		assert: x = 'def\' asByteArray;
		yourself.
%
