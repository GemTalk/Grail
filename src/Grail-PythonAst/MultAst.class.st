"https://docs.python.org/3/library/ast.html#ast.Mult

Binary operator token for multiplication (*).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        MultAst

"
Class {
	#name : 'MultAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
MultAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __mul__: '.

]
