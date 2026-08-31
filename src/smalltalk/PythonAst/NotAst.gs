! ------------------- Superclass check
run
UnaryOpAst ifNil: [self error: 'UnaryOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NotAst
expectvalue /Class
doit
UnaryOpAst subclass: 'NotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NotAst comment:
'https://docs.python.org/3/library/ast.html#ast.Not

Unary operator token for logical negation (not).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        NotAst
'
%

expectvalue /Class
doit
NotAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from NotAst
removeallmethods NotAst
removeallclassmethods NotAst

set compile_env: 0

category: 'Grail-other'
method: NotAst
printSmalltalkOn: aStream
	"Python ``not x`` coerces x to a Boolean via truthiness rules first,
	then negates.  Emitting `x @env0:not` works for actual Booleans but
	fails for any other type (Integer, String, OrderedCollection, ...)
	because those don't implement `not`.  Funnel through ___isTruthy___
	so the negation works on any operand."

	aStream nextPutAll: '('.
	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___) @env0:not'.
%

category: 'Grail-annotations'
method: NotAst
___pythonUnaryGlyph___

	^ 'not '
%

category: 'Grail-IR Codegen'
method: NotAst
___irEligibleValueLocals___: localNames
	"``not x'' -- unlike the dunder unary ops, this is a truthiness-then-negate
	pair, so it overrides UnaryOpAst's selector-based default."

	^ operand ___irEligibleValueLocals___: localNames
%

category: 'Grail-IR Codegen'
method: NotAst
___emitIRValueOn___: aBuilder
	"``((x) ___isTruthy___) @env0:not'' -- printSmalltalkOn:'s shape: coerce by
	Python truthiness (env 1), then negate the Boolean (env 0)."

	| truthy |
	truthy := aBuilder
		send: #'___isTruthy___'
		to: (operand ___emitIRValueOn___: aBuilder)
		with: { }.
	aBuilder at: self beginPosition.
	^ aBuilder send: #not to: truthy with: { } env: 0
%
