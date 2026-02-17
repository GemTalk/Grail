! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SysTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SysTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SysTestCase category: 'SUnit'
%

! ===============================================================================
! SysTestCase - Tests for Python sys module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
SysTestCase removeAllMethods: 0.
SysTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Tests - I/O Streams'
method: SysTestCase
_testStderr
	"Test sys.stderr is a GsFile"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #stderr env: 2.

	self assert: result notNil.
	self assert: (result isKindOf: GsFile)
%

category: 'Tests - I/O Streams'
method: SysTestCase
_testStdin
	"Test sys.stdin is a GsFile"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #stdin env: 2.

	self assert: result notNil.
	self assert: (result isKindOf: GsFile)
%

category: 'Tests - I/O Streams'
method: SysTestCase
_testStdout
	"Test sys.stdout is a GsFile"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #stdout env: 2.

	self assert: result notNil.
	self assert: (result isKindOf: GsFile)
%

category: 'Setup'
method: SysTestCase
setUp
	"Initialize the modules registry before each test"
	sys perform: #modules env: 2
%

category: 'Tests - Runtime Info'
method: SysTestCase
testArgv
	"Test sys.argv is a list"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #argv env: 2.

	self assert: (result isKindOf: list)
%

category: 'Tests - Runtime Info'
method: SysTestCase
testBuiltinModuleNames
	"Test sys.builtin_module_names contains expected modules"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #builtin_module_names env: 2.

	self assert: (result isKindOf: tuple)
%

category: 'Tests - Platform Info'
method: SysTestCase
testByteorder
	"Test sys.byteorder attribute"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #byteorder env: 2.

	self assert: ((result = 'little') or: [result = 'big'])
%

category: 'Tests - Runtime Info'
method: SysTestCase
testCopyright
	"Test sys.copyright attribute"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #copyright env: 2.

	self assert: (result isKindOf: String).
	self assert: result size > 0
%

category: 'Tests - Hooks'
method: SysTestCase
testDisplayhookExists
	"Test sys.displayhook exists and is callable"

	| s displayhookBlock |
	s := sys perform: #instance env: 2.
	displayhookBlock := s perform: #displayhook env: 2.

	self assert: displayhookBlock notNil
%

category: 'Tests - Hooks'
method: SysTestCase
testExcepthookExists
	"Test sys.excepthook exists and is callable"

	| s excepthookBlock |
	s := sys perform: #instance env: 2.
	excepthookBlock := s perform: #excepthook env: 2.

	self assert: excepthookBlock notNil
%

category: 'Tests - Functions'
method: SysTestCase
testExcInfo
	"Test sys.exc_info() returns a tuple"

	| s excInfoBlock result |
	s := sys perform: #instance env: 2.
	excInfoBlock := s perform: #exc_info env: 2.

	result := excInfoBlock value: {} value: nil.

	self assert: (result isKindOf: tuple).
	self assert: result size == 3
%

category: 'Tests - Path Info'
method: SysTestCase
testExecutable
	"Test sys.executable is set from GemStone"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #executable env: 2.

	self assert: (result isKindOf: String)
%

category: 'Tests - Functions'
method: SysTestCase
testExit
	"Test sys.exit raises SystemExit"

	| s exitBlock |
	s := sys perform: #instance env: 2.
	exitBlock := s perform: #exit env: 2.

	self should: [exitBlock value: {} value: nil] raise: SystemExit
%

category: 'Tests - Functions'
method: SysTestCase
testExitWithCode
	"Test sys.exit(code) raises SystemExit with code"

	| s exitBlock |
	s := sys perform: #instance env: 2.
	exitBlock := s perform: #exit env: 2.

	self should: [exitBlock value: {42} value: nil] raise: SystemExit
%

category: 'Tests - Functions'
method: SysTestCase
testGetdefaultencoding
	"Test sys.getdefaultencoding() returns utf-8"

	| s getdefaultencodingBlock result |
	s := sys perform: #instance env: 2.
	getdefaultencodingBlock := s perform: #getdefaultencoding env: 2.

	result := getdefaultencodingBlock value: {} value: nil.

	self assert: result equals: 'utf-8'
%

category: 'Tests - Functions'
method: SysTestCase
testGetfilesystemencoding
	"Test sys.getfilesystemencoding() returns utf-8"

	| s getfilesystemencodingBlock result |
	s := sys perform: #instance env: 2.
	getfilesystemencodingBlock := s perform: #getfilesystemencoding env: 2.

	result := getfilesystemencodingBlock value: {} value: nil.

	self assert: result equals: 'utf-8'
%

category: 'Tests - Functions'
method: SysTestCase
testGetrecursionlimit
	"Test sys.getrecursionlimit() returns a positive integer"

	| s getrecursionlimitBlock result |
	s := sys perform: #instance env: 2.
	getrecursionlimitBlock := s perform: #getrecursionlimit env: 2.

	result := getrecursionlimitBlock value: {} value: nil.

	self assert: (result isKindOf: Integer).
	self assert: result > 0
