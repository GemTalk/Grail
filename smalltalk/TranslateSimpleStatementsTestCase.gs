! ------------------- Remove existing behavior from TranslateSimpleStatementsTestCase
removeallmethods TranslateSimpleStatementsTestCase
removeallclassmethods TranslateSimpleStatementsTestCase
! ------------------- Class methods for TranslateSimpleStatementsTestCase
! ------------------- Instance methods for TranslateSimpleStatementsTestCase
category: 'other'
method: TranslateSimpleStatementsTestCase
testTranslateAssert

	| pyString ast stream x |
	pyString := 'assert True'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: '(True) ___value ifFalse: [AssertionError signal].'.
	self assert: stream contents evaluate equals: nil.

	pyString := 'assert False'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: '(False) ___value ifFalse: [AssertionError signal].'.
	self should: [stream contents evaluate] raise: AssertionError.

	pyString := 'assert False, "Assert failed"'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: '(False) ___value ifFalse: [AssertionError signal: (str ___value: ''Assert failed'') ___value].'.
	self
		should: [stream contents evaluate]
		raise: AssertionError
		withExceptionDo: [:exc | self assert: exc messageText equals: 'Assert failed'].
%
category: 'other'
method: TranslateSimpleStatementsTestCase
testTranslateRaise

	| pyString ast stream x |
	pyString := 'raise RuntimeError'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'RuntimeError signal'.
	self
		should: [stream contents evaluate]
		raise: RuntimeError.


	pyString := 'raise RuntimeError("Something bad happened")'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'RuntimeError signal: (str ___value: ''Something bad happened'') ___value'.
	self
		should: [stream contents evaluate]
		raise: RuntimeError
		withExceptionDo: [:exc | self assert: exc messageText equals: 'Something bad happened'].

	" TODO cause "
	pyString := 'raise RuntimeError("Something bad happened") from None'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'RuntimeError signal: (str ___value: ''Something bad happened'') ___value'.
	self
		should: [stream contents evaluate]
		raise: RuntimeError
		withExceptionDo: [:exc | self assert: exc messageText equals: 'Something bad happened'].

	pyString := 'raise RuntimeError("Something bad happened") from RuntimeError("Caused by me")'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'RuntimeError signal: ((str ___value: ''Something bad happened'') ___value, '' The above exception was the direct cause of the following exception: '', ((RuntimeError new addText: (str ___value: ''Caused by me'')  ___value) describe))'.
	self
		should: [stream contents evaluate]
		raise: RuntimeError
		withExceptionDo: [:exc | self assert: exc messageText equals: 'Something bad happened The above exception was the direct cause of the following exception: a RuntimeError occurred (error 2702), Caused by me'].
%
