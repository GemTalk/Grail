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

	self smalltalkSourceFor: test parenthesisIf: 3 on: aStream.
	aStream nextPutAll: ' ___value ifFalse: [AssertionError signal'.
	msg class == NoneType ifFalse: [
		aStream nextPutAll: ': '.
		self smalltalkSourceFor: msg parenthesisIf: 3 on: aStream.
		aStream nextPutAll: ' ___value'.
	].
	aStream nextPutAll: '].'
%