%

category: 'Tests - Functions'
method: SysTestCase
testGetsizeof
	"Test sys.getsizeof() returns a size"

	| s getsizeofBlock result |
	s := sys perform: #instance env: 2.
	getsizeofBlock := s perform: #getsizeof env: 2.

	result := getsizeofBlock value: {'hello'} value: nil.

	self assert: (result isKindOf: Integer).
	self assert: result >= 0
%

category: 'Tests - import_module'
method: SysTestCase
testImportSys
	"Test importing sys module via importlib"

	| imp importModuleBlock result |
	imp := importlib perform: #instance env: 2.
	importModuleBlock := imp perform: #import_module env: 2.

	result := importModuleBlock value: {'sys'} value: nil.

	self assert: result class equals: sys
%

category: 'Tests - Singleton'
method: SysTestCase
testInstance
	"Test that sys module is a singleton"

	| s1 s2 |
	s1 := sys perform: #instance env: 2.
	s2 := sys perform: #instance env: 2.

	self assert: s1 == s2
%

category: 'Tests - Functions'
method: SysTestCase
testIntern
	"Test sys.intern() returns the same string"

	| s internBlock result |
	s := sys perform: #instance env: 2.
	internBlock := s perform: #intern env: 2.

	result := internBlock value: {'hello'} value: nil.

	self assert: result equals: 'hello'
%

category: 'Tests - Functions'
method: SysTestCase
testIsFinalizing
	"Test sys.is_finalizing() returns false during normal execution"

	| s isFinalizingBlock result |
	s := sys perform: #instance env: 2.
	isFinalizingBlock := s perform: #is_finalizing env: 2.

	result := isFinalizingBlock value: {} value: nil.

	self assert: result equals: false
%

category: 'Tests - Platform Info'
method: SysTestCase
testMaxsize
	"Test sys.maxsize attribute"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #maxsize env: 2.

	self assert: (result isKindOf: Integer).
	self assert: result > 0
%

category: 'Tests - Path Info'
method: SysTestCase
testModules
	"Test sys.modules attribute is shared with importlib"

	| s result importModules |
	s := sys perform: #instance env: 2.
	result := s perform: #modules env: 2.
	importModules := importlib perform: #modules env: 2.

	self assert: result == importModules
%

category: 'Tests - Singleton'
method: SysTestCase
testNewRaisesError
	"Test that sys.new raises TypeError"

	self should: [sys perform: #new env: 2] raise: TypeError
%

category: 'Tests - Path Info'
method: SysTestCase
testPath
	"Test sys.path attribute is a list"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #path env: 2.

	self assert: (result isKindOf: list)
%

category: 'Tests - Platform Info'
method: SysTestCase
testPlatform
	"Test sys.platform attribute"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #platform env: 2.

	self assert: (result isKindOf: String).
	self assert: ((result = 'darwin') or: [(result = 'linux') or: [result = 'win32']])
%

category: 'Tests - Platform Info'
method: SysTestCase
testPlatformFromGemStone
	"Test sys.platform is derived from GemStone osName"

	| s result osName |
	s := sys perform: #instance env: 2.
	result := s perform: #platform env: 2.
	osName := System gemVersionAt: #osName.

	"Platform should match OS"
	osName = 'Darwin' ifTrue: [self assert: result equals: 'darwin'].
	osName = 'Linux' ifTrue: [self assert: result equals: 'linux']
%

category: 'Tests - Path Info'
method: SysTestCase
testPrefix
	"Test sys.prefix is set"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #prefix env: 2.

	self assert: (result isKindOf: String)
%

category: 'Tests - Module Registry'
method: SysTestCase
testSysInModuleRegistry
	"Test that sys is registered in importlib modules"

	| modules |
	modules := importlib perform: #modules env: 2.

	self assert: (modules includesKey: #sys)
%

category: 'Tests - Version Info'
method: SysTestCase
testVersion
	"Test sys.version attribute"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #version env: 2.

	self assert: (result isKindOf: String).
	self assert: result size > 0
%

category: 'Tests - Version Info'
method: SysTestCase
testVersionContainsGemStone
	"Test sys.version contains GemStone identifier"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #version env: 2.

	self assert: (result includesString: 'GemStone')
%

category: 'Tests - Version Info'
method: SysTestCase
testVersionContainsGrail
	"Test sys.version contains Grail identifier"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #version env: 2.

	self assert: (result includesString: 'Grail')
%

category: 'Tests - Version Info'
method: SysTestCase
testVersionInfo
	"Test sys.version_info attribute"

	| s result |
	s := sys perform: #instance env: 2.
	result := s perform: #version_info env: 2.

	self assert: (result isKindOf: tuple).
	self assert: result size >= 5
%
