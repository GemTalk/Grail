"https://docs.python.org/3/library/ast.html#ast.Mod

Binary operator token for modulo (%).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        ModAst

"
Class {
	#name : 'ModAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
ModAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __mod__: '.

]
