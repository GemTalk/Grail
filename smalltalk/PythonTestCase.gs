! ------------------- Remove existing behavior from PythonTestCase
expectvalue /Metaclass3       
doit
PythonTestCase removeAllMethods.
PythonTestCase class removeAllMethods.
%
! ------------------- Class methods for PythonTestCase
set compile_env: 0
category: 'other'
classmethod: PythonTestCase
resources

	^super resources , (Array with: PythonTestResource)
%
set compile_env: 0
category: 'Testing'
classmethod: PythonTestCase
isAbstract
	"Override to true if a TestCase subclass is Abstract and should not have
	TestCase instances built from it"

	^self sunitName == #PythonTestCase
%
! ------------------- Instance methods for PythonTestCase
set compile_env: 0
category: 'other'
method: PythonTestCase
filename

	self subclassResponsibility.
%
category: 'other'
method: PythonTestCase
setUp

	super setUp.
	statements := self resources first current statementsForModuleAtPath: '$HOME/code/Python/GemStoneP/tests/' , self filename.
%
