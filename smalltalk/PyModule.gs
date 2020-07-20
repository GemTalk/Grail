! ------------------- Remove existing behavior from PyModule
expectvalue /Metaclass3       
doit
PyModule removeAllMethods.
PyModule class removeAllMethods.
%
! ------------------- Class methods for PyModule
set compile_env: 0
category: 'other'
classmethod: PyModule
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
classmethod: PyModule
pythonPath

	^'/usr/local/bin/python3'
%
category: 'other'
classmethod: PyModule
script: aString
"
PyModule script: '$HOME/code/Python/performance/pyperformance'.
"
	^self script: aString as: '__main__'
%
category: 'other'
classmethod: PyModule
script: pathString as: nameString

	^self basicNew
		initialize;
		load: pathString as: nameString;
		yourself
%
category: 'other'
classmethod: PyModule
test
"
PyModule test
"

	^PyModule script: '$HOME/code/Python/GemStoneP/mastermind.py'.
%
! ------------------- Instance methods for PyModule
set compile_env: 0
category: 'other'
method: PyModule
children

	^super children
		add: body;
		yourself
%
category: 'other'
method: PyModule
evaluate

	| result |
	[
		result := body evaluate.
	] on: CancelNotification do: [:ex |
		ex return.
	].
	^result
%
category: 'other'
method: PyModule
initialize

	parent := PySystem.
%
category: 'other'
method: PyModule
load: aPathString as: aNameString

	name := aNameString.
	path := aPathString.
	self
		parseAst;
		readSource;
		yourself.
%
category: 'other'
method: PyModule
module

	^self
%
category: 'other'
method: PyModule
parseAst

	| string |
	stream := ReadStream on: self readAst.
	string := stream upTo: $(.
	string = 'Module' ifFalse: [self error].
	body :=  GlobalScope parent: self.
	(stream peekFor: $)) ifFalse: [self error].
	string := stream upToEnd trimSeparators.
	string isEmpty ifFalse: [self error: 'Unexpected text at end of AST: ' , string printString].
	body initialize2.
%
category: 'other'
method: PyModule
path

	^path
%
category: 'other'
method: PyModule
readAst

	^self class astForPath: path
%
category: 'other'
method: PyModule
readSource

	| file |
	file := GsFile openReadOnServer: path.
	source := file contentsAsUtf8.
	file close.
%
category: 'other'
method: PyModule
stream

	^stream
%
