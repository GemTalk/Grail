! ------------------- Remove existing behavior from NameAst
expectvalue /Metaclass3       
doit
NameAst removeAllMethods.
NameAst class removeAllMethods.
%
! ------------------- Class methods for NameAst
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
assign: aValue scope: aScope

	self assertContextIsStore.
	aScope set: id to: aValue.
%
category: 'other'
method: NameAst
callWithArguments: anArray keywords: aSymbolDictionary scope: aScope

	self assertContextIsLoad.
	^(aScope get: id)
		value: anArray
		value: aSymbolDictionary
		value: aScope
%
category: 'other'
method: NameAst
children

	^super children
		add: ctx;
		yourself
%
category: 'other'
method: NameAst
evaluate: aScope
	"If the name refers to a function, return an object that can be sent #'value:value:value:'"

	self assertContextIsLoad.
	^aScope get: id
%
category: 'other'
method: NameAst
id

	^id
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
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $(; 
		nextPutAll: id;
		nextPut: $).
%
