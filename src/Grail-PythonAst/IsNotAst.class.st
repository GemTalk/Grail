"https://docs.python.org/3/library/ast.html#ast.IsNot

Comparison operator token for negative identity test (is not).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        IsNotAst

"
Class {
	#name : 'IsNotAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
IsNotAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' ~~ '.

]
