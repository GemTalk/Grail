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
	(mods @env0:keys @env0:asArray) @env0:do: [:k | | ks |
		ks := k @env0:asString.
		((ks @env0:= aPrefix)
			@env0:or: [(ks @env0:size @env0:> prefixDot @env0:size)
				and: [(ks @env0:copyFrom: 1 to: prefixDot @env0:size) @env0:= prefixDot]])
			ifTrue: [
				"Skip only genuinely committed (deployed) instances."
				((deployed @env0:at: ks otherwise: nil) ifNil: [false] ifNotNil: [:m | m @env0:isCommitted])
					ifFalse: [mods @env0:removeKey: k ifAbsent: []]]]
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
	scope := System myUserProfile symbolList copy.
	scope insertObject: moduleScope at: 1.
	module := ModuleAst parseSource: pythonSource.
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
