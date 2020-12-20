! ------------------- Remove existing behavior from AddAst
removeAllMethods AddAst
removeAllClassMethods AddAst
! ------------------- Class methods for AddAst
! ------------------- Instance methods for AddAst
set compile_env: 0
category: 'other'
method: AddAst
pyFunctionFor: lhs

	^ lhs __add__
%
