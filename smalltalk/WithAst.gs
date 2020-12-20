! ------------------- Remove existing behavior from WithAst
removeAllMethods WithAst
removeAllClassMethods WithAst
! ------------------- Class methods for WithAst
! ------------------- Instance methods for WithAst
set compile_env: 0
category: 'other'
method: WithAst
initialize
	"AsyncWith(withitem* items, stmt* body, string? type_comment)"

	items := self collectAst: [WithItemAst parent: self].
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace. 
	type_comment := self optionalString.
	self readPosition.
%
