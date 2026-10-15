"https://docs.python.org/3/library/ast.html#ast.FloorDiv

Binary operator token for floor division (//).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        FloorDivAst

"
Class {
	#name : 'FloorDivAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
FloorDivAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __floordiv__: '.

]
