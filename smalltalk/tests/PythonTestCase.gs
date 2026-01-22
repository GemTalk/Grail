! ===============================================================================
! PythonTestCase - Abstract base class for Python tests
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PythonTestCase removeAllMethods.
PythonTestCase class removeAllMethods.
%

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
