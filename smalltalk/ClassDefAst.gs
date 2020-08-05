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
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	| function |
	function := self get: aSymbol.
	^function
		callFromClass: self
		arguments: anArray
		keywords: aSymbolDictionary
		scope: aScope
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
evaluate: aScope

	aScope set: name to: self.
	scope := aScope inner.
	body evaluate: scope.
%
category: 'other'
method: ClassDefAst
get: aSymbol

	^scope get: aSymbol
%
category: 'other'
method: ClassDefAst
initialize
	"ClassDef(identifier name, expr* bases, 
		keyword* keywords, stmt* body, expr* decorator_list)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := (stream upTo: $') asSymbol.
	self commaSpace.
	bases := self collectAst: [self expression].
	self commaSpace.
	keywords := self collectAst: [KeywordAst parent: self].
	self commaSpace.
	BlockAst parent: self.	"calls back to set body"
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
setBlock: aBlockAst

	body := aBlockAst.
%
category: 'other'
method: ClassDefAst
value: posArgs value: keywordArgs value: aScope
	"args are the parameters while arguments are the values"

	| object result |
	object := PyObject new: self.
	result := object
		call: #'__init__'
		withArguments: posArgs
		keywords: keywordArgs
		scope: aScope.
	result ifNotNil: [TypeError signal: '__init__() should return None, not ?'].
	^object
%
