! ------------------- Remove existing behavior from IfExpAst
removeallmethods IfExpAst
removeallclassmethods IfExpAst
! ------------------- Class methods for IfExpAst
! ------------------- Instance methods for IfExpAst
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
