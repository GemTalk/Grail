! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EvalExecModeCodeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EvalExecModeCodeTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EvalExecModeCodeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EvalExecModeCodeTestCase
!
! eval() OF A CODE OBJECT COMPILED IN ``exec'' MODE, and the bare-name decorator
! that could not be resolved in exec'd source.  Two independent gaps, both
! reached by test_decorators' test_errors.
!
! ---------------------------------------------------------------------------
! 1. eval() TREATS A STRING AND A CODE OBJECT DIFFERENTLY.
!
! A STRING must be a single expression -- ``eval('x = 1')'' is a SyntaxError.  A
! CODE OBJECT runs whatever it holds, so a source compiled in ``exec'' mode
! executes as STATEMENTS and eval() answers None.  That is not a technicality
! here: test_errors compiles a three-statement source in exec mode and eval()s
! it, expecting the DECORATOR's error to come out.
!
! Grail has no bytecode and compile() answers the source TEXT, which collapsed
! the two cases -- eval() could not tell a compile() result from a string a
! caller wrote, and applied the single-expression rule to both.
!
! THE MODE IS RECORDED IN A SIDE TABLE keyed by the object compile() answers,
! because there is nowhere else to put it: a GemStone String is a byte object
! and cannot carry a named instVar.  compile() answers a fresh COPY so that
! identity is a safe key -- answering the caller's own string would key on an
! object two call sites can share, and a string compiled once in exec mode could
! then make an unrelated eval() of an equal string run as statements.
!
! Returning a real code object instead was the other candidate and was rejected:
! compile() answering the source string is a contract the vendored code has been
! ADAPTED to -- jinja2's from_code tests ``hasattr(code, 'co_filename')'' and
! falls back, and flask, werkzeug and the REPL all exec() the result -- so
! changing the return type moves the risk into template rendering to buy a
! purity this table gets without it.
!
! THE SINGLE-EXPRESSION RULE STILL APPLIES TO STRINGS.  A fix that merely made
! eval() permissive would pass every interesting check here and quietly break
! that, which is why testAPlainStatementStringIsStillRejected is a test rather
! than an assumption.
!
! ---------------------------------------------------------------------------
! 2. A BARE-NAME DECORATOR IN EXEC'D SOURCE.
!
! The parser records ``@undef'' as a Symbol and the emit puts out a bare
! Smalltalk identifier.  In a DOIT a name bound nowhere is then a COMPILE error
! -- ``[1031] undefined symbol'' -- which aborts the entire exec() and CANNOT be
! caught from Python.  CPython raises NameError, which can.  The emit now
! answers NameAst's own free-name form, ___resolveBuiltinOrSignal___:, so the
! two agree and a name injected into builtins at run time still resolves.
!
! THE GUARD IS THE WHOLE DIFFICULTY, and the first version of it was wrong in an
! instructive way.  It asked the STATIC records -- moduleVariableNames,
! moduleFunctionNames, enclosing-function locals -- and reported every
! CONTEXT-SUPPLIED decorator as undefined, because those records describe the
! SOURCE being compiled and know nothing of the caller's namespace.  exec() and
! eval() seed their globals into the doit's scope, so ``@nullval'' with
! ``nullval'' in the passed-in globals resolves perfectly well; calling it
! undefined turned test_errors' expected TypeError into a NameError.  The guard
! now ASKS THE SYMBOL LIST first, which is the only test that sees those names
! -- and is the advice ModuleAst >> compilingDoitScope already gives for
! NameAst's fallback: asking the symbol list is asking exactly the question the
! Smalltalk compiler is about to ask.
!
! GATED ON DOIT CONTEXT, deliberately.  Outside a doit the enclosing method's
! temps are not enumerable from the emit, so ``I could not find it'' does not
! mean ``it is not there'' -- and EVERY ordinary decorator in the corpus goes
! through this emit, so a guard that guessed wrong would convert working code
! into a NameError raise.  Inside a doit the question is answerable.
!
! Fixture: tests/python/eval_exec_mode_code.py (self-verifying under CPython
! 3.14).  It compares exception TYPES rather than messages -- Grail's
! SyntaxError text for a rejected eval string differs from CPython's, and that
! is not what any of this is about.
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: EvalExecModeCodeTestCase
setUp
	probe := self ___loadProbe___: 'eval_exec_mode_code'.
