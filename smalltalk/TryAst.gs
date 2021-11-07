! ------------------- Remove existing behavior from TryAst
removeAllMethods TryAst
removeAllClassMethods TryAst
! ------------------- Class methods for TryAst
! ------------------- Instance methods for TryAst
set compile_env: 0
category: 'other'
method: TryAst
initialize
	"Try(stmt* body, excepthandler* handlers, stmt* orelse, stmt* finalbody)"

	body := SuiteAst parent: self.
	self commaSpace.
	handlers := self collectAst: [ExceptHandlerAst parent: self].
	self commaSpace.
	orelse := SuiteAst parent: self.
	self commaSpace.
	finalbody := SuiteAst parent: self.
	self readPosition.
%
