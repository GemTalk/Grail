! ------------------- Remove existing behavior from TranslateUnaryOperatorsTestCase
removeallmethods TranslateUnaryOperatorsTestCase
removeallclassmethods TranslateUnaryOperatorsTestCase
! ------------------- Class methods for TranslateUnaryOperatorsTestCase
! ------------------- Instance methods for TranslateUnaryOperatorsTestCase
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateInvertExpr

	| pyString ast stream x |
	pyString := '~200'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 200) __invert__'.
	self assert: stream contents evaluate equals: (int ___value: -201).
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateNestedUnary

	| pyString ast stream x |
	pyString := '-+300'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 300) __pos__) __neg__'.
	self assert: stream contents evaluate equals: (int ___value: -300).

	pyString := '~~400'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 400) __invert__) __invert__'.
	self assert: stream contents evaluate equals: (int ___value: 400).
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateNotExpr

	| pyString ast stream x |
	pyString := 'not False'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(False) __not__'.
	self assert: stream contents evaluate equals: True.
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateUAddExpr

	| pyString ast stream x |
	pyString := '+100'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 100) __pos__'.
	self assert: stream contents evaluate equals: (int ___value: 100).
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateUSubExpr

	| pyString ast stream x |
	pyString := '-100'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 100) __neg__'.
	self assert: stream contents evaluate equals: (int ___value: -100).
%
