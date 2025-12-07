! ------------------- Remove existing behavior from AsyncForAst
removeallmethods AsyncForAst
removeallclassmethods AsyncForAst
! ------------------- Class methods for AsyncForAst
! ------------------- Instance methods for AsyncForAst
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
	self commaSpace. 
	type_comment := self optionalString.
	self readPosition.
%
