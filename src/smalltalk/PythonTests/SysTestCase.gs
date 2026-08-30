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
SysTestCase category: 'Grail-SUnit'
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

category: 'Grail-Tests - I/O Streams'
method: SysTestCase
_testStderr
	"Test sys.stderr is a GsFile"

	| s result |
	s := sys @env1:instance.
	result := s @env1:stderr.

	self assert: result notNil.
	self assert: (result isKindOf: GsFile)
%

category: 'Grail-Tests - I/O Streams'
method: SysTestCase
_testStdin
	"Test sys.stdin is a GsFile"

	| s result |
	s := sys @env1:instance.
	result := s @env1:stdin.

	self assert: result notNil.
	self assert: (result isKindOf: GsFile)
%

category: 'Grail-Tests - I/O Streams'
method: SysTestCase
_testStdout
	"Test sys.stdout is a GsFile"

	| s result |
	s := sys @env1:instance.
	result := s @env1:stdout.

	self assert: result notNil.
	self assert: (result isKindOf: GsFile)
%

category: 'Grail-Setup'
method: SysTestCase
setUp
	"Initialize the modules registry before each test"
	sys @env1:modules.
%

category: 'Grail-Tests - Runtime Info'
method: SysTestCase
testArgv
	"Test sys.argv is a list"

	| s result |
	s := sys @env1:instance.
	result := s @env1:argv.

	self assert: (result isKindOf: list)
%

category: 'Grail-Tests - Runtime Info'
method: SysTestCase
testBuiltinModuleNames
	"Test sys.builtin_module_names contains expected modules"

	| s result |
	s := sys @env1:instance.
	result := s @env1:builtin_module_names.

	self assert: (result isKindOf: tuple)
%

category: 'Grail-Tests - Platform Info'
method: SysTestCase
testByteorder
	"Test sys.byteorder attribute"

	| s result |
	s := sys @env1:instance.
	result := s @env1:byteorder.

	self assert: ((result = 'little') or: [result = 'big'])
%

category: 'Grail-Tests - Runtime Info'
method: SysTestCase
testCopyright
	"Test sys.copyright attribute"

	| s result |
	s := sys @env1:instance.
	result := s @env1:copyright.

	self assert: (result isKindOf: String).
	self assert: result size > 0
%

