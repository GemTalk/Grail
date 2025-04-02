! ------------------- Remove existing behavior from TranslateCompoundStatementsTestCase
removeallmethods TranslateCompoundStatementsTestCase
removeallclassmethods TranslateCompoundStatementsTestCase
! ------------------- Class methods for TranslateCompoundStatementsTestCase
category: 'other'
classmethod: TranslateCompoundStatementsTestCase
filename

	^'CompoundStatements.py'
%
! ------------------- Instance methods for TranslateCompoundStatementsTestCase
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateFor

	| stream x |
	x := self statementsAt: 5.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'((currentScope at: #range) scope: currentScope positional: { (int ___value: 10). } named: {}) ___value do: [:i |
	currentScope at: #_ put: i.
	self yourself.
]'
%
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateIf

	| stream x |
	x := self statementsAt: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'(True) ___value ifTrue: [
	self yourself.
]'.

	x := self statementsAt: 2.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'(False) ___value ifTrue: [
	self yourself.
] ifFalse: [
	self yourself.
]'.
%
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateTryExcept

	| stream x |
	x := self statementsAt: 7.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'[
	(currentScope at: #print) scope: currentScope positional: { ((int ___value: 1) __truediv__: (int ___value: 0)). } named: {}.
] on: Error, Exception do: [
	RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
].'.

	x := self statementsAt: 8.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'[
	(currentScope at: #print) scope: currentScope positional: { ((int ___value: 1) __truediv__: (int ___value: 0)). } named: {}.
] on: ZeroDivisionError do: [
	RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
].'.

	x := self statementsAt: 9.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'[
	[
		(currentScope at: #print) scope: currentScope positional: { ((int ___value: 2) __add__: (int ___value: 2)). } named: {}.
	] on: Error, Exception do: [
		RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
	]
] ensure: [
	(currentScope at: #print) scope: currentScope positional: { ((int ___value: 3) __mul__: (int ___value: 2)). } named: {}.
].'.

	x := self statementsAt: 10.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'[
	[
		[
			(currentScope at: #print) scope: currentScope positional: { ((int ___value: 2) __add__: (int ___value: 2)). } named: {}.
		] on: ZeroDivisionError do: [
			self yourself.
		]
	] on: Error, Exception do: [
		RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
	]
] ensure: [
	(currentScope at: #print) scope: currentScope positional: { ((int ___value: 3) __mul__: (int ___value: 2)). } named: {}.
].'
%
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateWhile

	| stream x |
	x := self statementsAt: 3.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'[True] whileTrue: [
	self yourself.
].'
%
