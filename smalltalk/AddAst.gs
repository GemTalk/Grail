! ------------------- Remove existing behavior from AddAst
expectvalue /Metaclass3       
doit
AddAst removeAllMethods.
AddAst class removeAllMethods.
%
! ------------------- Class methods for AddAst
! ------------------- Instance methods for AddAst
set compile_env: 0
category: 'other'
method: AddAst
left: lhs right: rhs

	^ lhs __add__ value: lhs value: rhs
%
category: 'other'
method: AddAst
pyFunctionFor: lhs

	^lhs __add__
%
