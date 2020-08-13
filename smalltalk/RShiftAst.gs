! ------------------- Remove existing behavior from RShiftAst
expectvalue /Metaclass3       
doit
RShiftAst removeAllMethods.
RShiftAst class removeAllMethods.
%
! ------------------- Class methods for RShiftAst
! ------------------- Instance methods for RShiftAst
set compile_env: 0
category: 'other'
method: RShiftAst
pyFunctionFor: lhs

	^ lhs __rshift__
%
