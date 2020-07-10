! ------------------- Remove existing behavior from PyBoolop
expectvalue /Metaclass3       
doit
PyBoolop removeAllMethods.
PyBoolop class removeAllMethods.
%
! ------------------- Class methods for PyBoolop
set compile_env: 0
category: 'other'
classmethod: PyBoolop
parent: aNode
	"boolop = And | Or"

	^self customChildForParent: aNode peekForCloseParenthesis: true
%
! ------------------- Instance methods for PyBoolop
set compile_env: 0
category: 'other'
method: PyBoolop
initialize
	"override to do nothing!"
%
