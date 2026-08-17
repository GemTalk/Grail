! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AwaitAst
expectvalue /Class
doit
ExpressionAst subclass: 'AwaitAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AwaitAst comment:
'https://docs.python.org/3/library/ast.html#ast.Await

An await expression.

value is what it waits for.
Only valid in the body of an AsyncFunctionDef.

Example:
>>> print(ast.dump(ast.parse("""
... async def f():
...     await other_func()
... """), indent=4))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        AwaitAst(value)
'
%

expectvalue /Class
doit
AwaitAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AwaitAst
removeallmethods AwaitAst
removeallclassmethods AwaitAst
set compile_env: 0

category: 'Grail-code generation'
method: AwaitAst
printSmalltalkOn: aStream
	"``await X'' DRIVES X to completion and answers its result.

	Calling an ``async def'' now answers a PythonCoroutine rather than running
	the body (FunctionDefAst ___wrapsBody___), so ``await'' can no longer be the
	identity: it has to run the thing.  There is still NO EVENT LOOP -- nothing
	suspends -- so driving means running straight through and taking the value
	the coroutine returned, which arrives as StopIteration''s value exactly as it
	does for a generator.

	Non-coroutine operands pass through UNCHANGED.  ``await'' on a plain value
	is not legal Python, but it is what Grail did everywhere before this, and a
	great deal of shipped library code (jinja2, asgiref, flask) awaits things
	Grail resolves synchronously.  Passing them through keeps that working
	rather than turning a previously-quiet path into a TypeError."

	aStream nextPutAll: '(PythonCoroutine @env0:___grailAwait___: ('.
	value printSmalltalkOn: aStream.
	aStream nextPutAll: '))'
%
method: AwaitAst
value
	^value
%
method: AwaitAst
value: newValue
	value := newValue
%
