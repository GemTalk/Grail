! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptHandlerAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ExceptHandlerAst'
  instVarNames: #( type name body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ExceptHandlerAst comment:
'https://docs.python.org/3/library/ast.html#ast.ExceptHandler

An exception handler in a try statement.

type is the exception type to catch (can be None for bare except).
name is the optional identifier to bind the exception to.
body is a list of statements in the exception handler.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExceptHandlerAst(type name body)
'
%

expectvalue /Class
doit
ExceptHandlerAst category: 'Parser'
%

! ------------------- Remove existing behavior from ExceptHandlerAst
removeallmethods ExceptHandlerAst
removeallclassmethods ExceptHandlerAst

set compile_env: 0

category: 'initialization'
method: ExceptHandlerAst
setParent: aNode

	super setParent: aNode.
	name ifNotNil: [
		self declareVariable: name.
	].
%

category: 'other'
method: ExceptHandlerAst
body

	^body
%

category: 'other'
method: ExceptHandlerAst
name

	^name
%

category: 'other'
method: ExceptHandlerAst
type

	^type
%
