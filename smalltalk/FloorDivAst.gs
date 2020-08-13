! ------------------- Remove existing behavior from FloorDivAst
expectvalue /Metaclass3       
doit
FloorDivAst removeAllMethods.
FloorDivAst class removeAllMethods.
%
! ------------------- Class methods for FloorDivAst
! ------------------- Instance methods for FloorDivAst
set compile_env: 0
category: 'other'
method: FloorDivAst
left: leftOperand right: rightOperand
"https://docs.python.org/3/library/operator.html#operator.__floordiv__"

	^ leftOperand __floordiv__ value: rightOperand
%
