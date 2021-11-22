! ------------------- Remove existing behavior from ModuleAst
removeAllMethods ModuleAst
removeAllClassMethods ModuleAst
! ------------------- Class methods for ModuleAst
set compile_env: 0
category: 'other'
classmethod: ModuleAst
astForPath: pathString

	| file path string |
	path := '/tmp/grail.ast'.
	System performOnServer: '/usr/local/bin/pprintast -a -t ' , pathString , ' > ' , path.
	file := GsFile open: path mode: 'rb' onClient: false.
	string := file contentsAsUtf8 decodeToUnicode.
	GsFile removeServerFile: path.
	^string
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
test
"
ModuleAst test
"

	^ModuleAst script: '$HOME/Code/Python/Grail/hello.py'.
%
! ------------------- Instance methods for ModuleAst
set compile_env: 0
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
	string isEmpty ifFalse: [self error: 'Unexpected text at end of AST: ' , string printString].
%
category: 'other'
method: ModuleAst
path

	^path
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
