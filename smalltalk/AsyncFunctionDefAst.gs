! ------------------- Remove existing behavior from AsyncFunctionDefAst
expectvalue /Metaclass3       
doit
AsyncFunctionDefAst removeAllMethods.
AsyncFunctionDefAst class removeAllMethods.
%
! ------------------- Class methods for AsyncFunctionDefAst
! ------------------- Instance methods for AsyncFunctionDefAst
set compile_env: 0
category: 'other'
method: AsyncFunctionDefAst
children

	^super children
		add: args;
		add: body;
		addAll: decorator_list;
		add: returns;
		yourself
%
category: 'other'
method: AsyncFunctionDefAst
initialize
	"AsyncFunctionDef(identifier name, arguments args,
							  stmt* body, expr* decorator_list, 
							  expr? returns)"

	| stream |
	stream := self stream.
	stream peekFor: $'.
	name := stream upTo: $'.
	self commaSpace.
	args := ArgumentsAst parent: self.
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace.
	decorator_list := self collectAst: [self expression].
	self commaSpace.
	returns := self optionalExpression.
	self readPosition.
%
