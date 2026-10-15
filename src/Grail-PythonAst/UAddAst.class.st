"https://docs.python.org/3/library/ast.html#ast.UAdd

Unary operator token for unary positive (+).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        UAddAst

"
Class {
	#name : 'UAddAst',
	#superclass : 'UnaryOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
UAddAst >> ___irUnarySelector___ [
	^ #__pos__

]

{ #category : 'Grail-annotations' }
UAddAst >> ___pythonUnaryGlyph___ [

	^ '+'

]

{ #category : 'Grail-other' }
UAddAst >> printSmalltalkOn: aStream [

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __pos__'.

]
