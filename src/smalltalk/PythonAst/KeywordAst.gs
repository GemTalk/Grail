! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for KeywordAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'KeywordAst'
  instVarNames: #( arg value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
KeywordAst comment:
'https://docs.python.org/3/library/ast.html#ast.keyword

A keyword argument to a function call or class definition.

arg is a raw string of the parameter name (can be None for **kwargs).
value is the expression passed for the argument.

Example:
>>> print(ast.dump(ast.parse(''func(a=1, **kwargs)'', mode=''eval''), indent=4))
Expression(
    body=Call(
        func=Name(id=''func'', ctx=Load()),
        args=[],
        keywords=[
            keyword(arg=''a'', value=Constant(value=1)),
            keyword(arg=None, value=Name(id=''kwargs'', ctx=Load()))]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      KeywordAst(arg value)
'
%

expectvalue /Class
doit
KeywordAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from KeywordAst
removeallmethods KeywordAst
removeallclassmethods KeywordAst

set compile_env: 0

category: 'Grail-other'
method: KeywordAst
name

	^arg
%

category: 'Grail-other'
method: KeywordAst
value

	^value
%
