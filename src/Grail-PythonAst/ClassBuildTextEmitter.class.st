"The TEXT backend of ClassBuildEmitter: writes a class statement's build as
the Smalltalk source it has always been, onto the codegen stream (normally a
PrettyWriteStream, whose line-start indentation and position map are why the
writes happen in order and in the same pieces: a linefeed is always its own
``lf'', and a string literal is always ONE nextPutAll:, so an embedded newline
in a method source is never indented -- see ClassDefAst >>
printQuotedString:on:).

Every spelling here is the one ClassDefAst wrote inline before the interface
existed; the contract is that the generated text does not change by a byte.
Names written into symbols and literal arrays are Python identifiers and are
written raw, as they were; only ``string:'' doubles quotes."
Class {
	#name : 'ClassBuildTextEmitter',
	#superclass : 'ClassBuildEmitter',
	#instVars : [
		'stream',
		'opens'
	],
	#category : 'Grail-Parser'
}

{ #category : 'instance creation' }
ClassBuildTextEmitter class >> on: aStream [

	^ self new ___setStream___: aStream

]

{ #category : 'Grail-private' }
ClassBuildTextEmitter >> ___close___: aKind [
	"Pop the innermost open construct, refusing one of another kind."

	(opens isEmpty or: [opens last ~~ aKind]) ifTrue: [
		^ self error: 'ClassBuildTextEmitter: close of ' , aKind printString
			, ' with ' , opens asArray printString , ' open'].
	opens removeLast

]

{ #category : 'Grail-private' }
ClassBuildTextEmitter >> ___envPrefix___: anEnvOrNil [

	anEnvOrNil isNil ifFalse: [
		stream nextPutAll: '@env'; nextPutAll: anEnvOrNil printString; nextPut: $:]

]

{ #category : 'Grail-private' }
ClassBuildTextEmitter >> ___message___: aSelector env: anEnvOrNil with: argBlocks [
	"`` [@envN:]kw1: a1 kw2: a2'' (or `` sel'', `` + a''), after a receiver."

	| sel keywords |
	sel := aSelector asString.
	stream space.
	argBlocks isEmpty ifTrue: [
		self ___envPrefix___: anEnvOrNil.
		^ stream nextPutAll: sel].
	(sel first isLetter or: [sel first == $_]) ifFalse: [
		"A binary selector takes no environment prefix in any spelling used here."
		stream nextPutAll: sel; space.
		^ (argBlocks at: 1) value].
	keywords := ((sel subStrings: ':') reject: [:k | k isEmpty]) collect: [:k | k , ':'].
	keywords size = argBlocks size ifFalse: [
		^ self error: 'ClassBuildTextEmitter: ' , sel , ' given '
			, argBlocks size printString , ' arguments'].
	keywords doWithIndex: [:kw :i |
		i = 1
			ifTrue: [self ___envPrefix___: anEnvOrNil]
			ifFalse: [stream space].
		stream nextPutAll: kw; space.
		(argBlocks at: i) value]

]

{ #category : 'Grail-private' }
ClassBuildTextEmitter >> ___setStream___: aStream [

	stream := aStream.
	opens := OrderedCollection new

]

{ #category : 'Grail-structure' }
ClassBuildTextEmitter >> assertDepth: anInteger [

	opens size = anInteger ifFalse: [
		^ self error: 'ClassBuildTextEmitter: ' , opens asArray printString
			, ' open where ' , anInteger printString , ' were expected']

]

{ #category : 'Grail-expressions' }
ClassBuildTextEmitter >> assign: aName from: aBlock [

	stream nextPutAll: aName; nextPutAll: ' := '.
	aBlock value

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> boolean: aBoolean [

	stream nextPutAll: aBoolean printString

]

{ #category : 'Grail-expressions' }
ClassBuildTextEmitter >> braceArray: elementBlocks [

	stream nextPutAll: '{ '.
	elementBlocks do: [:each | each value] separatedBy: [stream nextPutAll: '. '].
	stream nextPutAll: ' }'

]

{ #category : 'Grail-expressions' }
ClassBuildTextEmitter >> cascadeTo: rcvrBlock sends: specs [

	rcvrBlock value.
	specs
		do: [:spec | self ___message___: (spec at: 1) env: (spec at: 3) with: (spec at: 2)]
		separatedBy: [stream nextPut: $;]

]

{ #category : 'Grail-structure' }
ClassBuildTextEmitter >> closeIfTrue [

	self ___close___: #ifTrue.
	stream nextPutAll: '].'; lf

]

{ #category : 'Grail-structure' }
ClassBuildTextEmitter >> closeValueBlock [

	self ___close___: #valueBlock.
	stream nextPutAll: '] @env0:value.'; lf

]

{ #category : 'Grail-structure' }
ClassBuildTextEmitter >> closeValueBlockLine [

	self ___close___: #valueBlockLine.
	stream nextPutAll: ' ] @env0:value.'; lf

]

{ #category : 'Grail-expressions' }
ClassBuildTextEmitter >> compactBraceArray: elementBlocks [

	stream nextPut: ${.
	elementBlocks do: [:each | each value] separatedBy: [stream nextPutAll: '. '].
	stream nextPut: $}

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> compactStringArray: strings [

	stream nextPutAll: '#('.
	strings do: [:s | stream nextPut: $'; nextPutAll: s asString; nextPutAll: ''' '].
	stream nextPut: $)

]

{ #category : 'Grail-statements' }
ClassBuildTextEmitter >> curPos: aLine [

	stream nextPutAll: '___curPos___ := '; nextPutAll: aLine printString; nextPutAll: '.'; lf

]

{ #category : 'Grail-structure' }
ClassBuildTextEmitter >> depth [

	^ opens size

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> emptyArray [

	stream nextPutAll: '#()'

]

{ #category : 'Grail-children' }
ClassBuildTextEmitter >> expressionNode: anAst [

	anAst printSmalltalkOn: stream

]

{ #category : 'Grail-statements' }
ClassBuildTextEmitter >> ifTrue: condBlock inline: bodyBlock [

	condBlock value.
	stream nextPutAll: ' ifTrue: ['.
	bodyBlock value.
	stream nextPutAll: '].'; lf

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> integer: anInteger [

	stream nextPutAll: anInteger printString

]

{ #category : 'Grail-children' }
ClassBuildTextEmitter >> mapDecorator: aNode of: anOwner do: aBlock [

	^ anOwner ___mapDecorator___: aNode on: stream do: aBlock

]

{ #category : 'Grail-layout' }
ClassBuildTextEmitter >> newline [

	stream lf

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> nilLiteral [

	stream nextPutAll: 'nil'

]

{ #category : 'Grail-structure' }
ClassBuildTextEmitter >> openIfTrue: condBlock [

	condBlock value.
	stream nextPutAll: ' ifTrue: ['; lf.
	opens addLast: #ifTrue

]

{ #category : 'Grail-structure' }
ClassBuildTextEmitter >> openValueBlock: tempNames [

	stream nextPutAll: '[| '.
	tempNames do: [:each | stream nextPutAll: each asString; nextPutAll: ' '].
	stream nextPutAll: '| '.
	opens addLast: #valueBlock

]

{ #category : 'Grail-structure' }
ClassBuildTextEmitter >> openValueBlockLine: tempNames [

	stream nextPutAll: '[ | '.
	tempNames do: [:each | stream nextPutAll: each asString] separatedBy: [stream space].
	stream nextPutAll: ' |'; lf.
	opens addLast: #valueBlockLine

]

{ #category : 'Grail-expressions' }
ClassBuildTextEmitter >> paren: aBlock [

	stream nextPut: $(.
	aBlock value.
	stream nextPut: $)

]

{ #category : 'Grail-children' }
ClassBuildTextEmitter >> parenthesizedNode: anAst [

	anAst printSmalltalkWithParenthesisOn: stream

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> plainSymbol: aString [
	stream nextPut: $#; nextPutAll: aString asString

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> quotedSymbolArray: names [

	stream nextPutAll: '#('.
	names do: [:n | stream nextPutAll: ' #'''; nextPutAll: n asString; nextPut: $'].
	stream nextPutAll: ' )'

]

{ #category : 'Grail-expressions' }
ClassBuildTextEmitter >> send: aSelector env: anEnvOrNil to: rcvrBlock [

	rcvrBlock value.
	self ___message___: aSelector env: anEnvOrNil with: #()

]

{ #category : 'Grail-expressions' }
ClassBuildTextEmitter >> send: aSelector env: anEnvOrNil to: rcvrBlock with: argBlocks [

	rcvrBlock value.
	self ___message___: aSelector env: anEnvOrNil with: argBlocks

]

{ #category : 'Grail-layout' }
ClassBuildTextEmitter >> space [

	stream space

]

{ #category : 'Grail-statements' }
ClassBuildTextEmitter >> statement: aBlock [

	aBlock value.
	stream nextPut: $.; lf

]

{ #category : 'Grail-children' }
ClassBuildTextEmitter >> statementNode: anAst [

	anAst printSmalltalkOn: stream

]

{ #category : 'Grail-statements' }
ClassBuildTextEmitter >> statementWithoutNewline: aBlock [

	aBlock value.
	stream nextPut: $.

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> string: aString [
	"Built in a local buffer and written with ONE nextPutAll:, so a newline
	inside the literal is never indented by the PrettyWriteStream."

	| buf |
	buf := WriteStream on: (Unicode7 new: aString size + 2).
	buf nextPut: $'.
	aString do: [:c |
		c = $'
			ifTrue: [buf nextPut: $'; nextPut: $']
			ifFalse: [buf nextPut: c]].
	buf nextPut: $'.
	stream nextPutAll: buf contents

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> stringArray: strings [

	stream nextPutAll: '#('.
	strings do: [:s | stream space; nextPut: $'; nextPutAll: s asString; nextPut: $'].
	stream nextPutAll: ' )'

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> symbol: aString [

	stream nextPutAll: '#'''; nextPutAll: aString asString; nextPut: $'

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> symbolArray: names [
	"``#( a b )''.  A bare ``_'' inside a literal array is the legacy
	assignment token to the Smalltalk parser (``unexpected token''), and a
	class that assigns ``self._ = self.t.gettext'' (test_gettext) infers
	exactly that name; all-underscore names are quoted, every other spelling
	is written bare."

	stream nextPutAll: '#('.
	names do: [:n | | str |
		str := n asString.
		stream space.
		(str allSatisfy: [:c | c == $_])
			ifTrue: [stream nextPutAll: '#'''; nextPutAll: str; nextPut: $']
			ifFalse: [stream nextPutAll: str]].
	stream nextPutAll: ' )'

]

{ #category : 'Grail-literals' }
ClassBuildTextEmitter >> symbolPairArray: pairs [
	"The shape object class >> ___grailApplyDeclaredRenames___:assigning: reads
	a __renamed__ declaration in."

	stream nextPutAll: '#('.
	pairs do: [:p | stream space. self symbolArray: p].
	stream nextPutAll: ' )'

]

{ #category : 'Grail-children' }
ClassBuildTextEmitter >> unrouted: aOneArgBlock [

	^ aOneArgBlock value: stream

]

{ #category : 'Grail-expressions' }
ClassBuildTextEmitter >> var: aName [

	stream nextPutAll: aName asString

]
