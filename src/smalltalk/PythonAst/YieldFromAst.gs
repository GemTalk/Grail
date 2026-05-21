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
	"``yield from iterable`` — Grail has no real generator delegation
	yet; treat it as ``for x in iterable: yield x`` open-coded into a
	loop that hands each item to ``___gen___ ___yield___:``.  Matches
	the surrounding YieldAst convention (see YieldAst >>
	printSmalltalkOn:); inside a regular def the surrounding codegen
	never binds ``___gen___`` so a top-level ``yield from`` falls
	through to a Smalltalk compile error, mirroring Python's
	``SyntaxError: 'yield' outside function``."

	aStream nextPutAll: '(['.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream
		nextPutAll: ' @env0:do: [:___each___ | ___gen___ @env1:___yield___: ___each___]. None] @env0:value)'
%
