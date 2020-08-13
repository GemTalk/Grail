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
pyFunctionFor: lhs

	^ lhs __floordiv__
%
