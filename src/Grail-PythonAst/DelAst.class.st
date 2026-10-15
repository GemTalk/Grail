"https://docs.python.org/3/library/ast.html#ast.Del

Expression context for deleting a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being deleted.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        DelAst

"
Class {
	#name : 'DelAst',
	#superclass : 'ExpressionContextAst',
	#category : 'Grail-Parser'
}
