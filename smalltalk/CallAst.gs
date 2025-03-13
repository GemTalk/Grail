! ------------------- Remove existing behavior from CallAst
removeallmethods CallAst
removeallclassmethods CallAst
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
	(keywords size == 1 and: [keywords first name isNil]) ifTrue: [
		keywords := KeywordsAst from: keywords.
	] ifFalse: [
		| replacement |
		replacement := Dictionary new.
		keywords do: [:each | replacement at: each name put: each value].
		keywords := replacement.
	].
	self readPosition.
%
category: 'other'
method: CallAst
printSmalltalkOn: aStream

		"throw namedefbefore error here"
	function printSmalltalkWithParenthesisOn: aStream.
	aStream 
		nextPutAll: ' scope: currentScope positional: { ';
		yourself.
	arguments do: [:each | 
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '} named: '.
	keywords size > 0 ifTrue: [
		aStream nextPutAll: '{'.
		keywords keysAndValuesDo: [:eachKey :eachValue |
			aStream 
				nextPutAll: ' #';
				nextPutAll: eachKey;
				nextPutAll: '->';
				yourself.
			eachValue printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: '. '.
		].
		aStream nextPutAll: '}'
	] ifFalse: [
		aStream nextPutAll: '{}'.
	].
%
category: 'other'
method: CallAst
printSmalltalkOnY: aStream

	"throw namedefbefore error here"
	aStream 
		nextPutAll: '(currentScope at: #';
		nextPutAll: function id;
		nextPut: $);
		nextPutAll: ' scope: currentScope';
		yourself.
%
