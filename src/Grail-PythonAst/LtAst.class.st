"https://docs.python.org/3/library/ast.html#ast.Lt

Comparison operator token for less than (<).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        LtAst

"
Class {
	#name : 'LtAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
LtAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __lt__: '.

]
