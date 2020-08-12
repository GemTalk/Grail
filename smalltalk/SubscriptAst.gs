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

	ctx assertIsStore.
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
declareVariable

	value declareVariable.
%
category: 'other'
method: SubscriptAst
evaluate: aScope

	| container |
	value assertContextIsLoad.
	container := value evaluate: aScope.
	^slice evaluate: container scope: aScope
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
setTo: anObject scope: aScope

	| container |
	self assertContextIsStore.
	container := value evaluate: aScope.
	slice set: container to: anObject scope: aScope.
%
