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
PythonTestCase category: 'SUnit'
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

category: 'Testing'
classmethod: PythonTestCase
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName == #PythonTestCase
%

category: 'Testing'
classmethod: PythonTestCase
suite
	"Return a test suite for all PythonTestCase subclasses.
	Initialize modules before creating the suite."
	
	"Initialize sys.modules to ensure all built-in modules are registered.
	We need to do this carefully to avoid circular dependencies.
	Call the class method directly in Python environment."
	[sys perform: #modules env: 2] on: Error do: [:ex | 
		"If initialization fails, continue anyway - individual tests will handle it"
		Transcript show: 'Warning: Could not initialize sys.modules: ', ex messageText; cr
	].
	
	^ super suite
%

category: 'helpers'
method: PythonTestCase
eval: pythonSource
	"Parse and evaluate a Python source string, returning the result."

	| moduleScope scope module |
	moduleScope := SymbolDictionary new.
	scope := System myUserProfile symbolList copy.
	scope insertObject: builtins ___instance___ at: 1.
	scope insertObject: moduleScope at: 1.
	module := ModuleAst parseSource: pythonSource.
	module useTempsForBlock: false.
	module ensureModuleScope: moduleScope.
	^module evaluateWithScope: scope
%
