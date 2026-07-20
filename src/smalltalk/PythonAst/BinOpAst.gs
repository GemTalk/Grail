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
	opStream := WriteStream on: String new.
	op printSmalltalkOn: opStream.
	sel := opStream contents trimSeparators.
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

category: 'Grail-annotations'
method: BinOpAst
___annotationSourceString___
	"Annotation binops are almost always PEP 604 unions (``int | None'').
	Render with the union bar; the exact operator glyph is not load-
	bearing (the string is used for display and best-effort register
	resolution, never re-parsed)."

	^ (left ___annotationSourceString___) , ' | ' , (right ___annotationSourceString___)
%
