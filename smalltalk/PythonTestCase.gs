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
ast

	^ModuleAst astForPath: '$HOME/code/Python/GemStoneP/tests/' , self filename
%
category: 'other'
classmethod: PythonTestCase
filename

	self subclassResponsibility.
%
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

	^self class filename
%
category: 'other'
method: PythonTestCase
pathToTests

	^'$HOME/code/Python/GemStoneP/tests/'
%
category: 'other'
method: PythonTestCase
setUp

	super setUp.
	stdout := WriteStream on: String new.
	(GsCurrentSession currentSession objectNamed: #'Builtins') current stdout: stdout.
	self filename ifNotNil: [:filename | 
		module := self resources first current moduleAtPath: self pathToTests , filename.
	].
	aScope := GlobalScope newForNode: self.
%
category: 'other'
method: PythonTestCase
statementsAt: anInteger

	^module.body.body at: anInteger
%
category: 'other'
method: PythonTestCase
tearDown

	(GsCurrentSession currentSession objectNamed: #'Builtins') current stdout: nil.
	super tearDown.
%
