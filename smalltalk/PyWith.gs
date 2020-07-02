! ------------------- Remove existing behavior from PyWith
expectvalue /Metaclass3       
doit
PyWith removeAllMethods.
PyWith class removeAllMethods.
%
! ------------------- Class methods for PyWith
! ------------------- Instance methods for PyWith
set compile_env: 0
category: 'other'
method: PyWith
addMissingPositions
%
category: 'other'
method: PyWith
initialize
	"With(withitem* items, stmt* body)"

	items := self collectAst: [PyWithItem parent: self].
	self commaSpace.
	body := self suite.
	self readPosition.
%
