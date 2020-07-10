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
	^self basicNew
		initialize;
		load: aString as: '__main__';
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
addMissingPositions

	statements addMissingPositions.
	stream := nil.
%
category: 'other'
method: PyModule
evaluate

	| result |
	[
		statements do: [:each | result := each evaluate].
	] on: CancelNotification do: [:ex |
		ex return.
	].
	^result
%
category: 'other'
method: PyModule
globals

self halt.
	^globals
%
category: 'other'
method: PyModule
initialize

	parent := PySystem.
	globals := Dictionary new.
%
category: 'other'
method: PyModule
load: aPathString as: aNameString

	name := aNameString.
	path := aPathString.
	self
		parseAst;
		readTokens;
		addMissingPositions;
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
	statements :=  PySuite parent: self.
	(stream peekFor: $)) ifFalse: [self error].
	string := stream upToEnd trimSeparators.
	string isEmpty ifFalse: [self error: 'Unexpected text at end of AST: ' , string printString].
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
readTokens

	| string tokens |
	string := self class pythonPath , ' -m tokenize -e ' , path.
	tokens := System performOnServer: string.
	tokens := tokens subStrings: Character lf.
	tokens := tokens reject: [:each | each isEmpty].
	tokens := tokens collect: [:each | PyToken fromString: each].
	stream := ReadStream on: tokens.
%
category: 'other'
method: PyModule
stream

	^stream
%
category: 'other'
method: PyModule
variableAt: aName 
	
	^globals at: aName id ifAbsent: [Builtins current variableAt: aName]
%
category: 'other'
method: PyModule
variableAt: aTarget put: aValue
	
	aTarget assign: aValue in: globals
%
set compile_env: 0
category: 'testing support'
method: PyModule
_statements

	^statements
%
