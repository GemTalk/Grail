! ------------------- Remove existing behavior from WhileAst
removeAllMethods WhileAst
removeAllClassMethods WhileAst
! ------------------- Class methods for WhileAst
! ------------------- Instance methods for WhileAst
set compile_env: 0
category: 'other'
method: WhileAst
initialize
	"While(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace.
	orelse := SuiteAst parent: self.
	self readPosition.
%
