! ------------------- Remove existing behavior from ByteLiteralsTestCase
removeallmethods ByteLiteralsTestCase
removeallclassmethods ByteLiteralsTestCase
! ------------------- Class methods for ByteLiteralsTestCase
! ------------------- Instance methods for ByteLiteralsTestCase
category: 'other'
method: ByteLiteralsTestCase
testBackspace

	| x pyString ast |
	pyString := 'b"def\b"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: ((x := x.value) isKindOf: String);
		assert: x equals: 'bytes ___fromAsciiString: ''def''';
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testBell

	| x pyString ast |
	pyString := 'b"abc\a"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: ((x := x.value) isKindOf: String);
		assert: x equals: 'bytes ___fromAsciiString: ''abc''';
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testHexHigh

	| x pyString ast |
	pyString := 'b"""def\xff"""'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: ((x := x.value) isKindOf: String);
		assert: x equals: 'bytes ___fromAsciiString: ''defÿ''';
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testHexLow

	| x pyString ast |
	pyString := 'b"""abc\x00"""'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: ((x := x.value) isKindOf: String);
		assert: x equals: ('bytes ___fromAsciiString: ''abc', (Unicode7 new add: (Character codePoint: 0); yourself) , '''');
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testNewline

	| x pyString ast |
	pyString := 'b"abc\n"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: ((x := x.value) isKindOf: String);
		assert: x equals: 'bytes ___fromAsciiString: ''abc
''';
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testOctalHigh

	| x pyString ast |
	pyString := 'b"""def\377"""'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: ((x := x.value) isKindOf: String);
		assert: x equals: 'bytes ___fromAsciiString: ''defÿ''';
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testOctalLow

	| x pyString ast |
	pyString := 'b"""abc\000"""'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: ((x := x.value) isKindOf: String);
		assert: x equals: 'bytes ___fromAsciiString: ''abc' , (Unicode7 new add: (Character codePoint: 0); yourself) , '''';
		yourself.
%
category: 'other'
method: ByteLiteralsTestCase
testSlash

	| x pyString ast |
	pyString := 'b"""def\\"""'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf: ConstantAst);
		assert: ((x := x.value) isKindOf: String);
		assert: x = 'bytes ___fromAsciiString: ''def\''';
		yourself.
%
