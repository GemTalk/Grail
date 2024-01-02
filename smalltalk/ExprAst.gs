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
initialize
	"Expr(expr value)"

	value := self expression.
	self readPosition.
%
category: 'other'
method: ExprAst
messagePrecendence
	
	^3
%
category: 'other'
method: ExprAst
printSmalltalkOn: aStream

	self smalltalkSourceFor: value parenthesisIf: 4 on: aStream
%
