! ------------------- Remove existing behavior from AsyncFunctionDefAst
removeAllMethods AsyncFunctionDefAst
removeAllClassMethods AsyncFunctionDefAst
! ------------------- Class methods for AsyncFunctionDefAst
! ------------------- Instance methods for AsyncFunctionDefAst
set compile_env: 0
category: 'other'
method: AsyncFunctionDefAst
initialize
	"AsyncFunctionDef(identifier name, arguments args,
                             stmt* body, expr* decorator_list, expr? returns,
                             string? type_comment)"

	| stream |
	stream := self stream.
	stream peekFor: $'.
	name := stream upTo: $'.
	self commaSpace.
	args := ArgumentsAst parent: self.
	self commaSpace.
	body := BlockAst parent: self.
	self commaSpace.
	decorator_list := self collectAst: [self expression].
	self commaSpace.
	returns := self optionalExpression.
	self commaSpace. 
	type_comment := self optionalString.
	self readPosition.
%
