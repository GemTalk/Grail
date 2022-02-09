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
	self assert: stream contents = '((int ___value: 10) __eq__: (int ___value: 20))'.
	self assert: stream contents evaluate equals: (bool ___value: false).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateGtEqExpr

	| stream x |
	x := (self statementsAt: 21).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 25) __ge__: (int ___value: 15))'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateGtExpr

	| stream x |
	x := (self statementsAt: 22).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 25) __gt__: (int ___value: 15))'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateInExpr

	"TODO"

	| stream x |
	x := (self statementsAt: 28).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '((list ___value: { (int ___value: 1). (int ___value: 2). (int ___value: 3). }) __contains__: (int ___value: 3))'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateIsExpr

	| stream x |
	x := (self statementsAt: 26).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((bool ___value: false) is_: (bool ___value: true))'.
	self assert: stream contents evaluate equals: (bool ___value: false).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateIsNotExpr

	| stream x |
	x := (self statementsAt: 27).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((bool ___value: false) is_not: (bool ___value: true))'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateLtEqExpr

	| stream x |
	x := (self statementsAt: 24).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 15) __le__: (int ___value: 25))'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateLtExpr

	| stream x |
	x := (self statementsAt: 23).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 25) __lt__: (int ___value: 15))'.
	self assert: stream contents evaluate equals: (bool ___value: false).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateNeExpr

	| stream x |
	x := (self statementsAt: 25).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 15) __ne__: (int ___value: 15))'.
	self assert: stream contents evaluate equals: (bool ___value: false).
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
	((int ___value: 11) __eq__: (rhs := int ___value: 22)) __and__: [(rhs __eq__: (rhs := int ___value: 33)) __and__: [rhs __eq__: (int ___value: 44)]]
] value)'.
	self assert: stream contents evaluate equals: (bool ___value: false).


	x := (self statementsAt: 31).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '([
	| lhs rhs |
	((int ___value: 44) __ge__: (rhs := int ___value: 55)) __and__: [rhs __ge__: (int ___value: 66)]
] value)'.
	self assert: stream contents evaluate equals: (bool ___value: false).

	x := (self statementsAt: 32).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents equals: '([
	| lhs rhs |
	(((lhs := str ___value: ''hello'') __contains__: (str ___value: ''he'')) ___ignore: (rhs := lhs)) __and__: [(((lhs := str ___value: ''hello world'') __contains__: rhs) ___ignore: (rhs := lhs)) __and__: [rhs __eq__: (str ___value: ''hello world'')]]
] value)'.

	self assert: stream contents evaluate equals:  (bool ___value: true).
%
category: 'other'
method: TranslateComparisonOperatorsTestCase
testTranslateNotInExpr
	
	"TODO"

	| stream x |
	x := (self statementsAt: 29).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(((list ___value: { (int ___value: 1). (int ___value: 2). (int ___value: 3). }) __contains__: (int ___value: 3)) __not__)'.
	self assert: stream contents evaluate equals: (bool ___value: false).
%
