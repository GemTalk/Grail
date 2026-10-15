"https://docs.python.org/3/library/ast.html#ast.Pow

Binary operator token for exponentiation (**).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        PowAst

"
Class {
	#name : 'PowAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
PowAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __pow__: '.

]
