! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for OperatorAst
expectvalue /Class
doit
AbstractNode subclass: 'OperatorAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
OperatorAst comment:
'https://docs.python.org/3/library/ast.html#ast.operator

Binary operator base class.

This is an abstract base class for all binary operator tokens (Add, Sub, Mult, Div, Mod, Pow, LShift, RShift, BitOr, BitXor, BitAnd, FloorDiv, MatMult).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
'
%

expectvalue /Class
doit
OperatorAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from OperatorAst
removeallmethods OperatorAst
removeallclassmethods OperatorAst

set compile_env: 0

category: 'Grail-other'
classmethod: OperatorAst
isAbstract

	^self == OperatorAst
%
