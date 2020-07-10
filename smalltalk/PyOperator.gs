! ------------------- Remove existing behavior from PyOperator
expectvalue /Metaclass3       
doit
PyOperator removeAllMethods.
PyOperator class removeAllMethods.
%
! ------------------- Class methods for PyOperator
set compile_env: 0
category: 'other'
classmethod: PyOperator
parent: aNode
	    "operator = Add | Sub | Mult | MatMult | Div | Mod | Pow | LShift
                 | RShift | BitOr | BitXor | BitAnd | FloorDiv"

	self == PyOperator ifTrue: [
		^self customChildForParent: aNode peekForCloseParenthesis: true.
	] ifFalse: [
		^super parent: aNode
	].
%
! ------------------- Instance methods for PyOperator
set compile_env: 0
category: 'other'
method: PyOperator
initialize
	"override to do nothing!"
%
category: 'other'
method: PyOperator
left: leftOperand right: rightOperand

	self subclassResponsibility
%
