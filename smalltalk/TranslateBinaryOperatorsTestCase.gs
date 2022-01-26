! ------------------- Remove existing behavior from TranslateBinaryOperatorsTestCase
removeAllMethods TranslateBinaryOperatorsTestCase
removeAllClassMethods TranslateBinaryOperatorsTestCase
! ------------------- Class methods for TranslateBinaryOperatorsTestCase
set compile_env: 0
category: 'other'
classmethod: TranslateBinaryOperatorsTestCase
filename

	^'Operators.py'
%
! ------------------- Instance methods for TranslateBinaryOperatorsTestCase
set compile_env: 0
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateAddExpr

	| stream x |
	x := (self statementsAt: 1).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __add__: (int with: 2))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitAndExpr

	| stream x |
	x := (self statementsAt: 2).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __and__: (int with: 1))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitLshiftExpr

	| stream x |
	x := (self statementsAt: 5).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __lshift__: (int with: 2))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitOrExpr

	| stream x |
	x := (self statementsAt: 3).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __or__: (int with: 1))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitRshiftExpr

	| stream x |
	x := (self statementsAt: 6).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 4) __rshift__: (int with: 2))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitXorExpr

	| stream x |
	x := (self statementsAt: 4).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 1) __xor__: (int with: 0))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateFloorDivExpr

	| stream x |
	x := (self statementsAt: 9).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 3) __floordiv__: (int with: 2))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateModExpr

	| stream x |
	x := (self statementsAt: 7).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 10) __mod__: (int with: 5))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateNestedAddExpr

	| stream x |
	x := (self statementsAt: 12).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(((int with: 2) __add__: (int with: 4)) __add__: (int with: 6))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateNestedMultExpr

	| stream x |
	x := (self statementsAt: 13).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(((int with: 7) __mul__: (int with: 8)) __mul__: (int with: 9))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslatePowExpr

	| stream x |
	x := (self statementsAt: 11).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 2) __pow__: (int with: 4))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateSubExpr

	| stream x |
	x := (self statementsAt: 10).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 2) __sub__: (int with: 1))'.
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateTrueDivExpr

	| stream x |
	x := (self statementsAt: 8).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int with: 10) __truediv__: (int with: 5))'.
%
