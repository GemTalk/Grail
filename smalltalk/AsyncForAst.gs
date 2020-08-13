! ------------------- Remove existing behavior from AsyncForAst
expectvalue /Metaclass3       
doit
AsyncForAst removeAllMethods.
AsyncForAst class removeAllMethods.
%
! ------------------- Class methods for AsyncForAst
! ------------------- Instance methods for AsyncForAst
set compile_env: 0
category: 'other'
method: AsyncForAst
initialize
	"AsyncFor(expr target, expr iter, stmt* body, stmt* orelse)"

	target := self expression.
	self commaSpace.
	iter := self expression.
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace.
	orelse := SuiteAst parent: self.
	self readPosition.
%
