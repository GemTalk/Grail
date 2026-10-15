"Grail-specific helper class for managing keyword arguments.

This is not a standard Python AST node, but a Grail implementation detail for managing collections of keyword arguments in function calls.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        NameAst(assoc id ctx)
          KeywordsAst

"
Class {
	#name : 'KeywordsAst',
	#superclass : 'NameAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
KeywordsAst class >> from: anArray [

	^anArray first value changeClassTo: self

]

{ #category : 'Grail-other' }
KeywordsAst >> do: aBlock [
	"provide the protocol of a SymbolDictionary"

	aBlock value: self.

]
