! ------------------- Remove existing behavior from PyExpression
expectvalue /Metaclass3       
doit
PyExpression removeAllMethods.
PyExpression class removeAllMethods.
%
! ------------------- Class methods for PyExpression
set compile_env: 0
category: 'other'
classmethod: PyExpression
expressionFrom: aNode

	^self customChildForParent: aNode peekForCloseParenthesis: false
%
! ------------------- Instance methods for PyExpression
set compile_env: 0
category: 'other'
method: PyExpression
evaluate

	self subclassResponsibility.
%
