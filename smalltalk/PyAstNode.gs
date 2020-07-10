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
customChildForParent: aNode peekForCloseParenthesis: aBoolean
	"Lookup child by name"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	aBoolean ifTrue: [(aNode stream peekFor: $)) ifFalse: [self error]].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
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
new

	self error: 'Use #parent: instead'.
%
category: 'other'
classmethod: PyAstNode
parent: aNode

	(aNode isKindOf: PyAstNode) ifFalse: [self error: 'Not a valid parent!'].
	^self basicNew
		initialize: aNode;
		yourself
%
! ------------------- Instance methods for PyAstNode
set compile_env: 0
category: 'builtins'
method: PyAstNode
globals

	^self module globals
%
set compile_env: 0
category: 'other'
method: PyAstNode
addMissingPositions
"
	| token |
	token := self stream peek.
	line ifNil: [token halt].
	[
		token line < line or: [token line == line and: [token column <= column]].
	] whileTrue: [
		token := self stream next; peek.
	]."
%
category: 'other'
method: PyAstNode
alias

	| string |
	string := self stream upTo: $(.
	string = 'alias' ifFalse: [self error].
	^PyAlias parent: self.
%
category: 'other'
method: PyAstNode
arg
	| string |
	string := self stream upTo: $(.
	string = 'arg' ifFalse: [self error].
	^PyArg parent: self.
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
commaSpace

	| stream |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
	(stream peekFor: Character space) ifFalse: [self error].
%
category: 'other'
method: PyAstNode
error

	self error: 'Invalid ' , self class name , ' node: ' , (self stream next: 10) printString.
%
category: 'other'
method: PyAstNode
expression

	^PyExpression expressionFrom: self
%
category: 'other'
method: PyAstNode
initialize

	self subclassResponsibility
%
category: 'other'
method: PyAstNode
initialize: aNode

	parent := aNode.
	self initialize.
%
category: 'other'
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
category: 'other'
method: PyAstNode
module

	^parent module
%
category: 'other'
method: PyAstNode
optionalExpression

	| stream string position |
	stream := self stream.
	position := stream position.
	string := stream next: 4.
	string = 'None' ifTrue: [^nil].
	stream position: position.
	^self expression.
%
category: 'other'
method: PyAstNode
readPosition
"
	| stream string |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
	(string := stream upTo: $=) = ' lineno' ifFalse: [self error].
	line := (stream upTo: $,) asNumber.
	(string := stream upTo: $=) = ' col_offset' ifFalse: [self error].
	column := (stream upTo: $)) asNumber.
"
%
category: 'other'
method: PyAstNode
stream

	^parent stream
%
category: 'other'
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
category: 'other'
method: PyAstNode
suite

	| stream suite node |
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	suite := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		node := PyStatement statementFrom: self.
		suite add: node.
		(stream peekFor: $,) ifTrue: [stream peekFor: Character space].
	].
	^suite
%
category: 'other'
method: PyAstNode
sys

	^parent sys
%
category: 'other'
method: PyAstNode
variableAt: aName 
	^parent variableAt: aName
%
category: 'other'
method: PyAstNode
variableAt: aTarget put: aValue
	^parent variableAt: aTarget put: aValue
%
