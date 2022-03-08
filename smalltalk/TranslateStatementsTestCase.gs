! ------------------- Remove existing behavior from TranslateStatementsTestCase
removeAllMethods TranslateStatementsTestCase
removeAllClassMethods TranslateStatementsTestCase
! ------------------- Class methods for TranslateStatementsTestCase
set compile_env: 0
category: 'other'
classmethod: TranslateStatementsTestCase
filename

	^'Statements.py'
%
! ------------------- Instance methods for TranslateStatementsTestCase
set compile_env: 0
category: 'other'
method: TranslateStatementsTestCase
testTranslateIf
"
if (True):
    print(0, end='')
"
	| stream x |
	x := (self statementsAt: 2).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'True ___value ifTrue: [
	print value: { (int ___value: 0). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
].
'
%
category: 'other'
method: TranslateStatementsTestCase
testTranslateIfElifElse
"
if (False):
    print(5, end=' ')
elif (True):
    print(6, end=' ')
else:
    print(7, end=' ')

if (False):
    print(8, end=' ')
elif (False):
    print(9, end=' ')
else:
    print(10, end=' ')

"
	| stream x |
	x := (self statementsAt: 5).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'False ___value ifTrue: [
	print value: { (int ___value: 5). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
] ifFalse: [
	True ___value ifTrue: [
		print value: { (int ___value: 6). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
	] ifFalse: [
		print value: { (int ___value: 7). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
	].

].
'.

	x := (self statementsAt: 6).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'False ___value ifTrue: [
	print value: { (int ___value: 8). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
] ifFalse: [
	False ___value ifTrue: [
		print value: { (int ___value: 9). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
	] ifFalse: [
		print value: { (int ___value: 10). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
	].

].
'
%
category: 'other'
method: TranslateStatementsTestCase
testTranslateIfElse
"
if (True):
    print(1, end='')
else:
    print(2, end='')

if (False):
    print(3, end=' ')
else:
    print(4, end=' ')

"
	| stream x |
	x := (self statementsAt: 3).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'True ___value ifTrue: [
	print value: { (int ___value: 1). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
] ifFalse: [
	print value: { (int ___value: 2). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
].
'.

	x := (self statementsAt: 4).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 
'False ___value ifTrue: [
	print value: { (int ___value: 3). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
] ifFalse: [
	print value: { (int ___value: 4). } value: (Dictionary new at: #''end'' put: (str ___value: '' ''); yourself).
].
'.
%
category: 'other'
method: TranslateStatementsTestCase
testTranslatePrint

	| stream x |
	x := (self statementsAt: 1).
	stream := PrettyWriteStream on: String new.
	x printSmalltalkOn: stream.

	self assert: stream contents equals: 'print value: { (str ___value: ''Hello world''). } value: Dictionary new'.
%
