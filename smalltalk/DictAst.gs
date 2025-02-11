! ------------------- Remove existing behavior from DictAst
removeallmethods DictAst
removeallclassmethods DictAst
! ------------------- Class methods for DictAst
! ------------------- Instance methods for DictAst
category: 'other'
method: DictAst
initialize
	"Dict(expr* keys, expr* values)"

	keys := self collectAst: [self expression].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
category: 'other'
method: DictAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'dict ___value: { '.
	keys with: values do: [:key :value |
		key printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: '->'.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '} asDictionary'.
%
