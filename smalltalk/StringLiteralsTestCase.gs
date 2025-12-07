! ------------------- Remove existing behavior from StringLiteralsTestCase
removeallmethods StringLiteralsTestCase
removeallclassmethods StringLiteralsTestCase
! ------------------- Class methods for StringLiteralsTestCase
! ------------------- Instance methods for StringLiteralsTestCase
category: 'other'
method: StringLiteralsTestCase
testEmbeddedStringDoubleQuotes

	| x pyString ast |
	pyString := '"a''bc"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''a''''bc'''.
%
category: 'other'
method: StringLiteralsTestCase
testEmbeddedStringSingleQuotes

	| x pyString ast |
	pyString := '''x"yz'''.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''x"yz'''.
%
category: 'other'
method: StringLiteralsTestCase
testEscapeCharacterStringNewline

	| x pyString ast |
	pyString := 'r"newline\n"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''newline\n'''.
%
category: 'other'
method: StringLiteralsTestCase
testEscapeCharacterStringSlash

	| x pyString ast |
	pyString := 'r''slash\\'''.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''slash\\'''.
%
category: 'other'
method: StringLiteralsTestCase
testJoinedStrWithFormattedValueNum

	| x child pyString ast |
	pyString := 'f"123{456}789"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		assert: ((x := x.value) isKindOf:JoinedStrAst);
		assert: ((child := x.values at: 1) isKindOf: ConstantAst);
		assert: child.value = 'str ___value: ''123''';
		assert: ((child := x.values at: 2) isKindOf: FormattedValueAst);
		assert: child.value.value = 'int ___value: 456';
		assert: ((child := x.values at: 3) isKindOf: ConstantAst);
		assert: child.value = 'str ___value: ''789''';
		assert: x.values size == 3;
		yourself.
%
category: 'other'
method: StringLiteralsTestCase
testJoinedStrWithFormattedValueStr

	| x child pyString ast |
	pyString := 'f"abc{''def''}ghi"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: JoinedStrAst);
		yourself.
	child := x.values at: 1.
	self
		assert: (child isKindOf: ConstantAst);
		assert: child.value = 'str ___value: ''abc''';
		yourself.
	child := x.values at: 2.
	self
		assert: (child isKindOf: FormattedValueAst);
		assert: (child.value isKindOf: ConstantAst);
		assert: (child.value.value isKindOf: String);
		assert: child.value.value = 'str ___value: ''def''';
		yourself.
	child := x.values at: 3.
	self
		assert: (child isKindOf: ConstantAst);
		assert: child.value = 'str ___value: ''ghi''';
		yourself.
	self assert: x.values size = 3.
%
category: 'other'
method: StringLiteralsTestCase
testLongStringDoubleQuotes

	| x pyString ast |
	pyString := '"""poiu
;lkj"""'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''poiu
;lkj'''.
%
category: 'other'
method: StringLiteralsTestCase
testLongStringSingleQuotes

	| x pyString ast |
	pyString := '''''''qwer
asdf'''''''.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''qwer
asdf'''.
%
category: 'other'
method: StringLiteralsTestCase
testNonEscapeCharacterStringNewline

	| x pyString ast |
	pyString := '"newline\n"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''newline
'''.
%
category: 'other'
method: StringLiteralsTestCase
testNonEscapeCharacterStringSlash

	| x pyString ast |
	pyString := '''slash\\'''.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''slash\'''.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringDoubleQuotes

	| x pyString ast |
	pyString := '"vwxyz"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''vwxyz'''.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringSingleQuotes

	| x pyString ast |
	pyString := '''abcde'''.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: ConstantAst);
		yourself.
	x := x.value.
	self assert: x = 'str ___value: ''abcde'''.
%
