! ------------------- Remove existing behavior from FunctionDefAst
expectvalue /Metaclass3       
doit
FunctionDefAst removeAllMethods.
FunctionDefAst class removeAllMethods.
%
! ------------------- Class methods for FunctionDefAst
set compile_env: 0
category: 'other'
classmethod: FunctionDefAst
parent: anAstNode

	| function | 
	function := super parent: anAstNode.
	anAstNode isInClass ifFalse: [^function].
	(function decoratorList includes: #'classmethod')
		ifTrue: [function changeClassTo: ClassFunctionDefAst]
		ifFalse: [function changeClassTo: InstanceFunctionDefAst].
	^function
%
! ------------------- Instance methods for FunctionDefAst
set compile_env: 0
category: 'other'
method: FunctionDefAst
decoratorList

	^decorator_list
%
category: 'other'
method: FunctionDefAst
evaluate: aScope
	"Executing the 'def' command defines the function, but does not execute it.
	We do, however, need to provide a scope based on the definition context,
	not the call context, so that we get the proper outer scope (nonlocals and
	globals). That is, the scope is based on the definition, not the call. When the
	function is called, the (inner) scope is copied so that a new namespace is
	created (changes made during one call are not visible to another call)."

	aScope 
		set: name 
		to: (function newForNode: self scope: (aScope innerForNode: self))
%
category: 'other'
method: FunctionDefAst
initialize
	"FunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns,
                       string? type_comment)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := (stream upTo: $') asSymbol.
	self commaSpace.
	args := ArgumentsAst parent: self.
	self commaSpace.
	BlockAst parent: self.	"calls back to set body"
	self commaSpace.
	decorator_list :=  self collectAst: [self expression id].
	self commaSpace.
	returns := self optionalExpression.
	self commaSpace.
	type_comment := self optionalString.
	self readPosition.
%
category: 'other'
method: FunctionDefAst
name

	^name
%
category: 'other'
method: FunctionDefAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
%
category: 'other'
method: FunctionDefAst
setBlock: aBlockAst

	body := aBlockAst.
%
category: 'other'
method: FunctionDefAst
value: arguments value: keywords value: aScope
	"args are the parameters while arguments are the values"

	args
		arguments: arguments
		keywords: keywords
		scope: aScope.
	^body evaluate: aScope
%
