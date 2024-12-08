! ------------------- Remove existing behavior from WhileAst
removeallmethods WhileAst
removeallclassmethods WhileAst
! ------------------- Class methods for WhileAst
! ------------------- Instance methods for WhileAst
category: 'other'
method: WhileAst
initialize
	"While(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace.
	orelse := SuiteAst parent: self.
	self readPosition.
%
category: 'other'
method: WhileAst
printSmalltalkOn: aStream

	aStream nextPut: $[.
	self smalltalkSourceFor: test parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
	aStream nextPutAll: '] whileTrue: ['; lf; yourself.
	self smalltalkSourceFor: body parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
	aStream lf; nextPutAll: '].'.
%
