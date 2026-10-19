"https://docs.python.org/3/library/ast.html#ast.Sub

Binary operator token for subtraction (-).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        SubAst

"
Class {
	#name : 'SubAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
SubAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __sub__: '.

]
