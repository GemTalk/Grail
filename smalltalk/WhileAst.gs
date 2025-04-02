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
	test printSmalltalkOn: aStream. " Doesn't need parenthesis "
	aStream nextPutAll: '] whileTrue: ['; lf; increaseIndent; yourself.
	body printSmalltalkOn: aStream. " Doesn't need parenthesis "
	aStream lf; decreaseIndent; nextPutAll: '].'.
%
