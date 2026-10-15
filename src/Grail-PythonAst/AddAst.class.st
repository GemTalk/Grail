"https://docs.python.org/3/library/ast.html#ast.Add

Binary operator token for addition (+).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        AddAst

"
Class {
	#name : 'AddAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
AddAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __add__: '.

]
