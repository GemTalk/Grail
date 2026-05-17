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

	left printSmalltalkWithParenthesisOn: aStream.
	op printSmalltalkOn: aStream.
	right printSmalltalkWithParenthesisOn: aStream.
%
