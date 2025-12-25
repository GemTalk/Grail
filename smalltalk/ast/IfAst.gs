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

	test printSmalltalkOn: aStream.
	aStream nextPutAll: ' ifTrue: ['; increaseIndent; lf.
	body printSmalltalkOn: aStream.
	aStream decreaseIndent; nextPutAll: '].'.
%
