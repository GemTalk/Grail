"https://docs.python.org/3/library/ast.html#ast.Or

Boolean operator token for 'or'.

Used as the op field in BoolOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
          OrAst

"
Class {
	#name : 'OrAst',
	#superclass : 'BoolOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
OrAst >> ___irBoolHelperSelector___ [
	^ #'___pyOr___:'

]
