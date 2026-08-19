! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'BreakpointBuiltinTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
BreakpointBuiltinTestCase comment:
'PEP 553: breakpoint() and sys.breakpointhook.

breakpoint() does exactly one thing -- forward to whatever sys.breakpointhook
currently is.  That indirection IS the feature: a program, a test, or
$PYTHONBREAKPOINT can redirect every breakpoint() in a codebase without
touching a call site.  So the hook is read on EACH call rather than captured
once, and the tests assign to it between calls to prove it.

The default hook is driven entirely by $PYTHONBREAKPOINT: unset or empty means
pdb.set_trace(), ``0'' means do nothing, and anything else is a dotted name to
import and call (a bare name means builtins).  An unimportable one is a
RuntimeWarning rather than an error -- a mistyped variable must not take the
program down at its first breakpoint.

Grail had the NAME in builtins'' table and a sys.breakpointhook that answered
None, so breakpoint() raised NameError.  Two methods shared the selector
``breakpointhook'' -- a dead accessor and the stub -- and the live hook is now
stored in the module DICT instead, because a test replaces it and the
replacement has to be what the next breakpoint() finds.

pdb is new too, and deliberately small: set_trace() pauses into GemStone''s own
debugger, which is the thing that actually stops execution for a human here.
The pdb command language is NOT stubbed -- a caller wanting step/next/continue
wants CPython''s debugger, and stubs that accepted those calls and did nothing
would be worse than the AttributeError.

See tests/python/breakpoint_builtin.py.'
%

expectvalue /Class
doit
BreakpointBuiltinTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
BreakpointBuiltinTestCase removeAllMethods: 0.
BreakpointBuiltinTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: BreakpointBuiltinTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'breakpoint_builtin' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/breakpoint_builtin.py')
		name: 'breakpoint_builtin'.
%

category: 'Grail-Helpers'
method: BreakpointBuiltinTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: BreakpointBuiltinTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - forwarding'
method: BreakpointBuiltinTestCase
testForwardsToTheHook
	"Arguments and keywords reach the hook, and its return value comes back."

	self assertAll: #('calls_the_hook'
		'forwards_positional_and_keyword_arguments'
		'returns_what_the_hook_returns')
%

category: 'Grail-Tests - forwarding'
method: BreakpointBuiltinTestCase
testTheHookIsReadOnEveryCall
	"Not captured once: replacing it between two calls sends them to
	different places, which is the whole point of the indirection."

	self assertAll: #('hook_is_read_on_each_call')
%

category: 'Grail-Tests - forwarding'
method: BreakpointBuiltinTestCase
testArgumentMismatchRaises
	"A hook that cannot take the arguments raises TypeError rather than being
	called wrongly."

	self assertAll: #('argument_mismatch_raises_typeerror')
%

category: 'Grail-Tests - the original hook'
method: BreakpointBuiltinTestCase
testDunderHookExistsAndRestores
	"sys.__breakpointhook__ is the original, and assigning it back restores
	default behaviour."

	self assertAll: #('dunder_hook_exists' 'hook_can_be_reset')
%

category: 'Grail-Tests - PYTHONBREAKPOINT'
method: BreakpointBuiltinTestCase
testZeroDisablesIt
	"``0'' means do nothing at all -- no import, no call, answer None."

	self assertAll: #('envvar_zero_is_a_noop')
%

category: 'Grail-Tests - PYTHONBREAKPOINT'
method: BreakpointBuiltinTestCase
testADottedNameIsImportedAndCalled
	"A bare name means builtins; a dotted one names a module attribute.  Both
	receive breakpoint()''s own arguments."

	self assertAll: #('envvar_names_a_builtin' 'envvar_names_a_dotted_path')
%

category: 'Grail-Tests - PYTHONBREAKPOINT'
method: BreakpointBuiltinTestCase
testAnUnimportableNameWarnsRatherThanRaising
	"RuntimeWarning and None: a mistyped environment variable must not take
	the program down at its first breakpoint."

	self assertAll: #('unimportable_envvar_warns_and_returns_none')
%

category: 'Grail-Tests - pdb'
method: BreakpointBuiltinTestCase
testTheDefaultReachesPdbSetTrace
	"Unset and empty both mean pdb.set_trace(), observable by replacing that
	function rather than by stopping anything."

	self assertAll: #('pdb_provides_set_trace'
		'default_hook_calls_pdb_set_trace'
		'empty_envvar_is_the_same_as_unset')
%
