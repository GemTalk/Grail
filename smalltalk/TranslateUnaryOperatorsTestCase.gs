! ------------------- Remove existing behavior from TranslateUnaryOperatorsTestCase
removeAllMethods TranslateUnaryOperatorsTestCase
removeAllClassMethods TranslateUnaryOperatorsTestCase
! ------------------- Class methods for TranslateUnaryOperatorsTestCase
set compile_env: 0
category: 'other'
classmethod: TranslateUnaryOperatorsTestCase
filename

	^'Operators.py'
%
! ------------------- Instance methods for TranslateUnaryOperatorsTestCase
set compile_env: 0
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateInvertExpr

	| stream x |
	x := (self statementsAt: 15).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 200) __invert__'.
	self assert: stream contents evaluate equals: (int ___value: -201).
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateNestedUnary

	| stream x |
	x := (self statementsAt: 18).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 300) __pos__ __neg__'.
	self assert: stream contents evaluate equals: (int ___value: -300).

	x := (self statementsAt: 19).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 400) __invert__ __invert__'.
	self assert: stream contents evaluate equals: (int ___value: 400).
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateNotExpr

	| stream x |
	x := (self statementsAt: 17).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(bool ___value: false) __not__'.
	self assert: stream contents evaluate equals: (bool ___value: true).
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateUAddExpr

	| stream x |
	x := (self statementsAt: 16).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 100) __pos__'.
	self assert: stream contents evaluate equals: (int ___value: 100).
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateUSubExpr

	| stream x |
	x := (self statementsAt: 14).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int ___value: 100) __neg__'.
	self assert: stream contents evaluate equals: (int ___value: -100).
%
