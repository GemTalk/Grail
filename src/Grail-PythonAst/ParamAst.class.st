"https://docs.python.org/3/library/ast.html#ast.Param

Expression context for function parameters.

Used as the ctx field in Name nodes when the name is a function parameter.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        ParamAst

"
Class {
	#name : 'ParamAst',
	#superclass : 'ExpressionContextAst',
	#category : 'Grail-Parser'
}
