"https://docs.python.org/3/library/ast.html#ast.Not

Unary operator token for logical negation (not).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        NotAst

"
Class {
	#name : 'NotAst',
	#superclass : 'UnaryOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
NotAst >> ___emitIRValueOn___: aBuilder [
	"``((x) ___isTruthy___) @env0:not'' -- printSmalltalkOn:'s shape: coerce by
	Python truthiness (env 1), then negate the Boolean (env 0)."

	| truthy |
	truthy := aBuilder
		send: #'___isTruthy___'
		to: (operand ___emitIRValueOn___: aBuilder)
		with: { }.
	aBuilder atNode: self.
	^ aBuilder send: #not to: truthy with: { } env: 0

]

{ #category : 'Grail-IR Codegen' }
NotAst >> ___irEligibleValueLocals___: localNames [
	"``not x'' -- unlike the dunder unary ops, this is a truthiness-then-negate
	pair, so it overrides UnaryOpAst's selector-based default."

	^ operand ___irEligibleValueLocals___: localNames

]

{ #category : 'Grail-annotations' }
NotAst >> ___pythonUnaryGlyph___ [

	^ 'not '

]

{ #category : 'Grail-other' }
NotAst >> printSmalltalkOn: aStream [
	"Python ``not x`` coerces x to a Boolean via truthiness rules first,
	then negates.  Emitting `x @env0:not` works for actual Booleans but
	fails for any other type (Integer, String, OrderedCollection, ...)
	because those don't implement `not`.  Funnel through ___isTruthy___
	so the negation works on any operand."

	aStream nextPutAll: '('.
	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___) @env0:not'.

]
