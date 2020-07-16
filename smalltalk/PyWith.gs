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
children

	^super children
		addAll: items;
		add: body;
		yourself
%
category: 'other'
method: PyWith
initialize
	"With(withitem* items, stmt* body)"

	items := self collectAst: [PyWithItem parent: self].
	self commaSpace.
	body := PySuite parent: self.
	self readPosition.
%
