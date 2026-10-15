Class {
	#name : 'EvalExecModeCodeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EvalExecModeCodeTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
EvalExecModeCodeTestCase >> reprAt: aKey [
	"The fixture's entries are nested Python values; compare their repr so a
	failure prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
EvalExecModeCodeTestCase >> setUp [
	probe := self ___loadProbe___: 'eval_exec_mode_code'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testAContextSuppliedDecoratorIsFound [
	"The boundary the first guard got wrong: these names come from the
	CALLER's globals, are seeded into the doit scope, and resolve -- so each
	fails on its OWN terms rather than as an undefined name.  test_errors'
	remaining three rows."

	self assert: (self reprAt: 'context_supplied_decorator_is_found')
		equals: '[''TypeError'', ''AttributeError'', ''NotImplementedError'']'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testADecoratorDeclaredInsideTheExecSourceStillWorks [
	"Declared by the source being compiled, so it has a pre-created slot and a
	bare identifier is correct.  The case the new emit must NOT claim."

	self assert: (self reprAt: 'decorator_defined_inside_the_exec_source')
		equals: '''k'''.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testANonCallableDecoratorIsATypeError [
	"Already correct, kept as a regression guard: resolving the name and
	FAILING to call it must stay distinct from not resolving it."

	self assert: (self reprAt: 'a_non_callable_decorator_is_a_type_error')
		equals: '[''TypeError'', ''TypeError'']'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testAnOrdinaryLocalDecoratorIsUnaffected [
	"The emit is gated on doit context; this is the ordinary path that every
	decorator in the corpus takes."

	self assert: (self reprAt: 'a_local_decorator_still_works') equals: '''h'''.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testAnUndefinedDecoratorRaisesNameError [
	"Previously an uncatchable Smalltalk CompileError that took the whole
	exec() down.  Checked through BOTH entry points, since eval() now shares
	exec()'s path and a fix in only one would look complete from the other."

	self assert: (self reprAt: 'undefined_decorator_raises_name_error')
		equals: '[''NameError'', ''NameError'']'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testAPlainExpressionStringStillEvaluates [
	"The common case, untouched."

	self assert: (self reprAt: 'accepts_a_plain_expression_string') equals: '2'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testAPlainStatementStringIsStillRejected [
	"The other half of being right.  A fix that simply made eval() permissive
	would pass every other test here and break this one."

	self assert: (self reprAt: 'rejects_a_plain_statement_string')
		equals: '[''SyntaxError'', ''SyntaxError'']'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testCompileStillRaisesOnBadSource [
	"compile() parses to surface SyntaxError, and answering a registered copy
	must not have disturbed that."

	self assert: (self reprAt: 'compile_still_raises_on_bad_source')
		equals: '''SyntaxError'''.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testDecoratorSyntaxErrorsStillRaise [
	"compile() must still reject a decorator that is not an expression at all
	-- a SyntaxError from the parser, ahead of any of this."

	self assert: (self reprAt: 'decorator_syntax_errors_still_raise')
		equals: '[''SyntaxError'', ''SyntaxError'']'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testEvalModeCodeCanBeExeced [
	"exec() of an eval-mode code object is legal and answers None."

	self assert: (self reprAt: 'eval_mode_code_through_exec') equals: 'None'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testEvalModeCodeStillAnswersItsValue [
	"The mode is honoured in both directions: an ``eval''-mode result is still
	an expression and still answers its value."

	self assert: (self reprAt: 'eval_mode_code_answers_its_value') equals: '5'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testExecModeCodeAnswersNone [
	"CPython's eval() answers None for exec-mode code -- not the last value,
	which is what a permissive re-read of the source would produce."

	self assert: (self reprAt: 'exec_mode_code_answers_none') equals: 'None'.

]

{ #category : 'Grail-Tests' }
EvalExecModeCodeTestCase >> testExecModeCodeRunsAsStatements [
	"The headline: eval() of an exec-mode code object executes statements and
	answers None, and the bindings it made are there afterwards."

	self assert: (self reprAt: 'exec_mode_code_runs_statements')
		equals: '[None, 7]'.

]
