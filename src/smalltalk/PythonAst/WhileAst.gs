! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for WhileAst
expectvalue /Class
doit
StatementAst subclass: 'WhileAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
WhileAst comment:
'https://docs.python.org/3/library/ast.html#ast.While

A while loop.

test holds the condition.
body is a list of nodes.
orelse is a list of nodes for the else clause.

Example:
>>> print(ast.dump(ast.parse(''while x:\\n    ...\\nelse:\\n    ...''), indent=4))
Module(
    body=[
        While(
            test=Name(id=''x'', ctx=Load()),
            body=[Expr(value=Constant(value=Ellipsis))],
            orelse=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        WhileAst(test body orelse)
'
%

expectvalue /Class
doit
WhileAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from WhileAst
removeallmethods WhileAst
removeallclassmethods WhileAst

set compile_env: 0

category: 'Grail-other'
method: WhileAst
printSmalltalkOn: aStream
	"Wrap the per-iteration body in a PythonContinue handler and the
	whole loop in a PythonBreak handler, mirroring ForAst's structure
	so `break` / `continue` inside the loop body behave correctly
	without escaping the enclosing method."

	aStream nextPutAll: '['; lf; increaseIndent.
	aStream nextPut: $[.
	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___] whileTrue: ['; increaseIndent; lf.
	aStream nextPutAll: '['; lf; increaseIndent.
	body printSmalltalkOn: aStream.
	aStream decreaseIndent; nextPutAll: '] @env0:on: PythonContinue do: [:___ex___ | nil].'; lf.
	aStream decreaseIndent; nextPutAll: '].'; lf.
	(orelse notNil and: [orelse size > 0]) ifTrue: [
		"Python while-else: the else body runs only when the loop
		terminates WITHOUT break.  Emit it INSIDE the outer block, after
		the whileTrue: drain, so a PythonBreak signalled from the body
		propagates past it to the handler below and skips it — the same
		structure ForAst uses for for-else.  (This used to be emitted
		after the handler, i.e. unconditionally; textwrap's max_lines
		placeholder backtracking depends on the correct semantics.)

		orelse may be either an Array of statements or a SuiteAst —
		the parser produces both shapes depending on context.  Both
		respond to printSmalltalkOn:, so route through that rather
		than iterating directly."
		(orelse isKindOf: SuiteAst)
			ifTrue: [orelse printSmalltalkOn: aStream]
			ifFalse: [orelse do: [:stmt |
				stmt printSmalltalkOn: aStream.
				aStream lf.
			]].
		aStream lf.
	].
	aStream decreaseIndent; nextPutAll: '] @env0:on: PythonBreak do: [:___ex___ | nil].'.
%
method: WhileAst
test
	^test
%
method: WhileAst
test: newValue
	test := newValue
%
method: WhileAst
body
	^body
%
method: WhileAst
body: newValue
	body := newValue
%
method: WhileAst
orelse
	^orelse
%
method: WhileAst
orelse: newValue
	orelse := newValue
%

category: 'Grail-IR Codegen'
method: WhileAst
___irEligibleStatementLocals___: localNames
	"A while loop with no else clause, an emittable test, and an all-emittable
	body.  while-else stays on text (its break-skips-else placement is its own
	shape)."

	"An else clause (cut 68) is emittable when its statements are: it goes
	inside the PythonBreak-protected block after the whileTrue:, as the text
	places it."
	((self ___irElseStatements___) allSatisfy: [:s | s ___irEligibleStatementLocals___: localNames])
		ifFalse: [^ false].
	(test ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
	((body isKindOf: BlockAst) or: [body isKindOf: SuiteAst]) ifFalse: [^ false].
	^ body ___irEligibleStatementsWithLocals___: localNames
%

category: 'Grail-IR Codegen'
method: WhileAst
___emitIRStatementOn___: aBuilder
	"The text path's exception-based loop, shape for shape:

	  [[(test) ___isTruthy___] whileTrue: [
	      [body] @env0:on: PythonContinue do: [:___ex___ | nil].
	  ]] @env0:on: PythonBreak do: [:___ex___ | nil].

	The whileTrue: is inlined (COMPAR_WHILE_TRUE); the on:do: sends are real
	env-0 sends over real blocks, so PythonBreak / PythonContinue signalled in
	the body unwind exactly as they do for a text-compiled loop."

	| outerBlk |
	aBuilder atNode: self.
	outerBlk := aBuilder inBlockDo: [
		| condBlk iterBlk |
		condBlk := aBuilder inBlockDo: [
			aBuilder add: (aBuilder
				send: #'___isTruthy___'
				to: (test ___emitIRValueOn___: aBuilder)
				with: { })].
		iterBlk := aBuilder inBlockDo: [
			| bodyBlk |
			bodyBlk := aBuilder inBlockDo: [body ___emitIRStatementsOn___: aBuilder].
			aBuilder add: (aBuilder
				send: #on:do:
				to: bodyBlk
				with: { aBuilder globalNamed: #PythonContinue.
					aBuilder handlerBlockNamed: #'___ex___' }
				env: 0)].
		aBuilder add: (aBuilder whileTrue: condBlk do: iterBlk).
		"while-else (cut 68): inside the outer block, after the drain, so a
		PythonBreak from the body propagates past it to the handler."
		(self ___irElseStatements___) do: [:s | s ___emitIRStatementOn___: aBuilder]].
	aBuilder add: (aBuilder
		send: #on:do:
		to: outerBlk
		with: { aBuilder globalNamed: #PythonBreak.
			aBuilder handlerBlockNamed: #'___ex___' }
		env: 0).
	^ self
%

category: 'Grail-IR Codegen'
method: WhileAst
___irElseStatements___
	"The else clause's statements -- an Array or a SuiteAst, or nil."

	orelse isNil ifTrue: [^ #()].
	(orelse isKindOf: SuiteAst) ifTrue: [^ orelse body ifNil: [#()]].
	^ orelse
%

category: 'Grail-IR Codegen'
method: WhileAst
___irReadLocalNamesInto___: aSet locals: localSet
	test ___irReadLocalNamesInto___: aSet locals: localSet.
	body ___irReadLocalNamesInto___: aSet locals: localSet.
	(self ___irElseStatements___) do: [:s | s ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%

category: 'Grail-IR Codegen'
method: WhileAst
___irWriteLocalNamesInto___: aSet locals: localSet
	body ___irWriteLocalNamesInto___: aSet locals: localSet.
	(self ___irElseStatements___) do: [:s | s ___irWriteLocalNamesInto___: aSet locals: localSet].
	^ self
%

category: 'Grail-IR Codegen'
method: WhileAst
___irFlowBound___: boundIn locals: localSet
	"The test's reads must be bound at entry (it runs before any iteration).
	The body walks from boundIn: a name bound late in one iteration is not
	known bound at the top of the next, so a read there is refused.  The loop
	may run zero times, so nothing the body binds survives it."

	| entry bodyOut breakSets after |
	(self ___irFlowReadsBound___: test in: boundIn locals: localSet)
		ifFalse: [^ nil].
	"A walrus in the test (``while (chunk := read()):'', cut 69) is bound
	before the body, the else and whatever follows: the test runs at least
	once."
	entry := boundIn copy.
	(test ___irWalrusTargetNames___: localSet) do: [:n | entry add: n].
	breakSets := AbstractNode ___irCollectBreakSetsDuring___: [
		bodyOut := body ___irFlowBound___: entry locals: localSet].
	bodyOut isNil ifTrue: [^ nil].
	"The else clause (cut 68): from the entry set, its bindings not surviving
	(a break skips it)."
	(self ___irFlowBoundElse___: entry locals: localSet) isNil ifTrue: [^ nil].
	"``while True:'' (cut 71) never exits through its test: what is bound after
	it is what EVERY break had bound (a body ending in return answers all
	locals and cannot reach here); no break means nothing after the loop is
	reachable.  Any other test can be false on the first evaluation, so only
	the entry set survives."
	self ___irTestIsConstantTrue___ ifFalse: [^ entry].
	breakSets isEmpty ifTrue: [^ localSet copy].
	after := breakSets first.
	breakSets allButFirst do: [:s | after := self ___irFlowMeet___: after with: s].
	^ after
%

category: 'Grail-IR Codegen'
method: WhileAst
___irTestIsConstantTrue___
	"``while True:'' / ``while 1:'' -- a literal that is truthy."

	(test isKindOf: ConstantAst) ifFalse: [^ false].
	test value == true ifTrue: [^ true].
	^ (test value isKindOf: Integer) and: [test value ~= 0]
%

category: 'Grail-IR Codegen'
method: WhileAst
___irFlowBoundElse___: boundIn locals: localSet
	| bound |
	bound := boundIn.
	(self ___irElseStatements___) do: [:s |
		bound := s ___irFlowBound___: bound locals: localSet.
		bound isNil ifTrue: [^ nil]].
	^ bound
%

category: 'Grail-IR Codegen'
method: WhileAst
___irRefusalDetail___: localSet
	^ #'WhileAst:other'
%
