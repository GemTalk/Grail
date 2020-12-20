! ------------------- Remove existing behavior from LShiftAst
removeAllMethods LShiftAst
removeAllClassMethods LShiftAst
! ------------------- Class methods for LShiftAst
! ------------------- Instance methods for LShiftAst
set compile_env: 0
category: 'other'
method: LShiftAst
pyFunctionFor: lhs

	^ lhs __lshift__
%
