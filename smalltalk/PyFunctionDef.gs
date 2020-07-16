! ------------------- Remove existing behavior from PyFunctionDef
expectvalue /Metaclass3       
doit
PyFunctionDef removeAllMethods.
PyFunctionDef class removeAllMethods.
%
! ------------------- Class methods for PyFunctionDef
! ------------------- Instance methods for PyFunctionDef
set compile_env: 0
category: 'other'
method: PyFunctionDef
associationAt: aSymbol

	^body associationAt: aSymbol
%
category: 'other'
method: PyFunctionDef
callWith: arguments keywords: keywords
	"args are the parameters while arguments are the values"

	args setValues: (arguments collect: [:each | each evaluate]).
	^body evaluate
%
category: 'other'
method: PyFunctionDef
children

	^super children
		add: args;
		add: body;
		addAll: decorator_list;
		add: returns;
		yourself
%
category: 'other'
method: PyFunctionDef
evaluate
	"This executes the 'def' command, creating and saving the function with its name.
	We call super because we want to store the function definition in the parent's scope.
	Our scope is used to hold local variables."

	 (assoc := super associationAt: name asSymbol) value: self.
%
category: 'other'
method: PyFunctionDef
initialize
	"FunctionDef(identifier name, arguments args, stmt* body, expr* decorator_list, expr? returns)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := stream upTo: $'.
	self commaSpace.
	args := PyArguments parent: self.
	self commaSpace.
	body := LocalScope parent: self.
	self commaSpace.
	decorator_list :=  self collectAst: [self expression].
	self commaSpace.
	returns := self optionalExpression.
	self readPosition.
%
