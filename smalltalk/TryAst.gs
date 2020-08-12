! ------------------- Remove existing behavior from TryAst
expectvalue /Metaclass3       
doit
TryAst removeAllMethods.
TryAst class removeAllMethods.
%
! ------------------- Class methods for TryAst
! ------------------- Instance methods for TryAst
set compile_env: 0
category: 'other'
method: TryAst
children

	^super children
		add: body;
		addAll: handlers;
		add: orelse;
		add: finalbody;
		yourself
%
category: 'other'
method: TryAst
evaluate: aScope

	[
		[
			body evaluate: aScope.
		] on: BaseException do: [:ex | 
			| handler |
			handler := handlers detect: [:each | (each type evaluateWithPyPrefix: aScope) handles: ex] ifNone: [ex pass].
			handler evaluate: aScope.
		].
		orelse evaluate: aScope.
	] ensure: [
		finalbody evaluate: aScope.
	].
%
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
