! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for JoinedStrAst
expectvalue /Class
doit
ExpressionAst subclass: 'JoinedStrAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
JoinedStrAst comment:
'https://docs.python.org/3/library/ast.html#ast.JoinedStr

An f-string, comprising a series of FormattedValue and Constant nodes.

values is a list of nodes that make up the f-string.

Example:
>>> print(ast.dump(ast.parse(''f"sin({a}) is {sin(a):.3}"'', mode=''eval''), indent=4))
Expression(
    body=JoinedStr(
        values=[
            Constant(value=''sin(''),
            FormattedValue(value=Name(id=''a'', ctx=Load()), conversion=-1),
            Constant(value='') is ''),
            FormattedValue(value=Call(...), conversion=-1, format_spec=...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        JoinedStrAst(values)
'
%

expectvalue /Class
doit
JoinedStrAst category: 'Parser'
%

! ------------------- Remove existing behavior from JoinedStrAst
removeallmethods JoinedStrAst
removeallclassmethods JoinedStrAst
set compile_env: 0
! ------------------- Class methods for JoinedStrAst
! ------------------- Instance methods for JoinedStrAst
