"https://docs.python.org/3/library/ast.html#ast.RShift

Binary operator token for right bit shift (>>).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        RShiftAst

"
Class {
	#name : 'RShiftAst',
	#superclass : 'OperatorAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
RShiftAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: ' __rshift__: '.

]
