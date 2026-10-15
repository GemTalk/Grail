"https://docs.python.org/3/library/ast.html#ast.Invert

Unary operator token for bitwise inversion (~).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        InvertAst

"
Class {
	#name : 'InvertAst',
	#superclass : 'UnaryOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
InvertAst >> ___irUnarySelector___ [
	^ #__invert__

]

{ #category : 'Grail-annotations' }
InvertAst >> ___pythonUnaryGlyph___ [

	^ '~'

]

{ #category : 'Grail-other' }
InvertAst >> printSmalltalkOn: aStream [

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __invert__'.

]
