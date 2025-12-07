! ------------------- Remove existing behavior from TranslateComparisonOperatorsTestCase
removeallmethods TranslateComparisonOperatorsTestCase
removeallclassmethods TranslateComparisonOperatorsTestCase
! ------------------- Class methods for TranslateComparisonOperatorsTestCase
! ------------------- Instance methods for TranslateComparisonOperatorsTestCase
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateEqExpr

	| pyString ast stream x |
	pyString := '10 == 20'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 10) __eq__: (int ___value: 20)'.
	self assert: stream contents evaluate equals: (bool ___value: false).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateGtEqExpr

	| pyString ast stream x |
	pyString := '25 >= 15'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 25) __ge__: (int ___value: 15)'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateGtExpr

	| pyString ast stream x |
	pyString := '25 > 15'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 25) __gt__: (int ___value: 15)'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateInExpr
	"TODO"

	| pyString ast stream x |
	pyString := '3 in [1, 2, 3]'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '(list ___value: { (int ___value: 1). (int ___value: 2). (int ___value: 3). }) __contains__: (int ___value: 3)'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateIsExpr

	| pyString ast stream x |
	pyString := 'False is True'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(False) is_: (True)'.
	self assert: stream contents evaluate equals: False.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateIsNotExpr

	| pyString ast stream x |
	pyString := 'False is not True'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(False) is_not: (True)'.
	self assert: stream contents evaluate equals: True.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateLtEqExpr

	| pyString ast stream x |
	pyString := '15 <= 25'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 15) __le__: (int ___value: 25)'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateLtExpr

	| pyString ast stream x |
	pyString := '25 < 15'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 25) __lt__: (int ___value: 15)'.
	self assert: stream contents evaluate equals: (bool ___value: false).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateNeExpr

	| pyString ast stream x |
	pyString := '15 != 15'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 15) __ne__: (int ___value: 15)'.
	self assert: stream contents evaluate equals: (bool ___value: false).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateNestedComparisonExpr

	| pyString ast stream x |
	pyString := '11 == 22 == 33 == 44'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '[
	| lhs rhs |
	((int ___value: 11) __eq__: (rhs := int ___value: 22)) __and__: [(rhs __eq__: (rhs := int ___value: 33)) __and__: [rhs __eq__: (int ___value: 44)]]
] value'.
	self assert: stream contents evaluate equals: (bool ___value: false).

	pyString := '44 >= 55 >= 66'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '[
	| lhs rhs |
	((int ___value: 44) __ge__: (rhs := int ___value: 55)) __and__: [rhs __ge__: (int ___value: 66)]
] value'.
	self assert: stream contents evaluate equals: (bool ___value: false).

	pyString := '''he'' in ''hello'' in ''hello world'' == ''hello world'''.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '[
	| lhs rhs |
	(((lhs := str ___value: ''hello'') __contains__: (str ___value: ''he'')) ___ignore: (rhs := lhs)) __and__: [(((lhs := str ___value: ''hello world'') __contains__: rhs) ___ignore: (rhs := lhs)) __and__: [rhs __eq__: (str ___value: ''hello world'')]]
] value'.

	self assert: stream contents evaluate equals:  (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateNotInExpr
	"TODO"

	| pyString ast stream x |
	pyString := '3 not in [1, 2, 3]'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((list ___value: { (int ___value: 1). (int ___value: 2). (int ___value: 3). }) __contains__: (int ___value: 3)) __not__'.
	self assert: stream contents evaluate equals: (bool ___value: false).
%
