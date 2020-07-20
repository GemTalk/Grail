! ------------------- Remove existing behavior from PyAstNode
expectvalue /Metaclass3       
doit
PyAstNode removeAllMethods.
PyAstNode class removeAllMethods.
%
! ------------------- Class methods for PyAstNode
set compile_env: 0
category: 'other'
classmethod: PyAstNode
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
classmethod: PyAstNode
isAbstract

	^self == PyAstNode
%
category: 'other'
classmethod: PyAstNode
new

	self error: 'Use #parent: instead'.
%
category: 'other'
classmethod: PyAstNode
parent: aNode

	(aNode isKindOf: PyAstNode) ifFalse: [self error: 'Not a valid parent!'].
	^self isAbstract ifTrue: [
		| symbol class |
		symbol := ('Py' , (aNode stream upTo: self subclassDelimiter)) asSymbol.
		class := Python at: symbol.
		class parent: aNode
	] ifFalse: [
		self basicNew
			initialize: aNode;
			yourself
	].
%
category: 'other'
classmethod: PyAstNode
subclassDelimiter

	^$(
%
! ------------------- Instance methods for PyAstNode
set compile_env: 0
category: 'initialization'
method: PyAstNode
alias

	| string |
	string := self stream upTo: $(.
	string = 'alias' ifFalse: [self error].
	^PyAlias parent: self.
%
category: 'initialization'
method: PyAstNode
arg
	| string |
	string := self stream upTo: $(.
	string = 'arg' ifFalse: [self error].
	^PyArg parent: self.
%
category: 'initialization'
method: PyAstNode
commaSpace

	| stream |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
	(stream peekFor: Character space) ifFalse: [self error].
%
category: 'initialization'
method: PyAstNode
error

	self error: 'Invalid ' , self class name , ' node: ' , (self stream next: 10) printString.
%
category: 'initialization'
method: PyAstNode
expression

	^PyExpression parent: self
%
category: 'initialization'
method: PyAstNode
initialize

	self subclassResponsibility
%
category: 'initialization'
method: PyAstNode
initialize: aNode

	parent := aNode.
	self initialize.
%
category: 'initialization'
method: PyAstNode
initialize2

	self children do: [:each | each initialize2].
%
category: 'initialization'
method: PyAstNode
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
method: PyAstNode
optionalArg

	| stream |
	stream := parent stream.
	^(stream peekN: 4) = 'None' ifTrue: [
		stream next: 4.
		PyNone singleton.
	] ifFalse: [
		self arg.
	].
%
category: 'initialization'
method: PyAstNode
optionalExpression

	| stream |
	stream := parent stream.
	^(stream peekN: 4) = 'None' ifTrue: [
		stream next: 4.
		PyNone singleton.
	] ifFalse: [
		self expression.
	].
%
category: 'initialization'
method: PyAstNode
readPosition
%
category: 'initialization'
method: PyAstNode
stream

	^parent stream
%
category: 'initialization'
method: PyAstNode
string

	| stream char writeStream next |
	stream := self stream.
	char := stream next.
	(char == $' or: [char == $"]) ifFalse: [self error].
	writeStream := WriteStream on: String new.
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
method: PyAstNode
associationAt: aSymbol 

	^parent associationAt: aSymbol
%
category: 'other'
method: PyAstNode
children

	^Array new
%
category: 'other'
method: PyAstNode
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
method: PyAstNode
globals

	^self module globals
%
category: 'other'
method: PyAstNode
locals

	^self module locals
%
category: 'other'
method: PyAstNode
module

	^parent module
%
category: 'other'
method: PyAstNode
sys

	^parent sys
%
set compile_env: 0
category: 'testing'
method: PyAstNode
isNone

	^false
%
