! ------------------- Remove existing behavior from AsyncWithAst
removeallmethods AsyncWithAst
removeallclassmethods AsyncWithAst
! ------------------- Class methods for AsyncWithAst
! ------------------- Instance methods for AsyncWithAst
category: 'other'
method: AsyncWithAst
initialize
	"AsyncWith(withitem* items, stmt* body, string? type_comment)"

	items := self collectAst: [WithItemAst parent: self].
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace. 
	type_comment := self optionalString.
	self readPosition.
%
