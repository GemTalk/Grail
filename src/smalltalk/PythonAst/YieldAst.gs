! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for YieldAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
YieldAst comment:
'https://docs.python.org/3/library/ast.html#ast.Yield

A yield expression.

value is what is yielded (can be None).

Example:
>>> print(ast.dump(ast.parse(''yield x'', mode=''eval''), indent=4))
Expression(
    body=Yield(value=Name(id=''x'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        YieldAst(value)
'
%

expectvalue /Class
doit
YieldAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from YieldAst
removeallmethods YieldAst
removeallclassmethods YieldAst
set compile_env: 0
! ------------------- Class methods for YieldAst
! ------------------- Instance methods for YieldAst

category: 'Grail-other'
method: YieldAst
printSmalltalkOn: aStream
	"``yield expr`` — emits a call to the surrounding generator
	proxy's ___yield___: that hands ``expr`` to the consumer and
	suspends the producer until the next ``__next__`` resumes us.

	The ``___gen___`` name is the parameter bound by the wrapper
	block FunctionDefAst emits for generator functions (see
	``isGenerator`` / ``emitGeneratorWrapperOn:``).  Outside a
	generator function the surrounding codegen never wraps with
	that block, so ``yield`` at module top level (or in an
	expression context outside a def) will fall through to a
	Smalltalk compile error on the unbound ``___gen___`` — the
	closest analog of Python's ``SyntaxError: 'yield' outside
	function``."

	aStream nextPutAll: '(___gen___ @env1:___yield___: '.
	value isNil
		ifTrue: [aStream nextPutAll: 'None']
		ifFalse: [value printSmalltalkWithParenthesisOn: aStream].
	aStream nextPut: $)
%
