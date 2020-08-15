! ------------------- Remove existing behavior from EllipsisAst
expectvalue /Metaclass3       
doit
EllipsisAst removeAllMethods.
EllipsisAst class removeAllMethods.
%
! ------------------- Class methods for EllipsisAst
! ------------------- Instance methods for EllipsisAst
set compile_env: 0
category: 'other'
method: EllipsisAst
initialize
	"Ellipsis"


self error: 'deprecated'.
%
