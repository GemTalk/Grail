! ------------------- Remove existing behavior from TranslateBinaryOperatorsTestCase
removeallmethods TranslateBinaryOperatorsTestCase
removeallclassmethods TranslateBinaryOperatorsTestCase
! ------------------- Class methods for TranslateBinaryOperatorsTestCase
! ------------------- Instance methods for TranslateBinaryOperatorsTestCase
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateAddExpr

	| pyString ast stream x |
	pyString := '1 + 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __add__: (int ___value: 2)'.
	self assert: stream contents evaluate equals: (int ___value: 3).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitAndExpr

	| pyString ast stream x |
	pyString := '1 & 1'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __and__: (int ___value: 1)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitLshiftExpr

	| pyString ast stream x |
	pyString := '1 << 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __lshift__: (int ___value: 2)'.
	self assert: stream contents evaluate equals: (int ___value: 4).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitOrExpr

	| pyString ast stream x |
	pyString := '1 | 1'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __or__: (int ___value: 1)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitRshiftExpr

	| pyString ast stream x |
	pyString := '4 >> 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 4) __rshift__: (int ___value: 2)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitXorExpr

	| pyString ast stream x |
	pyString := '1 ^ 0'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __xor__: (int ___value: 0)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateFloorDivExpr

	| pyString ast stream x |
	pyString := '3 // 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 3) __floordiv__: (int ___value: 2)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateModExpr

	| pyString ast stream x |
	pyString := '10 % 5'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 10) __mod__: (int ___value: 5)'.
	self assert: stream contents evaluate equals: (int ___value: 0).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateNestedAddExpr

	| pyString ast stream x |
	pyString := '2 + 4 + 6'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 2) __add__: (int ___value: 4)) __add__: (int ___value: 6)'.
	self assert: stream contents evaluate equals: (int ___value: 12).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateNestedMultExpr

	| pyString ast stream x |
	pyString := '7 * 8 * 9'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 7) __mul__: (int ___value: 8)) __mul__: (int ___value: 9)'.
	self assert: stream contents evaluate equals: (int ___value: 504).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslatePowExpr

	| pyString ast stream x |
	pyString := '2 ** 4'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 2) __pow__: (int ___value: 4)'.
	self assert: stream contents evaluate equals: (int ___value: 16).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateSubExpr

	| pyString ast stream x |
	pyString := '2 - 1'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 2) __sub__: (int ___value: 1)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateTrueDivExpr

	| pyString ast stream x |
	pyString := '10 / 5'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 10) __truediv__: (int ___value: 5)'.
	self assert: stream contents evaluate equals: (int ___value: 2).
%
