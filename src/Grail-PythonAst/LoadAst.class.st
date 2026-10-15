"https://docs.python.org/3/library/ast.html#ast.Load

Expression context for reading/loading a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being read.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        LoadAst

"
Class {
	#name : 'LoadAst',
	#superclass : 'ExpressionContextAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
LoadAst >> assertIsLoad [
	"Override to avoid inherited error"

]
