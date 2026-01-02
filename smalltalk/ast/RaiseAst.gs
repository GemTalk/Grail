! ------------------- Remove existing behavior from RaiseAst
removeallmethods RaiseAst
removeallclassmethods RaiseAst
set compile_env: 0
! ------------------- Class methods for RaiseAst
! ------------------- Instance methods for RaiseAst
category: 'other'
method: RaiseAst
initialize
	"Raise(expr? exc, expr? cause)"

	exc := self optionalExpression.
	self commaSpace.
	cause := self optionalExpression.
	self readPosition.
%
category: 'other'
method: RaiseAst
printSmalltalkOn: aStream

	self halt.
%
