! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'GlobalBuiltinFallbackTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GlobalBuiltinFallbackTestCase comment:
'One ``global'''' statement poisoned a builtin for a WHOLE MODULE.

``global all'''' promotes ``all'''' to a module-scope name.  That much is
CPython''s behaviour too, and is not the bug -- the bug was the READ that
happens before anything is assigned.  CPython''s LOAD_GLOBAL searches the
module globals and then BUILTINS before raising; Grail''s fallback,
NameError class >> ___resolveBuiltinOrSignal___:, knew only about names
INJECTED into builtins at run time (``builtins.__dict__[name] = value'''',
which is how gettext.install() publishes ``_'''').  A real builtin like
``all'''' was not there, so the read raised NameError.

THE BLAST RADIUS IS THE MODULE, NOT THE FUNCTION, which is what makes it
serious.  Once any function in a file declares ``global all'''', every read
of ``all'''' in that file compiles to a module attribute load -- including
reads in functions that never mentioned it, and in lambdas.  So a single
save-and-restore helper took the builtin away from its whole module, and
reading a name you intend to shadow before assigning it is the ordinary
way to write that helper.  A live trap, not a test artifact.

THE FIX IS THE CHAIN CODEGEN ALREADY USES.  ___globalAt___:otherwise: on
the builtins instance wraps a builtins METHOD as a BoundMethod and
CACHES the wrap (so ``len is len'''' stays true, which is why identity is
asserted here) and answers a builtins CLASS directly.  NameAst >>
emitBuiltinFirstClassRead:on: emits exactly that for an ordinary
first-class read; the runtime fallback now resolves the same way.

AND IT IS GATED, which is half the test.  Grail''s builtins class is also
its implementation namespace, so an ungated probe resolves names CPython
does not have: an undefined ``instance'''' or ``new'''' would come back as a
BoundMethod instead of raising NameError.  Resolution is restricted to
builtins class >> ___builtinNamespaceNames___, CPython''s own namespace,
for the same reason NameAst >> isResolvableSymbol: is -- an earlier
ungated symbol-list probe bound 166 names CPython would not resolve at
all.  The undefined-name tests here hold that line.

Covers test_builtin test_all, test_any and
test_builtin_call_async_genexpr_no_crash.'
%

doit
GlobalBuiltinFallbackTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
GlobalBuiltinFallbackTestCase removeAllMethods: 0.
GlobalBuiltinFallbackTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: GlobalBuiltinFallbackTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'global_builtin_fallback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/global_builtin_fallback.py')
		name: 'global_builtin_fallback'.
%

category: 'Grail-Helpers'
method: GlobalBuiltinFallbackTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: GlobalBuiltinFallbackTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: GlobalBuiltinFallbackTestCase
testAShadowedBuiltinIsReadableBeforeItIsAssigned
	"The save-and-restore idiom: read the builtin, replace it, put it
	back.  The first read is the one that raised."

	self assertAll: #('shadow_all' 'shadow_any' 'sorted_save_and_restore')
%

category: 'Grail-Tests'
method: GlobalBuiltinFallbackTestCase
testTheRestOfTheModuleKeepsTheBuiltinToo
	"The blast radius.  These readers never say ``global'' -- one other
	function in the file did, which is enough to make the name
	module-scope for everybody, lambdas included."

	self assertAll: #('read_without_declaring' 'read_after_restore'
		'read_in_a_lambda' 'declared_but_never_assigned')
%

category: 'Grail-Tests'
method: GlobalBuiltinFallbackTestCase
testAResolvedBuiltinIsTheSameObjectEachTime
	"___globalAt___: caches the BoundMethod wrap, so ``zip is zip'' holds
	-- a fresh wrapper per read would answer False where CPython's
	builtins have stable identity."

	self assertAll: #('identity_is_stable')
%

category: 'Grail-Tests'
method: GlobalBuiltinFallbackTestCase
testABuiltinClassResolvesAsWellAsAFunction
	"The chain answers a CLASS directly rather than wrapping it, so
	``global TypeError'' then reading it gives the class."

	self assertAll: #('a_builtin_class_resolves_too')
%

category: 'Grail-Tests'
method: GlobalBuiltinFallbackTestCase
testAnUndefinedNameStillRaises
	"Half the point of the change.  ``instance'' and ``new'' are real
	selectors on Grail's builtins class, and an UNGATED fallback would
	answer a BoundMethod for them -- a wrong answer where CPython raises.
	The curated builtins namespace is what keeps them out."

	self assertAll: #('undefined_plain' 'undefined_declared_global'
		'implementation_name_does_not_leak' 'another_implementation_name')
%

category: 'Grail-Tests'
method: GlobalBuiltinFallbackTestCase
testOrdinaryReadsAreUnchanged
	"The regression half: an undeclared builtin call still works, and a
	module global that IS assigned still shadows the builtin rather than
	falling through to it."

	self assertAll: #('ordinary_builtin_call' 'assigned_module_global_wins')
%
