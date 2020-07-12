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
initialize
	"Try(stmt* body, excepthandler* handlers, stmt* orelse, stmt* finalbody)"

	body := PySuite parent: self.
	self commaSpace.
	handlers := self collectAst: [PyExceptHandler parent: self].
	self commaSpace.
	orelse := PySuite parent: self.
	self commaSpace.
	finalbody := PySuite parent: self.
	self readPosition.
%
