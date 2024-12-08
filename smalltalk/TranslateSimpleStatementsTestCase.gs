! ------------------- Remove existing behavior from TranslateSimpleStatementsTestCase
removeallmethods TranslateSimpleStatementsTestCase
removeallclassmethods TranslateSimpleStatementsTestCase
! ------------------- Class methods for TranslateSimpleStatementsTestCase
category: 'other'
classmethod: TranslateSimpleStatementsTestCase
filename

	^'SimpleStatements.py'
%
! ------------------- Instance methods for TranslateSimpleStatementsTestCase
category: 'other'
method: TranslateSimpleStatementsTestCase
testTranslateAssert

	| stream x |
	x := (self statementsAt: 9).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'True ___value ifFalse: [AssertionError signal].'.
	self assert: stream contents evaluate equals: nil.

	x := (self statementsAt: 10).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'False ___value ifFalse: [AssertionError signal].'.
	self should: [stream contents evaluate] raise: AssertionError.

	x := (self statementsAt: 11).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'False ___value ifFalse: [AssertionError signal: (str ___value: ''Assert failed'') ___value].'.
	self 
		should: [stream contents evaluate] 
		raise: AssertionError
		withExceptionDo: [:exc | self assert: exc messageText equals: 'Assert failed'].
%
category: 'other'
method: TranslateSimpleStatementsTestCase
testTranslateRaise

	| stream x |
	x := (self statementsAt: 20).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'RuntimeError signal.'.
	self 
		should: [stream contents evaluate] 
		raise: RuntimeError.


	x := (self statementsAt: 21).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'RuntimeError signal: (str ___value: ''Something bad happened'') ___value.'.
	self 
		should: [stream contents evaluate] 
		raise: RuntimeError
		withExceptionDo: [:exc | self assert: exc messageText equals: 'Something bad happened'].
	
	" TODO cause "
	x := (self statementsAt: 22).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'RuntimeError signal: (str ___value: ''Something bad happened'') ___value.'.
	self 
		should: [stream contents evaluate] 
		raise: RuntimeError
		withExceptionDo: [:exc | self assert: exc messageText equals: 'Something bad happened'].

	x := (self statementsAt: 23).
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'RuntimeError signal: ((str ___value: ''Something bad happened'') ___value, '' The above exception was the direct cause of the following exception: '', ((RuntimeError new addText: (str ___value: ''Caused by me'')  ___value) describe)).'.
	self 
		should: [stream contents evaluate] 
		raise: RuntimeError
		withExceptionDo: [:exc | self assert: exc messageText equals: 'Something bad happened The above exception was the direct cause of the following exception: a RuntimeError occurred (error 2702), Caused by me'].
%
