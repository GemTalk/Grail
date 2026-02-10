! ------------------- Remove existing behavior from ModuleAst
removeallmethods ModuleAst
removeallclassmethods ModuleAst
set compile_env: 0
! ------------------- Class methods for ModuleAst
category: 'parsing'
classmethod: ModuleAst
parseSource: sourceString
	"Parse Python source code and return a ModuleAst."

	^PythonParser parse: sourceString
%
category: 'evaluation'
classmethod: ModuleAst
evaluate: sourceString withScope: aSymbolList
	"Evaluate sourceString in a persistent scope for REPL usage."

	| module |
	module := self parseSource: sourceString.
	module useTempsForBlock: false.
	^module evaluateWithScope: aSymbolList
%
category: 'evaluation'
classmethod: ModuleAst
evaluateSource: sourceString usingModuleScope: aSymbolDictionary
	"Evaluate sourceString in a persistent scope for REPL usage."

	| module symbolList |
	module := self parseSource: sourceString.
	module useTempsForBlock: false.
	module ensureModuleScope: aSymbolDictionary.
	symbolList := self symbolListForModuleScope: aSymbolDictionary.
	^module evaluateWithScope: symbolList
%
category: 'evaluation'
classmethod: ModuleAst
symbolListForModuleScope: aSymbolDictionary
	"Return a SymbolList with module scope before builtins."

	^SymbolList new
		add: aSymbolDictionary;
		add: builtins ___instance___;
		yourself
%
! ------------------- Instance methods for ModuleAst
category: 'accessors'
method: ModuleAst
body

	^body
%
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
category: 'code generation'
method: ModuleAst
printSmalltalkOn: aStream

	body printSmalltalkOn: aStream useTemps: useTempsForBlock.
%
category: 'evaluation'
method: ModuleAst
evaluateWithScope: aSymbolList
	"Evaluate this module using the provided symbol list."

	| result |
	result := self executeWithScope: aSymbolList.
	self shouldReturnExpressionResult ifTrue: [
		^result
	].
	^None.
%
category: 'evaluation'
method: ModuleAst
executeWithScope: aSymbolList
	"Compile and execute this module, returning the raw execution result."

	| file writeStream compiledMethod result |
	writeStream := PrettyWriteStream on: Unicode7 new.
	self printSmalltalkOn: writeStream.
	file := GsFile open: '/tmp/grail.st' mode: 'w' onClient: false.
	file nextPutAll: writeStream contents.
	file close.
	[
		compiledMethod := writeStream contents
			_compileInContext: nil
			symbolList: aSymbolList
			oldLitVars: nil
			environmentId: 2
			flags: 0.
	] on: AbstractException do: [:ex |
		ex pass.
	].
	[
		result := compiledMethod _executeInContext: 2.
	] on: AbstractException do: [:ex |
		ex pass.
	].
	^result
%
category: 'evaluation'
method: ModuleAst
shouldReturnExpressionResult

	| statements |
	statements := body body.
	^statements notEmpty and: [(statements last isKindOf: ExprAst)]
%
category: 'evaluation'
method: ModuleAst
ensureModuleScope: aSymbolDictionary
	"Ensure module scope has entries for declared variables."

	body variables do: [:each | aSymbolDictionary at: each ifAbsentPut: [nil] ].
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
useTempsForBlock: aBoolean

	useTempsForBlock := aBoolean.
%
category: 'variables'
method: ModuleAst
set: aSymbol to: anObject

	self halt.
%
