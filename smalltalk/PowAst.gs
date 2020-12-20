! ------------------- Remove existing behavior from PowAst
removeAllMethods PowAst
removeAllClassMethods PowAst
! ------------------- Class methods for PowAst
! ------------------- Instance methods for PowAst
set compile_env: 0
category: 'other'
method: PowAst
pyFunctionFor: lhs

	^ lhs __pow__
%
