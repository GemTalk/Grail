"https://docs.python.org/3/library/ast.html#ast.expr

Base class for all expression nodes in the AST.

Expressions are nodes that can be evaluated to produce a value.
All expression nodes inherit from this class.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst

"
Class {
	#name : 'ExpressionAst',
	#superclass : 'AbstractLocationNode',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
ExpressionAst class >> isAbstract [

	^self == ExpressionAst

]

{ #category : 'Grail-Code Generation' }
ExpressionAst >> ___addDeletedTargetsTo___: aCollection [
	"A name, attribute or subscript ``del'' target deletes itself; a tuple
	or list deletes its elements instead."

	aCollection add: self

]
