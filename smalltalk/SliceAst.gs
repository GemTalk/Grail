! ------------------- Remove existing behavior from SliceAst
removeallmethods SliceAst
removeallclassmethods SliceAst
! ------------------- Class methods for SliceAst
! ------------------- Instance methods for SliceAst
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

	"Generate a slice object: (slice __call__: start _: stop _: step)"
	aStream nextPutAll: '(slice __call__: '.

	lower class == NoneType ifTrue: [
		aStream nextPutAll: 'None'.
	] ifFalse: [
		lower printSmalltalkWithParenthesisOn: aStream.
	].

	aStream nextPutAll: ' _: '.

	upper class == NoneType ifTrue: [
		aStream nextPutAll: 'None'.
	] ifFalse: [
		upper printSmalltalkWithParenthesisOn: aStream.
	].

	aStream nextPutAll: ' _: '.

	step class == NoneType ifTrue: [
		aStream nextPutAll: 'None'.
	] ifFalse: [
		step printSmalltalkWithParenthesisOn: aStream.
	].

	aStream nextPut: $).
%
