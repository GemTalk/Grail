! ------------------- Remove existing behavior from StarredAst
expectvalue /Metaclass3       
doit
StarredAst removeAllMethods.
StarredAst class removeAllMethods.
%
! ------------------- Class methods for StarredAst
! ------------------- Instance methods for StarredAst
set compile_env: 0
category: 'other'
method: StarredAst
children

	^super children
		add: ctx;
		add: value;
		yourself
%
category: 'other'
method: StarredAst
initialize
	"Starred(expr value, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: StarredAst
saveVariableAssociationForRead
	"the variable association should have been loaded as part of the arg name"
%
category: 'other'
method: StarredAst
saveVariableAssociationForWrite
	"the variable association should have been loaded as part of the arg name"
%
