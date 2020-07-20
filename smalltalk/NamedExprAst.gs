! ------------------- Remove existing behavior from NamedExprAst
expectvalue /Metaclass3       
doit
NamedExprAst removeAllMethods.
NamedExprAst class removeAllMethods.
%
! ------------------- Class methods for NamedExprAst
! ------------------- Instance methods for NamedExprAst
set compile_env: 0
category: 'other'
method: NamedExprAst
children

	^super children
		add: target;
		add: value;
		yourself
%
