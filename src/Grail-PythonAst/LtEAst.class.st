"https://docs.python.org/3/library/ast.html#ast.LtE

Comparison operator token for less than or equal (<=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        LtEAst

"
Class {
	#name : 'LtEAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
LtEAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __le__: '.

]
