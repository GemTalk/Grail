! ------------------- Remove existing behavior from PyImport
expectvalue /Metaclass3       
doit
PyImport removeAllMethods.
PyImport class removeAllMethods.
%
! ------------------- Class methods for PyImport
! ------------------- Instance methods for PyImport
set compile_env: 0
category: 'other'
method: PyImport
_names
	^ names
%
category: 'other'
method: PyImport
children

	^super children
		addAll: names;
		yourself
%
category: 'other'
method: PyImport
evaluate
	"each name is an instance of PyAlias and that is where the import occurs"

	names do: [:each | each import].
%
category: 'other'
method: PyImport
initialize
	"Import(alias* names)"

	names := self collectAst: [self alias].
	self readPosition.
%
