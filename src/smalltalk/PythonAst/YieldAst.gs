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

	| fn selector |
	"An ASYNC generator's yield must be TAGGED.  Its body suspends for two
	unrelated reasons -- ``yield'' (which ends the current __anext__) and
	``await'' (which must travel past __anext__ out to the event loop) -- and
	both arrive at the consumer through ___yield___:, so the value is otherwise
	ambiguous and a suspension would be reported as an iteration item.
	___asyncYield___: wraps it; see PyAsyncYield and PythonAsyncGenerator.

	Gated on the ENCLOSING function rather than on the presence of ``await''
	anywhere, because the two questions are independent: a body with no await at
	all is still an async generator, and its yields still have to be
	distinguishable from any await a nested delegation might introduce later.

	CallAst functionBeingCompiled is nil at module scope, where ``yield'' is a
	Python SyntaxError anyway and the emitted ___gen___ is unbound -- the same
	Smalltalk compile error the synchronous path has always produced there."
	fn := CallAst functionBeingCompiled.
	selector := (fn notNil
		and: [(fn respondsTo: #'isAsync')
			and: [fn isAsync and: [fn isGenerator]]])
		ifTrue: ['___asyncYield___: ']
		ifFalse: ['___yield___: '].
	aStream nextPutAll: '(___gen___ @env1:' , selector.
	value isNil
		ifTrue: [aStream nextPutAll: 'None']
		ifFalse: [value printSmalltalkWithParenthesisOn: aStream].
	aStream nextPut: $)
%
method: YieldAst
value
	^value
%

category: 'Grail-IR Codegen'
method: YieldAst
___irYieldSelector___
	"printSmalltalkOn:'s selector choice: ___asyncYield___: inside an ASYNC
	generator (the yield must be distinguishable from an await travelling
	through the same suspension), ___yield___: otherwise.  Gated on the
	enclosing function exactly as the text is."

	| fn |
	fn := CallAst functionBeingCompiled.
	^ (fn notNil
		and: [(fn respondsTo: #'isAsync')
			and: [fn isAsync and: [fn isGenerator]]])
		ifTrue: [#'___asyncYield___:']
		ifFalse: [#'___yield___:']
%

category: 'Grail-IR Codegen'
method: YieldAst
___irEligibleValueLocals___: localNames
	"``yield'' / ``yield v'' with an emittable operand.  Only reachable inside a
	def the seam admits as a generator (cut 53): the surrounding
	___emitIRWrappedBodyOn___: binds the ___gen___ leaf this sends to."

	^ value isNil or: [value ___irEligibleValueLocals___: localNames]
%

category: 'Grail-IR Codegen'
method: YieldAst
___emitIRValueOn___: aBuilder
	"``(___gen___ @env1:___yield___: v)'' -- the text's send, to the wrapper
	block's argument.  Its value is what send() passed in (None for a plain
	next()).  Outside a wrapped body there is no ___gen___: the text falls to
	a compile error there, the IR build raises and the seam falls back."

	| gen v |
	gen := aBuilder genLeaf.
	gen isNil ifTrue: [
		^ Error signal: 'IR codegen: yield outside a generator body'].
	v := value isNil
		ifTrue: [aBuilder globalNamed: #None]
		ifFalse: [value ___emitIRValueOn___: aBuilder].
	aBuilder at: self beginPosition.
	^ aBuilder send: self ___irYieldSelector___ to: (aBuilder var: gen) with: { v } env: 1
%

category: 'Grail-IR Codegen'
method: YieldAst
___irReadLocalNamesInto___: aSet locals: localSet
	value ifNotNil: [value ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
method: YieldAst
value: newValue
	value := newValue
%
