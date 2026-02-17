! ------------------- Superclass check
run
SuiteAst ifNil: [self error: 'SuiteAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BlockAst
expectvalue /Class
doit
SuiteAst subclass: 'BlockAst'
  instVarNames: #( variables tempCount)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BlockAst category: 'Parser'
%

! ------------------- Remove existing behavior from BlockAst
removeallmethods BlockAst
removeallclassmethods BlockAst

set compile_env: 0

category: 'other'
method: BlockAst
allocateTemp

	| name |
	tempCount := (tempCount ifNil: [0]) + 1.
	name := ('___' , tempCount printString) asSymbol.
	variables add: name.
	^name
%

category: 'other'
method: BlockAst
declareVariable: aSymbol

	variables add: aSymbol.
%

category: 'other'
method: BlockAst
printSmalltalkOn: aStream

	self printSmalltalkOn: aStream useTemps: true.
%

category: 'other'
method: BlockAst
printSmalltalkOn: aStream useTemps: aBoolean

	(aBoolean and: [variables notEmpty]) ifTrue: [
		aStream nextPut: $|.
		variables do: [:each | aStream space; nextPutAll: each].
		aStream nextPutAll: ' |'; lf.
	].
	body do: [:each |
		each printSmalltalkOn: aStream.
		aStream lf.
	].
%

category: 'other'
method: BlockAst
variables

	^variables
%
