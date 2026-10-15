"https://docs.python.org/3/library/ast.html#ast.BitOr

Binary operator token for bitwise OR (|).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitOrAst

"
Class {
	#name : 'BitOrAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
BitOrAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __or__: '.

]
