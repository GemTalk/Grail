! ------------------- Remove existing behavior from RaiseAst
expectvalue /Metaclass3       
doit
RaiseAst removeAllMethods.
RaiseAst class removeAllMethods.
%
! ------------------- Class methods for RaiseAst
! ------------------- Instance methods for RaiseAst
set compile_env: 0
category: 'other'
method: RaiseAst
evaluate: aScope

	| exception from |
	exception := exc evaluate: aScope.
	from := cause evaluate: aScope.
	self halt.
%
category: 'other'
method: RaiseAst
initialize
	"Raise(expr? exc, expr? cause)"

	exc := self optionalExpression.
	self commaSpace.
	cause := self optionalExpression.
	self readPosition.
%
