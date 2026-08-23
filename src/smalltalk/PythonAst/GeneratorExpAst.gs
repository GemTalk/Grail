! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for GeneratorExpAst
expectvalue /Class
doit
ExpressionAst subclass: 'GeneratorExpAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
GeneratorExpAst comment:
'https://docs.python.org/3/library/ast.html#ast.GeneratorExp

A generator expression.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''(x for x in numbers)'', mode=''eval''), indent=4))
Expression(
    body=GeneratorExp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        GeneratorExpAst(elt generators)
'
%

expectvalue /Class
doit
GeneratorExpAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from GeneratorExpAst
removeallmethods GeneratorExpAst
removeallclassmethods GeneratorExpAst
set compile_env: 0
! ------------------- Class methods for GeneratorExpAst
! ------------------- Instance methods for GeneratorExpAst

category: 'code generation'
method: GeneratorExpAst
printSmalltalkOn: aStream
	"(expr for t in iter [if c]* ...) — Python generator expressions are
	lazy iterators.  Grail has no first-class generator type, so we
	materialize eagerly into an OrderedCollection.  This matches
	semantics for any consumer that fully drains the iterator
	(`sum(...)`, `list(...)`, `for x in (...)`); breaks if a caller
	depends on lazy evaluation for side effects or unbounded sources.
	Revisit when Grail grows real generator support."

	"AN ASYNC GENERATOR EXPRESSION IS A REAL ASYNC GENERATOR, and cannot be
	materialised.  ``(x async for x in ait)'' answers an async generator
	upstream, and the eager OrderedCollection below would answer a LIST -- which
	worked only while ``async for'' was compiled as a synchronous ``for'',
	because a list is synchronously iterable.  Once async iteration became real
	the accident ended: test_coroutines' test_comp_3 does

	    gen = (i + 1 async for i in f([10, 20]))
	    return [g + 100 async for g in gen]

	and the second comprehension raised ``'async for' requires an object with
	__aiter__ method, got list''.

	So the async form emits a PythonAsyncGenerator whose body yields each
	element -- which is also the CORRECT lazy semantics, not a workaround.
	``___gen___'' is rebound inside the block to that async generator, and that
	is exactly right: an await in the expression's own clauses must suspend the
	GENERATOR, and its consumer awaits the generator in turn.

	The SYNCHRONOUS form is left materialising, deliberately.  It is a
	long-standing approximation with a wide blast radius (every genexp in the
	corpus), and correcting it is its own change -- not something to do as a
	side effect of async work."
	(generators anySatisfy: [:g | g is_async = 1]) ifTrue: [
		aStream nextPutAll: '(PythonAsyncGenerator @env1:withBlock: [:___gen___ |'; lf; increaseIndent.
		ComprehensionAst
			emitGenerators: generators
			from: 1
			on: aStream
			innerBody: [
				aStream nextPutAll: '___gen___ @env1:___asyncYield___: ('.
				elt printSmalltalkOn: aStream.
				aStream nextPutAll: ').'; lf.
			].
		aStream nextPutAll: 'None'; lf.
		aStream decreaseIndent; nextPutAll: '])'.
		^ self].
	aStream nextPutAll: '([| ___r___ |'; lf; increaseIndent.
	aStream nextPutAll: '___r___ := (OrderedCollection perform: #new env: 0).'; lf.
	ComprehensionAst
		emitGenerators: generators
		from: 1
		on: aStream
		innerBody: [
			aStream nextPutAll: '___r___ @env0:add: ('.
			elt printSmalltalkOn: aStream.
			aStream nextPutAll: ').'; lf.
		].
	aStream nextPutAll: '___r___'; lf.
	aStream decreaseIndent; nextPutAll: '] value)'
%
method: GeneratorExpAst
elt
	^elt
%
method: GeneratorExpAst
elt: newValue
	elt := newValue
%
method: GeneratorExpAst
generators
	^generators
%
method: GeneratorExpAst
generators: newValue
	generators := newValue
%
