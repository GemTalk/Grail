! ------------------- Remove existing behavior from PyClassDef
expectvalue /Metaclass3       
doit
PyClassDef removeAllMethods.
PyClassDef class removeAllMethods.
%
! ------------------- Class methods for PyClassDef
! ------------------- Instance methods for PyClassDef
set compile_env: 0
category: 'other'
method: PyClassDef
_bases
	^ bases
%
category: 'other'
method: PyClassDef
_body
	^ body
%
category: 'other'
method: PyClassDef
_decorator_list
	^ decorator_list
%
category: 'other'
method: PyClassDef
_keywords
	^ keywords
%
category: 'other'
method: PyClassDef
_name
	^ name
%
category: 'other'
method: PyClassDef
initialize
	"ClassDef(identifier name, expr* bases, 
		keyword* keywords, stmt* body, expr* decorator_list)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := stream upTo: $'.
	self commaSpace.
	bases := self collectAst:[self expression].
	self commaSpace.
	keywords := self collectAst: [PyKeyword parent: self].
	self commaSpace.
	body := self suite.
	self commaSpace.
	decorator_list := self collectAst:[self expression].
	self readPosition.
%
