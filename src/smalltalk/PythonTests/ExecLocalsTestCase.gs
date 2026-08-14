! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ExecLocalsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecLocalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecLocalsTestCase - the ``locals'' argument of exec() and eval()
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecLocalsTestCase removeAllMethods.
ExecLocalsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - builtins'
method: ExecLocalsTestCase
assertResults: expectations
	"Each entry is { key. CPython 3.14's repr of that value }."

	| mod results |
	importlib @env1:modules removeKey: #'exec_locals' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_locals.py')
		name: 'exec_locals'.
	results := mod @env1:___pyAttrLoad___: #RESULTS_REPR.
	expectations do: [:pair |
		| got |
		got := (results @env1:__getitem__: (pair at: 1)) asString.
		self
			assert: (got = (pair at: 2))
			description: (pair at: 1) , ': expected <' , (pair at: 2) ,
				'> but got <' , got , '>']
%

category: 'Grail-Tests - builtins'
method: ExecLocalsTestCase
testExecBindsIntoLocals
	"``exec(source, globals, locals)'' binds into LOCALS.  Grail ignored the
	third argument entirely and reflected every binding into globals, which is
	not an approximation of the 3-argument form but a silent no-op for it:

	    l = {}
	    exec('def f(): ...', {}, l)

	left l EMPTY.  Nothing exec'd into a separate namespace could be read back
	-- and not just defs: assignments, classes and imports were dropped the
	same way, since they are all just bindings in the module body's scope.

	test_call's test_function_with_many_args is one line of exactly this (it
	reads l['f']), and was the only error left in that module once the missing
	test.support names let it import at all."

	self assertResults: {
		{ 'def_into_locals'. '[''f'']' }.
		"...and what lands there is the real function, not a name."
		{ 'def_is_callable'. '5' }.
		{ 'assign_into_locals'. '[''x'']' }.
		{ 'mixed_into_locals'. '[''C'', ''sys'', ''y'']' } }
%

category: 'Grail-Tests - builtins'
method: ExecLocalsTestCase
testExecReflectsOnlyWhatTheSourceBound
	"The reflect-back writes only the bindings the SOURCE produced.  The scope
	an exec runs in is SEEDED from globals, so reflecting the whole scope into
	locals would pass the tests above while quietly making every exec'd
	namespace a merged copy of its globals -- which is why the seeded entries
	are recorded and skipped by identity on the way out.

	The globals mapping is read through normally while the source runs, and
	must come back unchanged."

	self assertResults: {
		{ 'locals_only_new'. '[''z'']' }.
		{ 'globals_untouched'. '[''other'', ''seed'']' }.
		{ 'read_through_globals'. '3' }.
		"Locals is seeded over globals, so a name in both resolves to locals."
		{ 'locals_shadows_globals'. '''from_locals''' } }
%

category: 'Grail-Tests - builtins'
method: ExecLocalsTestCase
testExecWithoutLocalsStillUsesGlobals
	"CPython defaults locals to globals, so the 2-argument form must keep
	reflecting into globals exactly as before.  This is the shape the
	load-bearing in-tree caller uses -- jinja2's Template.from_code exec's its
	generated render source into a fresh dict and reads root / blocks / name /
	debug_info back out of it -- so it is the one that must not move."

	self assertResults: {
		{ 'two_arg_into_globals'. '[''g2'']' }.
		"Passing the same mapping twice is what that default MEANS, and has to
		behave identically -- the identity check that suppresses seeded
		entries must not suppress the source's own bindings here."
		{ 'same_mapping_twice'. '[''h'']' } }
%

category: 'Grail-Tests - builtins'
method: ExecLocalsTestCase
testGlobalDeclarationOverridesLocalsRouting
	"``global'' is the one thing that sends a binding to GLOBALS when every
	other binding the body made goes to locals.  Grail runs an exec'd body in
	one flat scope -- there is no separate globals/locals at runtime -- so by
	the time the reflect-back runs, that declaration is the only evidence left
	that a binding was meant for globals.  ModuleAst walks the parsed source
	for it, nested defs included, since that is where it almost always is.

	test_named_expressions' test_named_expression_scope_25 is precisely this
	shape, and routing everything to locals without the override traded its
	pass for the ones this fix buys -- it asserts ns['a'] == 20 where a is
	declared global inside a def and the enclosing exec was given a
	throwaway {} for locals."

	self assertResults: {
		{ 'global_decl_to_globals'. '20' }.
		"The def alongside it was not declared global, so it is NOT in globals."
		{ 'global_decl_keeps_rest_local'. '[''a'']' } }
	"A MODULE-LEVEL ``global'' in exec'd source is deliberately not covered --
	see the note in the fixture.  It routes correctly here, but the doit does
	not compile at all (``undefined symbol''), which is a separate gap sitting
	in front of this one."
%

category: 'Grail-Tests - builtins'
method: ExecLocalsTestCase
testEvalTakesLocalsOnTheSameTerms
	"eval() had the identical gap and the identical shape, so it got the
	identical fix: locals seeded over globals for lookups, and the target the
	reflect-back writes to.  A walrus is the way an expression binds a name,
	so it is what proves the write half."

	self assertResults: {
		{ 'eval_reads_locals'. '3' }.
		{ 'eval_walrus_value'. '8' }.
		{ 'eval_walrus_binding'. '[''n'']' } }
%
