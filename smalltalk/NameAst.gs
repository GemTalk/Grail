! ------------------- Remove existing behavior from NameAst
removeAllMethods NameAst
removeAllClassMethods NameAst
! ------------------- Class methods for NameAst
set compile_env: 0
category: 'other'
classmethod: NameAst
with: aSymbol

	^ self basicNew 
		id: aSymbol;
		yourself
%
! ------------------- Instance methods for NameAst
set compile_env: 0
category: 'other'
method: NameAst
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: NameAst
assertContextIsStore

	ctx assertIsStore.
%
category: 'other'
method: NameAst
callWithArguments: anArray keywords: aSymbolDictionary scope: aScope

	| callable |
	self assertContextIsLoad.
	callable := aScope get: id.
	self injectSuperArguments: anArray scope: aScope.
	^ callable
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: NameAst
declareVariable

	parent declareVariable: id.
%
category: 'other'
method: NameAst
evaluate: aScope
	"If the name refers to a function, return an object that can be sent #'value:value:value:'"

	self assertContextIsLoad.
	[
		^aScope get: id.
	] on: NameError do: [:ex | 
		(self isVariableIsDeclared: id) ifTrue: [
			"How would we resignal this?"
			UnboundLocalError signal: 'local variable ''', id, ''' referenced before assignment'.
		].
		ex pass.
	]
%
category: 'other'
method: NameAst
evaluate: container scope: aScope

	| slice |
	self assertContextIsLoad.
	[
		slice := aScope get: id.
	] on: NameError do: [:ex | 
		(self isVariableIsDeclared: id) ifTrue: [
			"How would we resignal this?"
			UnboundLocalError signal: 'local variable ''', id, ''' referenced before assignment'.
		].
		ex pass.
	].
	^slice evaluate: container scope: aScope

%
category: 'other'
method: NameAst
id

	^id
%
category: 'other'
method: NameAst
id: aSymbol

	id := aSymbol
%
category: 'other'
method: NameAst
initialize
	"Name(identifier id, expr_context ctx)"

	self stream peekFor: $(.
	id := self string asSymbol.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: NameAst
injectSuperArguments: anArray scope: aScope

	| type objectOrType |
	type := aScope superInfo 
		at: #'type'
		ifAbsent: [ ].
	objectOrType := aScope superInfo 
		at: #'objectOrType'
		ifAbsent: [ ].
	(((type isNil not) and: [ objectOrType isNil not ]) and: [ id = #'super' ]) ifTrue: [ "in case of calling super"
		anArray add: type.
		anArray add: objectOrType.
	].
%
category: 'other'
method: NameAst
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $(; 
		nextPutAll: id;
		nextPut: $).
%
category: 'other'
method: NameAst
setTo: aValue scope: aScope

	self assertContextIsStore.
	aScope set: id to: aValue.
%
