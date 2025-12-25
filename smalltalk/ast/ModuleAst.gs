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
ModuleAst evaluateScript: '/Users/acaraveo/ORA.py'.
"
	| method module mySymbolDictionary mySymbolList stream |
	module := self script: aPath.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	mySymbolDictionary := SymbolDictionary new
		name: #'foo';
		at: #'abs' put: [:arg1 | builtins new abs: arg1];
		at: #'len' put: [:arg1 | builtins new len: arg1];
		at: #'type' put: [:arg1 | builtins new type: arg1];
		at: #'repr' put: [:arg1 | builtins new repr: arg1];
		at: #'str' put: [:arg1 | builtins new str: arg1];
		at: #'hash' put: [:arg1 | builtins new hash: arg1];
		at: #'hex' put: [:arg1 | builtins new hex: arg1];
		at: #'oct' put: [:arg1 | builtins new oct: arg1];
		at: #'bin' put: [:arg1 | builtins new bin: arg1];
		at: #'chr' put: [:arg1 | builtins new chr: arg1];
		at: #'ord' put: [:arg1 | builtins new ord: arg1];
		at: #'min' put: [:arg1 | builtins new min: arg1];
		at: #'max' put: [:arg1 | builtins new max: arg1];
		at: #'sum' put: [:arg1 | builtins new sum: arg1];
		at: #'all' put: [:arg1 | builtins new all: arg1];
		at: #'any' put: [:arg1 | builtins new any: arg1];
		at: #'isinstance' put: [:arg1 :arg2 | builtins new isinstance: arg1 _: arg2];
		at: #'callable' put: [:arg1 | builtins new callable: arg1];
		at: #'dir' put: [:arg1 | builtins new dir: arg1];
		at: #'id' put: [:arg1 | builtins new id: arg1];
		at: #'pow' put: [:arg1 :arg2 | builtins new pow: arg1 _: arg2];
		at: #'round' put: [:arg1 | builtins new round: arg1];
		at: #'divmod' put: [:arg1 :arg2 | builtins new divmod: arg1 _: arg2];
		at: #'print' put: [:arg1 | builtins new print: arg1];
		at: #'input' put: [builtins new input];
		at: #'sorted' put: [:arg1 | builtins new sorted: arg1];
		at: #'reversed' put: [:arg1 | builtins new reversed: arg1];
		at: #'enumerate' put: [:arg1 | builtins new enumerate: arg1];
		at: #'zip' put: [:arg1 | builtins new zip: arg1];
		yourself.
	mySymbolList := SymbolList with: mySymbolDictionary.
	self halt.
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
