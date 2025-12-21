! ===============================================================================
! PythonTestCase - Abstract base class for Python tests
! ===============================================================================

expectvalue /Metaclass3
doit
PythonTestCase removeAllMethods: 2.
PythonTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Testing'
classmethod: PythonTestCase
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName == #PythonTestCase
%

