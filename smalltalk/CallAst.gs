! ------------------- Remove existing behavior from CallAst
expectvalue /Metaclass3       
doit
CallAst removeAllMethods.
CallAst class removeAllMethods.
%
! ------------------- Class methods for CallAst
! ------------------- Instance methods for CallAst
set compile_env: 0
category: 'other'
method: CallAst
children

	^super children
		addAll: arguments;
		add: function;
		addAll: keywords;
		yourself
%
category: 'other'
method: CallAst
evaluate: aScope
	"https://docs.python.org/3/reference/expressions.html#calls"

	^
	[ [ [
	function
		callWithArguments: (arguments collect: [:each | each evaluate: aScope]) 
		keywords: (keywords collect: [:each | each evaluate: aScope])
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
		replacement := SymbolDictionary new.
		keywords do: [:each | replacement at: each name put: each value].
		keywords := replacement.
	].
	self readPosition.
%
