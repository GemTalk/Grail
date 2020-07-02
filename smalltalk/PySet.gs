! ------------------- Remove existing behavior from PySet
expectvalue /Metaclass3       
doit
PySet removeAllMethods.
PySet class removeAllMethods.
%
! ------------------- Class methods for PySet
! ------------------- Instance methods for PySet
set compile_env: 0
category: 'other'
method: PySet
evaluate
	^(elts collect: [:each | each evaluate]) asSet
%
category: 'other'
method: PySet
initialize
	"Set(expr* elts)"

	elts := self collectAst:[self expression].
	self readPosition.
%
