! ------------------- Remove existing behavior from PyAssign
expectvalue /Metaclass3       
doit
PyAssign removeAllMethods.
PyAssign class removeAllMethods.
%
! ------------------- Class methods for PyAssign
! ------------------- Instance methods for PyAssign
set compile_env: 0
category: 'other'
method: PyAssign
_targets
	^ targets
%
category: 'other'
method: PyAssign
_value
	^ value
%
category: 'other'
method: PyAssign
addMissingPositions
%
category: 'other'
method: PyAssign
evaluate
	| x |
	x := value evaluate.
	targets do: [:each | parent variableAt: each put: x].
%
category: 'other'
method: PyAssign
initialize
	"Assign(expr* targets, expr value)"

	targets := self collectAst: [ self expression].
	self commaSpace.
	value := self expression.
	self readPosition.
%
