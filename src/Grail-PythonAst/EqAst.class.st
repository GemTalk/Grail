"https://docs.python.org/3/library/ast.html#ast.Eq

Comparison operator token for equality (==).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        EqAst

"
Class {
	#name : 'EqAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
EqAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __eq__: '.

]
