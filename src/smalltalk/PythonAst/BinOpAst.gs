! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BinOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BinOpAst'
  instVarNames: #( left op right)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BinOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.BinOp

A binary operation (like addition or division).

op is the operator.
left and right are any expression nodes.

Example:
>>> print(ast.dump(ast.parse(''x + y'', mode=''eval''), indent=4))
Expression(
    body=BinOp(
        left=Name(id=''x'', ctx=Load()),
        op=Add(),
        right=Name(id=''y'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BinOpAst(left op right)
'
%

expectvalue /Class
doit
BinOpAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from BinOpAst
removeallmethods BinOpAst
removeallclassmethods BinOpAst

set compile_env: 0

category: 'Grail-other'
classmethod: BinOpAst
left: newLeft operand: operand right: newRight

	^self basicNew 
		initializeLeft: newLeft
		operand: operand
		right: newRight.
%

category: 'Grail-other'
method: BinOpAst
initializeLeft: newLeft operand: operand right: newRight

	left := newLeft.
	op := operand.
	right := newRight.
%

category: 'Grail-other'
method: BinOpAst
printSmalltalkOn: aStream
	"For the arithmetic operators, route through object>>___binOpXxx___: (a
	per-op helper doing a DIRECT dunder send + NotImplemented check) so an
	explicit ``return NotImplemented'' from a forward dunder (vendored Fraction,
	user classes) triggers the reflected op / catchable TypeError instead of
	leaking the NotImplemented singleton.  The direct send preserves normal
	dispatch, so built-ins (which never return the singleton) are unchanged.
	Non-arithmetic operators keep the bare dunder send."

	| opStream sel helper |
	opStream := AppendStream on: String new.
	op printSmalltalkOn: opStream.
	sel := opStream _contents trimSeparators.
	helper := self ___pyBinOpHelperFor___: sel.
	helper isNil ifTrue: [
		left printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: opStream contents.
		right printSmalltalkWithParenthesisOn: aStream.
		^ self].
	left printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' '; nextPutAll: helper; nextPutAll: ' '.
	right printSmalltalkWithParenthesisOn: aStream.
%

category: 'Grail-other'
method: BinOpAst
___pyBinOpHelperFor___: sel
	"Map an arithmetic dunder selector to its NotImplemented-aware helper on
	object; nil for non-arithmetic operators (which keep the bare send)."

	| m |
	m := Dictionary new.
	m at: '__add__:' put: '___binOpAdd___:';
		at: '__sub__:' put: '___binOpSub___:';
		at: '__mul__:' put: '___binOpMul___:';
		at: '__truediv__:' put: '___binOpTrueDiv___:';
		at: '__floordiv__:' put: '___binOpFloorDiv___:';
		at: '__mod__:' put: '___binOpMod___:';
		at: '__pow__:' put: '___binOpPow___:';
		at: '__lshift__:' put: '___binOpLShift___:';
		at: '__rshift__:' put: '___binOpRShift___:';
		at: '__and__:' put: '___binOpAnd___:';
		at: '__or__:' put: '___binOpOr___:';
		at: '__xor__:' put: '___binOpXor___:';
		at: '__matmul__:' put: '___binOpMatMul___:'.
	^ m at: sel otherwise: nil
%

category: 'Grail-other'
method: BinOpAst
___pythonOperatorFor___: sel
	"Map an arithmetic dunder selector back to its PYTHON glyph.

	Keyed on the same selector ___pyBinOpHelperFor___: uses, so the two tables
	cover the same operators and a new one is added in one place."

	| m |
	m := Dictionary new.
	m at: '__add__:' put: '+';
		at: '__sub__:' put: '-';
		at: '__mul__:' put: '*';
		at: '__truediv__:' put: '/';
		at: '__floordiv__:' put: '//';
		at: '__mod__:' put: '%';
		at: '__pow__:' put: '**';
		at: '__lshift__:' put: '<<';
		at: '__rshift__:' put: '>>';
		at: '__and__:' put: '&';
		at: '__or__:' put: '|';
		at: '__xor__:' put: '^';
		at: '__matmul__:' put: '@'.
	^ m at: sel otherwise: nil
%

category: 'Grail-annotations'
method: BinOpAst
___annotationSourceString___
	"Render the ACTUAL operator.

	This hardcoded `` | '' on the reasoning that annotation binops are almost
	always PEP 604 unions and ``the exact operator glyph is not load-bearing''.
	That was true while the unparser served ANNOTATIONS only.  It stopped being
	true when FunctionDefAst>>emitSignatureEntryFor: reused the same unparser for
	DEFAULT VALUES, where arithmetic is ordinary and the glyph is the whole
	point: every binop in a default rendered as a union, so ``def f(a=1+1)''
	reported ``a=1 | 1'' through inspect.signature, and ``x='s'+'t''' reported
	``x=s | t''.  A shared helper whose documented assumption holds in one
	caller's context and not the other's.

	Falls back to `` | '' for an operator not in the table, which keeps the
	previous behaviour for anything the map does not cover rather than losing
	the operand text entirely."

	| opStream sel glyph |
	opStream := AppendStream on: String new.
	op printSmalltalkOn: opStream.
	sel := opStream _contents trimSeparators.
	glyph := self ___pythonOperatorFor___: sel.
	glyph isNil ifTrue: [glyph := '|'].
	^ (left ___annotationSourceString___) , ' ' , glyph , ' '
		, (right ___annotationSourceString___)
%
method: BinOpAst
left
	^left
%
method: BinOpAst
left: newValue
	left := newValue
%
method: BinOpAst
op
	^op
%
method: BinOpAst
op: newValue
	op := newValue
%
method: BinOpAst
right
	^right
%
method: BinOpAst
right: newValue
	right := newValue
%

category: 'Grail-IR Codegen'
method: BinOpAst
___irBinHelperSelector___
	"The NotImplemented-aware helper selector this binary op lowers to, e.g.
	``a + b'' -> ``a ___binOpAdd___: b'' -- the same helper printSmalltalkOn:
	routes arithmetic/bitwise ops through.  nil for any op without a helper (none
	of the standard BinOp ops), which keeps such a node off the IR path."

	| opStream sel helper |
	opStream := AppendStream on: String new.
	op printSmalltalkOn: opStream.
	sel := opStream _contents trimSeparators.
	helper := self ___pyBinOpHelperFor___: sel.
	^ helper ifNotNil: [:h | h asSymbol]
%

category: 'Grail-IR Codegen'
method: BinOpAst
___irEligibleValueLocals___: localNames
	^ (self ___irBinHelperSelector___ notNil)
		and: [(left ___irEligibleValueLocals___: localNames)
		and: [right ___irEligibleValueLocals___: localNames]]
%

category: 'Grail-IR Codegen'
method: BinOpAst
___emitIRValueOn___: aBuilder
	"``left <op> right'' -> ``left ___binOpXxx___: right'' (one keyword send)."

	| leftV rightV |
	leftV := left ___emitIRValueOn___: aBuilder.
	rightV := right ___emitIRValueOn___: aBuilder.
	aBuilder at: self beginPosition.
	^ aBuilder send: self ___irBinHelperSelector___ to: leftV with: { rightV }
%

category: 'Grail-annotations'
method: BinOpAst
___defaultSourceString___
	"Recurse with the DEFAULT renderer, not the annotation one.

	Inheriting AbstractNode's delegation sent the whole subtree down the
	annotation path, so nested literals lost their repr: ``n='s'+'t''' rendered
	``n=s + t'' -- correct operator, but operands stripped of their quotes.  The
	operator glyph itself is shared with the annotation form, which needs it too
	(a PEP 604 union is a BinOp), so only the RECURSION differs."

	| opStream sel glyph |
	opStream := AppendStream on: String new.
	op printSmalltalkOn: opStream.
	sel := opStream _contents trimSeparators.
	glyph := self ___pythonOperatorFor___: sel.
	glyph isNil ifTrue: [glyph := '|'].
	^ (left ___defaultSourceString___) , ' ' , glyph , ' '
		, (right ___defaultSourceString___)
%

category: 'Grail-IR Codegen'
method: BinOpAst
___irReadLocalNamesInto___: aSet locals: localSet
	left ___irReadLocalNamesInto___: aSet locals: localSet.
	right ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self
%
