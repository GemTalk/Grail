! ------------------- Remove existing behavior from AsyncWithAst
expectvalue /Metaclass3       
doit
AsyncWithAst removeAllMethods.
AsyncWithAst class removeAllMethods.
%
! ------------------- Class methods for AsyncWithAst
! ------------------- Instance methods for AsyncWithAst
set compile_env: 0
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
