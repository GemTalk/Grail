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
	"`yield expr` — Grail doesn't have a generator/coroutine
	runtime yet, so emit a TypeError that fires when the
	containing function actually runs.  This lets modules that
	*declare* generator functions (blinker uses `@contextmanager`
	on `Signal.connected_to` and `Signal.muted`) at least load,
	even though the generator methods themselves can't be
	called.  Replace with a real generator emit once Grail
	grows the runtime support."

	aStream nextPutAll: '(TypeError ___signal___: ''yield is not yet supported in Grail'')'
%
