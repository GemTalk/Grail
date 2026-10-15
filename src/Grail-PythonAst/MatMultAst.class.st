"https://docs.python.org/3/library/ast.html#ast.MatMult

Binary operator token for matrix multiplication (@).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        MatMultAst

"
Class {
	#name : 'MatMultAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-code generation' }
MatMultAst >> printSmalltalkOn: aStream [
	"Python ``@`` matrix-mul binary operator — dispatches to the
	standard ``__matmul__:`` method on the left operand.  Grail has
	no matrix type out of the box but the codegen needs to compile
	cleanly for modules that mention ``@`` in passing (Jinja2's
	nodes.py touches the operator dict)."

	aStream nextPutAll: ' __matmul__: '.

]
