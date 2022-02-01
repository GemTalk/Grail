! ------------------- Remove existing behavior from TranslateComparisonOperatorsTestCase
removeAllMethods TranslateComparisonOperatorsTestCase
removeAllClassMethods TranslateComparisonOperatorsTestCase
! ------------------- Class methods for TranslateComparisonOperatorsTestCase
set compile_env: 0
category: 'other'
classmethod: TranslateComparisonOperatorsTestCase
filename

	^'Operators.py'
%
! ------------------- Instance methods for TranslateComparisonOperatorsTestCase
set compile_env: 0
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateEqExpr

	| stream x |
	x := (self statementsAt: 20).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 10) __eq__: (int with: 20))'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateGtEqExpr

	| stream x |
	x := (self statementsAt: 21).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 25) __ge__: (int with: 15))'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateGtExpr

	| stream x |
	x := (self statementsAt: 22).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 25) __gt__: (int with: 15))'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateInExpr

	"TODO"

	| stream x |
	x := (self statementsAt: 28).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((list ___value: { (int with: 1). (int with: 2). (int with: 3). }) __contains__: (int with: 3))'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateIsExpr

	| stream x |
	x := (self statementsAt: 26).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(False is_: True)'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateIsNotExpr

	| stream x |
	x := (self statementsAt: 27).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(False is_not: True)'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateLtEqExpr

	| stream x |
	x := (self statementsAt: 24).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 15) __le__: (int with: 25))'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateLtExpr

	| stream x |
	x := (self statementsAt: 23).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 25) __lt__: (int with: 15))'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateNeExpr

	| stream x |
	x := (self statementsAt: 25).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 15) __ne__: (int with: 15))'.
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateNestedComparisonExpr

	| stream x |
	x := (self statementsAt: 30).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '([
	| lhs rhs |
	((int with: 11) __eq__: (rhs := int with: 22)) __and__: [(rhs __eq__: (rhs := int with: 33)) __and__: [rhs __eq__: (int with: 44)]]
] value)'.

	x := (self statementsAt: 31).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '([
	| lhs rhs |
	((int with: 44) __ge__: (rhs := int with: 55)) __and__: [rhs __ge__: (int with: 66)]
] value)'.

	x := (self statementsAt: 32).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '([
	| lhs rhs |
	(((lhs := str ___value: ''hello'') __contains__: (str ___value: ''he'')) ___ignore: (rhs := lhs)) __and__: [(((lhs := str ___value: ''hello world'') __contains__: rhs) ___ignore: (rhs := lhs)) __and__: [rhs __eq__: (str ___value: ''hello world'')]]
] value)'.

	self assert: stream contents evaluate ___value equals: 1
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateNotInExpr
	
	"TODO"

	| stream x |
	x := (self statementsAt: 29).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(False is_not: True)'.
%
