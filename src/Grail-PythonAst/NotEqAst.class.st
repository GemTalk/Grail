"https://docs.python.org/3/library/ast.html#ast.NotEq

Comparison operator token for inequality (!=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        NotEqAst

"
Class {
	#name : 'NotEqAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
NotEqAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __ne__: '.

]
