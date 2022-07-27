! ------------------- Remove existing behavior from CallAst
removeAllMethods CallAst
removeAllClassMethods CallAst
! ------------------- Class methods for CallAst
! ------------------- Instance methods for CallAst
set compile_env: 0
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
set compile_env: 0
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
messagePrecedence

	^3
%
category: 'other'
method: CallAst
printSmalltalkOn: aStream

	aStream 
		nextPutAll: '(currentScope at: #';
		nextPutAll: function id;
		nextPut: $);
		nextPutAll: ' scope: currentScope positional: { ';
		yourself.

	arguments do: [ :each | 
		self smalltalkSourceFor: each parenthesisIf: 3 on: aStream.
		aStream nextPutAll: '. '.
	].

	aStream nextPutAll: '} named: '.

	keywords size > 0 ifTrue: [

		aStream nextPutAll: '{'.

		keywords keysAndValuesDo: [ :eachKey :eachValue |
			aStream 
				nextPutAll: ' #';
				nextPutAll: eachKey;
				nextPutAll: '->';
				yourself.

			self smalltalkSourceFor: eachValue parenthesisIf: 3 on: aStream.

			aStream nextPutAll: '. '.
		].

		aStream nextPutAll: '}'

	] ifFalse: [
		aStream nextPutAll: 'Array new'.
	].
%
