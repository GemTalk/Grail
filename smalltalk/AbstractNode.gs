! ------------------- Remove existing behavior from AbstractNode
removeallmethods AbstractNode
removeallclassmethods AbstractNode
! ------------------- Class methods for AbstractNode
category: 'other'
classmethod: AbstractNode
escapeCharacters

	escapeCharacters ifNil: [
		escapeCharacters := IdentityKeyValueDictionary new
			at: $\		put: 92;
			at: $'		put: 39;
			at: $"		put: 34;
			at: $a		put: 7;
			at: $b		put: 8;
			at: $f		put: 12;
			at: $n		put: 10;
			at: $r		put: 13;
			at: $t		put: 9;
			at: $v		put: 11;
			yourself.
	].
	^escapeCharacters
%
category: 'other'
classmethod: AbstractNode
isAbstract

	^self == AbstractNode
%
category: 'other'
classmethod: AbstractNode
new

	self error: 'Use #parent: instead'.
%
category: 'other'
classmethod: AbstractNode
parent: aNode

	(aNode isKindOf: AbstractNode) ifFalse: [self error: 'Not a valid parent!'].
	^self isAbstract ifTrue: [
		| symbol class |
		symbol := aNode stream peekN: 4.
		symbol = 'None' ifTrue: [
			aNode stream skip: 4.
			^None.
		] ifFalse: [
			symbol := ((aNode stream upTo: self subclassDelimiter) , 'Ast') asSymbol.
		].
		class := Python at: symbol.
		class parent: aNode
	] ifFalse: [
		self basicNew
			initialize: aNode;
			yourself
	].
%
category: 'other'
classmethod: AbstractNode
subclassDelimiter

	^$(
%
! ------------------- Instance methods for AbstractNode
category: 'initialization'
method: AbstractNode
alias

	| string |
	string := self stream upTo: $(.
	string = 'alias' ifFalse: [self error].
	^AliasAst parent: self.
%
category: 'initialization'
method: AbstractNode
arg

	| string |
	string := self stream upTo: $(.
	string = 'arg' ifFalse: [self error].
	^ArgAst parent: self.
%
category: 'initialization'
method: AbstractNode
commaSpace

	| stream temp |
	stream := self stream.
	(temp := stream peekFor: $,) ifFalse: [self error].
	(stream peekFor: Character space) ifFalse: [self error].
%
category: 'initialization'
method: AbstractNode
declareVariable

	parent declareVariable.
%
category: 'initialization'
method: AbstractNode
declareVariable: aSymbol

	parent declareVariable: aSymbol.
%
category: 'initialization'
method: AbstractNode
error

	self error: 'Invalid ' , self class name , ' node: ' , (self stream next: 10) printString.
%
category: 'initialization'
method: AbstractNode
expression

	^ExpressionAst parent: self
%
category: 'initialization'
method: AbstractNode
initialize

	self subclassResponsibility
%
category: 'initialization'
method: AbstractNode
initialize: aNode

	parent := aNode.
	self initialize.
%
category: 'initialization'
method: AbstractNode
interpretEscapeSequence: aStream
	"answers a Character"

	| char |
	char := aStream next.
	(char == $x) ifTrue: [
		^Character codePoint: ('16r', (aStream next: 2)) asInteger
	].
	^Character codePoint: (self class escapeCharacters at: char)
%
category: 'initialization'
method: AbstractNode
isVariableIsDeclared: aSymbol

	^parent isVariableIsDeclared: aSymbol.
%
category: 'initialization'
method: AbstractNode
optionalArg

	| stream temp |
	stream := parent stream.
	^(temp := stream peekN: 4) = 'None' ifTrue: [
		stream next: 4.
		None
	] ifFalse: [
		self arg.
	].
%
category: 'initialization'
method: AbstractNode
optionalExpression

	| stream |
	stream := parent stream.
	^(stream peekN: 4) = 'None' ifTrue: [
		stream next: 4.
		None.
	] ifFalse: [
		self expression.
	].
%
category: 'initialization'
method: AbstractNode
optionalString

	| stream |
	stream := parent stream.
	^(stream peekN: 4) = 'None' ifTrue: [
		stream next: 4.
		None.
	] ifFalse: [
		self string.
	].
%
category: 'initialization'
method: AbstractNode
readPosition
%
category: 'initialization'
method: AbstractNode
stream

	^parent stream
%
category: 'initialization'
method: AbstractNode
string

	| stream char writeStream next |
	stream := self stream.
	stream peekFor: $b. "TODO: deal with byte literal"
	char := stream next.
	(char == $' or: [char == $"]) ifFalse: [self error].
	writeStream := WriteStream on: Unicode7 new.
	[
		next := stream next.
		next == char
	] whileFalse: [
		next == $\ ifTrue: [
			next := self interpretEscapeSequence: stream.
		].
		writeStream nextPut: next.
	].
	^writeStream contents
%
category: 'other'
method: AbstractNode
collectAst: aBlock

	| result stream char |
	stream := self stream.
	stream peekFor: Character space.
	char := stream peek.
	(stream peekFor: $[) ifFalse: [self error].
	result := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		result add: aBlock value.
		(stream peekFor: $,) ifTrue: [stream skipSeparators].
	].
	^result
%
category: 'other'
method: AbstractNode
globals

	^self module globals
%
category: 'other'
method: AbstractNode
locals

	^parent locals
%
category: 'other'
method: AbstractNode
messagePrecedence

	^0
%
category: 'other'
method: AbstractNode
module

	^parent module
%
category: 'other'
method: AbstractNode
number

	| stream string x num |
	stream := self stream.
	string := stream upTo: $,.
	stream skip: -1.
	(string notEmpty and: [string last == $j]) ifTrue: [
		num := complex ___real: 0 imaginary: (string copyFrom: 1 to: string size - 1) asNumber.
	] ifFalse: [
		num := string asNumber.
		"num := (x isKindOf: Integer)
			ifTrue: [int with: x]
			ifFalse: [float with: x]."
	].
	^num
%
category: 'other'
method: AbstractNode
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $-;
		nextPutAll: self module name;
		yourself.
%
category: 'other'
method: AbstractNode
printSmalltalkOn: aStream

	self subclassResponsibility.
%
category: 'other'
method: AbstractNode
setBlock: aBlock
%
category: 'other'
method: AbstractNode
smalltalkSourceFor: aNode parenthesisIf: anInteger on: aStream

	| flag |
	flag := aNode messagePrecedence >= anInteger.
	aStream nextPutAll: ''.
	flag ifTrue: [aStream nextPut: $(].
	aNode printSmalltalkOn: aStream.
	flag ifTrue: [aStream nextPut: $)].
%
category: 'testing'
method: AbstractNode
isInClass

	^parent isInClass
%
category: 'testing'
method: AbstractNode
isNone

	^false
%
