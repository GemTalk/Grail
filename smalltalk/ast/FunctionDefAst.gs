! ------------------- Remove existing behavior from FunctionDefAst
removeallmethods FunctionDefAst
removeallclassmethods FunctionDefAst
set compile_env: 0
! ------------------- Class methods for FunctionDefAst
category: 'other'
classmethod: FunctionDefAst
parent: anAstNode

	| function |
	function := super parent: anAstNode.
	anAstNode isInClass ifFalse: [^function].
	(function decoratorList includes: #'staticmethod')
		ifTrue: [^function changeClassTo: StaticFunctionDefAst].
	(function decoratorList includes: #'classmethod')
		ifTrue: [^function changeClassTo: ClassFunctionDefAst].
	^function changeClassTo: InstanceFunctionDefAst
%
! ------------------- Instance methods for FunctionDefAst
category: 'other'
method: FunctionDefAst
addVariableNamesTo: aStream

	aStream nextPutAll: name; space
%
category: 'other'
method: FunctionDefAst
decoratorList

	^decorator_list
%
category: 'other'
method: FunctionDefAst
initialize
	"FunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns,
                       string? type_comment, type_param* type_params)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := (stream upTo: $') asSymbol.
	self declareVariable: name.
	self commaSpace.
	args := ArgumentsAst parent: self.
	self commaSpace.
	BlockAst parent: self.	"calls back to set body"
	self commaSpace.
	decorator_list :=  self collectAst: [self expression id].
	self commaSpace.
	returns := self optionalExpression.
	self commaSpace.
	type_comment := self optionalString.
	self commaSpace.
	type_params := self collectAst: [self typeParams].
	self readPosition.
%
category: 'other'
method: FunctionDefAst
name

	^name
%
category: 'other'
method: FunctionDefAst
printArgList: anArray on: aStream

	
	aStream nextPutAll: '{ '.
	anArray do: [:arg |
		aStream
			nextPut: $#;
			nextPutAll: arg name;
			nextPutAll: '. ';
			yourself.
	].
	aStream nextPut: $}.
%
category: 'other'
method: FunctionDefAst
printDefaultsList: anArray on: aStream

	
	aStream nextPutAll: '{ '.
	anArray do: [:arg |
		arg == None ifTrue: [
			aStream nextPutAll: 'None. '.
		] ifFalse: [
			arg printSmalltalkWithParenthesisOn: aStream.
			aStream
				nextPutAll: '. ';
				yourself.
		].
	].
	aStream nextPut: $}.
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
printSmalltalkOn: aStream

	aStream 
		nextPutAll: name; 
		nextPutAll: ' := [:positional :keyword |';
		lf;
		increaseIndent.
	args args notEmpty ifTrue: [
		aStream nextPutAll: '| '.
		args args do: [:arg |
			aStream nextPutAll: arg name; space.
		].
		aStream nextPut: $|; lf.
		1 to: args args size do: [:i | 
			| arg |
			arg := args args at: i.
			aStream 
				nextPutAll: arg name;
				nextPutAll: ' := positional ___at___: ';
				print: i;
				nextPut: $.;
				lf.
		].
	].
	aStream 
		nextPut: $[; 
		lf; 
		increaseIndent.
	body printSmalltalkOn: aStream.
	aStream 
		decreaseIndent; 
		nextPutAll: '] value.';
		lf.
	aStream decreaseIndent; nextPutAll: '].'.
%
category: 'other'
method: FunctionDefAst
setBlock: aBlockAst

	body := aBlockAst.
%
