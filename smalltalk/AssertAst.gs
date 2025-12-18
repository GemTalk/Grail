! ------------------- Remove existing behavior from AssertAst
removeallmethods AssertAst
removeallclassmethods AssertAst
! ------------------- Class methods for AssertAst
! ------------------- Instance methods for AssertAst
category: 'other'
method: AssertAst
initialize
	"Assert(expr test, expr? msg)"

	test := self expression. 
	self commaSpace.
	msg := self optionalExpression.
	self readPosition.
%
category: 'other'
method: AssertAst
printSmalltalkOn: aStream

	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __bool__ ___value ifFalse: [AssertionError signal'.
	msg ~~ None ifTrue: [
		aStream nextPutAll: ': '.
		msg printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' ___value'.
	].
	aStream nextPutAll: '].'
%
