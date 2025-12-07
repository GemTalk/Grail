! ------------------- Remove existing behavior from IfAst
removeallmethods IfAst
removeallclassmethods IfAst
! ------------------- Class methods for IfAst
! ------------------- Instance methods for IfAst
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

	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___value ifTrue: ['; lf; yourself.
	aStream increaseIndent.
	aStream nextPutAll: ''.	"This adds an indent before proceeding."
	body printSmalltalkOn: aStream.
	aStream decreaseIndent.
	orelse body size > 0 ifTrue: [
		aStream lf; nextPutAll: '] ifFalse: ['; lf; yourself.
		aStream increaseIndent.
		aStream nextPutAll: ''.	"This adds an indent before proceeding."
		orelse printSmalltalkOn: aStream.
		aStream decreaseIndent.
		aStream lf; nextPutAll: ']'; yourself.
	] ifFalse: [
		aStream lf; nextPutAll: ']'; yourself.
	].
%
