! ------------------- Remove existing behavior from IfExpAst
expectvalue /Metaclass3
doit
IfExpAst removeAllMethods.
IfExpAst class removeAllMethods.
%
! ------------------- Class methods for IfExpAst
! ------------------- Instance methods for IfExpAst
set compile_env: 0
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
