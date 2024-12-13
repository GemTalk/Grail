! ------------------- Remove existing behavior from TranslateBinaryOperatorsTestCase
removeallmethods TranslateBinaryOperatorsTestCase
removeallclassmethods TranslateBinaryOperatorsTestCase
! ------------------- Class methods for TranslateBinaryOperatorsTestCase
category: 'other'
classmethod: TranslateBinaryOperatorsTestCase
filename

	^'Operators.py'
%
! ------------------- Instance methods for TranslateBinaryOperatorsTestCase
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateAddExpr

	| stream x |
	x := (self statementsAt: 1).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __add__: (int ___value: 2)'.
	self assert: stream contents evaluate equals: (int ___value: 3).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitAndExpr

	| stream x |
	x := (self statementsAt: 2).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __and__: (int ___value: 1)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitLshiftExpr

	| stream x |
	x := (self statementsAt: 5).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __lshift__: (int ___value: 2)'.
	self assert: stream contents evaluate equals: (int ___value: 4).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitOrExpr

	| stream x |
	x := (self statementsAt: 3).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __or__: (int ___value: 1)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitRshiftExpr

	| stream x |
	x := (self statementsAt: 6).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 4) __rshift__: (int ___value: 2)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateBitXorExpr

	| stream x |
	x := (self statementsAt: 4).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 1) __xor__: (int ___value: 0)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateFloorDivExpr

	| stream x |
	x := (self statementsAt: 9).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 3) __floordiv__: (int ___value: 2)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateModExpr

	| stream x |
	x := (self statementsAt: 7).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 10) __mod__: (int ___value: 5)'.
	self assert: stream contents evaluate equals: (int ___value: 0).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateNestedAddExpr

	| stream x |
	x := (self statementsAt: 12).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 2) __add__: (int ___value: 4)) __add__: (int ___value: 6)'.
	self assert: stream contents evaluate equals: (int ___value: 12).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateNestedMultExpr

	| stream x |
	x := (self statementsAt: 13).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '((int ___value: 7) __mul__: (int ___value: 8)) __mul__: (int ___value: 9)'.
	self assert: stream contents evaluate equals: (int ___value: 504).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslatePowExpr

	| stream x |
	x := (self statementsAt: 11).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 2) __pow__: (int ___value: 4)'.
	self assert: stream contents evaluate equals: (int ___value: 16).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateSubExpr

	| stream x |
	x := (self statementsAt: 10).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 2) __sub__: (int ___value: 1)'.
	self assert: stream contents evaluate equals: (int ___value: 1).
%
category: 'other'
method: TranslateBinaryOperatorsTestCase
testTranslateTrueDivExpr

	| stream x |
	x := (self statementsAt: 8).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 10) __truediv__: (int ___value: 5)'.
	self assert: stream contents evaluate equals: (int ___value: 2).
%
