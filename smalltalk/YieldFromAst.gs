! ------------------- Remove existing behavior from YieldFromAst
expectvalue /Metaclass3       
doit
YieldFromAst removeAllMethods.
YieldFromAst class removeAllMethods.
%
! ------------------- Class methods for YieldFromAst
! ------------------- Instance methods for YieldFromAst
set compile_env: 0
category: 'other'
method: YieldFromAst
initialize
	"YieldFrom(expr value)"

	value := self expression.
	self readPosition.
%
