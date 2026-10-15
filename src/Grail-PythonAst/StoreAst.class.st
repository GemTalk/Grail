"https://docs.python.org/3/library/ast.html#ast.Store

Expression context for writing/storing a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being assigned to.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        StoreAst

"
Class {
	#name : 'StoreAst',
	#superclass : 'ExpressionContextAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
StoreAst >> assertIsStore [
	"Overide to avoid error"

]

{ #category : 'Grail-other' }
StoreAst >> isStoreCtx [

	^true

]
