"https://docs.python.org/3/library/ast.html#ast.Gt

Comparison operator token for greater than (>).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        GtAst

"
Class {
	#name : 'GtAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
GtAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __gt__: '.

]
