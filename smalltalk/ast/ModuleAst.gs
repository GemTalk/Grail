! ------------------- Remove existing behavior from ModuleAst
removeallmethods ModuleAst
removeallclassmethods ModuleAst
! ------------------- Class methods for ModuleAst
category: 'other'
classmethod: ModuleAst
astForPath: pathString
"
ModuleAst astForPath: '/path/to/file.py'.
"
	^self script: pathString
%
category: 'other'
classmethod: ModuleAst
astForSource: aString
"
ModuleAst astForSource: '1 == 1'.
"
	| file pathPy module |
	pathPy := '/tmp/grail.py'.
	file := GsFile open: pathPy mode: 'w' onClient: false.
	file nextPutAll: aString.
	file close.
	module := self script: pathPy.
	GsFile removeServerFile: pathPy.
	^module
%
category: 'other'
classmethod: ModuleAst
astStringForPath: pathString

	| file path string exitCode errPath errFile errMsg |
	path := '/tmp/grail.ast'.
	errPath := '/tmp/grail.err'.
	pprintast ifNil: [self error: 'Please run `ModuleAst pprintast: aPathString`!'].
	exitCode := System performOnServer: pprintast , ' -a -t ' , pathString , ' > ' , path , ' 2> ' , errPath , '; echo $?'.

	"Check if pprintast failed"
	(Integer fromString: exitCode) ~= 0 ifTrue: [
		errFile := GsFile open: errPath mode: 'rb' onClient: false.
		errMsg := errFile contentsAsUtf8 decodeToUnicode.
		errFile close.
		GsFile removeServerFile: path.
		GsFile removeServerFile: errPath.
		SyntaxError signal: errMsg.
	].

	file := GsFile open: path mode: 'rb' onClient: false.
	string := file contentsAsUtf8 decodeToUnicode.
	file close.
	GsFile removeServerFile: path.
	GsFile removeServerFile: errPath.
	^string
%
category: 'other'
classmethod: ModuleAst
astStringForSource: aString
"
ModuleAst astStringForSource: '1 == 1'.
"
	| file pathPy pathAst string exitCode errPath errFile errMsg |
	pathPy := '/tmp/grail.py'.
	pathAst := '/tmp/grail.ast'.
	errPath := '/tmp/grail.err'.
	file := GsFile open: pathPy mode: 'w' onClient: false.
	file nextPutAll: aString.
	file close.
	pprintast ifNil: [self error: 'Please run `ModuleAst pprintast: aPathString`!'].
	exitCode := System performOnServer: pprintast , ' -a -t ' , pathPy , ' > ' , pathAst , ' 2> ' , errPath , '; echo $?'.

	"Check if pprintast failed"
	(Integer fromString: exitCode) ~= 0 ifTrue: [
		errFile := GsFile open: errPath mode: 'rb' onClient: false.
		errMsg := errFile contentsAsUtf8 decodeToUnicode.
		errFile close.
		GsFile removeServerFile: pathAst.
		GsFile removeServerFile: pathPy.
		GsFile removeServerFile: errPath.
		SyntaxError signal: errMsg.
	].

	file := GsFile open: pathAst mode: 'rb' onClient: false.
	string := file contentsAsUtf8 decodeToUnicode.
	file close.
	GsFile removeServerFile: pathAst.
	GsFile removeServerFile: pathPy.
	GsFile removeServerFile: errPath.
	^string
%
category: 'other'
classmethod: ModuleAst
evaluate: aString
	"
	ModuleAst evaluate: '1 == 1'.
	"

	| file path module stream |
	path := '/tmp/grail.py'.
	file := GsFile open: path mode: 'w' onClient: false.
	file nextPutAll: aString.
	module := self script: path.
	GsFile removeServerFile: path.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	^stream contents evaluate
%
category: 'other'
classmethod: ModuleAst
evaluateScript: aPath
"
ModuleAst evaluateScript: 'hello.py'.
"
	| method module mySymbolList stream |
	module := self script: aPath.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	mySymbolList := SymbolList with: (builtins perform: #instance env: 2) asSymbolDictionary.
	[
		method := stream contents 
			_compileInContext: nil 
			symbolList: mySymbolList 
			oldLitVars: nil
			environmentId: 2
			flags: 0.
	] on: AbstractException do: [:ex |
		ex halt.
	].
	[
    	^method perform: #_executeInContext: env: 0 withArguments: { nil }
	] on: AbstractException do: [:ex |
		ex halt.
	].
%
category: 'other'
classmethod: ModuleAst
hello

	ModuleAst evaluateScript: '/Users/jfoster/code/GemStone/Grail/scripts/hello.py'.
%
category: 'other'
classmethod: ModuleAst
pprintast: aString
"
	ModuleAst pprintast: '/Users/jfoster/code/GemStone/Grail/.venv/bin/pprintast'.
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
ModuleAst smalltalkForModulePath: '/Users/jfoster/code/Python/Grail/scripts/hello.py'.
ModuleAst smalltalkForModulePath: '/Users/acaraveo/ORA.py'.
"
	| module stream |
	module := self script: aString.
	stream := PrettyWriteStream on: Unicode7 new.
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
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	^stream contents
%
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
path

	^path
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
initialize
%
category: 'parse'
method: ModuleAst
load: aPathString as: aNameString

	name := aNameString.
	path := aPathString.
	self
		parseAst;
		readSource;
		yourself.
%
category: 'parse'
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
category: 'parse'
method: ModuleAst
readAst

	^self class astStringForPath: path
%
category: 'parse'
method: ModuleAst
readSource

	| file |
	file := GsFile openReadOnServer: path.
	source := file contentsAsUtf8.
	file close.
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
