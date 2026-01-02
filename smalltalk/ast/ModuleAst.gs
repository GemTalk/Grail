! ------------------- Remove existing behavior from ModuleAst
removeallmethods ModuleAst
removeallclassmethods ModuleAst
set compile_env: 0
! ------------------- Class methods for ModuleAst
! ------------------- Instance methods for ModuleAst
category: 'accessors'
method: ModuleAst
module

	^self
%
category: 'accessors'
method: ModuleAst
name

	^name
%

category: 'accessors'
method: ModuleAst
name: aString

	name := aString
%

category: 'accessors'
method: ModuleAst
path

	^path
%

category: 'accessors'
method: ModuleAst
path: aString

	path := aString
%
category: 'accessors'
method: ModuleAst
setBlock: aBlockAst

	body := aBlockAst.
%
category: 'accessors'
method: ModuleAst
source

	^source
%

category: 'accessors'
method: ModuleAst
source: aString

	source := aString
%
category: 'accessors'
method: ModuleAst
stream

	stream skipSeparators.
	^stream
%
category: 'code generation'
method: ModuleAst
printSmalltalkOn: aStream

	body printSmalltalkOn: aStream.
%
category: 'parse'
method: ModuleAst
initialize: aStream
	"Initialize with an AST stream. Saves the stream and calls initialize."

	stream := aStream.
	self initialize
%

category: 'parse'
method: ModuleAst
initialize
	"Module(body=[...], type_ignores=[...])"

	| string |
	string := stream upTo: $(.
	string = 'Module' ifFalse: [self error].
	BlockAst parent: self.
	self commaSpace.
	type_ignore := self collectAst: [StatementAst statementFrom: self].
	(stream peekFor: $)) ifFalse: [self error].
	string := stream upToEnd trimSeparators.
	string isEmpty ifFalse: [SyntaxError signal: 'Unexpected text at end of AST: ' , string printString].
%
category: 'querying'
method: ModuleAst
isInClass

	^false
%
category: 'querying'
method: ModuleAst
isPackage

	^false
%
category: 'variables'
method: ModuleAst
globals

	^body
%
category: 'variables'
method: ModuleAst
locals

	^body
%
category: 'variables'
method: ModuleAst
set: aSymbol to: anObject

	self halt.
%
