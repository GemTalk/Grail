! ------------------- Remove existing behavior from ModuleAst
removeallmethods ModuleAst
removeallclassmethods ModuleAst
! ------------------- Class methods for ModuleAst
category: 'other'
classmethod: ModuleAst
astForPath: pathString

	| file path string |
	path := '/tmp/grail.ast'.
	pprintast ifNil: [self error: 'Please run `ModuleAst pprintast: aPathString`!'].
	System performOnServer: pprintast , ' -a -t ' , pathString , ' > ' , path.
	file := GsFile open: path mode: 'rb' onClient: false.
	string := file contentsAsUtf8 decodeToUnicode.
	GsFile removeServerFile: path.
	^string
%
category: 'other'
classmethod: ModuleAst
astForSource: aString
"
ModuleAst astForSource: '1 == 1'.
"
	| file pathPy pathAst string |
	pathPy := '/tmp/grail.py'.
	pathAst := '/tmp/grail.ast'.
	file := GsFile open: pathPy mode: 'w' onClient: false.
	file nextPutAll: aString.
	file close.
	pprintast ifNil: [self error: 'Please run `ModuleAst pprintast: aPathString`!'].
	System performOnServer: pprintast , ' -a -t ' , pathPy , ' > ' , pathAst.
	file := GsFile open: pathAst mode: 'rb' onClient: false.
	string := file contentsAsUtf8 decodeToUnicode.
	GsFile removeServerFile: pathAst. 
	GsFile removeServerFile: pathPy.
	^string
%
category: 'other'
classmethod: ModuleAst
evaluate: aString
"
ModuleAst script: '1 == 1'.
"
	| file path module stream |
	path := '/tmp/grail.py'.
	file := GsFile open: path mode: 'w' onClient: false.
	file nextPutAll: aString.
	module := self script: path.
	GsFile removeServerFile: path.
	stream := PrettyWriteStream on: String new.
	module printSmalltalkOn: stream.
	^stream contents evaluate
%
category: 'other'
classmethod: ModuleAst
pprintast: aString
"
	ModuleAst pprintast: '/Users/jfoster/.venv/bin/pprintast'.
"
	pprintast := aString.
%
category: 'other'
classmethod: ModuleAst
script: aString
"
ModuleAst script: '$HOME/code/Python/performance/pyperformance'.
"
	^self script: aString as: '__main__'
%
category: 'other'
classmethod: ModuleAst
script: pathString as: nameString

	^self basicNew
		initialize;
		load: pathString as: nameString;
		yourself
%
category: 'other'
classmethod: ModuleAst
smalltalkForModulePath: aString
"
ModuleAst smalltalkForModulePath: '/Users/jfoster/code/Python/Grail/tests/hello.py'.
"
	| module stream |
	module := self script: aString.
	stream := PrettyWriteStream on: String new.
	module printSmalltalkOn: stream.
	^stream contents
%
category: 'other'
classmethod: ModuleAst
smalltalkForSource: aString
"
ModuleAst smalltalkForSource: '1 == 1'.
"
	| file module pathPy stream |
	pathPy := '/tmp/grail.py'.
	file := GsFile open: pathPy mode: 'w' onClient: false.
	file nextPutAll: aString.
	file close.
	module := self script: pathPy.
	stream := PrettyWriteStream on: String new.
	module printSmalltalkOn: stream.
	^stream contents
%
! ------------------- Instance methods for ModuleAst
category: 'other'
method: ModuleAst
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	| function |
	function := scope get: aSymbol.
	^function
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: ModuleAst
globals

	^body
%
category: 'other'
method: ModuleAst
initialize

	parent := nil.
%
category: 'other'
method: ModuleAst
isInClass

	^false
%
category: 'other'
method: ModuleAst
isPackage

	^false
%
category: 'other'
method: ModuleAst
load: aPathString as: aNameString

	name := aNameString.
	path := aPathString.
	self
		parseAst;
		readSource;
		yourself.
%
category: 'other'
method: ModuleAst
locals

	^body
%
category: 'other'
method: ModuleAst
module

	^self
%
category: 'other'
method: ModuleAst
name

	^name
%
category: 'other'
method: ModuleAst
parseAst

	| string |
	stream := ReadStream on: self readAst.
	string := stream upTo: $(.
	string = 'Module' ifFalse: [self error].
	BlockAst parent: self.
	self commaSpace.
	type_ignore := self collectAst: [StatementAst statementFrom: self].
	(stream peekFor: $)) ifFalse: [self error].
	string := stream upToEnd trimSeparators.
	string isEmpty ifFalse: [SyntaxError signal: 'Unexpected text at end of AST: ' , string printString].
%
category: 'other'
method: ModuleAst
path

	^path
%
category: 'other'
method: ModuleAst
printSmalltalkOn: aStream

	aStream
		increaseIndent;
		lf;
		nextPutAll: '| currentScope |';
		lf;
		nextPutAll: 'currentScope := PyGlobals new.';
		lf;
		yourself.
	body printSmalltalkOn: aStream. " Doesn't need parenthesis "
	aStream lf.
%
category: 'other'
method: ModuleAst
readAst

	^self class astForPath: path
%
category: 'other'
method: ModuleAst
readSource

	| file |
	file := GsFile openReadOnServer: path.
	source := file contentsAsUtf8.
	file close.
%
category: 'other'
method: ModuleAst
set: aSymbol to: anObject

	scope set: aSymbol to: anObject
%
category: 'other'
method: ModuleAst
setBlock: aBlockAst

	body := aBlockAst.
%
category: 'other'
method: ModuleAst
source

	^source
%
category: 'other'
method: ModuleAst
stream

	stream skipSeparators.
	^stream
%
