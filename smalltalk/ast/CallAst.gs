! ------------------- Remove existing behavior from CallAst
removeallmethods CallAst
removeallclassmethods CallAst
set compile_env: 0
! ------------------- Class methods for CallAst
! ------------------- Instance methods for CallAst
category: 'Accessing'
method: CallAst
arguments

	^arguments
%
category: 'Accessing'
method: CallAst
function

	^function
%
category: 'Accessing'
method: CallAst
keywords

	^keywords
%
category: 'other'
method: CallAst
initialize
	"Call(expr func, expr* args, keyword* keywords)"

	function := self expression.
	self commaSpace.
	arguments := self collectAst: [self expression].
	self commaSpace.
	keywords := self collectAst: [KeywordAst parent: self].
	self readPosition.
%
category: 'other'
method: CallAst
printSmalltalkOn: aStream

	function printSmalltalkOn: aStream.
	
	"Build positional arguments array"
	aStream nextPutAll: ' value: { '.
	arguments do: [:each |
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $.; space.
	].
	aStream nextPutAll: '} value: '.
	
	keywords isEmpty ifTrue: [
		aStream nextPutAll: 'nil'.
	] ifFalse: [
		"Build keywords dictionary"
		keywords keysAndValuesDo: [:key :value |
			aStream nextPutAll: ' at: #'; nextPutAll: key; nextPutAll: ' put: '.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $;.
		].
		aStream nextPutAll: ' yourself)'.
	].
%
