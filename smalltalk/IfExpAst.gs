! ------------------- Remove existing behavior from IfExpAst
removeAllMethods IfExpAst
removeAllClassMethods IfExpAst
! ------------------- Class methods for IfExpAst
! ------------------- Instance methods for IfExpAst
set compile_env: 0
category: 'other'
method: IfExpAst
evaluate: aScope

	| value |
	value := test evaluate: aScope.
	(value isKindOf: Boolean) ifFalse: [value halt].
	value
		ifTrue: [body evaluate: aScope]
		ifFalse: [orelse evaluate: aScope].
%
category: 'other'
method: IfExpAst
initialize
	"IfExp(expr test, expr body, expr orelse)"

	test := self expression.
	self commaSpace.
	body := self expression.
	self commaSpace.
	orelse := self expression.
	self readPosition.
%
