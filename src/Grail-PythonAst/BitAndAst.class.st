"https://docs.python.org/3/library/ast.html#ast.BitAnd

Binary operator token for bitwise AND (&).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitAndAst

"
Class {
	#name : 'BitAndAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
BitAndAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __and__: '.

]
