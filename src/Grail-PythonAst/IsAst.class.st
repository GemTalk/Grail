"https://docs.python.org/3/library/ast.html#ast.Is

Comparison operator token for identity test (is).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        IsAst

"
Class {
	#name : 'IsAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
IsAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' == '.

]
