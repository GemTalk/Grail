! ------------------- Remove existing behavior from ExprAst
expectvalue /Metaclass3       
doit
ExprAst removeAllMethods.
ExprAst class removeAllMethods.
%
! ------------------- Class methods for ExprAst
! ------------------- Instance methods for ExprAst
set compile_env: 0
category: 'other'
method: ExprAst
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: ExprAst
evaluate
	^value evaluate
%
category: 'other'
method: ExprAst
initialize
	"Expr(expr value)"

	value := self expression.
	self readPosition.
%
