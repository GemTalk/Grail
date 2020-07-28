! ------------------- Remove existing behavior from FunctionDefAst
expectvalue /Metaclass3       
doit
FunctionDefAst removeAllMethods.
FunctionDefAst class removeAllMethods.
%
! ------------------- Class methods for FunctionDefAst
set compile_env: 0
category: 'other'
classmethod: FunctionDefAst
parent: anAstNode

	| function | 
	function := super parent: anAstNode.
	anAstNode isInClass ifFalse: [^function].
	(function decoratorList includes: #'classmethod')
		ifTrue: [function changeClassTo: ClassFunctionDefAst]
		ifFalse: [function changeClassTo: InstanceFunctionDefAst].
	^function
%
! ------------------- Instance methods for FunctionDefAst
set compile_env: 0
category: 'other'
method: FunctionDefAst
associationAt: aSymbol

	^body associationAt: aSymbol
%
category: 'other'
method: FunctionDefAst
children

	^super children
		add: args;
		add: body;
		"addAll: decorator_list;"	"I think these are all strings (converted to Symbols)"
		add: returns;
		yourself
%
category: 'other'
method: FunctionDefAst
decoratorList

	^decorator_list
%
category: 'other'
method: FunctionDefAst
evaluate
	"This executes the 'def' command, creating and saving the function with its name.
	We call super because we want to store the function definition in the parent's scope.
	Our scope is used to hold local variables."

	 (assoc := super associationAt: name) value: self.
%
category: 'other'
method: FunctionDefAst
initialize
	"FunctionDef(identifier name, arguments args, stmt* body, expr* decorator_list, expr? returns)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := (stream upTo: $') asSymbol.
	self commaSpace.
	args := ArgumentsAst parent: self.
	self commaSpace.
	body := LocalScope parent: self.
	self commaSpace.
	decorator_list :=  self collectAst: [self expression id].
	self commaSpace.
	returns := self optionalExpression.
	self readPosition.
%
category: 'other'
method: FunctionDefAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
%
category: 'other'
method: FunctionDefAst
value: arguments value: keywords
	"args are the parameters while arguments are the values"

	args setValues: arguments.
	^body evaluate
%
