! ------------------- Remove existing behavior from RShiftAst
removeAllMethods RShiftAst
removeAllClassMethods RShiftAst
! ------------------- Class methods for RShiftAst
! ------------------- Instance methods for RShiftAst
set compile_env: 0
category: 'other'
method: RShiftAst
pyFunctionFor: lhs

	^ lhs __rshift__
%
