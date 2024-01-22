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
	(function decoratorList includes: #'staticmethod')
		ifTrue: [^function changeClassTo: StaticFunctionDefAst].
	(function decoratorList includes: #'classmethod')
		ifTrue: [^function changeClassTo: ClassFunctionDefAst].
	^function changeClassTo: InstanceFunctionDefAst
%
! ------------------- Instance methods for FunctionDefAst
set compile_env: 0
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
                       string? type_comment)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := (stream upTo: $') asSymbol.
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
		arg class == NoneType ifTrue: [
			aStream nextPutAll: 'None. '.
		] ifFalse: [
			self smalltalkSourceFor: arg parenthesisIf: 3 on:aStream.
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
		nextPutAll: 'currentScope at: ';
		nextPut: $#;
		nextPutAll: name asString;
		nextPutAll: ' put: (FunctionDef new params: ';
		yourself.

	self printArgList: args args on: aStream.
	aStream nextPutAll: '; kwonlyargs: '.
	self printArgList: args kwonlyargs on: aStream.
	aStream 
		nextPutAll: '; vararg: #'; 
		nextPutAll: ((args vararg class == NoneType) ifTrue: ['None'] ifFalse: [args vararg name]);
		nextPutAll: '; kwarg: #';
		nextPutAll: ((args kwarg class == NoneType) ifTrue: ['None'] ifFalse: [args kwarg name]);
		nextPutAll: '; kw_defaults: ';
		yourself.

	self printDefaultsList: args kw_defaults on: aStream.
	aStream nextPutAll: '; defaults: '.
	self printDefaultsList: args defaults on: aStream.

	aStream
		nextPutAll: '; block: [:currentScope |';
		lf;
		increaseIndent;
		yourself.

	self smalltalkSourceFor: body parenthesisIf: 4 on: aStream.

	aStream decreaseIndent.

	aStream
		nextPutAll: ']; yourself)';
		yourself.
%
category: 'other'
method: FunctionDefAst
setBlock: aBlockAst

	body := aBlockAst.
%
