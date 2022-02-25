! ------------------- Remove existing behavior from TranslateSimpleStatementsTestCase
removeAllMethods TranslateSimpleStatementsTestCase
removeAllClassMethods TranslateSimpleStatementsTestCase
! ------------------- Class methods for TranslateSimpleStatementsTestCase
set compile_env: 0
category: 'other'
classmethod: TranslateSimpleStatementsTestCase
filename

	^'SimpleStatements.py'
%
! ------------------- Instance methods for TranslateSimpleStatementsTestCase
set compile_env: 0
category: 'other'
method: TranslateSimpleStatementsTestCase
testTranslateAssert

	| stream x |
	x := (self statementsAt: 9).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'True ___value ifFalse: [ AssertionError signal ].'.
	self assert: stream contents evaluate equals: nil.

	x := (self statementsAt: 10).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'False ___value ifFalse: [ AssertionError signal ].'.
	self should: [ stream contents evaluate ] raise: AssertionError.

	x := (self statementsAt: 11).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'False ___value ifFalse: [ AssertionError signal: (str ___value: ''Assert failed'') ___value ].'.
	self 
		should: [ stream contents evaluate ] 
		raise: AssertionError
		withExceptionDo: [ :exc | self assert: exc messageText equals: 'Assert failed' ].
%
