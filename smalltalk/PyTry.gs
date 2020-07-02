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
addMissingPositions
%
category: 'other'
method: PyTry
initialize
	"Try(stmt* body, excepthandler* handlers, stmt* orelse, stmt* finalbody)"

	body := self suite.
	self commaSpace.
	handlers := self collectAst: [PyExceptHandler parent: self].
	self commaSpace.
	orelse := self suite.
	self commaSpace.
	finalbody := self suite.
	self readPosition.
%
