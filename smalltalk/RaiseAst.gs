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
_cause
	^ cause
%
category: 'other'
method: RaiseAst
_exc
	^ exc
%
category: 'other'
method: RaiseAst
children

	^super children
		add: exc;
		add: cause;
		yourself
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
