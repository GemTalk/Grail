! ------------------- Remove existing behavior from IfAst
removeAllMethods IfAst
removeAllClassMethods IfAst
! ------------------- Class methods for IfAst
! ------------------- Instance methods for IfAst
set compile_env: 0
category: 'other'
method: IfAst
initialize
	"If(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace.
	orelse := SuiteAst parent: self.
	self readPosition.
%
category: 'other'
method: IfAst
printSmalltalkOn: aStream

	self smalltalkSourceFor: test parenthesisIf: 3 on: aStream.
	aStream nextPutAll: ' ___value ifTrue: ['.
	body printSmalltalkOn: aStream.
	orelse body size > 0 ifTrue: [
		aStream nextPutAll: '] ifFalse: ['.
		orelse printSmalltalkOn: aStream.
		aStream nextPutAll: '].'; lf; yourself.
	] ifFalse: [
		aStream nextPutAll: '].'; lf; yourself.
	].
%
