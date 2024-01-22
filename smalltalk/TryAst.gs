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

	1 to: handlers size do: [:i |
		aStream nextPutAll: '['; lf; yourself.
		aStream increaseIndent.
	].
	finalbody body size > 0 ifTrue: [
		aStream nextPutAll: '['; lf; yourself.
		aStream increaseIndent.
	].
	self smalltalkSourceFor: body parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
	handlers do: [:handler |
		aStream decreaseIndent.
		aStream lf; nextPutAll: '] on: '; yourself.
		
		handler type = None ifTrue: [
			aStream nextPutAll: 'Error, Exception'.
		] ifFalse: [
			aStream nextPutAll: handler type id asString.
		].

		aStream nextPutAll: ' do: ['; lf; yourself.

		aStream increaseIndent.
		self smalltalkSourceFor: handler body parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
		aStream decreaseIndent.
		aStream lf; nextPutAll: ']'; yourself.
	].
	
	aStream decreaseIndent.

	finalbody body size > 0 ifTrue: [
		aStream lf; nextPutAll: '] ensure: ['; lf; yourself.
		aStream increaseIndent.
		self smalltalkSourceFor: finalbody parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
		aStream decreaseIndent.
		aStream lf; nextPutAll: '].'; yourself.
	] ifFalse: [
		aStream nextPut: $..
	].
%
