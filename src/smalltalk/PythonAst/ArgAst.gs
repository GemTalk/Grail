! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for ArgAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ArgAst'
  instVarNames: #( arg annotation type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ArgAst comment:
'https://docs.python.org/3/library/ast.html#ast.arg

A single argument in a function argument list.

arg is a raw string of the argument name.
annotation is its annotation, such as a Name node.
type_comment is an optional string with the type annotation as a comment.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ArgAst(arg annotation type_comment)
'
%

expectvalue /Class
doit
ArgAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ArgAst
removeallmethods ArgAst
removeallclassmethods ArgAst

set compile_env: 0

category: 'Grail-other'
method: ArgAst
name

	^arg
%

category: 'Grail-other'
method: ArgAst
annotation
	"The parameter's annotation expression AST (or nil).  Read by
	FunctionDefAst when building a function's __annotations__ dict."

	^annotation
%

category: 'Grail-other'
method: ArgAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: arg;
		nextPut: $);
		yourself.
%

category: 'Grail-other'
method: ArgAst
setTo: anObject scope: aScope

	aScope set: arg to: anObject.
%
