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
BlockAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from BlockAst
removeallmethods BlockAst
removeallclassmethods BlockAst

set compile_env: 0

category: 'Grail-other'
method: BlockAst
allocateTemp

	| name |
	tempCount := (tempCount ifNil: [0]) + 1.
	name := ('___' , tempCount printString) asSymbol.
	variables add: name.
	^name
%

category: 'Grail-other'
method: BlockAst
declareVariable: aSymbol

	variables add: aSymbol.
%

category: 'Grail-other'
method: BlockAst
isVariableIsDeclared: aSymbol
	"Return true if aSymbol is declared as a local in this scope, or in any
	enclosing scope. Used by NameAst/CallAst codegen to decide whether a
	bare name like `abs` resolves to a builtin (apply the fast-path
	special case) or has been shadowed by a local."

	(variables includes: aSymbol) ifTrue: [^true].
	^super isVariableIsDeclared: aSymbol
%

category: 'Grail-other'
method: BlockAst
isVariableIsDeclaredFromMethod: aSymbol
	"Same walk as isVariableIsDeclared: but Python class scope is
	invisible from inside method bodies — when transiting through a
	class body's BlockAst (parent is ClassDefAst), skip its own
	variables and continue at the enclosing scope (module body).
	NameAst / CallAst use this entry when the query originates
	inside a function def nested in a class."

	(parent notNil and: [parent isKindOf: ClassDefAst]) ifFalse: [
		(variables includes: aSymbol) ifTrue: [^true].
	].
	parent isNil ifTrue: [^false].
	^ parent isVariableIsDeclaredFromMethod: aSymbol
%

category: 'Grail-other'
method: BlockAst
printSmalltalkOn: aStream

	self printSmalltalkOn: aStream useTemps: true.
%

category: 'Grail-other'
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

category: 'Grail-other'
method: BlockAst
variables

	^variables
%
