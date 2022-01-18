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
		assert: ((x := x.value) isKindOf: Unicode7);
		assert: x equals: '(bytes ___fromAsciiString: ''def'')';
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
		assert: ((x := x.value) isKindOf: Unicode7);
		assert: x equals: '(bytes ___fromAsciiString: ''abc'')';
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
		assert: ((x := x.value) isKindOf: Unicode16);
		assert: x equals: '(bytes ___fromAsciiString: ''defÿ'')';
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
		assert: ((x := x.value) isKindOf: Unicode7);
		assert: x equals: ('(bytes ___fromAsciiString: ''abc', (Unicode7 new add: (Character codePoint: 0); yourself) , ''')');
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
		assert: ((x := x.value) isKindOf: Unicode7);
		assert: x equals: '(bytes ___fromAsciiString: ''abc
'')';
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
		assert: ((x := x.value) isKindOf: Unicode16);
		assert: x equals: '(bytes ___fromAsciiString: ''defÿ'')';
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
		assert: ((x := x.value) isKindOf: Unicode7);
		assert: x equals: '(bytes ___fromAsciiString: ''abc' , (Unicode7 new add: (Character codePoint: 0); yourself) , ''')';
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
		assert: ((x := x.value) isKindOf: Unicode7);
		assert: x = '(bytes ___fromAsciiString: ''def\'')';
		yourself.
%
