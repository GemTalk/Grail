! ------------------- Remove existing behavior from SliceAst
removeAllMethods SliceAst
removeAllClassMethods SliceAst
! ------------------- Class methods for SliceAst
! ------------------- Instance methods for SliceAst
set compile_env: 0
category: 'other'
method: SliceAst
initialize
	"Slice(expr? lower, expr? upper, expr? step)"

	lower:= self optionalExpression.
	self commaSpace.
	upper := self optionalExpression.
	self commaSpace.
	step := self optionalExpression.
	self readPosition.
%
category: 'other'
method: SliceAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __getslice__: '.

	lower class = NoneType ifTrue: [
		aStream nextPutAll: '(int ___value: 0)'.
	] ifFalse: [
		self smalltalkSourceFor: lower parenthesisIf: 3 on: aStream.
	].

	aStream nextPutAll: ' _: '.

	upper class = NoneType ifTrue: [
		aStream nextPutAll: 'None'.
	] ifFalse: [
		self smalltalkSourceFor: upper parenthesisIf: 3 on: aStream.
	].
%
