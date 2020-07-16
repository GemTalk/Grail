! ------------------- Remove existing behavior from PyNamedExpr
expectvalue /Metaclass3       
doit
PyNamedExpr removeAllMethods.
PyNamedExpr class removeAllMethods.
%
! ------------------- Class methods for PyNamedExpr
! ------------------- Instance methods for PyNamedExpr
set compile_env: 0
category: 'other'
method: PyNamedExpr
children

	^super children
		add: target;
		add: value;
		yourself
%
