"https://docs.python.org/3/library/ast.html#ast.Div

Binary operator token for division (/).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        DivAst

"
Class {
	#name : 'DivAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
DivAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __truediv__: '.

]
