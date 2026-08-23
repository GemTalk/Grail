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
	"``await X'' DELEGATES to X, so a suspension inside X suspends the awaiting
	coroutine too.

	TWO EMITS, and which one fires is the whole substance of this method.

	INSIDE A WRAPPED BODY (an ``async def'', or a generator -- FunctionDefAst
	___wrapsBody___) the surrounding codegen binds ``___gen___'' to the
	coroutine, exactly as it does for ``yield''.  Emitting the INSTANCE-side
	``___gen___ ___grailAwait___:'' hands the awaiting coroutine to the runtime,
	which can then delegate through ___yieldFrom___: -- so a yield from deep
	inside the awaited object travels out to whoever is driving.  That is what
	an event loop needs and what the class-side form could not express: with no
	reference to the awaiter there is nobody to suspend, so ``await'' could only
	run the awaited thing inline to completion.  See PythonGenerator >>
	___grailAwait___:.

	ANYWHERE ELSE, the class-side form, unchanged.  ``await'' outside an async
	function is a Python SyntaxError, so this branch is not reachable from
	legal Python -- but it IS reachable from Grail, whose ``await'' has always
	been a total function on any operand in any position, and shipped library
	code sits on that.  YieldFromAst takes the opposite choice, emitting
	``___gen___'' unconditionally and letting an out-of-function ``yield from''
	become a Smalltalk compile error that mirrors Python's SyntaxError.  The
	asymmetry is deliberate: a ``yield'' outside a generator never worked here,
	so nothing can depend on it, while a plain-value ``await'' demonstrably
	does.  Gating on the enclosing function keeps every context that compiles
	today compiling, and confines the new behaviour to bodies that actually have
	a coroutine to suspend.

	Non-coroutine operands still pass through unchanged on BOTH paths; the
	runtime decides that, not this method."

	| fn |
	fn := CallAst functionBeingCompiled.
	(fn notNil
		and: [(fn respondsTo: #'___wrapsBody___') and: [fn ___wrapsBody___]])
		ifTrue: [
			aStream nextPutAll: '(___gen___ @env1:___grailAwait___: ('.
			value printSmalltalkOn: aStream.
			aStream nextPutAll: '))'.
			^ self].
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
