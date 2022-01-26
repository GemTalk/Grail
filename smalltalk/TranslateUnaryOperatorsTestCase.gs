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
	self assert: stream contents = '(int with: 200) __invert__'.
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateNestedUnary

	| stream x |
	x := (self statementsAt: 18).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int with: 300) __pos__ __neg__'.

	x := (self statementsAt: 19).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int with: 400) __invert__ __invert__'.
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateNotExpr

	| stream x |
	x := (self statementsAt: 17).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = 'False __not__'.
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateUAddExpr

	| stream x |
	x := (self statementsAt: 16).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int with: 100) __pos__'.
%
category: 'other'
method: TranslateUnaryOperatorsTestCase
testTranslateUSubExpr

	| stream x |
	x := (self statementsAt: 14).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
	self assert: stream contents = '(int with: 100) __neg__'.
%
