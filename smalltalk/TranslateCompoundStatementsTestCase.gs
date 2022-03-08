! ------------------- Remove existing behavior from TranslateCompoundStatementsTestCase
removeAllMethods TranslateCompoundStatementsTestCase
removeAllClassMethods TranslateCompoundStatementsTestCase
! ------------------- Class methods for TranslateCompoundStatementsTestCase
set compile_env: 0
category: 'other'
classmethod: TranslateCompoundStatementsTestCase
filename

	^'CompoundStatements.py'
%
! ------------------- Instance methods for TranslateCompoundStatementsTestCase
set compile_env: 0
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateFor

	| stream x |
	x := self statementsAt: 5.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'(range value: { (int ___value: 10). } value: Dictionary new) ___value do: [ :i |

].'
%
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateIf

	| stream x |
	x := self statementsAt: 1.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'True ___value ifTrue: [

].
'.

	x := self statementsAt: 2.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'False ___value ifTrue: [

] ifFalse: [

].
'.
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
	print value: { ((int ___value: 1) __truediv__: (int ___value: 0)). } value: Dictionary new
] on: Exception do: [
	RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
].'.

	x := self statementsAt: 8.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'[
	print value: { ((int ___value: 1) __truediv__: (int ___value: 0)). } value: Dictionary new
] on: ZeroDivisionError do: [
	RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
].'.

	x := self statementsAt: 9.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'[
	[
		print value: { ((int ___value: 2) __add__: (int ___value: 2)). } value: Dictionary new
	] on: Exception do: [
		RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
	]
] ensure: [
	print value: { ((int ___value: 3) __mul__: (int ___value: 2)). } value: Dictionary new
].'.

	x := self statementsAt: 10.
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals:
'[
	[
		[
			print value: { ((int ___value: 2) __add__: (int ___value: 2)). } value: Dictionary new
		] on: ZeroDivisionError do: [

		]
	] on: Exception do: [
		RuntimeError signal: (str ___value: ''Something bad happened'') ___value.
	]
] ensure: [
	print value: { ((int ___value: 3) __mul__: (int ___value: 2)). } value: Dictionary new
].'
%
category: 'other'
method: TranslateCompoundStatementsTestCase
testTranslateWhile

	| stream x |
	x := self statementsAt: 3.
	stream := WriteStream on: String new.
	x printSmalltalkOn: stream.
%
