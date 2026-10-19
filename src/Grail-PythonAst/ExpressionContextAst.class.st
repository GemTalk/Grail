"https://docs.python.org/3/library/ast.html#ast.expr_context

Expression context base class. The context indicates whether the expression is being read (Load), written to (Store), or deleted (Del).

This is an abstract base class. The concrete subclasses are Load, Store, Del, and Param.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst

"
Class {
	#name : 'ExpressionContextAst',
	#superclass : 'AbstractNode',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
ExpressionContextAst class >> isAbstract [

	^self == ExpressionContextAst

]

{ #category : 'Grail-other' }
ExpressionContextAst >> assertIsLoad [

	self error: 'Expression Context should be <Load> but is <' , self class name , '>'.

]

{ #category : 'Grail-other' }
ExpressionContextAst >> assertIsStore [

	self error: 'Expression Context should be <Store> but is <' , self class name , '>'.

]

{ #category : 'Grail-other' }
ExpressionContextAst >> isStoreCtx [

	^false

]
