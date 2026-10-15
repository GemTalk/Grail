"https://docs.python.org/3/library/ast.html#ast.BitXor

Binary operator token for bitwise XOR (^).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitXorAst

"
Class {
	#name : 'BitXorAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
BitXorAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __xor__: '.

]
