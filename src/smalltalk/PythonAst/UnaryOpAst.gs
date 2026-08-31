! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnaryOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'UnaryOpAst'
  instVarNames: #( operand)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
UnaryOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.UnaryOp

A unary operation.

op is the operator (UAdd, USub, Not, or Invert).
operand is the operand.

Example:
>>> print(ast.dump(ast.parse(''-1'', mode=''eval''), indent=4))
Expression(
    body=UnaryOp(
        op=USub(),
        operand=Constant(value=1)))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        UnaryOpAst(op operand)
'
%

expectvalue /Class
doit
UnaryOpAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from UnaryOpAst
removeallmethods UnaryOpAst
removeallclassmethods UnaryOpAst

set compile_env: 0

category: 'Grail-other'
classmethod: UnaryOpAst
isAbstract

	^self == UnaryOpAst
%

category: 'Grail-other'
method: UnaryOpAst
printSmalltalkOn: aStream

	self error: 'UnaryOpAst is abstract; subclasses must implement printSmalltalkOn:'.
%
method: UnaryOpAst
operand
	^operand
%
method: UnaryOpAst
operand: newValue
	operand := newValue
%

category: 'Grail-annotations'
method: UnaryOpAst
___defaultSourceString___
	"``-5'' is an ordinary default and fell to the ``<annotation>'' placeholder,
	because a unary operator never appears in the annotation subset the shared
	unparser was written for.

	UnaryOpAst is ABSTRACT, so the glyph comes from the subclass rather than from
	an ``op'' instance variable -- there is none, unlike BinOpAst."

	^ self ___pythonUnaryGlyph___ , (operand ___defaultSourceString___)
%

category: 'Grail-annotations'
method: UnaryOpAst
___pythonUnaryGlyph___
	"Overridden per subclass; abstract here rather than guessed."

	^ self error: 'UnaryOpAst is abstract; subclasses must implement ___pythonUnaryGlyph___'
%

category: 'Grail-IR Codegen'
method: UnaryOpAst
___irUnarySelector___
	"The unary dunder selector this op sends to its operand (#__neg__ / #__pos__
	/ #__invert__); nil for ops the IR path does not yet handle (``not'', which
	needs an env-0 truthiness send)."

	^ nil
%

category: 'Grail-IR Codegen'
method: UnaryOpAst
___irEligibleValueLocals___: localNames
	^ (self ___irUnarySelector___ notNil)
		and: [operand ___irEligibleValueLocals___: localNames]
%

category: 'Grail-IR Codegen'
method: UnaryOpAst
___emitIRValueOn___: aBuilder
	"``<op> operand'' -> ``operand <dunder>'' (one unary send)."

	| v |
	v := operand ___emitIRValueOn___: aBuilder.
	aBuilder at: self beginPosition.
	^ aBuilder send: self ___irUnarySelector___ to: v with: { }
%

category: 'Grail-IR Codegen'
method: UnaryOpAst
___irReadLocalNamesInto___: aSet locals: localSet
	operand ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self
%
