! ------------------- Remove existing behavior from ForAst
expectvalue /Metaclass3
doit
ForAst removeAllMethods.
ForAst class removeAllMethods.
%
! ------------------- Class methods for ForAst
! ------------------- Instance methods for ForAst
set compile_env: 0
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

	self smalltalkSourceFor: iter parenthesisIf: 3 on: aStream.
	aStream nextPutAll: ' ___value do: [ :i |'; increaseIndent; lf; yourself.
	aStream nextPutAll: 'currentScope at: #'; nextPutAll: target id; nextPutAll: ' put: i.'.
	body size > 0 ifTrue:[
		aStream lf.
	].
	self smalltalkSourceFor: body parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
	aStream decreaseIndent; lf; nextPutAll: ']'.
%
