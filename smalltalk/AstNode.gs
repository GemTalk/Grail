! ------------------- Remove existing behavior from AstNode
expectvalue /Metaclass3       
doit
AstNode removeAllMethods.
AstNode class removeAllMethods.
%
! ------------------- Class methods for AstNode
set compile_env: 0
category: 'other'
classmethod: AstNode
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
	^ escapeCharacters
%
category: 'other'
classmethod: AstNode
isAbstract

	^self == AstNode
%
category: 'other'
classmethod: AstNode
new

	self error: 'Use #parent: instead'.
%
category: 'other'
classmethod: AstNode
parent: aNode

	(aNode isKindOf: AstNode) ifFalse: [self error: 'Not a valid parent!'].
	^self isAbstract ifTrue: [
		| symbol class |
		symbol := ((aNode stream upTo: self subclassDelimiter) , 'Ast') asSymbol.
		class := Python at: symbol.
		class parent: aNode
	] ifFalse: [
		self basicNew
			initialize: aNode;
			yourself
	].
%
category: 'other'
classmethod: AstNode
subclassDelimiter

	^$(
%
! ------------------- Instance methods for AstNode
set compile_env: 0
category: 'initialization'
method: AstNode
alias

	| string |
	string := self stream upTo: $(.
	string = 'alias' ifFalse: [self error].
	^AliasAst parent: self.
%
category: 'initialization'
method: AstNode
arg
	| string |
	string := self stream upTo: $(.
	string = 'arg' ifFalse: [self error].
	^ArgAst parent: self.
%
category: 'initialization'
method: AstNode
commaSpace

	| stream |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
	(stream peekFor: Character space) ifFalse: [self error].
%
category: 'initialization'
method: AstNode
error

	self error: 'Invalid ' , self class name , ' node: ' , (self stream next: 10) printString.
%
category: 'initialization'
method: AstNode
expression

	^ExpressionAst parent: self
%
category: 'initialization'
method: AstNode
initialize

	self subclassResponsibility
%
category: 'initialization'
method: AstNode
initialize: aNode

	parent := aNode.
	self initialize.
%
category: 'initialization'
method: AstNode
initialize2

	self children do: [:each | each initialize2].
%
category: 'initialization'
method: AstNode
interpretEscapeSequence: aStream

	| aSymbol | 
	aSymbol := aStream next.
	"it seems Python AST never dumps octal values, so this case is useless" 
	(aSymbol = $o) ifTrue: [
		^ aSymbol asString, (aStream next: 2)
	].
	(aSymbol = $x) ifTrue: [
		^ (Character withValue: ('16r', (aStream next: 2)) asInteger) asString
	].
	^ (Character withValue: (self class escapeCharacters at: aSymbol)) asString.
%
category: 'initialization'
method: AstNode
optionalArg

	| stream |
	stream := parent stream.
	^(stream peekN: 4) = 'None' ifTrue: [
		stream next: 4.
		NoneAst singleton.
	] ifFalse: [
		self arg.
	].
%
category: 'initialization'
method: AstNode
optionalExpression

	| stream |
	stream := parent stream.
	^(stream peekN: 4) = 'None' ifTrue: [
		stream next: 4.
		NoneAst singleton.
	] ifFalse: [
		self expression.
	].
%
category: 'initialization'
method: AstNode
readPosition
%
category: 'initialization'
method: AstNode
stream

	^parent stream
%
category: 'initialization'
method: AstNode
string

	| stream char writeStream next |
	stream := self stream.
	char := stream next.
	(char == $' or: [char == $"]) ifFalse: [self error].
	writeStream := WriteStream on: PyString new.
	[ 
		stream peekFor: char.
	] whileFalse: [
		next := stream next asString.
		(next = '\') ifTrue: [
			next := self interpretEscapeSequence: stream.  
		].
		writeStream nextPutAll: next.
	].
	^ writeStream contents
%
set compile_env: 0
category: 'other'
method: AstNode
associationForArgument: aSymbol 

	^parent associationForArgument: aSymbol
%
category: 'other'
method: AstNode
associationForReadAt: aSymbol 

	^parent associationForReadAt: aSymbol
%
category: 'other'
method: AstNode
associationForWriteAt: aSymbol 

	^parent associationForWriteAt: aSymbol
%
category: 'other'
method: AstNode
children

	^Array new
%
category: 'other'
method: AstNode
collectAst: aBlock

	| list stream char |
	stream := self stream.
	stream peekFor: Character space.
	char := stream peek.
	(stream peekFor: $[) ifFalse: [self error].
	list := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		list add: aBlock value.
		(stream peekFor: $,) ifTrue: [stream skipSeparators].
	].
	^list
%
category: 'other'
method: AstNode
globals

	^self module globals
%
category: 'other'
method: AstNode
locals

	^self module locals
%
category: 'other'
method: AstNode
module

	^parent module
%
category: 'other'
method: AstNode
sys

	^parent sys
%
set compile_env: 0
category: 'testing'
method: AstNode
isInClass

	^parent isInClass
%
category: 'testing'
method: AstNode
isNone

	^false
%
