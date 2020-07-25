! ------------------- Remove existing behavior from ListAst
expectvalue /Metaclass3       
doit
ListAst removeAllMethods.
ListAst class removeAllMethods.
%
! ------------------- Class methods for ListAst
! ------------------- Instance methods for ListAst
set compile_env: 0
category: 'other'
method: ListAst
children

	^super children
		add: ctx;
		addAll: elts;
		yourself
%
category: 'other'
method: ListAst
evaluate
	"May wish to revisit context"
	^List withAll: (elts collect: [:each | each evaluate])
%
category: 'other'
method: ListAst
initialize
	"List(expr* elts, expr_context ctx)"
	
	elts := self collectAst: [self expression].
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: ListAst
saveVariableAssociation
	"Not really a variable?"
%
