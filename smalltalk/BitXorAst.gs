! ------------------- Remove existing behavior from BitXorAst
expectvalue /Metaclass3       
doit
BitXorAst removeAllMethods.
BitXorAst class removeAllMethods.
%
! ------------------- Class methods for BitXorAst
! ------------------- Instance methods for BitXorAst
set compile_env: 0
category: 'other'
method: BitXorAst
pyFunctionFor: lhs

	^ lhs __xor__
%
