! ------------------- Remove existing behavior from PyAsyncWith
expectvalue /Metaclass3       
doit
PyAsyncWith removeAllMethods.
PyAsyncWith class removeAllMethods.
%
! ------------------- Class methods for PyAsyncWith
! ------------------- Instance methods for PyAsyncWith
set compile_env: 0
category: 'other'
method: PyAsyncWith
children

	^super children
		addAll: items;
		add: body;
		yourself
%
category: 'other'
method: PyAsyncWith
initialize
	"AsyncWith(withitem* items, stmt* body)"

	items := self collectAst: [PyWithItem parent: self].
	self commaSpace.
	body := PySuite parent: self.
	self readPosition.
%
