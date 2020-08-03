! ------------------- Remove existing behavior from ModuleAst
expectvalue /Metaclass3       
doit
ModuleAst removeAllMethods.
ModuleAst class removeAllMethods.
%
! ------------------- Class methods for ModuleAst
set compile_env: 0
category: 'other'
classmethod: ModuleAst
astForPath: pathString

	| string1 string2 string3 |
	string1 := '
import ast
file=open(''' , pathString , ''',''r'')
tree=ast.parse(file.read())
out=ast.dump(tree,annotate_fields=False,include_attributes=True)
file.close()
print(out)
'.
	string2 := 'echo "' , string1 , '" | ' , self pythonPath.
	string3 := System performOnServer: string2.
	^string3
%
category: 'other'
classmethod: ModuleAst
pythonPath

	^'/usr/local/bin/python3'
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

	^ModuleAst script: '$HOME/code/Python/GemStoneP/mastermind.py'.
%
! ------------------- Instance methods for ModuleAst
set compile_env: 0
category: 'other'
method: ModuleAst
children

	^super children
		add: body;
		yourself
%
category: 'other'
method: ModuleAst
evaluate

	| scope result |
	[
		scope := GlobalScope new.
		result := body evaluate: scope.
	] on: CancelNotification do: [:ex |
		ex return.
	].
	^result
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
	SuiteAst parent: self.
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
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
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
setBlock: aBlockAst

	body := aBlockAst.
%
category: 'other'
method: ModuleAst
stream

	^stream
%
