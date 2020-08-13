! ------------------- Remove existing behavior from BitOrAst
expectvalue /Metaclass3       
doit
BitOrAst removeAllMethods.
BitOrAst class removeAllMethods.
%
! ------------------- Class methods for BitOrAst
! ------------------- Instance methods for BitOrAst
set compile_env: 0
category: 'other'
method: BitOrAst
pyFunctionFor: lhs

	^ lhs __or__
%
