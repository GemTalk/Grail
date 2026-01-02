! ------------------- Remove existing behavior from WithAst
removeallmethods WithAst
removeallclassmethods WithAst
set compile_env: 0
! ------------------- Class methods for WithAst
! ------------------- Instance methods for WithAst
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
category: 'other'
method: WithAst
printSmalltalkOn: aStream

	self halt.
%
