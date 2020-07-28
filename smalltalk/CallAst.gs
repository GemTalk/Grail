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
evaluate
	"https://docs.python.org/3/reference/expressions.html#calls"

	^function
		callWithArguments: (arguments collect: [:each | each evaluate]) 
		keywords: (keywords collect: [:each | each evaluate])
%
category: 'other'
method: CallAst
initialize
	"Call(expr func, expr* args, keyword* keywords)"

	| dict |
	function := self expression.
	self commaSpace.
	arguments := self collectAst: [self expression].
	self commaSpace.
	keywords := self collectAst: [KeywordAst parent: self].
	(keywords size == 1 and: [keywords first name isNil]) ifTrue: [
		keywords := KeywordsAst from: keywords.
	] ifFalse: [
		dict := SymbolDictionary new.
		keywords do: [:each | dict at: each name put: each value].
		keywords := dict.
	].
	self readPosition.
%
