! ------------------- Remove existing behavior from PyAsyncFunctionDef
expectvalue /Metaclass3       
doit
PyAsyncFunctionDef removeAllMethods.
PyAsyncFunctionDef class removeAllMethods.
%
! ------------------- Class methods for PyAsyncFunctionDef
! ------------------- Instance methods for PyAsyncFunctionDef
set compile_env: 0
category: 'other'
method: PyAsyncFunctionDef
_args
	^ args
%
category: 'other'
method: PyAsyncFunctionDef
_body
	^ body
%
category: 'other'
method: PyAsyncFunctionDef
_decorator_list
	^ decorator_list
%
category: 'other'
method: PyAsyncFunctionDef
_name
	^ name
%
category: 'other'
method: PyAsyncFunctionDef
_returns
	^ returns
%
category: 'other'
method: PyAsyncFunctionDef
children

	^super children
		add: args;
		add: body;
		addAll: decorator_list;
		add: returns;
		yourself
%
category: 'other'
method: PyAsyncFunctionDef
initialize
	"AsyncFunctionDef(identifier name, arguments args,
							  stmt* body, expr* decorator_list, 
							  expr? returns)"

	| stream |
	stream := self stream.
	stream peekFor: $'.
	name := stream upTo: $'.
	self commaSpace.
	args := PyArguments parent: self.
	self commaSpace.
	body := PySuite parent: self.
	self commaSpace.
	decorator_list := self collectAst: [self expression].
	self commaSpace.
	returns := self optionalExpression.
	self readPosition.
%
