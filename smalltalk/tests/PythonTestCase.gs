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
