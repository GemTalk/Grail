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

	function printSmalltalkOn: aStream.
	self halt.
	arguments isEmpty ifTrue: [
		aStream nextPutAll: ' value.'.
		^self
	].
	arguments do: [:each |
		aStream nextPutAll: ' value: '.
		each printSmalltalkOn: aStream.
	].
	aStream nextPut: $..
%
