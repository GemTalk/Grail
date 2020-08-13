! ------------------- Remove existing behavior from GtEAst
expectvalue /Metaclass3       
doit
GtEAst removeAllMethods.
GtEAst class removeAllMethods.
%
! ------------------- Class methods for GtEAst
! ------------------- Instance methods for GtEAst
set compile_env: 0
category: 'other'
method: GtEAst
left: leftOperand right: rightOperand

	^ leftOperand __gte__ value: rightOperand
%
