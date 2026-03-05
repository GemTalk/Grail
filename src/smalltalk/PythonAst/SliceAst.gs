! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for SliceAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'SliceAst'
  instVarNames: #( lower upper step)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SliceAst comment:
'https://docs.python.org/3/library/ast.html#ast.Slice

Regular slicing (on the form lower:upper or lower:upper:step).

Can occur only inside the slice field of Subscript, either directly or as an element of Tuple.

lower is the lower bound (None if omitted).
upper is the upper bound (None if omitted).
step is the step value (None if omitted).

Example:
>>> print(ast.dump(ast.parse(''a[1:2]'', mode=''eval''), indent=4))
Expression(
    body=Subscript(
        value=Name(id=''a'', ctx=Load()),
        slice=Slice(lower=Constant(value=1), upper=Constant(value=2)),
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      SliceAbstractAst
        SliceAst(lower upper step)
'
%

expectvalue /Class
doit
SliceAst category: 'Parser'
%

! ------------------- Remove existing behavior from SliceAst
removeallmethods SliceAst
removeallclassmethods SliceAst

set compile_env: 0

category: 'other'
method: SliceAst
printSmalltalkOn: aStream

	self halt.
%
