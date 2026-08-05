! ------------------- Superclass check
run
TestCase ifNil: [self error: 'TestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonTestCase
expectvalue /Class
doit
TestCase subclass: 'PythonTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PythonTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PythonTestCase - Abstract base class for Python tests
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PythonTestCase removeAllMethods.
PythonTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Testing'
classmethod: PythonTestCase
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName == #PythonTestCase
%

category: 'Grail-Testing'
classmethod: PythonTestCase
suite
	"Return a test suite for all PythonTestCase subclasses.
	Initialize modules before creating the suite."
	
	"Initialize sys.modules to ensure all built-in modules are registered.
	We need to do this carefully to avoid circular dependencies.
	Call the class method directly in Python environment."
	[sys @env1:modules] on: Error do: [:ex | 
		"If initialization fails, continue anyway - individual tests will handle it"
		Transcript show: 'Warning: Could not initialize sys.modules: ', ex messageText; cr
	].
	
	^ super suite
%

category: 'Grail-helpers'
method: PythonTestCase
___resetImportedFramework___: aPrefix
	"Remove ``aPrefix`` and its ``aPrefix.*`` submodules from sys.modules
	for test isolation -- BUT skip any that are canonical-DEPLOYED
	(docs/Persistent_Modules_and_Classes.md par.10): a deployed module is
	a committed, shared, immutable instance, so there is no per-test state
	to isolate, and removing it would make the fixture's re-import trip the
	par.10.5 delete-and-reimport guard.  Leaving it lets the re-import
	warm-BIND the deployed instance.  With no deployment (the default test
	run) every match is removed exactly as before, forcing the fresh
	recompile these framework-import tests were written to exercise."

	| mods deployed prefixDot |
	mods := importlib @env1:modules.
	deployed := importlib ___canonicalModules___.
	prefixDot := aPrefix , '.'.
	(mods keys asArray) do: [:k | | ks |
		ks := k asString.
		((ks = aPrefix)
			or: [(ks size > prefixDot size)
				and: [(ks copyFrom: 1 to: prefixDot size) = prefixDot]])
			ifTrue: [
				"Skip only genuinely committed (deployed) instances."
				((deployed at: ks otherwise: nil) ifNil: [false] ifNotNil: [:m | m isCommitted])
					ifFalse: [mods removeKey: k ifAbsent: []]]]
%

category: 'Grail-helpers'
method: PythonTestCase
tmpRoot
	"This checkout's private fixture directory, ``/tmp/Grail<N>'', created on
	demand.  Four checkouts share one stone on the dev host as four users, so
	an absolute fixture path shared between them is a real collision -- see
	importlib class>>grailTmpDir for what it cost."

	^ importlib grailTmpDir
%

category: 'Grail-helpers'
method: PythonTestCase
tmp: aName
	"A path for a fixture named aName inside this checkout's tmpRoot.  Use
	this from SMALLTALK code; Python source passed to eval: should say
	``$TMP/<name>'' instead, which eval: expands."

	^ (self tmpRoot , '/') , aName
%

category: 'Grail-helpers'
method: PythonTestCase
expandTmpTokensIn: aString
	"Replace the ``$TMP'' token with this checkout's tmpRoot.

	Fixture Python source says $TMP/thing rather than a hardcoded
	/tmp/grail_thing, so that concurrent checkouts do not write to, and
	rmtree, one another's fixtures.  A token rather than Smalltalk string
	concatenation keeps multi-line embedded Python readable and cannot break
	the surrounding Smalltalk literal.  ``$'' is not otherwise special in
	Python or in a Smalltalk string.

	Guarded on includesString: so the common no-token case does not copy the
	source at all."

	^ (aString includesString: '$TMP')
		ifTrue: [aString copyReplaceAll: '$TMP' with: self tmpRoot]
		ifFalse: [aString]
%

category: 'Grail-helpers'
method: PythonTestCase
eval: pythonSource
	"Parse and evaluate a Python source string, returning the result.

	Phase 4c: the previous version inserted `builtins ___instance___` at
	position 2 in the symbol list so bare-name builtin references could
	resolve through the SymbolDictionary protocol. With Phase 4 codegen,
	all builtin calls go through `((builtins instance) name: …)` or
	BoundMethod, and bare-name resolution for builtins is no longer used.
	The insertion has been removed."

	| moduleScope scope module |
	moduleScope := SymbolDictionary new.
	scope := importlib ___grailCompileSymbolList___.
	scope insertObject: moduleScope at: 1.
	module := ModuleAst parseSource: (self expandTmpTokensIn: pythonSource).
	module useTempsForBlock: false.
	module ensureModuleScope: moduleScope.
	^module evaluateWithScope: scope
%

category: 'Grail-testing'
method: PythonTestCase
performTest

	[
		super performTest.
	] on: BaseException do: [:ex |
		Error signal: ex description.
	].
%

category: 'Grail-testing'
method: PythonTestCase
runCase
	"As TestCase>>runCase, but with setUp and tearDown covered by the same
	BaseException -> Error bridge that performTest gives the test method.

	Grail's Python exceptions are NOT kinds of Error:

	    ModuleNotFoundError -> ImportError -> Exception -> BaseException
	                        -> Exception -> AbstractException -> Object

	and SUnit's TestResult>>runCase: handler is
	``self class failure , self class error'' = ``TestFailure , Error''.
	Stock TestCase>>runCase is

	    [self setUp. self performTest] ensure: [self tearDown]

	so setUp and tearDown sit OUTSIDE the performTest bridge.  A Python
	exception raised in either matched neither arm of that handler, escaped
	to the top level, and took the WHOLE run down -- a CI shard, or an
	interactive ``PythonTestCase suite run'' -- instead of being recorded as
	one test error.  ShutilTestCase>>setUp did exactly that in a session
	whose grailDir was never set: `import shutil' raised
	ModuleNotFoundError, and 4000-odd unrelated tests never ran.

	Wrapping super is not double-wrapping: an exception out of the test
	METHOD has already been converted to an Error by performTest, so it is
	no longer a BaseException when it reaches this handler.  A TestFailure
	from ``self assert:'' is a sibling of Error under Exception, not a Python
	exception, so it passes through untouched and still reports as a FAILURE
	rather than an error.

	super's own ensure: still runs tearDown before the exception gets here."

	"Start every test with no exception BEING HANDLED.  sys.exc_info() reads a
	session-global (SessionTemps #GrailCurrentException) that TryAst sets on
	except-handler entry and restores on exit with an ensure: block.  That
	restore is skipped when the unwind would cross a C primitive, user action
	or FFI frame -- GemStone refuses to run ensure: blocks across one
	(UncontinuableError) -- so an error escaping the CPython shim leaves the
	slot set for the REST OF THE SESSION.  Every later test that asserts
	sys.exc_info() is empty then fails for a reason that has nothing to do with
	it: one shim fault in DunderNewTestCase produced two failures over in
	TracebackTestCase, which is most of why that run was hard to read.
	Clearing here keeps a leak contained to the test that caused it."
	BaseException ___setCurrentException___: nil.
	[ super runCase ]
		on: BaseException
		do: [:ex | Error signal: ex description]
%
