! ------------------- Remove existing behavior from WithAst
removeallmethods WithAst
removeallclassmethods WithAst
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
