"https://docs.python.org/3/library/ast.html#ast.And

Boolean operator token for 'and'.

Used as the op field in BoolOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
          AndAst

"
Class {
	#name : 'AndAst',
	#superclass : 'BoolOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
AndAst >> ___irBoolHelperSelector___ [
	^ #'___pyAnd___:'

]
