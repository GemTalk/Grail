! ------------------- Remove existing behavior from TranslateCompoundStatementsTestCase
removeallmethods TranslateCompoundStatementsTestCase
removeallclassmethods TranslateCompoundStatementsTestCase
! ------------------- Class methods for TranslateCompoundStatementsTestCase
! ------------------- Instance methods for TranslateCompoundStatementsTestCase
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateIf

	| pyString ast stream x |
	pyString := 'if True:
	pass'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'(True) __bool__ ___value ifTrue: [
	self yourself.
]'.

	pyString := 'if False:
	pass
else:
	pass'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'(False) __bool__ ___value ifTrue: [
	self yourself.
] ifFalse: [
	self yourself.
]'.
%
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateTryExcept

	| pyString ast stream x |
	pyString := 'try:
    print(1 / 0)
except:
    raise RuntimeError("Something bad happened")'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'[
	(currentScope at: #print) scope: currentScope positional: { ((int ___value: 1) __truediv__: (int ___value: 0)). } named: {}.
] on: Error, Exception do: [
	RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
].'.

	pyString := 'try:
	print(1 / 0)
except ZeroDivisionError:
	raise RuntimeError("Something bad happened")'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'[
	(currentScope at: #print) scope: currentScope positional: { ((int ___value: 1) __truediv__: (int ___value: 0)). } named: {}.
] on: ZeroDivisionError do: [
	RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
].'.

	pyString := 'try:
	print(2 + 2)
except:
	raise RuntimeError("Something bad happened")
finally:
	print(3 * 2)'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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

	pyString := 'try:
	print(2 + 2)
except ZeroDivisionError:
	pass
except:
	raise RuntimeError("Something bad happened")
finally:
	print(3 * 2)'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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

	| pyString ast stream x |
	pyString := 'while True:
	pass'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'[(True) __bool__ ___value] whileTrue: [
	self yourself.
]'
%
