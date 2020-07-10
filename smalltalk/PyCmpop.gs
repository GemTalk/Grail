! ------------------- Remove existing behavior from PyCmpop
expectvalue /Metaclass3       
doit
PyCmpop removeAllMethods.
PyCmpop class removeAllMethods.
%
! ------------------- Class methods for PyCmpop
set compile_env: 0
category: 'other'
classmethod: PyCmpop
parent: aNode
	"cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn"

	self == PyCmpop ifTrue: [
		^self customChildForParent: aNode peekForCloseParenthesis: true.
	] ifFalse: [
		^super parent: aNode
	].
%
! ------------------- Instance methods for PyCmpop
set compile_env: 0
category: 'other'
method: PyCmpop
initialize
	"override to do nothing!"
%
category: 'other'
method: PyCmpop
left: leftOperand right: rightOperand

	^leftOperand evaluate + rightOperand evaluate
%
