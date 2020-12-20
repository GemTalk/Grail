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
evaluate: aScope
	"https://docs.python.org/3/reference/expressions.html#calls"

	^
	[ [ [
	function
		callWithArguments: (arguments collect: [:each | each evaluate: aScope]) 
		keywords: keywords
		scope: aScope
	] on: AlmostOutOfStack do: [ :ex |
	        ex resignalAs: RecursionError new
	] ] on: MessageNotUnderstood do: [ :ex |
	        TypeError signal: 'bad operand type for ', ex selector asString, '(): ', ex receiver asString "could be translated wrong"
	] ] on: ImproperOperation do: [ :ex |
	        ValueError signal: 'TODO' "need to specify message"
	]
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
		replacement := dict new.
		keywords do: [:each | replacement set: each name to: each value].
		keywords := replacement.
	].
	self readPosition.
%
set compile_env: 0
category: 'Updating'
method: CallAst
arguments: newValue
	arguments := newValue
%
category: 'Updating'
method: CallAst
function: newValue
	function := newValue
%
category: 'Updating'
method: CallAst
keywords: newValue
	keywords := newValue
%
