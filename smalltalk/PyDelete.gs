! ------------------- Remove existing behavior from PyDelete
expectvalue /Metaclass3       
doit
PyDelete removeAllMethods.
PyDelete class removeAllMethods.
%
! ------------------- Class methods for PyDelete
! ------------------- Instance methods for PyDelete
set compile_env: 0
category: 'other'
method: PyDelete
addMissingPositions
%
category: 'other'
method: PyDelete
initialize
	"Delete(expr* targets)"

	targets := self collectAst: [ self expression ].
	self readPosition.
%
