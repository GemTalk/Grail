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
		replacement := dict new.
		keywords do: [:each | replacement set: each name to: each value].
		keywords := replacement.
	].
	self readPosition.
%
set compile_env: 0
