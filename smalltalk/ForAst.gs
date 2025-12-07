! ------------------- Remove existing behavior from ForAst
removeallmethods ForAst
removeallclassmethods ForAst
! ------------------- Class methods for ForAst
! ------------------- Instance methods for ForAst
category: 'other'
method: ForAst
initialize
	"For(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)"

	target := self expression.
	self commaSpace. 
	iter := self expression. 
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace. 
	orelse := SuiteAst parent: self.
	self commaSpace. 
	type_comment := self optionalString.
	self readPosition.
%
category: 'other'
method: ForAst
printSmalltalkOn: aStream

	iter printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___asIterableForFor do: [:value |'; increaseIndent; lf; yourself.
	target printSmalltalkAssignmentOn: aStream.
	aStream nextPutAll: '.'.
	body size > 0 ifTrue: [
		aStream lf.
	].
	body printSmalltalkOn: aStream. " Doesn't need parenthesis "
	aStream decreaseIndent; lf; nextPutAll: ']'.
%
