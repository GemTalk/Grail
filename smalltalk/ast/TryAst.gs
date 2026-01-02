! ------------------- Remove existing behavior from TryAst
removeallmethods TryAst
removeallclassmethods TryAst
set compile_env: 0
! ------------------- Class methods for TryAst
! ------------------- Instance methods for TryAst
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
category: 'other'
method: TryAst
printSmalltalkOn: aStream

	self halt.
%
