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
	aStream nextPutAll: ' ___value ifTrue: ['; lf; yourself.
	aStream increaseIndent.
	body printSmalltalkOn: aStream.
	aStream decreaseIndent.
	orelse body size > 0 ifTrue: [
		aStream lf; nextPutAll: '] ifFalse: ['; lf; yourself.
		aStream increaseIndent.
		orelse printSmalltalkOn: aStream.
		aStream decreaseIndent.
		aStream lf; nextPutAll: '].'; lf; yourself.
	] ifFalse: [
		aStream lf; nextPutAll: '].'; lf; yourself.
	].
%
