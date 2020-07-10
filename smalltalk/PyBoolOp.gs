! ------------------- Remove existing behavior from PyBoolOp
expectvalue /Metaclass3       
doit
PyBoolOp removeAllMethods.
PyBoolOp class removeAllMethods.
%
! ------------------- Class methods for PyBoolOp
set compile_env: 0
category: 'other'
classmethod: PyBoolOp
parent: aNode
	"boolop = And | Or"

	self == PyBoolOp ifTrue: [
		^self customChildForParent: aNode peekForCloseParenthesis: true.
	] ifFalse: [
		^super parent: aNode
	].
%
! ------------------- Instance methods for PyBoolOp
set compile_env: 0
category: 'other'
method: PyBoolOp
evaluate

	self subclassResponsibility.
%
category: 'other'
method: PyBoolOp
initialize
	"BoolOp(boolop op, expr* values)"

	self commaSpace.
	values := self collectAst:[self expression].
	self readPosition.
%
