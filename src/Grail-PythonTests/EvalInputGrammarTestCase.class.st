Class {
	#name : 'EvalInputGrammarTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
EvalInputGrammarTestCase >> testCompileInSyntaxErrorHandlerParsesByItsOwnMode [
	"tests/python/compile_in_syntaxerror_handler.py: after a failed eval-mode
	compile() or eval(), a compile(), exec() or eval() inside the
	``except SyntaxError:'' handler parses by its own mode, not the eval rule
	(GemTalk/Grail#1883) -- the eval-then-exec fallback of CPython's REPL and
	brain-freeze's run_notebook.py, nested too.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'compile_in_syntaxerror_handler' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_in_syntaxerror_handler.py')
		name: 'compile_in_syntaxerror_handler'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
EvalInputGrammarTestCase >> testEvalInputIsOneExpressionListAndNothingElse [
	"tests/python/eval_input_grammar.py: eval() input and
	compile(..., 'eval') source parse by CPython's eval rule, so a statement or
	anything after the expression list is invalid syntax at its first token.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'eval_input_grammar' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/eval_input_grammar.py')
		name: 'eval_input_grammar'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '2 checks, 0 disagreeing [], keys match: True'

]
