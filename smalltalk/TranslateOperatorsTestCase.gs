! ------------------- Remove existing behavior from TranslateOperatorsTestCase
removeAllMethods TranslateOperatorsTestCase
removeAllClassMethods TranslateOperatorsTestCase
! ------------------- Instance methods for TranslateOperatorsTestCase
set compile_env: 0
category: 'other'
method: TranslateOperatorsTestCase
testTranslateAddExpr

	| pyString ast stream x |
	pyString := '1 + 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __add__: (int with: 2))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateBitAndExpr

	| pyString ast stream x |
	pyString := '1 & 1'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __and__: (int with: 1))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateBitLshiftExpr

	| pyString ast stream x |
	pyString := '1 << 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __lshift__: (int with: 2))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateBitOrExpr

	| pyString ast stream x |
	pyString := '1 | 1'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __or__: (int with: 1))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateBitRshiftExpr

	| pyString ast stream x |
	pyString := '4 >> 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 4) __rshift__: (int with: 2))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateBitXorExpr

	| pyString ast stream x |
	pyString := '1 ^ 0'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __xor__: (int with: 0))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateFloorDivExpr

	| pyString ast stream x |
	pyString := '3 // 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 3) __floordiv__: (int with: 2))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateModExpr

	| pyString ast stream x |
	pyString := '10 % 5'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 10) __mod__: (int with: 5))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateNestedAddExpr

	| pyString ast stream x |
	pyString := '2 + 4 + 6'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(((int with: 2) __add__: (int with: 4)) __add__: (int with: 6))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateNestedMultExpr

	| pyString ast stream x |
	pyString := '7 * 8 * 9'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(((int with: 7) __mul__: (int with: 8)) __mul__: (int with: 9))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslatePowExpr

	| pyString ast stream x |
	pyString := '2 ** 4'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 2) __pow__: (int with: 4))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateSubExpr

	| pyString ast stream x |
	pyString := '2 - 1'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 2) __sub__: (int with: 1))'.
%
category: 'other'
method: TranslateOperatorsTestCase
testTranslateTrueDivExpr

	| pyString ast stream x |
	pyString := '10 / 5'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 10) __truediv__: (int with: 5))'.
%
