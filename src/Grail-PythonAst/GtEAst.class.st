"https://docs.python.org/3/library/ast.html#ast.GtE

Comparison operator token for greater than or equal (>=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        GtEAst

"
Class {
	#name : 'GtEAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
GtEAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __ge__: '.

]
