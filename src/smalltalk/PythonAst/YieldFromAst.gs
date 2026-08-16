! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for YieldFromAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldFromAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
YieldFromAst comment:
'https://docs.python.org/3/library/ast.html#ast.YieldFrom

A yield from expression.

value is what is yielded from.

Example:
>>> print(ast.dump(ast.parse(''yield from x'', mode=''eval''), indent=4))
Expression(
    body=YieldFrom(value=Name(id=''x'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        YieldFromAst(value)
'
%

expectvalue /Class
doit
YieldFromAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from YieldFromAst
removeallmethods YieldFromAst
removeallclassmethods YieldFromAst
set compile_env: 0

category: 'Grail-code generation'
method: YieldFromAst
printSmalltalkOn: aStream
	"``yield from iterable`` — real PEP 380 delegation, performed by
	``PythonGenerator >> ___yieldFrom___:``.  Matches the surrounding
	YieldAst convention (see YieldAst >> printSmalltalkOn:); inside a
	regular def the surrounding codegen never binds ``___gen___`` so a
	top-level ``yield from`` falls through to a Smalltalk compile
	error, mirroring Python's ``SyntaxError: 'yield' outside
	function``.

	This used to be open-coded HERE as ``for x in iterable: yield x'',
	which forwards values outward but nothing inward: the consumer's
	send / throw / close all acted on the DELEGATOR rather than being
	forwarded to the sub-iterator, and the expression's value was
	hardcoded None instead of the sub-generator's return value.  All
	four are properties of the delegation as a whole, spanning many
	suspensions, so they cannot be expressed in a per-item loop —
	hence the move to a runtime method, which holds the delegation
	state across suspensions.  The emitted expression now evaluates to
	the sub-iterator's return value, so ``r = yield from g()'' binds
	what ``g'' returned."

	aStream nextPutAll: '(___gen___ @env1:___yieldFrom___: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ')'
%
method: YieldFromAst
value
	^value
%
method: YieldFromAst
value: newValue
	value := newValue
%
