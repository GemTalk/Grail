"https://docs.python.org/3/library/ast.html#ast.LShift

Binary operator token for left bit shift (<<).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        LShiftAst

"
Class {
	#name : 'LShiftAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
LShiftAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __lshift__: '.

]
