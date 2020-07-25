! ------------------- Remove existing behavior from AssertAst
expectvalue /Metaclass3       
doit
AssertAst removeAllMethods.
AssertAst class removeAllMethods.
%
! ------------------- Class methods for AssertAst
! ------------------- Instance methods for AssertAst
set compile_env: 0
category: 'other'
method: AssertAst
children

	^super children
		add: msg;
		add: test;
		yourself
%
category: 'other'
method: AssertAst
initialize
	"Assert(expr test, expr? msg)"

	test := self expression. 
	self commaSpace.
	msg := self optionalExpression.
	self readPosition.
%
