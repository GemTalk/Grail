! ------------------- Remove existing behavior from AsyncFunctionDefAst
removeallmethods AsyncFunctionDefAst
removeallclassmethods AsyncFunctionDefAst
set compile_env: 0
! ------------------- Class methods for AsyncFunctionDefAst
! ------------------- Instance methods for AsyncFunctionDefAst
category: 'other'
method: AsyncFunctionDefAst
initialize
	"AsyncFunctionDef(identifier name, arguments args,
                             stmt* body, expr* decorator_list, expr? returns,
                             string? type_comment, type_param* type_params)"

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
	self commaSpace.
	type_params := self collectAst: [self typeParams].
	self readPosition.
%
