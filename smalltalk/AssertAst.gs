! ------------------- Remove existing behavior from AssertAst
removeAllMethods AssertAst
removeAllClassMethods AssertAst
! ------------------- Class methods for AssertAst
! ------------------- Instance methods for AssertAst
set compile_env: 0
category: 'other'
method: AssertAst
initialize
	"Assert(expr test, expr? msg)"

	test := self expression. 
	self commaSpace.
	msg := self optionalExpression.
	self readPosition.
%
