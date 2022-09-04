! ------------------- Remove existing behavior from RaiseAst
removeAllMethods RaiseAst
removeAllClassMethods RaiseAst
! ------------------- Class methods for RaiseAst
! ------------------- Instance methods for RaiseAst
set compile_env: 0
category: 'other'
method: RaiseAst
initialize
	"Raise(expr? exc, expr? cause)"

	exc := self optionalExpression.
	self commaSpace.
	cause := self optionalExpression.
	self readPosition.
%
category: 'other'
method: RaiseAst
printSmalltalkOn: aStream
	aStream 
		nextPutAll: (exc class == CallAst ifTrue: [ exc function id ] ifFalse: [ exc id ]);
		nextPutAll: ' signal';
		yourself.

	exc class == CallAst ifTrue: [
		aStream nextPutAll: ': '.
		self smalltalkSourceFor: (exc arguments at: 1) parenthesisIf: 3 on: aStream.
		aStream nextPutAll: ' ___value'.
	].

	cause class = NoneType ifFalse: [
		self halt.
	].

	aStream nextPut: $..
%
