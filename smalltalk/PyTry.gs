! ------------------- Remove existing behavior from PyTry
expectvalue /Metaclass3       
doit
PyTry removeAllMethods.
PyTry class removeAllMethods.
%
! ------------------- Class methods for PyTry
! ------------------- Instance methods for PyTry
set compile_env: 0
category: 'other'
method: PyTry
children

	^super children
		add: body;
		addAll: handlers;
		add: orelse;
		add: finalbody;
		yourself
%
category: 'other'
method: PyTry
evaluate

	[
		[
			body evaluate.
		] on: BaseException do: [:ex | 
			| handler |
			handler := handlers detect: [:each | each type evaluate handles: ex] ifNone: [ex pass].
			handler evaluate.
		].
		orelse evaluate.
	] ensure: [
		finalbody evaluate.
	].
%
category: 'other'
method: PyTry
initialize
"
	Try(stmt* body, excepthandler* handlers, stmt* orelse, stmt* finalbody)
	https://docs.python.org/3/reference/compound_stmts.html#the-try-statement
"

	body := PySuite parent: self.
	self commaSpace.
	handlers := self collectAst: [PyExceptHandler parent: self].
	self commaSpace.
	orelse := PySuite parent: self.
	self commaSpace.
	finalbody := PySuite parent: self.
	self readPosition.
%
