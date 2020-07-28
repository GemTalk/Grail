! ------------------- Remove existing behavior from ClassDefAst
expectvalue /Metaclass3       
doit
ClassDefAst removeAllMethods.
ClassDefAst class removeAllMethods.
%
! ------------------- Class methods for ClassDefAst
! ------------------- Instance methods for ClassDefAst
set compile_env: 0
category: 'other'
method: ClassDefAst
__str__
	"<class '__main__.MyClass'>"

	^(WriteStream on: PyString new)
		nextPutAll: '<class ''';
		nextPutAll: self module name;
		nextPut: $.;
		nextPutAll: name;
		nextPutAll: '''>';
		contents
%
category: 'other'
method: ClassDefAst
associationAt: aSymbol otherwise: anObject

	^body associationAt: aSymbol otherwise: anObject
%
category: 'other'
method: ClassDefAst
call: aSymbol withArguments: anArray keywords: aSymbolDictionary

	| methodAssoc |
	methodAssoc := self associationAt: aSymbol otherwise: nil.
	methodAssoc ifNil: [self error: 'method not found!'].
	^methodAssoc value
		callFromClass: self
		arguments: anArray
		keywords: aSymbolDictionary
%
category: 'other'
method: ClassDefAst
children

	^super children
		addAll: bases;
		addAll: keywords;
		add: body;
		addAll: decorator_list;
		yourself
%
category: 'other'
method: ClassDefAst
classAst

	^self
%
category: 'other'
method: ClassDefAst
evaluate
	"This executes the 'def' command, creating and saving the class with its name.
	We call super because we want to store the class definition in the parent's scope.
	Our scope is used to hold local variables."

	body evaluate.
	(assoc := super associationAt: name) value: self.
%
category: 'other'
method: ClassDefAst
initialize
	"ClassDef(identifier name, expr* bases, 
		keyword* keywords, stmt* body, expr* decorator_list)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := stream upTo: $'.
	self commaSpace.
	bases := self collectAst: [self expression].
	self commaSpace.
	keywords := self collectAst: [KeywordAst parent: self].
	self commaSpace.
	body := LocalScope parent: self.
	self commaSpace.
	decorator_list := self collectAst:[self expression].
	self readPosition.
%
category: 'other'
method: ClassDefAst
isInClass

	^true
%
category: 'other'
method: ClassDefAst
name

	^name
%
category: 'other'
method: ClassDefAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
%
category: 'other'
method: ClassDefAst
value: posArgs value: keywordArgs
	"args are the parameters while arguments are the values"

	| object result |
	object := PyObject new: self.
	result := object
		call: #'__init__'
		withArguments: posArgs
		keywords: keywordArgs.
	result ifNotNil: [TypeError signal: '__init__() should return None, not ?'].
	^object
%
