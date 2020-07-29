! ------------------- Remove existing behavior from SubscriptAst
expectvalue /Metaclass3       
doit
SubscriptAst removeAllMethods.
SubscriptAst class removeAllMethods.
%
! ------------------- Class methods for SubscriptAst
! ------------------- Instance methods for SubscriptAst
set compile_env: 0
category: 'other'
method: SubscriptAst
assertContextIsStore
	value assertContextIsStore.
%
category: 'other'
method: SubscriptAst
children

	^super children
		add: ctx;
		add: slice;
		add: value;
		yourself
%
category: 'other'
method: SubscriptAst
evaluate
	| x |
	value assertContextIsLoad.
	x := self variableAt: value.
	^slice evaluate: x
	
%
category: 'other'
method: SubscriptAst
initialize
	"Subscript(expr value, slice slice, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	slice := SliceAbstractAst parent: self.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: SubscriptAst
saveVariableAssociationForRead
	"Not really a variable?"
%
category: 'other'
method: SubscriptAst
saveVariableAssociationForWrite
	"Not really a variable?"
%
