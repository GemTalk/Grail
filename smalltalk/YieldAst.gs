! ------------------- Remove existing behavior from YieldAst
expectvalue /Metaclass3       
doit
YieldAst removeAllMethods.
YieldAst class removeAllMethods.
%
! ------------------- Class methods for YieldAst
! ------------------- Instance methods for YieldAst
set compile_env: 0
category: 'other'
method: YieldAst
_value
	^ value
%
category: 'other'
method: YieldAst
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: YieldAst
initialize
	"Yield(expr? value)"

	value := self optionalExpression.
	self readPosition.
%
