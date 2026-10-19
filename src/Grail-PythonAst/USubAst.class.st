"https://docs.python.org/3/library/ast.html#ast.USub

Unary operator token for unary negation (-).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        USubAst

"
Class {
	#name : 'USubAst',
	#superclass : 'UnaryOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
USubAst >> ___irUnarySelector___ [
	^ #__neg__

]

{ #category : 'Grail-annotations' }
USubAst >> ___pythonUnaryGlyph___ [

	^ '-'

]

{ #category : 'Grail-other' }
USubAst >> printSmalltalkOn: aStream [

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __neg__'.

]
