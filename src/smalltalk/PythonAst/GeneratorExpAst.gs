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
	self ___isAsyncGenexp___ ifTrue: [ | gxTemp depth p |
		"The OUTERMOST iterable is evaluated AT CREATION, in the enclosing
		scope -- CPython's rule for every comprehension kind, and for a lazy
		genexp the only correct reading of a loop variable it references:

		    gens = [(i async for i in asynciter(range(j))) for j in [3, 5]]

		builds two generators over range(3) and range(5).  Evaluated inside
		the withBlock: body (as this emission used to), both closed over the
		SAME j temp and read it after the loop finished: range(5) twice
		(test_nested_comp's run_gen_inside_list).  So the iterable is bound
		into a wrapper-block parameter here, at construction; the parameter
		is depth-named because nested async genexps nest these wrappers and
		Smalltalk blocks may not shadow an outer block's parameter."
		depth := 0.
		p := parent.
		[p notNil] whileTrue: [
			(p isKindOf: GeneratorExpAst) ifTrue: [depth := depth + 1].
			p := p parent].
		gxTemp := '___gxsrc' , depth printString , '___'.
		aStream nextPutAll: '([:'; nextPutAll: gxTemp; nextPutAll: ' |'; lf; increaseIndent.
		aStream nextPutAll: '(PythonAsyncGenerator @env1:withBlock: [:___gen___ |'; lf; increaseIndent.
		ComprehensionAst
			emitGenerators: generators
			from: 1
			on: aStream
			innerBody: [
				aStream nextPutAll: '___gen___ @env1:___asyncYield___: ('.
				elt printSmalltalkOn: aStream.
				aStream nextPutAll: ').'; lf.
			]
			outerSource: gxTemp.
		aStream nextPutAll: 'None'; lf.
		aStream decreaseIndent; nextPutAll: '] name: ''<genexpr>'' qualname: '''.
		aStream nextPutAll: (CallAst ___qualnameFor___: self name: '<genexpr>').
		aStream nextPutAll: ''' code: nil)'; lf.
		aStream decreaseIndent; nextPutAll: '] @env0:value: '.
		"When the FIRST clause is async, aiter() runs at CREATION -- CPython
		calls __aiter__ on the outermost iterable while the genexp is being
		built, which is why ``(x async for x in None)'' raises its TypeError
		from the enclosing statement even when the genexp is never consumed
		(test_async_gen_expression_incorrect).  The wrapper-block value is
		then already an ASYNC ITERATOR, and emitGenerators' outerSource path
		binds it directly rather than aiter-ing twice.  A sync first clause
		keeps the raw value; its __iter__ runs at first drive, as upstream."
		(generators at: 1) is_async = 1
			ifTrue: [
				aStream nextPutAll: '(PythonCoroutine @env1:___grailAiter___: '.
				(generators at: 1) iter printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ')']
			ifFalse: [(generators at: 1) iter printSmalltalkWithParenthesisOn: aStream].
		aStream nextPutAll: ')'.
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
___isAsyncGenexp___
	"PEP 530's actual rule, which is WIDER than the clauses: a generator
	expression is asynchronous if it contains ``async for'' or ``await''
	anywhere in its own scope -- including inside a nested LIST/SET/DICT
	comprehension in its element, which since the 3.12 inlining shares the
	scope.  test_nested_comp's run_list_inside_gen builds exactly that:
	``([... async for i in ait] for j in [10, 20])'' has a SYNC clause of
	its own, yet upstream makes it an async generator, and ``async for x in
	gen'' over it must work.  The clause-only test materialised it to a
	list, and the loop then said ``'async for' requires an object with
	__aiter__ method, got list''.

	A nested GENERATOR EXPRESSION is its own scope and does NOT leak
	asynchrony outward -- run_gen_inside_gen iterates the outer one with a
	plain sync clause and expects that to work -- so the walk stops at
	GeneratorExpAst, FunctionDefAst and LambdaAst boundaries."

	^ self ___subtreeHasAsyncConstruct___: (Array with: elt with: generators)
%

method: GeneratorExpAst
___subtreeHasAsyncConstruct___: node
	| isScope |
	node isNil ifTrue: [^ false].
	node isString ifTrue: [^ false].
	(node isKindOf: SequenceableCollection) ifTrue: [
		node do: [:each |
			(self ___subtreeHasAsyncConstruct___: each) ifTrue: [^ true]].
		^ false].
	(node isKindOf: AbstractNode) ifFalse: [^ false].
	isScope := (node isKindOf: GeneratorExpAst)
		or: [(node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst]].
	isScope ifTrue: [^ false].
	(node isKindOf: AwaitAst) ifTrue: [^ true].
	((node isKindOf: ComprehensionAst) and: [node is_async = 1]) ifTrue: [^ true].
	node class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			(self ___subtreeHasAsyncConstruct___: (node instVarAt: i))
				ifTrue: [^ true]]].
	^ false
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
