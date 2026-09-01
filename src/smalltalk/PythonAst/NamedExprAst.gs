! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NamedExprAst
expectvalue /Class
doit
ExpressionAst subclass: 'NamedExprAst'
  instVarNames: #( target value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NamedExprAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from NamedExprAst
removeallmethods NamedExprAst
removeallclassmethods NamedExprAst

set compile_env: 0

category: 'Grail-other'
method: NamedExprAst
printSmalltalkOn: aStream

	"``global x'' makes the walrus target a module binding, and such a
	name has no Smalltalk temp to assign to -- the bare ``x := v'' named
	an undefined symbol and failed the whole method's compile."

	| rhs |
	self ___checkNotInClassBodyComprehension___.
	"PrettyWriteStream, not a bare WriteStream: codegen sends indentation
	protocol (#increaseIndent, #lf) that a plain WriteStream does not
	understand, and the failure shows up as the whole module refusing to
	import rather than as a bad expression."
	rhs := PrettyWriteStream on: Unicode7 new.
	value printSmalltalkOn: rhs.
	"Parenthesised, because a walrus is an EXPRESSION and Smalltalk's
	assignment is not.  Unparenthesised, ``y := 5'' is a statement, and the
	one place a Python expression most often lands is a brace array -- the
	constructor Grail emits for every list, tuple and subscript display:

	    [y := spam(x), x/y]   ->   { y := spam(x). ... }

	which is not a parse error Python code can catch but a SMALLTALK
	CompileError (``unexpected token'') that takes the whole enclosing
	method down.  ``{(y := spam(x)). ...}'' is accepted, and parenthesising
	is harmless everywhere else: an assignment's value is what it assigned,
	so ``(y := 5)'' is the walrus's value in any surrounding expression.
	The module- and class-scope branches emit a keyword send rather than an
	assignment, and those needed the same wrapping for the same reason --
	unparenthesised, the send would swallow whatever followed it."
	aStream nextPut: $(.
	(target isKindOf: NameAst)
		ifTrue: [self emitNameStoreOn: aStream target: target rhs: rhs contents]
		ifFalse: [
			target printSmalltalkOn: aStream.
			aStream nextPutAll: ' := '; nextPutAll: rhs contents].
	aStream nextPut: $).
%

category: 'Grail-other'
method: NamedExprAst
___checkNotInClassBodyComprehension___
	"PEP 572 forbids a walrus inside a comprehension that sits in a CLASS body,
	and CPython rejects it at COMPILE time:

	    class Foo:
	        [(42, 1 + ((( j := i )))) for i in range(5)]

	    SyntaxError: assignment expression within a comprehension cannot be
	                 used in a class body

	The rule exists because the two scopes disagree about where ``j'' would go:
	a walrus binds in the scope ENCLOSING the comprehension, and that scope is
	a class namespace, which a comprehension cannot write to.  There is no
	answer, so the language refuses the program.

	Grail has no answer either, and used to have no complaint: a class body
	binds no name for a bare expression statement, so the statement was dropped
	whole and the walrus never compiled.  Now that such a statement is emitted,
	``j'' reaches codegen as a bare identifier bound nowhere -- a SMALLTALK
	CompileError (``undefined symbol j'') that kills the whole compile, and
	that Python code cannot catch.  Raise CPython's SyntaxError instead, which
	is both catchable and the right diagnosis (test_named_expressions
	test_named_expression_invalid_in_class_body).

	Walks OUT rather than scanning down, the idiom the rest of the AST uses: a
	FunctionDefAst or LambdaAst between here and the class body ends the walk,
	because a walrus inside a comprehension inside a METHOD is ordinary and
	legal -- the enclosing scope is then the function, not the class."

	| node inComp |
	inComp := false.
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: ListCompAst)
			or: [(node isKindOf: SetCompAst)
			or: [(node isKindOf: DictCompAst)
			or: [node isKindOf: GeneratorExpAst]]])
				ifTrue: [inComp := true].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [^ self].
		((node isKindOf: ClassDefAst) and: [inComp]) ifTrue: [
			^ SyntaxError @env1:___signal___:
				'assignment expression within a comprehension cannot be used in a class body'].
		node := node parent].
%
method: NamedExprAst
target
	^target
%
method: NamedExprAst
target: newValue
	target := newValue
%
method: NamedExprAst
value
	^value
%
method: NamedExprAst
value: newValue
	value := newValue
%
