! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnaryOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'UnaryOpAst'
  instVarNames: #( operand)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
UnaryOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.UnaryOp

A unary operation.

op is the operator (UAdd, USub, Not, or Invert).
operand is the operand.

Example:
>>> print(ast.dump(ast.parse(''-1'', mode=''eval''), indent=4))
Expression(
    body=UnaryOp(
        op=USub(),
        operand=Constant(value=1)))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        UnaryOpAst(op operand)
'
%

expectvalue /Class
doit
UnaryOpAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from UnaryOpAst
removeallmethods UnaryOpAst
removeallclassmethods UnaryOpAst

set compile_env: 0

category: 'Grail-other'
classmethod: UnaryOpAst
isAbstract

	^self == UnaryOpAst
%

category: 'Grail-other'
method: UnaryOpAst
printSmalltalkOn: aStream

	self error: 'UnaryOpAst is abstract; subclasses must implement printSmalltalkOn:'.
%