%

category: 'Grail-Private'
method: EvalExecModeCodeTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: EvalExecModeCodeTestCase
reprAt: aKey
	"The fixture's entries are nested Python values; compare their repr so a
	failure prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testExecModeCodeRunsAsStatements
	"The headline: eval() of an exec-mode code object executes statements and
	answers None, and the bindings it made are there afterwards."

	self assert: (self reprAt: 'exec_mode_code_runs_statements')
		equals: '[None, 7]'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testExecModeCodeAnswersNone
	"CPython's eval() answers None for exec-mode code -- not the last value,
	which is what a permissive re-read of the source would produce."

	self assert: (self reprAt: 'exec_mode_code_answers_none') equals: 'None'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testEvalModeCodeStillAnswersItsValue
	"The mode is honoured in both directions: an ``eval''-mode result is still
	an expression and still answers its value."

	self assert: (self reprAt: 'eval_mode_code_answers_its_value') equals: '5'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testAPlainStatementStringIsStillRejected
	"The other half of being right.  A fix that simply made eval() permissive
	would pass every other test here and break this one."

	self assert: (self reprAt: 'rejects_a_plain_statement_string')
		equals: '[''SyntaxError'', ''SyntaxError'']'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testAPlainExpressionStringStillEvaluates
	"The common case, untouched."

	self assert: (self reprAt: 'accepts_a_plain_expression_string') equals: '2'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testEvalModeCodeCanBeExeced
	"exec() of an eval-mode code object is legal and answers None."

	self assert: (self reprAt: 'eval_mode_code_through_exec') equals: 'None'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testAnUndefinedDecoratorRaisesNameError
	"Previously an uncatchable Smalltalk CompileError that took the whole
	exec() down.  Checked through BOTH entry points, since eval() now shares
	exec()'s path and a fix in only one would look complete from the other."

	self assert: (self reprAt: 'undefined_decorator_raises_name_error')
		equals: '[''NameError'', ''NameError'']'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testAContextSuppliedDecoratorIsFound
	"The boundary the first guard got wrong: these names come from the
	CALLER's globals, are seeded into the doit scope, and resolve -- so each
	fails on its OWN terms rather than as an undefined name.  test_errors'
	remaining three rows."

	self assert: (self reprAt: 'context_supplied_decorator_is_found')
		equals: '[''TypeError'', ''AttributeError'', ''NotImplementedError'']'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testADecoratorDeclaredInsideTheExecSourceStillWorks
	"Declared by the source being compiled, so it has a pre-created slot and a
	bare identifier is correct.  The case the new emit must NOT claim."

	self assert: (self reprAt: 'decorator_defined_inside_the_exec_source')
		equals: '''k'''.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testANonCallableDecoratorIsATypeError
	"Already correct, kept as a regression guard: resolving the name and
	FAILING to call it must stay distinct from not resolving it."

	self assert: (self reprAt: 'a_non_callable_decorator_is_a_type_error')
		equals: '[''TypeError'', ''TypeError'']'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testDecoratorSyntaxErrorsStillRaise
	"compile() must still reject a decorator that is not an expression at all
	-- a SyntaxError from the parser, ahead of any of this."

	self assert: (self reprAt: 'decorator_syntax_errors_still_raise')
		equals: '[''SyntaxError'', ''SyntaxError'']'.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testAnOrdinaryLocalDecoratorIsUnaffected
	"The emit is gated on doit context; this is the ordinary path that every
	decorator in the corpus takes."

	self assert: (self reprAt: 'a_local_decorator_still_works') equals: '''h'''.
%

category: 'Grail-Tests'
method: EvalExecModeCodeTestCase
testCompileStillRaisesOnBadSource
	"compile() parses to surface SyntaxError, and answering a registered copy
	must not have disturbed that."

	self assert: (self reprAt: 'compile_still_raises_on_bad_source')
		equals: '''SyntaxError'''.
%
