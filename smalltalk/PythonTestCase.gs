! ------------------- Remove existing behavior from PythonTestCase
removeAllMethods PythonTestCase
removeAllClassMethods PythonTestCase
! ------------------- Class methods for PythonTestCase
set compile_env: 0
category: 'other'
classmethod: PythonTestCase
ast

	^ModuleAst astForPath: self pathToTests , self filename
%
category: 'other'
classmethod: PythonTestCase
filename

	self subclassResponsibility.
%
category: 'other'
classmethod: PythonTestCase
pathToTests

	^'$HOME/Code/Python/Grail/tests/'
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
assert: value

	super assert: (value == True or: [value]).
%
category: 'other'
method: PythonTestCase
deny: value

	super assert: (value == False or: [value ~= True or: [value not]]).
%
category: 'other'
method: PythonTestCase
filename

	^self class filename
%
category: 'other'
method: PythonTestCase
setUp

	super setUp.
	self filename ifNotNil: [:filename |
		module := self resources first current moduleAtPath: self class pathToTests , filename.
	].
%
category: 'other'
method: PythonTestCase
statementsAt: anInteger

	^module.body.body at: anInteger
%
