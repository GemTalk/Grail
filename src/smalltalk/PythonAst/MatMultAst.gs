! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatMultAst
expectvalue /Class
doit
OperatorAst subclass: 'MatMultAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MatMultAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatMult

Binary operator token for matrix multiplication (@).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        MatMultAst
'
%

expectvalue /Class
doit
MatMultAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from MatMultAst
removeallmethods MatMultAst
removeallclassmethods MatMultAst
set compile_env: 0

category: 'Grail-code generation'
method: MatMultAst
printSmalltalkOn: aStream
	"Python ``@`` matrix-mul binary operator — dispatches to the
	standard ``__matmul__:`` method on the left operand.  Grail has
	no matrix type out of the box but the codegen needs to compile
	cleanly for modules that mention ``@`` in passing (Jinja2's
	nodes.py touches the operator dict)."

	aStream nextPutAll: ' __matmul__: '.
%
