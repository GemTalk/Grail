"https://docs.python.org/3/library/ast.html#ast.operator

Binary operator base class.

This is an abstract base class for all binary operator tokens (Add, Sub, Mult, Div, Mod, Pow, LShift, RShift, BitOr, BitXor, BitAnd, FloorDiv, MatMult).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode
    AbstractLocationNode
      OperatorAst

"
Class {
	#name : 'OperatorAst',
	#superclass : 'AbstractLocationNode',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
OperatorAst class >> isAbstract [

	^self == OperatorAst

]