category: 'Grail-Tests - Hooks'
method: SysTestCase
testDisplayhookExists
	"Test sys.displayhook exists as a real method."

	self assert: ((sys methodDictForEnv: 1) includesKey: #'displayhook:')
%

category: 'Grail-Tests - Hooks'
method: SysTestCase
testExcepthookExists
	"Test sys.excepthook exists as a real method."

	self assert: ((sys methodDictForEnv: 1) includesKey: #'excepthook:_:_:')
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testExcInfo
	"Test sys.exc_info() returns a tuple"

	| s result |
	s := sys @env1:instance.

	result := s @env1:exc_info.

	self assert: (result isKindOf: tuple).
	self assert: result size == 3
%

category: 'Grail-Tests - Path Info'
method: SysTestCase
testExecutable
	"Test sys.executable is set from GemStone"

	| s result |
	s := sys @env1:instance.
	result := s @env1:executable.

	self assert: (result isKindOf: String)
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testExit
	"Test sys.exit raises SystemExit"

	| s |
	s := sys @env1:instance.

	self should: [s @env1:exit] raise: SystemExit
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testExitWithCode
	"Test sys.exit(code) raises SystemExit with code"

	| s |
	s := sys @env1:instance.

	self should: [s @env1:exit: 42] raise: SystemExit.
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testGetdefaultencoding
	"Test sys.getdefaultencoding() returns utf-8"

	| s result |
	s := sys @env1:instance.

	result := s @env1:getdefaultencoding.

	self assert: result equals: 'utf-8'
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testGetfilesystemencoding
	"Test sys.getfilesystemencoding() returns utf-8"

	| s result |
	s := sys @env1:instance.

	result := s @env1:getfilesystemencoding.

	self assert: result equals: 'utf-8'
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testGetrecursionlimit
	"Test sys.getrecursionlimit() returns a positive integer"

	| s result |
	s := sys @env1:instance.

	result := s @env1:getrecursionlimit.

	self assert: (result isKindOf: Integer).
	self assert: result > 0
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testGetsizeof
	"Test sys.getsizeof() returns a size"

	| s result |
	s := sys @env1:instance.

	result := s @env1:getsizeof: 'hello'.

	self assert: (result isKindOf: Integer).
	self assert: result >= 0
%

category: 'Grail-Tests - import_module'
method: SysTestCase
testImportSys
	"Test importing sys module via importlib"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'sys'.

	self assert: result class equals: sys
%

category: 'Grail-Tests - Singleton'
method: SysTestCase
testInstance
	"Test that sys module is a singleton"

	| s1 s2 |
	s1 := sys @env1:instance.
	s2 := sys @env1:instance.

	self assert: s1 == s2
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testIntern
	"Test sys.intern() returns the same string"

	| s result |
	s := sys @env1:instance.

	result := s @env1:intern: 'hello'.

	self assert: result equals: 'hello'
%

category: 'Grail-Tests - Functions'
method: SysTestCase
testIsFinalizing
	"Test sys.is_finalizing() returns false during normal execution"

	| s result |
	s := sys @env1:instance.

	result := s @env1:is_finalizing.

	self assert: result equals: false
%

category: 'Grail-Tests - Platform Info'
method: SysTestCase
testMaxsize
	"Test sys.maxsize attribute"

	| s result |
	s := sys @env1:instance.
	result := s @env1:maxsize.

	self assert: (result isKindOf: Integer).
	self assert: result > 0
%

category: 'Grail-Tests - Path Info'
method: SysTestCase
testModules
	"Test sys.modules attribute is shared with importlib"

	| s result importModules |
	s := sys @env1:instance.
	result := s @env1:modules.
	importModules := importlib @env1:modules.

	self assert: result == importModules
%

category: 'Grail-Tests - Singleton'
method: SysTestCase
testNewRaisesError
	"Test that sys.new raises TypeError"

	self should: [sys @env1:new] raise: TypeError
%

category: 'Grail-Tests - Path Info'
method: SysTestCase
testPath
	"Test sys.path attribute is a list"

	| s result |
	s := sys @env1:instance.
	result := s @env1:path.

	self assert: (result isKindOf: list)
%

category: 'Grail-Tests - Platform Info'
method: SysTestCase
testPlatform
	"Test sys.platform attribute"

	| s result |
	s := sys @env1:instance.
	result := s @env1:platform.

	self assert: (result isKindOf: String).
	self assert: ((result = 'darwin') or: [(result = 'linux') or: [result = 'win32']])
%

category: 'Grail-Tests - Platform Info'
method: SysTestCase
testPlatformFromGemStone
	"Test sys.platform is derived from GemStone osName"

	| s result osName |
	s := sys @env1:instance.
	result := s @env1:platform.
	osName := System gemVersionAt: #osName.

	"Platform should match OS"
	osName = 'Darwin' ifTrue: [self assert: result equals: 'darwin'].
	osName = 'Linux' ifTrue: [self assert: result equals: 'linux']
%

category: 'Grail-Tests - Path Info'
method: SysTestCase
testPrefix
	"Test sys.prefix is set"

	| s result |
	s := sys @env1:instance.
	result := s @env1:prefix.

	self assert: (result isKindOf: String)
%

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testSysInModuleRegistry
	"Test that sys is registered in importlib modules"

	| modules |
	modules := importlib @env1:modules.

	self assert: (modules includesKey: #sys)
%

category: 'Grail-Tests - Version Info'
method: SysTestCase
testVersion
	"Test sys.version attribute"

	| s result |
	s := sys @env1:instance.
	result := s @env1:version.

	self assert: (result isKindOf: String).
	self assert: result size > 0
%

category: 'Grail-Tests - Version Info'
method: SysTestCase
testVersionContainsGemStone
	"Test sys.version contains GemStone identifier"

	| s result |
	s := sys @env1:instance.
	result := s @env1:version.

	self assert: (result includesString: 'GemStone')
%

category: 'Grail-Tests - Version Info'
method: SysTestCase
testVersionContainsGrail
	"Test sys.version contains Grail identifier"

	| s result |
	s := sys @env1:instance.
	result := s @env1:version.

	self assert: (result includesString: 'Grail')
%

category: 'Grail-Tests - Version Info'
method: SysTestCase
testVersionInfo
	"Test sys.version_info attribute"

	| s result |
	s := sys @env1:instance.
	result := s @env1:version_info.

	self assert: (result isKindOf: tuple).
	self assert: result size >= 5
%

! ===============================================================================
! sys.modules keys are genuine ``str'' -- see PySysModules.gs and
! tests/python/sys_modules_keys.py.  The registry was a SymbolDictionary, so its
! keys were Symbols: ``isinstance(k, str)'' answered True and then
! ``k.replace(...)'' died with ``Attempt to modify invariant object'', an
! UNCATCHABLE Smalltalk error.  That is what stopped ``import requests''
! (requests/packages.py loops over sys.modules doing exactly that replace).
!
! The tests below hold both halves of the fix: the keys really are str, AND the
! hundred-odd Smalltalk callers that probe this registry with a SYMBOL -- Grail's
! own module machinery and most test tearDowns (``mods removeKey: #'enum_x''')
! -- still find their entries.
! ===============================================================================

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testModuleRegistryIsAPythonDict
	"CPython's sys.modules is a plain dict.  Grail's is a PyDict subclass (it
	normalises Symbol probes), and reports ``dict'' to Python -- it reported
	``SymbolDictionary'' while it was one."

	| mods |
	mods := importlib @env1:modules.

	self assert: (mods isKindOf: KeyValueDictionary).
	self assert: mods class == PySysModules.
	self assert: mods class @env1:___pythonBuiltinTypeName___ equals: 'dict'
%

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testModuleKeysAreGenuineStrings
	"Every key is a str -- not a Symbol that merely passes isinstance."

	| mods |
	mods := importlib @env1:modules.
	self assert: mods size > 0.

	mods keysDo: [:k |
		self deny: (k isKindOf: Symbol)
			description: 'sys.modules key ' , k asString , ' is a Symbol'.
		self assert: k class @env1:___pythonBuiltinTypeName___ equals: 'str']
%

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testModuleKeysSurviveReplace
	"The concrete failure: ``mod.replace(x, y)'' over sys.modules.  A Symbol is
	invariant, so copyReplaceAll: on one raised an error no Python ``except''
	could catch.  A str copies fine."

	| mods |
	mods := importlib @env1:modules.
	self assert: mods size > 0.

	mods keysDo: [:k |
		self assert: (k @env1:replace: 's' _: 'S') notNil]
%

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testSymbolProbesStillResolve
	"Smalltalk callers pass Symbols.  Symbols and strings are NOT
	interchangeable in GemStone (``'sys' = #sys'' is false, and their hashes
	differ), so this only works because PySysModules normalises the probe."

	| mods |
	mods := importlib @env1:modules.

	self assert: (mods includesKey: #sys).
	self assert: (mods includesKey: 'sys').
	self assert: (mods at: #sys otherwise: nil) == (mods at: 'sys' otherwise: nil).
	self assert: (importlib @env1:lookupModule: #math)
		== (importlib @env1:lookupModule: 'math')
%

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testSymbolWriteStoresAStringKey
	"A Symbol handed to at:put: is normalised on the way IN, so the stored key
	is a str even when the writer is Smalltalk."

	| mods stored |
	mods := importlib @env1:modules.
	mods removeKey: #'sys_modules_symbol_write_probe' ifAbsent: [].
	[mods at: #'sys_modules_symbol_write_probe' put: 42.
	stored := nil.
	mods keysDo: [:k |
		k asString = 'sys_modules_symbol_write_probe' ifTrue: [stored := k]].

	self assert: stored notNil.
	self deny: (stored isKindOf: Symbol).
	self assert: stored class @env1:___pythonBuiltinTypeName___ equals: 'str'.
	self assert: (mods at: 'sys_modules_symbol_write_probe' otherwise: nil) equals: 42]
		ensure: [mods removeKey: #'sys_modules_symbol_write_probe' ifAbsent: []]
%

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testSymbolRemovalLeavesNoGhostKey
	"PyDict keeps a parallel insertion-order list and drops from it with
	Smalltalk ``='', which a Symbol does not satisfy against the stored str.
	Normalising only the hash probe would empty the table and STRAND the key in
	that list, where the next keysDo: yields a key the table no longer has --
	so removal normalises too, and this is the test that says so."

	| mods walked |
	mods := importlib @env1:modules.
	mods at: 'sys_modules_ghost_probe' put: 7.
	mods removeKey: #'sys_modules_ghost_probe' ifAbsent: [].

	self deny: (mods includesKey: 'sys_modules_ghost_probe').
	walked := 0.
	mods keysDo: [:k | walked := walked + 1].
	self assert: walked equals: mods size.
	"valuesDo: reads each key back out of the table; a ghost key raises here."
	mods valuesDo: [:v | v == nil]
%

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testModuleUnloadsAndReimports
	"Removal and re-import still behave -- the registry's whole job."

	| mods before after |
	before := importlib @env1:lookupModule: 'json'.
	self assert: before notNil.
	mods := importlib @env1:modules.
	self assert: (mods includesKey: 'json').

	mods removeKey: 'json' ifAbsent: [].
	self deny: (mods includesKey: 'json').
	self assert: (mods at: #json otherwise: nil) isNil.

	after := importlib @env1:lookupModule: 'json'.
	self assert: after notNil.
	self assert: (mods includesKey: 'json').
	self assert: (mods includesKey: #json)
%

category: 'Grail-Tests - Module Registry'
method: SysTestCase
testCPythonFixtureChecks
	"tests/python/sys_modules_keys.py -- every check in it is measured against
	CPython by scripts/check_python_fixtures.sh, and two of them are CONTROLs
	proving the ``type(k) is str'' predicate can tell a str from something that
	only passes isinstance."

	| mods fixture results names |
	mods := importlib @env1:modules.
	mods removeKey: #'sys_modules_keys' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_modules_keys.py')
		name: 'sys_modules_keys'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := OrderedCollection new.
	results @env0:keysDo: [:k | names add: k asString].
	self assert: names size >= 20.
	names asSortedCollection do: [:each |
		self assert: (results @env1:__getitem__: each) equals: true
			description: 'sys_modules_keys.py check failed: ' , each]
%

! ===============================================================================
! sys.audit(event, *args)
!
! CPython's signature is VARIADIC; Grail's was a zero-argument stub, so every
! real call was a TypeError -- ``audit() takes a different number of arguments
! (4 given)''.  urllib3's HTTPConnection._new_conn opens with exactly such a
! call and stopped a Kaggle-client acceptance harness dead.
!
! WHAT THESE TESTS ESTABLISH: that events are ACCEPTED and DISCARDED.  NOT that
! auditing works -- Grail raises no audit events and dispatches none of the ones
! it is handed.  That is not an approximation: it is CPython's exact behaviour
! with an empty hook list, and sys.addaudithook() refusing to install one is
! what keeps the list empty.  The argument-validation tests are the negative
! control: a stub that swallowed anything would pass the acceptance tests and
! still be wrong.
!
! Drives tests/python/sys_audit.py, whose checks are measured against CPython by
! scripts/check_python_fixtures.sh.
! ===============================================================================

category: 'Grail-Private'
method: SysTestCase
checkAudit: aName
	"Load tests/python/sys_audit.py fresh and run one of its zero-argument
	checks, each of which answers True."

	| mods fixture |
	mods := importlib @env1:modules.
	mods removeKey: #'sys_audit' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_audit.py')
		name: 'sys_audit'.
	^ (fixture @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil
%

category: 'Grail-Tests - audit'
method: SysTestCase
testTheUrllib3CallIsAccepted
	"The exact shape urllib3 writes: an event name and three arguments."

	self assert: (self checkAudit: #'the_urllib3_call_is_accepted') equals: true.
%

category: 'Grail-Tests - audit'
method: SysTestCase
testAOneArgumentAuditCallIsAccepted
	self assert: (self checkAudit: #'a_one_argument_call_is_accepted') equals: true.
%

category: 'Grail-Tests - audit'
method: SysTestCase
testManyAuditArgumentsAreAccepted
	"Variadic means variadic -- no arity is special."

	self assert: (self checkAudit: #'many_arguments_are_accepted') equals: true.
%

category: 'Grail-Tests - audit'
method: SysTestCase
testAuditAnswersNoneNotAMarker
	"A stub answering something truthy would let a caller branch on
	``auditing is on''."

	self assert: (self checkAudit: #'it_answers_none_not_a_marker') equals: true.
%

category: 'Grail-Tests - audit'
method: SysTestCase
testAuditIsAFirstClassCallable
	"Libraries cache it (``_audit = sys.audit'') rather than looking it up per
	call, so the NAME has to be a callable value and not only a call site.
	sys.audit has no unary method, so this is the module-dict BoundMethod that
	sys >> initialize installs -- the same device breakpointhook uses."

	self assert: (self checkAudit: #'it_is_a_first_class_callable') equals: true.
%

category: 'Grail-Tests - audit'
method: SysTestCase
testGetattrFindsAudit
	"The defensive spelling, which is how a library that must also run on a
	pre-3.8 interpreter reaches it."

	self assert: (self checkAudit: #'getattr_finds_it') equals: true.
%

category: 'Grail-Tests - audit'
method: SysTestCase
testANonStrAuditEventIsRefused
	"NEGATIVE CONTROL.  A stub that accepted absolutely anything would pass
	every acceptance test above and still be wrong."

	self assert: (self checkAudit: #'a_non_str_event_is_refused') equals: true.
%

category: 'Grail-Tests - audit'
method: SysTestCase
testAuditKeywordArgumentsAreRefused
	"NEGATIVE CONTROL, the other half: CPython's sys.audit takes no keywords."

	self assert: (self checkAudit: #'keyword_arguments_are_refused') equals: true.
%

category: 'Grail-Tests - audit'
method: SysTestCase
testInstallingAnAuditHookIsRefused
	"DOCUMENTED DIVERGENCE, and the point of it.  CPython installs the hook and
	answers None; Grail has no dispatch to hand it to, so accepting it would
	report that auditing is on when it is off.  Refusing is also what makes the
	no-op sys.audit exactly right rather than merely convenient -- the hook list
	can never be non-empty.  The fixture prints this one as XFAIL under CPython."

	self assert: (self checkAudit: #'installing_an_audit_hook_is_refused') equals: true.
%
