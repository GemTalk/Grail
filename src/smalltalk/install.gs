output pushnew install.out only
! ===============================================================================
! Grail Installation Script
!   file  src/smalltalk/install.gs
! ===============================================================================
! This script installs the Grail Python implementation in GemStone Smalltalk.
! It performs the following steps:
! 1. Removes existing SymbolDictionaries (Python, PythonAst, EmbeddedPython,
!    PythonTests, EmbeddedPythonTests) and creates fresh ones in the correct order
! 2. Creates forward references for ALL dictionaries (so names resolve
!    during method compilation before actual classes are defined)
! 3. Maps Python type names to existing GemStone classes
! 4. Loads Python built-in type classes (handles user switching internally)
! 5. Loads AST node classes
! 6. Loads test classes
! 7. Verifies installation
!
! PERMISSIONS:
! - This script should be started as DataCurator
! - User switching to SystemUser is handled internally
! ===============================================================================

fileformat utf8
set user SystemUser pass swordfish
iferr 1 exit 1
login

iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

send String enableUnicodeComparisonMode
send Stream installPortableStreamImplementation

! ===============================================================================
! Reset the committed Transcript to a commit-safe TranscriptStreamPortable.
! ===============================================================================
! The global Transcript lives in Globals (owned by SystemUser).  If an earlier
! session left it as a `GsFile stdout` (e.g. a REPL/run via scripts/grail.tpz
! that later committed), that GsFile is doubly broken for every later session:
! its transient OS handle is dead (writing raises ImproperOperation, error 2364)
! and a GsFile does not understand show: (TranscriptStream protocol used here and
! throughout).  Reassign a fresh TranscriptStreamPortable -- it understands
! show:/cr/nextPutAll:, routes to the session's stdout, and carries no transient
! state, so it survives the commit below cleanly.  Doing it here (as SystemUser,
! before this segment's commit and before the first Transcript show: at Step 0)
! self-heals the image on every install, independent of how it was left.
run
Transcript := TranscriptStreamPortable new.
%

! ===============================================================================
! Step 0: Hygiene — scrub Grail-tagged env-0 methods from every class
! ===============================================================================
! Per-file ``Foo removeAllMethods: 1`` directives at the top of each
! source file clear env-1 methods on the class that owns the file
! (e.g. ``NoneType``), so env-1 doesn't accumulate stale methods across
! installs.  Env-0 is different: we deliberately can't do
! ``Object removeAllMethods: 0`` — that would nuke GemStone's own
! kernel.  So env-0 methods we previously added to shared GemStone
! classes (Object, SequenceableCollection, ...) silently linger when
! removed from source.
!
! Every Grail method is now categorised under the ``Grail-`` prefix.
! Iterate every class, find env-0 methods whose category starts with
! ``Grail-`` (or the legacy ``Python-`` prefix that pre-dates this
! convention), and remove them.  The .gs files re-add them with
! current source on the next pass, so nothing is lost.
!
! Runs as SystemUser because we mutate shared system classes.

run
| total |
total := 0.
Object @env0:allSubclasses do: [:cls |
	| md toRemove |
	md := cls @env0:methodDictForEnv: 0.
	toRemove := OrderedCollection new.
	md @env0:keysDo: [:sel |
		| cat |
		cat := cls @env0:categoryOfSelector: sel environmentId: 0.
		cat notNil ifTrue: [
			((cat @env0:beginsWith: 'Grail-')
				or: [cat @env0:beginsWith: 'Python-'])
				ifTrue: [toRemove @env0:add: sel]
		]
	].
	toRemove @env0:do: [:sel |
		cls @env0:removeSelector: sel environmentId: 0.
		total := total @env0:+ 1
	]
].
Transcript show: 'Step 0 hygiene: scrubbed ', total printString,
	' Grail-tagged env-0 method(s) from shared classes'.
%

! ------------------- Grail extensions to GemStone system classes
! Filed in as SystemUser because shared classes like ``Class'' are
! owned by SystemUser and DataCurator can't compile env-0 methods on
! them.  The Step 0 hygiene loop above will scrub these on the next
! install (the methods carry the ``Grail-'' category prefix), and
! this input re-adds them.
input src/smalltalk/Python/Class.gs

commit
logout
set user DataCurator pass swordfish
login

! ------------------- Repair known-broken host-extent kernel patches
! No-op on a stock extent; idempotent on a patched one.  Runs here —
! as DataCurator, not SystemUser — because the known patches are
! GsPackagePolicy session methods living in the GsPackage held by the
! application's UserGlobals; recompiling under the same user + policy
! replaces the override in that package.  Commits on success.
input src/smalltalk/RepairHostExtent.gs

! ===============================================================================
! Step 1: Remove and recreate SymbolDictionaries
! ===============================================================================
! Four dictionaries belong to Grail:
!   Python         — Python type classes (str, int, list, ...)
!   PythonAst      — AST node classes
!   PythonTests    — SUnit TestCase classes
!   PythonModules  — Smalltalk classes generated at runtime for each
!                    imported Python module (``loadModuleFromPath:``).
!                    Recreating the dict each install drops orphan
!                    module classes — the next ``import`` rebuilds the
!                    class against the current Grail hierarchy.  User
!                    classes from Python ``class`` statements are
!                    *anonymous* (``inDictionary: nil``); only the
!                    module instance's instVar holds the reference.
run
"Remove Grail dictionaries if they exist"
#(#'Python' #'PythonAst' #'EmbeddedPython' #'PythonTests' #'EmbeddedPythonTests' #'PythonModules') do: [:each |
	| symbolList names |
	symbolList := System myUserProfile symbolList.
	names := symbolList names.
	(names includes: each) ifTrue: [
		symbolList removeAtIndex: (names indexOf: each).
		Transcript show: 'Removed ' , each , ' dictionary'.
	] ifFalse: [
		Transcript show: each , ' dictionary not found (OK)'.
	].
].
%

run
"Create Grail dictionaries in reverse order (so each ends up nearer the
 front of the symbol list than the next; importlib classes resolve
 from Python before falling through to PythonModules at runtime)."
#(#'PythonModules' #'EmbeddedPythonTests' #'PythonTests' #'EmbeddedPython' #'PythonAst' #'Python') do: [:each |
	| dict |
	dict := SymbolDictionary new name: each; yourself.
	System myUserProfile insertDictionary: dict at: 1.
	Transcript show: 'Created ' , each , ' dictionary'.
].

Transcript show: 'Step 1 complete: Recreated dictionaries in correct order'.
%

run
| symList |
symList := System myUserProfile symbolList .
(symList includesIdentical: GsCompilerClasses) ifFalse:[
  symList add: GsCompilerClasses.
  Transcript show: 'Added GsCompilerClasses dictionary to DataCurator''s symbol list'.
].
%

! ===============================================================================
! Step 2: Forward references for ALL dictionaries
! ===============================================================================
! Pre-populate all three dictionaries with nil entries so that class names
! resolve during method compilation before the actual classes are defined.
! This must happen before ANY files are loaded.
! ===============================================================================

! ------------------- Forward references for Python dictionary
run
(System myUserProfile symbolList objectNamed: #'Python')
	at: #'ArithmeticError' put: nil;
	at: #'AssertionError' put: nil;
	at: #'AttributeError' put: nil;
	at: #'BaseException' put: nil;
	at: #'BaseExceptionGroup' put: nil;
	at: #'BlockingIOError' put: nil;
	at: #'UnsupportedOperation' put: nil;
	at: #'BrokenPipeError' put: nil;
	at: #'BufferError' put: nil;
	at: #'BytesWarning' put: nil;
	at: #'ChildProcessError' put: nil;
	at: #'ConnectionAbortedError' put: nil;
	at: #'ConnectionError' put: nil;
	at: #'ConnectionRefusedError' put: nil;
	at: #'ConnectionResetError' put: nil;
	at: #'DeprecationWarning' put: nil;
	at: #'EOFError' put: nil;
	at: #'EncodingWarning' put: nil;
	at: #'Exception' put: nil;
	at: #'ExceptionGroup' put: nil;
	at: #'FileExistsError' put: nil;
	at: #'FileNotFoundError' put: nil;
	at: #'FloatingPointError' put: nil;
	at: #'FutureWarning' put: nil;
	at: #'GeneratorExit' put: nil;
	at: #'ImportError' put: nil;
	at: #'ImportWarning' put: nil;
	at: #'IndentationError' put: nil;
	at: #'IndexError' put: nil;
	at: #'InterruptedError' put: nil;
	at: #'IsADirectoryError' put: nil;
	at: #'KeyError' put: nil;
	at: #'KeyboardInterrupt' put: nil;
	at: #'LookupError' put: nil;
	at: #'MemoryError' put: nil;
	at: #'ModuleNotFoundError' put: nil;
	at: #'NameError' put: nil;
	at: #'None' put: nil;
	at: #'NotImplemented' put: nil;
	at: #'Ellipsis' put: nil;
	at: #'NoneType' put: nil;
	at: #'NotADirectoryError' put: nil;
	at: #'NotImplementedError' put: nil;
	at: #'OSError' put: nil;
	at: #'OverflowError' put: nil;
	at: #'PendingDeprecationWarning' put: nil;
	at: #'PermissionError' put: nil;
	at: #'ProcessLookupError' put: nil;
	at: #'RecursionError' put: nil;
	at: #'ReferenceError' put: nil;
	at: #'ResourceWarning' put: nil;
	at: #'RuntimeError' put: nil;
	at: #'RuntimeWarning' put: nil;
	at: #'StatisticsError' put: nil;
	at: #'StopAsyncIteration' put: nil;
	at: #'PythonBreak' put: nil;
	at: #'PythonContinue' put: nil;
	at: #'PythonReturn' put: nil;
	at: #'StopIteration' put: nil;
	at: #'SyntaxError' put: nil;
	at: #'SyntaxWarning' put: nil;
	at: #'SystemError' put: nil;
	at: #'SystemExit' put: nil;
	at: #'TabError' put: nil;
	at: #'TimeoutError' put: nil;
	at: #'TypeError' put: nil;
	at: #'UnboundLocalError' put: nil;
	at: #'UnicodeDecodeError' put: nil;
	at: #'UnicodeEncodeError' put: nil;
	at: #'UnicodeError' put: nil;
	at: #'UnicodeTranslateError' put: nil;
	at: #'UnicodeWarning' put: nil;
	at: #'UserWarning' put: nil;
	at: #'ValueError' put: nil;
	at: #'Warning' put: nil;
	at: #'ZeroDivisionError' put: nil;
	at: #'CPythonShim' put: nil;
	at: #'ShimForeignObject' put: nil;
	at: #'PyObject' put: nil;
	at: #'_statistics' put: nil;
	at: #'_bisect' put: nil;
	at: #'_crc32c' put: nil;
	at: #'_shimtest' put: nil;
	at: #'_sre' put: nil;
	at: #'BoundMethod' put: nil;
	at: #'ExecBlockAttrs' put: nil;
	at: #'MethodBinding' put: nil;
	at: #'PropertyDescriptor' put: nil;
	at: #'LruCacheWrapper' put: nil;
	at: #'functools_CacheInfo' put: nil;
	at: #'functools_Placeholder' put: nil;
	at: #'Super' put: nil;
	at: #'SuperBoundMethod' put: nil;
	at: #'UnboundMethod' put: nil;
	at: #'PythonGenerator' put: nil;
	at: #'builtins' put: nil;
	at: #'bytearray' put: nil;
	at: #'PyMemoryView' put: nil;
	at: #'cmath' put: nil;
	at: #'complex' put: nil;
	at: #'copyreg' put: nil;
	at: #'enum' put: nil;
	at: #'fractions' put: nil;
	at: #'frozenset' put: nil;
	at: #'functools' put: nil;
	at: #'functools_partial' put: nil;
	at: #'dict_itemiterator' put: nil;
	at: #'dict_keyiterator' put: nil;
	at: #'dict_valueiterator' put: nil;
	at: #'gemstone' put: nil;
	at: #'grail' put: nil;
	at: #'html' put: nil;
	at: #'html_entities' put: nil;
	at: #'importlib' put: nil;
	at: #'iterator' put: nil;
	at: #'list_iterator' put: nil;
	at: #'filter_iterator' put: nil;
	at: #'map_iterator' put: nil;
	at: #'zip_iterator' put: nil;
	at: #'hashlib' put: nil;
	at: #'socket' put: nil;
	at: #'PySocket' put: nil;
	at: #'PySocketIO' put: nil;
	at: #'_thread' put: nil;
	at: #'PyThreadLock' put: nil;
	at: #'Hash' put: nil;
	at: #'time' put: nil;
	at: #'secrets' put: nil;
	at: #'warnings' put: nil;
	at: #'CatchWarnings' put: nil;
	at: #'struct' put: nil;
	at: #'PyStruct' put: nil;
	at: #'mimetypes' put: nil;
	at: #'ipaddress' put: nil;
	at: #'IPv4Address' put: nil;
	at: #'IPv4Network' put: nil;
	at: #'datetime' put: nil;
	at: #'PyDate' put: nil;
	at: #'PyDateTime' put: nil;
	at: #'PyTime' put: nil;
	at: #'PyTimedelta' put: nil;
	at: #'PyTimezone' put: nil;
	at: #'PyTzinfo' put: nil;
	at: #'json' put: nil;
	at: #'io' put: nil;
	at: #'StringIO' put: nil;
	at: #'BytesIO' put: nil;
	at: #'PyIOBase' put: nil;
	at: #'PyRawIOBase' put: nil;
	at: #'PyBufferedIOBase' put: nil;
	at: #'PyTextIOBase' put: nil;
	at: #'FileIO' put: nil;
	at: #'TextIOWrapper' put: nil;
	at: #'zlib' put: nil;
	at: #'ZlibError' put: nil;
	at: #'math' put: nil;
	at: #'module' put: nil;
	at: #'PythonClass' put: nil;
	at: #'PythonInstance' put: nil;
	at: #'PyInstanceDict' put: nil;
	at: #'AbstractPyInt' put: nil;
	at: #'AbstractPyFloat' put: nil;
	at: #'Enum' put: nil;
	at: #'IntEnum' put: nil;
	at: #'IntFlag' put: nil;
	at: #'NamedIntConstant' put: nil;
	at: #'numbers' put: nil;
	at: #'numbers_Complex' put: nil;
	at: #'numbers_Integral' put: nil;
	at: #'numbers_Number' put: nil;
	at: #'numbers_Rational' put: nil;
	at: #'numbers_Real' put: nil;
	at: #'os' put: nil;
	at: #'os_path' put: nil;
	at: #'os_PathLike' put: nil;
	at: #'random' put: nil;
	at: #'range_iterator' put: nil;
	at: #'set' put: nil;
	at: #'set_iterator' put: nil;
	at: #'slice' put: nil;
	at: #'statistics' put: nil;
	at: #'str_iterator' put: nil;
	at: #'string' put: nil;
	at: #'string_formatter' put: nil;
	at: #'sys' put: nil;
	at: #'sys_flags' put: nil;
	at: #'sys_implementation' put: nil;
	at: #'tuple' put: nil;
	at: #'tuple_iterator' put: nil;
	at: #'_weakref' put: nil;
	at: #'WeakReference' put: nil;
	at: #'WeakReferenceHolder' put: nil;
	at: #'WeakReferenceEphemeron' put: nil;
	at: #'WeakValueDictionary' put: nil;
	at: #'WeakKeyDictionary' put: nil;
	at: #'WeakSet' put: nil;
	yourself.
Transcript show: 'Forward references created for Python dictionary'.
%

! ------------------- Forward references for PythonAst dictionary
run
(System myUserProfile symbolList objectNamed: #'PythonAst')
	at: #'AbstractLocationNode' put: nil;
	at: #'AbstractNode' put: nil;
	at: #'AddAst' put: nil;
	at: #'AliasAst' put: nil;
	at: #'AndAst' put: nil;
	at: #'AnnAssignAst' put: nil;
	at: #'ArgAst' put: nil;
	at: #'ArgumentsAst' put: nil;
	at: #'AssertAst' put: nil;
	at: #'AssignAst' put: nil;
	at: #'AsyncForAst' put: nil;
	at: #'AsyncFunctionDefAst' put: nil;
	at: #'AsyncWithAst' put: nil;
	at: #'AttributeAst' put: nil;
	at: #'AugAssignAst' put: nil;
	at: #'AwaitAst' put: nil;
	at: #'BinOpAst' put: nil;
	at: #'BitAndAst' put: nil;
	at: #'BitOrAst' put: nil;
	at: #'BitXorAst' put: nil;
	at: #'BlockAst' put: nil;
	at: #'BoolOpAst' put: nil;
	at: #'BreakAst' put: nil;
	at: #'CallAst' put: nil;
	at: #'ClassDefAst' put: nil;
	at: #'ClassFunctionDefAst' put: nil;
	at: #'CmpOpAst' put: nil;
	at: #'CompareAst' put: nil;
	at: #'ComprehensionAst' put: nil;
	at: #'ConstantAst' put: nil;
	at: #'ContinueAst' put: nil;
	at: #'DelAst' put: nil;
	at: #'DeleteAst' put: nil;
	at: #'DictAst' put: nil;
	at: #'DictCompAst' put: nil;
	at: #'DivAst' put: nil;
	at: #'EqAst' put: nil;
	at: #'ExceptHandlerAst' put: nil;
	at: #'ExprAst' put: nil;
	at: #'ExpressionAst' put: nil;
	at: #'ExpressionContextAst' put: nil;
	at: #'FloorDivAst' put: nil;
	at: #'ForAst' put: nil;
	at: #'FormattedValueAst' put: nil;
	at: #'FunctionDefAst' put: nil;
	at: #'GeneratorExpAst' put: nil;
	at: #'GlobalAst' put: nil;
	at: #'GtAst' put: nil;
	at: #'GtEAst' put: nil;
	at: #'IfAst' put: nil;
	at: #'IfExpAst' put: nil;
	at: #'ImportAst' put: nil;
	at: #'ImportFromAst' put: nil;
	at: #'InAst' put: nil;
	at: #'InstanceFunctionDefAst' put: nil;
	at: #'InvertAst' put: nil;
	at: #'IsAst' put: nil;
	at: #'IsNotAst' put: nil;
	at: #'JoinedStrAst' put: nil;
	at: #'KeywordAst' put: nil;
	at: #'KeywordsAst' put: nil;
	at: #'LShiftAst' put: nil;
	at: #'LambdaAst' put: nil;
	at: #'ListAst' put: nil;
	at: #'ListCompAst' put: nil;
	at: #'LoadAst' put: nil;
	at: #'LtAst' put: nil;
	at: #'LtEAst' put: nil;
	at: #'MatMultAst' put: nil;
	at: #'ModAst' put: nil;
	at: #'ModuleAst' put: nil;
	at: #'MultAst' put: nil;
	at: #'NameAst' put: nil;
	at: #'NamedExprAst' put: nil;
	at: #'NonlocalAst' put: nil;
	at: #'NotAst' put: nil;
	at: #'NotEqAst' put: nil;
	at: #'NotInAst' put: nil;
	at: #'OperatorAst' put: nil;
	at: #'OrAst' put: nil;
	at: #'Package' put: nil;
	at: #'ParamAst' put: nil;
	at: #'PassAst' put: nil;
	at: #'PowAst' put: nil;
	at: #'PrettyWriteStream' put: nil;
	at: #'PythonParser' put: nil;
	at: #'PythonToken' put: nil;
	at: #'PythonTokenizer' put: nil;
	at: #'RShiftAst' put: nil;
	at: #'RaiseAst' put: nil;
	at: #'ReturnAst' put: nil;
	at: #'SetAst' put: nil;
	at: #'SetCompAst' put: nil;
	at: #'SliceAst' put: nil;
	at: #'StarredAst' put: nil;
	at: #'StatementAst' put: nil;
	at: #'StaticFunctionDefAst' put: nil;
	at: #'StoreAst' put: nil;
	at: #'SubAst' put: nil;
	at: #'SubscriptAst' put: nil;
	at: #'SuiteAst' put: nil;
	at: #'TryAst' put: nil;
	at: #'TupleAst' put: nil;
	at: #'TypeIgnoreAst' put: nil;
	at: #'TypeParamAst' put: nil;
	at: #'UAddAst' put: nil;
	at: #'USubAst' put: nil;
	at: #'UnaryOpAst' put: nil;
	at: #'WhileAst' put: nil;
	at: #'WithAst' put: nil;
	at: #'WithItemAst' put: nil;
	at: #'YieldAst' put: nil;
	at: #'YieldFromAst' put: nil;
	yourself.
Transcript show: 'Forward references created for PythonAst dictionary'.
%

! ------------------- Forward references for PythonTests dictionary
run
(System myUserProfile symbolList objectNamed: #'PythonTests')
	at: #'ArithmeticErrorTestCase' put: nil;
	at: #'AssertionErrorTestCase' put: nil;
	at: #'AttributeErrorTestCase' put: nil;
	at: #'BaseExceptionGroupTestCase' put: nil;
	at: #'BaseExceptionTestCase' put: nil;
	at: #'BlockingIOErrorTestCase' put: nil;
	at: #'BooleanTestCase' put: nil;
	at: #'BoundMethodNameTestCase' put: nil;
	at: #'BrokenPipeErrorTestCase' put: nil;
	at: #'BufferErrorTestCase' put: nil;
	at: #'BuiltinExtrasTestCase' put: nil;
	at: #'BuiltinSubclassOverrideTestCase' put: nil;
	at: #'FormatSpecTestCase' put: nil;
	at: #'BuiltinsTestCase' put: nil;
	at: #'BytearrayTestCase' put: nil;
	at: #'BytesTestCase' put: nil;
	at: #'CachedPropertyTestCase' put: nil;
	at: #'DeployCheckTestCase' put: nil;
	at: #'PyDictTestCase' put: nil;
	at: #'BytesWarningTestCase' put: nil;
	at: #'CPythonShimTestCase' put: nil;
	at: #'CPythonHarnessTestCase' put: nil;
	at: #'DunderNewTestCase' put: nil;
	at: #'CMathTestCase' put: nil;
	at: #'ChildProcessErrorTestCase' put: nil;
	at: #'ClassCallFastPathTestCase' put: nil;
	at: #'ClassAttrsTestCase' put: nil;
	at: #'ClassDecoratorTestCase' put: nil;
	at: #'SmalltalkForwarderTestCase' put: nil;
	at: #'ClassScopeTestCase' put: nil;
	at: #'GrailModuleTestCase' put: nil;
	at: #'HttpClientTestCase' put: nil;
	at: #'HttpStatusTestCase' put: nil;
	at: #'HttpCookiesTestCase' put: nil;
	at: #'EnumTestCase' put: nil;
	at: #'GrailSTestTarget' put: nil;
	at: #'ClassTestCase' put: nil;
	at: #'ClosureAttributeTestCase' put: nil;
	at: #'ComplexTestCase' put: nil;
	at: #'ComparisonProtocolTestCase' put: nil;
	at: #'ComprehensionTestCase' put: nil;
	at: #'DefaultsAndAttrsTestCase' put: nil;
	at: #'DynamicGlobalsTestCase' put: nil;
	at: #'ModuleScopeBindingsTestCase' put: nil;
	at: #'ModuleFunctionDecoratorsTestCase' put: nil;
	at: #'ImportTypeIntrospectionTestCase' put: nil;
	at: #'ContextVarsTestCase' put: nil;
	at: #'ShimForeignObjectTestCase' put: nil;
	at: #'DynamicInstanceAttrsTestCase' put: nil;
	at: #'AttributeAccessTestCase' put: nil;
	at: #'AttributeInheritanceTestCase' put: nil;
	at: #'AttributePropertyTestCase' put: nil;
	at: #'ClassAttributeTestCase' put: nil;
	at: #'AttributeProtocolTestCase' put: nil;
	at: #'AttributeStoreTestCase' put: nil;
	at: #'SlotsTestCase' put: nil;
	at: #'DictKwargsTestCase' put: nil;
	at: #'DunderClassTestCase' put: nil;
	at: #'ClassFunctionBindingTestCase' put: nil;
	at: #'GenericClassSubscriptTestCase' put: nil;
	at: #'GlobalStatementCodegenTestCase' put: nil;
	at: #'EmailMessageTestCase' put: nil;
	at: #'EnumAutoImportTestCase' put: nil;
	at: #'Pep448StarredLiteralsTestCase' put: nil;
	at: #'LambdaStarargsTestCase' put: nil;
	at: #'ClassBodyMethodRefsTestCase' put: nil;
	at: #'NonlocalClosureTestCase' put: nil;
	at: #'ModuleHigherArityDefTestCase' put: nil;
	at: #'MultipleInheritanceTestCase' put: nil;
	at: #'FunctionRebindingTestCase' put: nil;
	at: #'LiveDictTestCase' put: nil;
	at: #'LegbScopeTestCase' put: nil;
	at: #'KwargsSplatTestCase' put: nil;
	at: #'SubclassNameAttrTestCase' put: nil;
	at: #'TernaryTruthinessTestCase' put: nil;
	at: #'VarargsNamingTestCase' put: nil;
	at: #'YieldFromTestCase' put: nil;
	at: #'ConnectionAbortedErrorTestCase' put: nil;
	at: #'ConnectionErrorTestCase' put: nil;
	at: #'ConnectionRefusedErrorTestCase' put: nil;
	at: #'ConnectionResetErrorTestCase' put: nil;
	at: #'CopyregTestCase' put: nil;
	at: #'DataclassesTestCase' put: nil;
	at: #'DecimalTestCase' put: nil;
	at: #'DeprecationWarningTestCase' put: nil;
	at: #'DictTestCase' put: nil;
	at: #'DictUnpackingTestCase' put: nil;
	at: #'DynamicTypeTestCase' put: nil;
	at: #'EOFErrorTestCase' put: nil;
	at: #'ExitStackUsageTestCase' put: nil;
	at: #'EncodingWarningTestCase' put: nil;
	at: #'EnumGlobalInjectTestCase' put: nil;
	at: #'ExceptionGroupTestCase' put: nil;
	at: #'ExceptionTestCase' put: nil;
	at: #'FileExistsErrorTestCase' put: nil;
	at: #'FileIoTestCase' put: nil;
	at: #'FileNotFoundErrorTestCase' put: nil;
	at: #'FloatTestCase' put: nil;
	at: #'FourArgAttrCallTestCase' put: nil;
	at: #'FloatingPointErrorTestCase' put: nil;
	at: #'FractionTestCase' put: nil;
	at: #'FunctoolsTestCase' put: nil;
	at: #'FunctoolsWrapsVarargsTestCase' put: nil;
	at: #'FrozensetTestCase' put: nil;
	at: #'FutureWarningTestCase' put: nil;
	at: #'ArgparseTestCase' put: nil;
	at: #'BisectTestCase' put: nil;
	at: #'CalendarTestCase' put: nil;
	at: #'ConfigparserTestCase' put: nil;
	at: #'CsvTestCase' put: nil;
	at: #'FnmatchTestCase' put: nil;
	at: #'GetoptTestCase' put: nil;
	at: #'GetpassTestCase' put: nil;
	at: #'HeapqTestCase' put: nil;
	at: #'QueueTestCase' put: nil;
	at: #'ReprlibTestCase' put: nil;
	at: #'ShlexTestCase' put: nil;
	at: #'ShutilTestCase' put: nil;
	at: #'TomllibTestCase' put: nil;
	at: #'UnittestTestCase' put: nil;
	at: #'ZlibTestCase' put: nil;
	at: #'TextwrapTestCase' put: nil;
	at: #'GlobTestCase' put: nil;
	at: #'GemStoneTestCase' put: nil;
	at: #'GzipTestCase' put: nil;
	at: #'MockTestCase' put: nil;
	at: #'WsgirefTestCase' put: nil;
	at: #'GlobalStatementTestCase' put: nil;
	at: #'GeneratorExitTestCase' put: nil;
	at: #'ImportErrorTestCase' put: nil;
	at: #'ImportWarningTestCase' put: nil;
	at: #'ImportlibTestCase' put: nil;
	at: #'PackageImportTestCase' put: nil;
	at: #'IndentationErrorTestCase' put: nil;
	at: #'IndexErrorTestCase' put: nil;
	at: #'IntegerTestCase' put: nil;
	at: #'InterruptedErrorTestCase' put: nil;
	at: #'IsADirectoryErrorTestCase' put: nil;
	at: #'IteratorTestCase' put: nil;
	at: #'KeyErrorTestCase' put: nil;
	at: #'KeyboardInterruptTestCase' put: nil;
	at: #'KeywordOnlyParamsTestCase' put: nil;
	at: #'ListSortKwargsTestCase' put: nil;
	at: #'ListTestCase' put: nil;
	at: #'LocalsTestCase' put: nil;
	at: #'LookupErrorTestCase' put: nil;
	at: #'MakecodesPatternTestCase' put: nil;
	at: #'NamedIntConstantTestCase' put: nil;
	at: #'NextIterTestCase' put: nil;
	at: #'PkgRelativeInitTestCase' put: nil;
	at: #'ReConstantsTestCase' put: nil;
	at: #'MathTestCase' put: nil;
	at: #'MemoryErrorTestCase' put: nil;
	at: #'ModuleFunctionTestCase' put: nil;
	at: #'ModuleNotFoundErrorTestCase' put: nil;
	at: #'ModuleTestCase' put: nil;
	at: #'NameErrorTestCase' put: nil;
	at: #'NoneTypeTestCase' put: nil;
	at: #'NotADirectoryErrorTestCase' put: nil;
	at: #'NotImplementedErrorTestCase' put: nil;
	at: #'NumbersTestCase' put: nil;
	at: #'OSErrorTestCase' put: nil;
	at: #'ObjectTestCase' put: nil;
	at: #'OsTestCase' put: nil;
	at: #'OverflowErrorTestCase' put: nil;
	at: #'PassTestCase' put: nil;
	at: #'PendingDeprecationWarningTestCase' put: nil;
	at: #'PermissionErrorTestCase' put: nil;
	at: #'ProcessLookupErrorTestCase' put: nil;
	at: #'PythonParserTestCase' put: nil;
	at: #'PythonTestCase' put: nil;
	at: #'PythonTokenizerTestCase' put: nil;
	at: #'RaiseTestCase' put: nil;
	at: #'RandomTestCase' put: nil;
	at: #'RangeTestCase' put: nil;
	at: #'ReturnTestCase' put: nil;
	at: #'RecursionErrorTestCase' put: nil;
	at: #'ReferenceErrorTestCase' put: nil;
	at: #'ReSubCallableTestCase' put: nil;
	at: #'ImportlibUnloadTestCase' put: nil;
	at: #'ResourceWarningTestCase' put: nil;
	at: #'RuntimeClassCreationTestCase' put: nil;
	at: #'RuntimeErrorTestCase' put: nil;
	at: #'RuntimeWarningTestCase' put: nil;
	at: #'SecretsTestCase' put: nil;
	at: #'SetTestCase' put: nil;
	at: #'SliceAndLoopsTestCase' put: nil;
	at: #'SreTestCase' put: nil;
	at: #'StatisticsTestCase' put: nil;
	at: #'StopAsyncIterationTestCase' put: nil;
	at: #'StarUnpackIteratorTestCase' put: nil;
	at: #'KwargSplatMergeTestCase' put: nil;
	at: #'ClassAttrDictSubclassTestCase' put: nil;
	at: #'NestedDefNameTestCase' put: nil;
	at: #'SocketModuleTestCase' put: nil;
	at: #'ImportlibReloadTestCase' put: nil;
	at: #'SslModuleTestCase' put: nil;
	at: #'ThreadingModuleTestCase' put: nil;
	at: #'UnboundMethodTestCase' put: nil;
	at: #'StopIterationTestCase' put: nil;
	at: #'StrTestCase' put: nil;
	at: #'ClassMethodGlobalFallbackTestCase' put: nil;
	at: #'FlaskScaffoldingTestCase' put: nil;
	at: #'DjangoTestCase' put: nil;
	at: #'ReModuleTestCase' put: nil;
	at: #'StarImportDynamicNamesTestCase' put: nil;
	at: #'StringModuleTestCase' put: nil;
	at: #'SubmoduleAutoBindTestCase' put: nil;
	at: #'SyntaxErrorTestCase' put: nil;
	at: #'SyntaxWarningTestCase' put: nil;
	at: #'SysTestCase' put: nil;
	at: #'SystemErrorTestCase' put: nil;
	at: #'SystemExitTestCase' put: nil;
	at: #'TabErrorTestCase' put: nil;
	at: #'TimeoutErrorTestCase' put: nil;
	at: #'TryTestCase' put: nil;
	at: #'TupleTestCase' put: nil;
	at: #'TwilioClientTestCase' put: nil;
	at: #'TwilioShapeTestCase' put: nil;
	at: #'TwilioTier1TestCase' put: nil;
	at: #'TypeErrorTestCase' put: nil;
	at: #'UnboundLocalErrorTestCase' put: nil;
	at: #'UrlsplitIndexingTestCase' put: nil;
	at: #'UnicodeDecodeErrorTestCase' put: nil;
	at: #'UnicodeEncodeErrorTestCase' put: nil;
	at: #'UnicodeErrorTestCase' put: nil;
	at: #'UnicodeTranslateErrorTestCase' put: nil;
	at: #'UnicodeWarningTestCase' put: nil;
	at: #'UserWarningTestCase' put: nil;
	at: #'VarargsAndImportsTestCase' put: nil;
	at: #'ValueErrorTestCase' put: nil;
	at: #'WarningTestCase' put: nil;
	at: #'WeakReferenceTestCase' put: nil;
	at: #'WeakReferenceTestSubject' put: nil;
	at: #'WeakrefModuleTestCase' put: nil;
	at: #'ZeroDivisionErrorTestCase' put: nil;
	yourself.
Transcript show: 'Forward references created for PythonTests dictionary'.
%

! ------------------- Forward references for EmbeddedPython dictionary
run
(System myUserProfile symbolList objectNamed: #'EmbeddedPython')
	at: #'CPythonObjectForwarder' put: nil;
	at: #'CPythonException' put: nil;
	at: #'CPythonLibrary' put: nil;
	at: #'CPythonObject' put: nil;
	at: #'CPythonRepl' put: nil;
	at: #'EmbeddedExtensionModule' put: nil;
	at: #'PythonReplicator' put: nil;
	at: #'PythonStore' put: nil;
	yourself.
Transcript show: 'Forward references created for EmbeddedPython dictionary'.
%

! ------------------- Forward references for EmbeddedPythonTests dictionary
run
(System myUserProfile symbolList objectNamed: #'EmbeddedPythonTests')
	at: #'CPythonTestCase' put: nil;
	at: #'CPythonLibraryTestCase' put: nil;
	at: #'CPythonObjectForwarderTestCase' put: nil;
	at: #'CPythonReplTestCase' put: nil;
	at: #'EmbeddedExtensionModuleTestCase' put: nil;
	at: #'PythonStoreTestCase' put: nil;
	yourself.
Transcript show: 'Forward references created for EmbeddedPythonTests dictionary'.
%

run
Transcript show: 'Step 2 complete: All forward references created'.
%

! ===============================================================================
! Step 3: Python type mappings (as DataCurator)
! ===============================================================================
! Map Python type names to existing GemStone Smalltalk classes.
! These classes already exist in GemStone; we just add them to the Python dictionary.
! ===============================================================================

set compile_env: 0

! ``memoryview'' has no Grail implementation, but Django (and other
! libraries) reference it inside isinstance type-tuples like
! ``isinstance(v, (bytes, memoryview, str))''.  Without a real class
! there, ``memoryview'' resolves to a BoundMethod and isinstance
! raises ArgumentTypeError.  Define an empty marker class so those
! guards evaluate to False (nothing is ever a memoryview in Grail).
expectvalue /Class
doit
Object subclass: 'PyMemoryView'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

run
(System myUserProfile symbolList objectNamed: #'Python')
  "Python names that map to existing GemStone globals"
	at: #'True'                       put: true;
	at: #'memoryview'                 put: PyMemoryView;
	at: #'False'                      put: false;
	at: #'__debug__'                  put: true;
	at: #'Ellipsis'                   put: #'...' asSymbol;
	at: #'NotImplemented'             put: #'___NotImplemented___' asSymbol;
  "Python names that map to existing GemStone classes"
	at: #'bool'                       put: Boolean;
	at: #'builtin_function_or_method' put: GsNMethod;
	at: #'bytes'                      put: ByteArray;
	at: #'Decimal'                    put: ScaledDecimal;
	at: #'dict'                       put: KeyValueDictionary;
	at: #'float'                      put: Float;
	at: #'int'                        put: Integer;
	at: #'list'                       put: OrderedCollection;
	at: #'object'                     put: Object;
	at: #'range'                      put: Interval;
	at: #'str'                        put: Unicode7;
	yourself.
Transcript show: 'Step 3 complete: Python type mappings created'.
%

! ===============================================================================
! Step 4: Load Python built-in type classes
! ===============================================================================

! ------------------- New Python classes (as DataCurator)
! Files are ordered so superclasses load before subclasses.
run
Transcript show: 'Step 4: Loading Python built-in type classes...'.
%

! NoneType is loaded first so that the global ``None`` is bound to the
! singleton before any subsequent class file (which may reference None
! in method bodies) is compiled.
input src/smalltalk/Python/NoneType.gs
input src/smalltalk/Python/BaseException.gs
input src/smalltalk/Python/Bytearray.gs
input src/smalltalk/Python/complex.gs
input src/smalltalk/Python/slice.gs
input src/smalltalk/Python/iterator.gs
input src/smalltalk/Python/module.gs
input src/smalltalk/Python/PythonInstance.gs
input src/smalltalk/Python/PyInstanceDict.gs
input src/smalltalk/Python/AbstractPyInt.gs
input src/smalltalk/Python/AbstractPyFloat.gs
input src/smalltalk/Python/NamedIntConstant.gs
input src/smalltalk/Python/BoundMethod.gs
input src/smalltalk/Python/MethodBinding.gs
input src/smalltalk/Python/PropertyDescriptor.gs

! Register ``property'' → PropertyDescriptor AFTER the class file is
! loaded — the Step 3 type-mapping block runs before the class
! definition itself.
run
Python at: #'property' put: PropertyDescriptor.
Transcript show: 'Registered: property -> PropertyDescriptor'.
%
input src/smalltalk/Python/SuperBoundMethod.gs
input src/smalltalk/Python/Super.gs
input src/smalltalk/Python/UnboundMethod.gs
input src/smalltalk/Python/PythonGenerator.gs
input src/smalltalk/Python/string_Formatter.gs
input src/smalltalk/Python/BaseExceptionGroup.gs
input src/smalltalk/Python/Exception.gs
input src/smalltalk/Python/GeneratorExit.gs
input src/smalltalk/Python/KeyboardInterrupt.gs
input src/smalltalk/Python/SystemExit.gs
input src/smalltalk/Python/dict_itemiterator.gs
input src/smalltalk/Python/dict_keyiterator.gs
input src/smalltalk/Python/dict_valueiterator.gs
input src/smalltalk/Python/list_iterator.gs
input src/smalltalk/Python/range_iterator.gs
input src/smalltalk/Python/set_iterator.gs
input src/smalltalk/Python/str_iterator.gs
input src/smalltalk/Python/Tuple.gs
input src/smalltalk/Python/tuple_iterator.gs
input src/smalltalk/Python/filter_iterator.gs
input src/smalltalk/Python/map_iterator.gs
input src/smalltalk/Python/zip_iterator.gs
input src/smalltalk/Python/builtins.gs
input src/smalltalk/Python/copyreg.gs
input src/smalltalk/Python/cmath.gs
input src/smalltalk/Python/PyEnumTypes.gs
input src/smalltalk/Python/enum.gs
input src/smalltalk/Python/fractions.gs
! LruCacheWrapper must load before functools — functools.lru_cache
! references it from its decorator-builder closure.
input src/smalltalk/Python/LruCacheWrapper.gs
input src/smalltalk/Python/functools.gs
input src/smalltalk/Python/gemstone.gs
input src/smalltalk/Python/grail.gs
input src/smalltalk/Python/PyObject.gs
input src/smalltalk/Python/CPythonShim.gs
input src/smalltalk/Python/ShimForeignObject.gs
input src/smalltalk/EmbeddedPython/CPythonException.gs
input src/smalltalk/EmbeddedPython/CPythonLibrary.gs
input src/smalltalk/EmbeddedPython/CPythonObject.gs
input src/smalltalk/EmbeddedPython/CPythonRepl.gs
input src/smalltalk/EmbeddedPython/PythonReplicator.gs
input src/smalltalk/EmbeddedPython/PythonStore.gs
input src/smalltalk/EmbeddedPython/CPythonObjectForwarder.gs
input src/smalltalk/EmbeddedPython/EmbeddedExtensionModule.gs
input src/smalltalk/Python/ShimStatisticsModule.gs
input src/smalltalk/Python/ShimBisectModule.gs
input src/smalltalk/Python/ShimCrc32cModule.gs
input src/smalltalk/Python/ShimTestModule.gs
input src/smalltalk/Python/ShimSreModule.gs
input src/smalltalk/Python/importlib.gs
input src/weakref/WeakReference.gs
input src/smalltalk/Python/hashlib.gs
input src/smalltalk/Python/socket_module.gs
input src/smalltalk/Python/thread_module.gs
input src/smalltalk/Python/time.gs
input src/smalltalk/Python/secrets.gs
input src/smalltalk/Python/warnings.gs
input src/smalltalk/Python/struct.gs
input src/smalltalk/Python/mimetypes.gs
input src/smalltalk/Python/ipaddress.gs
input src/smalltalk/Python/datetime_module.gs
input src/smalltalk/Python/json_module.gs
input src/smalltalk/Python/io_module.gs
input src/smalltalk/Python/zlib_module.gs
input src/smalltalk/Python/math.gs
input src/smalltalk/Python/numbers.gs
input src/smalltalk/Python/os.gs
input src/smalltalk/Python/os_path.gs
input src/smalltalk/Python/random.gs
input src/smalltalk/Python/statistics.gs
input src/smalltalk/Python/string.gs
input src/smalltalk/Python/html_entities.gs
input src/smalltalk/Python/html.gs
input src/smalltalk/Python/sys.gs
input src/smalltalk/Python/ExceptionGroup.gs
input src/smalltalk/Python/ArithmeticError.gs
input src/smalltalk/Python/AssertionError.gs
input src/smalltalk/Python/AttributeError.gs
input src/smalltalk/Python/BufferError.gs
input src/smalltalk/Python/EOFError.gs
input src/smalltalk/Python/ImportError.gs
input src/smalltalk/Python/LookupError.gs
input src/smalltalk/Python/MemoryError.gs
input src/smalltalk/Python/NameError.gs
input src/smalltalk/Python/OSError.gs
input src/smalltalk/Python/ReferenceError.gs
input src/smalltalk/Python/RuntimeError.gs
input src/smalltalk/Python/StopAsyncIteration.gs
input src/smalltalk/Python/PythonBreak.gs
input src/smalltalk/Python/PythonContinue.gs
input src/smalltalk/Python/PythonReturn.gs
input src/smalltalk/Python/StopIteration.gs
input src/smalltalk/Python/SyntaxError.gs
input src/smalltalk/Python/SystemError.gs
input src/smalltalk/Python/TypeError.gs
input src/smalltalk/Python/ValueError.gs
input src/smalltalk/Python/Warning.gs
input src/smalltalk/Python/FloatingPointError.gs
input src/smalltalk/Python/OverflowError.gs
input src/smalltalk/Python/ZeroDivisionError.gs
input src/smalltalk/Python/ModuleNotFoundError.gs
input src/smalltalk/Python/IndexError.gs
input src/smalltalk/Python/KeyError.gs
input src/smalltalk/Python/UnboundLocalError.gs
input src/smalltalk/Python/BlockingIOError.gs
input src/smalltalk/Python/UnsupportedOperation.gs
input src/smalltalk/Python/ChildProcessError.gs
input src/smalltalk/Python/ConnectionError.gs
input src/smalltalk/Python/FileExistsError.gs
input src/smalltalk/Python/FileNotFoundError.gs
input src/smalltalk/Python/InterruptedError.gs
input src/smalltalk/Python/IsADirectoryError.gs
input src/smalltalk/Python/NotADirectoryError.gs
input src/smalltalk/Python/PermissionError.gs
input src/smalltalk/Python/ProcessLookupError.gs
input src/smalltalk/Python/TimeoutError.gs
input src/smalltalk/Python/NotImplementedError.gs
input src/smalltalk/Python/RecursionError.gs
input src/smalltalk/Python/IndentationError.gs
input src/smalltalk/Python/StatisticsError.gs
input src/smalltalk/Python/UnicodeError.gs
input src/smalltalk/Python/BytesWarning.gs
input src/smalltalk/Python/DeprecationWarning.gs
input src/smalltalk/Python/EncodingWarning.gs
input src/smalltalk/Python/FutureWarning.gs
input src/smalltalk/Python/ImportWarning.gs
input src/smalltalk/Python/PendingDeprecationWarning.gs
input src/smalltalk/Python/ResourceWarning.gs
input src/smalltalk/Python/RuntimeWarning.gs
input src/smalltalk/Python/SyntaxWarning.gs
input src/smalltalk/Python/UnicodeWarning.gs
input src/smalltalk/Python/UserWarning.gs
input src/smalltalk/Python/BrokenPipeError.gs
input src/smalltalk/Python/ConnectionAbortedError.gs
input src/smalltalk/Python/ConnectionRefusedError.gs
input src/smalltalk/Python/ConnectionResetError.gs
input src/smalltalk/Python/TabError.gs
input src/smalltalk/Python/UnicodeDecodeError.gs
input src/smalltalk/Python/UnicodeEncodeError.gs
input src/smalltalk/Python/UnicodeTranslateError.gs

! ------------------- Switch to SystemUser for adding methods to base classes
commit
logout
set user SystemUser pass swordfish
login

! ------- Add Python dictionary to SystemUser's symbol list
run
| pythonDict systemUserProfile dataCurator |
systemUserProfile := System myUserProfile.
dataCurator := AllUsers userWithId: 'DataCurator' ifAbsent: [self error: 'DataCurator not found'].
pythonDict := dataCurator symbolList objectNamed: #'Python'.
pythonDict ifNil: [self error: 'Python dictionary not found in DataCurator''s symbol list'].
systemUserProfile insertDictionary: pythonDict at: 1.
Transcript show: 'Added Python dictionary to SystemUser''s symbol list'.
%

run
| symList |
symList := System myUserProfile symbolList .
(symList includesIdentical: GsCompilerClasses) ifFalse:[
  symList add: GsCompilerClasses.
  Transcript show: 'Added GsCompilerClasses dictionary to DataCurator''s symbol list'.
].
%

! ------------------- GemStone base class methods (as SystemUser)
input src/smalltalk/Python/Bool.gs
input src/smalltalk/Python/builtin_function_or_method.gs
input src/smalltalk/Python/Bytes.gs
input src/smalltalk/Python/Decimal.gs
input src/smalltalk/Python/Fraction.gs
input src/smalltalk/Python/dict.gs
input src/smalltalk/Python/PyDict.gs
input src/smalltalk/Python/ExecBlockAttrs.gs
input src/smalltalk/Python/ExecBlock.gs
input src/smalltalk/Python/Float.gs
input src/smalltalk/Python/SetProtocol.gs
input src/smalltalk/Python/frozenset.gs
input src/smalltalk/Python/Int.gs
input src/smalltalk/Python/list.gs
input src/smalltalk/Python/Object.gs
input src/smalltalk/Python/Range.gs
input src/smalltalk/Python/SequenceableCollection.gs
input src/smalltalk/Python/set.gs
input src/smalltalk/Python/str.gs
input src/smalltalk/Python/Subscript.gs
input src/smalltalk/Python/System.gs
input src/smalltalk/Python/Tuple.gs
input src/smalltalk/Python/UndefinedObject.gs

! ------- Remove Python dictionary from SystemUser's symbol list
run
| systemUserProfile names |
systemUserProfile := System myUserProfile.
names := systemUserProfile symbolList names.
(names includes: #'Python') ifTrue: [
	systemUserProfile symbolList removeAtIndex: (names indexOf: #'Python').
	Transcript show: 'Removed Python dictionary from SystemUser''s symbol list'.
].
%

! ------------------- Switch back to DataCurator
commit
logout
set user DataCurator pass swordfish
login

! ------- Register built-in numeric types with numbers module ABCs
run
numbers @env1:instance.
%
commit

run
Transcript show: 'Step 4 complete: Python built-in type classes loaded'.
%

! ===============================================================================
! Step 5: Load AST classes
! ===============================================================================
! Files are ordered so superclasses load before subclasses.
! ===============================================================================
run
Transcript show: 'Step 5: Loading AST classes...'.
%

input src/smalltalk/PythonAst/AbstractNode.gs
input src/smalltalk/PythonAst/PrettyWriteStream.gs
input src/smalltalk/PythonAst/PythonParser.gs
input src/smalltalk/PythonAst/PythonToken.gs
input src/smalltalk/PythonAst/PythonTokenizer.gs
input src/smalltalk/PythonAst/AbstractLocationNode.gs
input src/smalltalk/PythonAst/ArgumentsAst.gs
input src/smalltalk/PythonAst/CmpOpAst.gs
input src/smalltalk/PythonAst/ComprehensionAst.gs
input src/smalltalk/PythonAst/ExpressionContextAst.gs
input src/smalltalk/PythonAst/ModuleAst.gs
input src/smalltalk/PythonAst/OperatorAst.gs
input src/smalltalk/PythonAst/SuiteAst.gs
input src/smalltalk/PythonAst/TypeIgnoreAst.gs
input src/smalltalk/PythonAst/TypeParamAst.gs
input src/smalltalk/PythonAst/WithItemAst.gs
input src/smalltalk/PythonAst/AliasAst.gs
input src/smalltalk/PythonAst/ArgAst.gs
input src/smalltalk/PythonAst/ExceptHandlerAst.gs
input src/smalltalk/PythonAst/ExpressionAst.gs
input src/smalltalk/PythonAst/KeywordAst.gs
input src/smalltalk/PythonAst/SliceAst.gs
input src/smalltalk/PythonAst/StatementAst.gs
input src/smalltalk/PythonAst/EqAst.gs
input src/smalltalk/PythonAst/GtAst.gs
input src/smalltalk/PythonAst/GtEAst.gs
input src/smalltalk/PythonAst/InAst.gs
input src/smalltalk/PythonAst/IsAst.gs
input src/smalltalk/PythonAst/IsNotAst.gs
input src/smalltalk/PythonAst/LtAst.gs
input src/smalltalk/PythonAst/LtEAst.gs
input src/smalltalk/PythonAst/NotEqAst.gs
input src/smalltalk/PythonAst/NotInAst.gs
input src/smalltalk/PythonAst/DelAst.gs
input src/smalltalk/PythonAst/LoadAst.gs
input src/smalltalk/PythonAst/ParamAst.gs
input src/smalltalk/PythonAst/StoreAst.gs
input src/smalltalk/PythonAst/Package.gs
input src/smalltalk/PythonAst/AddAst.gs
input src/smalltalk/PythonAst/BitAndAst.gs
input src/smalltalk/PythonAst/BitOrAst.gs
input src/smalltalk/PythonAst/BitXorAst.gs
input src/smalltalk/PythonAst/DivAst.gs
input src/smalltalk/PythonAst/FloorDivAst.gs
input src/smalltalk/PythonAst/LShiftAst.gs
input src/smalltalk/PythonAst/MatMultAst.gs
input src/smalltalk/PythonAst/ModAst.gs
input src/smalltalk/PythonAst/MultAst.gs
input src/smalltalk/PythonAst/PowAst.gs
input src/smalltalk/PythonAst/RShiftAst.gs
input src/smalltalk/PythonAst/SubAst.gs
input src/smalltalk/PythonAst/BlockAst.gs
input src/smalltalk/PythonAst/AttributeAst.gs
input src/smalltalk/PythonAst/AwaitAst.gs
input src/smalltalk/PythonAst/BinOpAst.gs
input src/smalltalk/PythonAst/BoolOpAst.gs
input src/smalltalk/PythonAst/CallAst.gs
input src/smalltalk/PythonAst/CompareAst.gs
input src/smalltalk/PythonAst/ConstantAst.gs
input src/smalltalk/PythonAst/DictAst.gs
input src/smalltalk/PythonAst/DictCompAst.gs
input src/smalltalk/PythonAst/FormattedValueAst.gs
input src/smalltalk/PythonAst/GeneratorExpAst.gs
input src/smalltalk/PythonAst/IfExpAst.gs
input src/smalltalk/PythonAst/JoinedStrAst.gs
input src/smalltalk/PythonAst/LambdaAst.gs
input src/smalltalk/PythonAst/ListAst.gs
input src/smalltalk/PythonAst/ListCompAst.gs
input src/smalltalk/PythonAst/NameAst.gs
input src/smalltalk/PythonAst/NamedExprAst.gs
input src/smalltalk/PythonAst/SetAst.gs
input src/smalltalk/PythonAst/SetCompAst.gs
input src/smalltalk/PythonAst/StarredAst.gs
input src/smalltalk/PythonAst/SubscriptAst.gs
input src/smalltalk/PythonAst/TupleAst.gs
input src/smalltalk/PythonAst/UnaryOpAst.gs
input src/smalltalk/PythonAst/YieldAst.gs
input src/smalltalk/PythonAst/YieldFromAst.gs
input src/smalltalk/PythonAst/AnnAssignAst.gs
input src/smalltalk/PythonAst/AssertAst.gs
input src/smalltalk/PythonAst/AssignAst.gs
input src/smalltalk/PythonAst/AugAssignAst.gs
input src/smalltalk/PythonAst/BreakAst.gs
input src/smalltalk/PythonAst/ClassDefAst.gs
input src/smalltalk/PythonAst/ContinueAst.gs
input src/smalltalk/PythonAst/DeleteAst.gs
input src/smalltalk/PythonAst/ExprAst.gs
input src/smalltalk/PythonAst/ForAst.gs
input src/smalltalk/PythonAst/FunctionDefAst.gs
input src/smalltalk/PythonAst/GlobalAst.gs
input src/smalltalk/PythonAst/IfAst.gs
input src/smalltalk/PythonAst/ImportAst.gs
input src/smalltalk/PythonAst/ImportFromAst.gs
input src/smalltalk/PythonAst/NonlocalAst.gs
input src/smalltalk/PythonAst/PassAst.gs
input src/smalltalk/PythonAst/RaiseAst.gs
input src/smalltalk/PythonAst/ReturnAst.gs
input src/smalltalk/PythonAst/TryAst.gs
input src/smalltalk/PythonAst/WhileAst.gs
input src/smalltalk/PythonAst/WithAst.gs
! Async statement variants — load AFTER their sync counterparts since
! they now inherit from them (see AsyncForAst.gs etc.).
input src/smalltalk/PythonAst/AsyncForAst.gs
input src/smalltalk/PythonAst/AsyncFunctionDefAst.gs
input src/smalltalk/PythonAst/AsyncWithAst.gs
input src/smalltalk/PythonAst/AndAst.gs
input src/smalltalk/PythonAst/OrAst.gs
input src/smalltalk/PythonAst/KeywordsAst.gs
input src/smalltalk/PythonAst/InvertAst.gs
input src/smalltalk/PythonAst/NotAst.gs
input src/smalltalk/PythonAst/UAddAst.gs
input src/smalltalk/PythonAst/USubAst.gs
input src/smalltalk/PythonAst/ClassFunctionDefAst.gs
input src/smalltalk/PythonAst/InstanceFunctionDefAst.gs
input src/smalltalk/PythonAst/StaticFunctionDefAst.gs

run
Transcript show: 'Step 5 complete: AST classes loaded'.
%

! ===============================================================================
! Step 6: Load test classes
! ===============================================================================
! PythonTestCase loaded first (base class), then all others.
! ===============================================================================
run
Transcript show: 'Step 6: Loading test classes...'.
%

set compile_env: 0

input src/smalltalk/PythonTests/PythonTestCase.gs
input src/smalltalk/PythonTests/BooleanTestCase.gs
input src/smalltalk/PythonTests/BoundMethodNameTestCase.gs
input src/smalltalk/PythonTests/BuiltinsTestCase.gs
input src/smalltalk/PythonTests/BuiltinSubclassOverrideTestCase.gs
input src/smalltalk/PythonTests/BytearrayTestCase.gs
input src/smalltalk/PythonTests/CachedPropertyTestCase.gs
input src/smalltalk/PythonTests/DeployCheckTestCase.gs
input src/smalltalk/PythonTests/PyDictTestCase.gs
input src/smalltalk/PythonTests/BytesTestCase.gs
input src/smalltalk/PythonTests/ClassAttrsTestCase.gs
input src/smalltalk/PythonTests/ClassDecoratorTestCase.gs
input src/smalltalk/PythonTests/SmalltalkForwarderTestCase.gs
input src/smalltalk/PythonTests/GrailModuleTestCase.gs
input src/smalltalk/PythonTests/ClassCallFastPathTestCase.gs
input src/smalltalk/PythonTests/ClassScopeTestCase.gs
input src/smalltalk/PythonTests/ClassTestCase.gs
input src/smalltalk/PythonTests/ClosureAttributeTestCase.gs
input src/smalltalk/PythonTests/CMathTestCase.gs
input src/smalltalk/PythonTests/ComplexTestCase.gs
input src/smalltalk/PythonTests/ComparisonProtocolTestCase.gs
input src/smalltalk/PythonTests/ComprehensionTestCase.gs
input src/smalltalk/PythonTests/DefaultsAndAttrsTestCase.gs
input src/smalltalk/PythonTests/DynamicGlobalsTestCase.gs
input src/smalltalk/PythonTests/ModuleScopeBindingsTestCase.gs
input src/smalltalk/PythonTests/ModuleFunctionDecoratorsTestCase.gs
input src/smalltalk/PythonTests/ImportTypeIntrospectionTestCase.gs
input src/smalltalk/PythonTests/ContextVarsTestCase.gs
input src/smalltalk/PythonTests/ShimForeignObjectTestCase.gs
input src/smalltalk/PythonTests/DynamicInstanceAttrsTestCase.gs
input src/smalltalk/PythonTests/AttributeAccessTestCase.gs
input src/smalltalk/PythonTests/AttributeInheritanceTestCase.gs
input src/smalltalk/PythonTests/AttributePropertyTestCase.gs
input src/smalltalk/PythonTests/ClassAttributeTestCase.gs
input src/smalltalk/PythonTests/AttributeProtocolTestCase.gs
input src/smalltalk/PythonTests/AttributeStoreTestCase.gs
input src/smalltalk/PythonTests/SlotsTestCase.gs
input src/smalltalk/PythonTests/DictKwargsTestCase.gs
input src/smalltalk/PythonTests/DunderClassTestCase.gs
input src/smalltalk/PythonTests/ClassFunctionBindingTestCase.gs
input src/smalltalk/PythonTests/GenericClassSubscriptTestCase.gs
input src/smalltalk/PythonTests/GlobalStatementCodegenTestCase.gs
input src/smalltalk/PythonTests/EnumAutoImportTestCase.gs
input src/smalltalk/PythonTests/Pep448StarredLiteralsTestCase.gs
input src/smalltalk/PythonTests/LambdaStarargsTestCase.gs
input src/smalltalk/PythonTests/ClassBodyMethodRefsTestCase.gs
input src/smalltalk/PythonTests/NonlocalClosureTestCase.gs
input src/smalltalk/PythonTests/ModuleHigherArityDefTestCase.gs
input src/smalltalk/PythonTests/MultipleInheritanceTestCase.gs
input src/smalltalk/PythonTests/FunctionRebindingTestCase.gs
input src/smalltalk/PythonTests/KwargsSplatTestCase.gs
input src/smalltalk/PythonTests/SubclassNameAttrTestCase.gs
input src/smalltalk/PythonTests/LiveDictTestCase.gs
input src/smalltalk/PythonTests/LegbScopeTestCase.gs
input src/smalltalk/PythonTests/TernaryTruthinessTestCase.gs
input src/smalltalk/PythonTests/VarargsNamingTestCase.gs
input src/smalltalk/PythonTests/YieldFromTestCase.gs
input src/smalltalk/PythonTests/EnumGlobalInjectTestCase.gs
input src/smalltalk/PythonTests/MakecodesPatternTestCase.gs
input src/smalltalk/PythonTests/NamedIntConstantTestCase.gs
input src/smalltalk/PythonTests/NextIterTestCase.gs
input src/smalltalk/PythonTests/PkgRelativeInitTestCase.gs
input src/smalltalk/PythonTests/ReConstantsTestCase.gs
input src/smalltalk/PythonTests/CopyregTestCase.gs
input src/smalltalk/PythonTests/DataclassesTestCase.gs
input src/smalltalk/PythonTests/DecimalTestCase.gs
input src/smalltalk/PythonTests/DictTestCase.gs
input src/smalltalk/PythonTests/DictUnpackingTestCase.gs
input src/smalltalk/PythonTests/DynamicTypeTestCase.gs
input src/smalltalk/PythonTests/FloatTestCase.gs
input src/smalltalk/PythonTests/FourArgAttrCallTestCase.gs
input src/smalltalk/PythonTests/FractionTestCase.gs
input src/smalltalk/PythonTests/FrozensetTestCase.gs
input src/smalltalk/PythonTests/FunctoolsTestCase.gs
input src/smalltalk/PythonTests/FunctoolsWrapsVarargsTestCase.gs
input src/smalltalk/PythonTests/ArgparseTestCase.gs
input src/smalltalk/PythonTests/BuiltinExtrasTestCase.gs
input src/smalltalk/PythonTests/FormatSpecTestCase.gs
input src/smalltalk/PythonTests/BisectTestCase.gs
input src/smalltalk/PythonTests/CalendarTestCase.gs
input src/smalltalk/PythonTests/ConfigparserTestCase.gs
input src/smalltalk/PythonTests/CsvTestCase.gs
input src/smalltalk/PythonTests/FnmatchTestCase.gs
input src/smalltalk/PythonTests/GetoptTestCase.gs
input src/smalltalk/PythonTests/GetpassTestCase.gs
input src/smalltalk/PythonTests/HeapqTestCase.gs
input src/smalltalk/PythonTests/QueueTestCase.gs
input src/smalltalk/PythonTests/ReprlibTestCase.gs
input src/smalltalk/PythonTests/ShlexTestCase.gs
input src/smalltalk/PythonTests/TextwrapTestCase.gs
input src/smalltalk/PythonTests/GlobTestCase.gs
input src/smalltalk/PythonTests/ShutilTestCase.gs
input src/smalltalk/PythonTests/TomllibTestCase.gs
input src/smalltalk/PythonTests/UnittestTestCase.gs
input src/smalltalk/PythonTests/ZlibTestCase.gs
input src/smalltalk/PythonTests/EmailMessageTestCase.gs
input src/smalltalk/PythonTests/GzipTestCase.gs
input src/smalltalk/PythonTests/MockTestCase.gs
input src/smalltalk/PythonTests/WsgirefTestCase.gs
input src/smalltalk/PythonTests/GemStoneTestCase.gs
input src/smalltalk/PythonTests/GlobalStatementTestCase.gs
input src/smalltalk/PythonTests/HtmlTestCase.gs
input src/smalltalk/PythonTests/HttpClientTestCase.gs
input src/smalltalk/PythonTests/HttpStatusTestCase.gs
input src/smalltalk/PythonTests/HttpCookiesTestCase.gs
input src/smalltalk/PythonTests/EnumTestCase.gs
input src/smalltalk/PythonTests/CPythonShimTestCase.gs
input src/smalltalk/PythonTests/CPythonHarnessTestCase.gs
input src/smalltalk/PythonTests/DunderNewTestCase.gs
input src/smalltalk/EmbeddedPythonTests/CPythonTestCase.gs
input src/smalltalk/EmbeddedPythonTests/CPythonLibraryTestCase.gs
input src/smalltalk/EmbeddedPythonTests/CPythonObjectForwarderTestCase.gs
input src/smalltalk/EmbeddedPythonTests/CPythonReplTestCase.gs
input src/smalltalk/EmbeddedPythonTests/EmbeddedExtensionModuleTestCase.gs
input src/smalltalk/EmbeddedPythonTests/PythonStoreTestCase.gs
input src/smalltalk/PythonTests/ImportlibTestCase.gs
input src/smalltalk/PythonTests/PackageImportTestCase.gs
input src/smalltalk/PythonTests/IntegerTestCase.gs
input src/smalltalk/PythonTests/IteratorTestCase.gs
input src/smalltalk/PythonTests/ListSortKwargsTestCase.gs
input src/smalltalk/PythonTests/ListTestCase.gs
input src/smalltalk/PythonTests/MathTestCase.gs
input src/smalltalk/PythonTests/ModuleFunctionTestCase.gs
input src/smalltalk/PythonTests/ModuleTestCase.gs
input src/smalltalk/PythonTests/NoneTypeTestCase.gs
input src/smalltalk/PythonTests/NumbersTestCase.gs
input src/smalltalk/PythonTests/ObjectTestCase.gs
input src/smalltalk/PythonTests/OsTestCase.gs
input src/smalltalk/PythonTests/PassTestCase.gs
input src/smalltalk/PythonTests/PythonParserTestCase.gs
input src/smalltalk/PythonTests/PythonTokenizerTestCase.gs
input src/smalltalk/PythonTests/RaiseTestCase.gs
input src/smalltalk/PythonTests/RandomTestCase.gs
input src/smalltalk/PythonTests/RangeTestCase.gs
input src/smalltalk/PythonTests/ReturnTestCase.gs
input src/smalltalk/PythonTests/RuntimeClassCreationTestCase.gs
input src/smalltalk/PythonTests/SecretsTestCase.gs
input src/smalltalk/PythonTests/SetTestCase.gs
input src/smalltalk/PythonTests/SliceAndLoopsTestCase.gs
input src/smalltalk/PythonTests/SreTestCase.gs
input src/smalltalk/PythonTests/StarUnpackIteratorTestCase.gs
input src/smalltalk/PythonTests/StatisticsTestCase.gs
input src/smalltalk/PythonTests/StrTestCase.gs
input src/smalltalk/PythonTests/ClassMethodGlobalFallbackTestCase.gs
input src/smalltalk/PythonTests/FlaskScaffoldingTestCase.gs
input src/smalltalk/PythonTests/DjangoTestCase.gs
input src/smalltalk/PythonTests/ReModuleTestCase.gs
input src/smalltalk/PythonTests/ReSubCallableTestCase.gs
input src/smalltalk/PythonTests/ImportlibUnloadTestCase.gs
input src/smalltalk/PythonTests/KwargSplatMergeTestCase.gs
input src/smalltalk/PythonTests/ClassAttrDictSubclassTestCase.gs
input src/smalltalk/PythonTests/NestedDefNameTestCase.gs
input src/smalltalk/PythonTests/SocketModuleTestCase.gs
input src/smalltalk/PythonTests/ImportlibReloadTestCase.gs
input src/smalltalk/PythonTests/SslModuleTestCase.gs
input src/smalltalk/PythonTests/ThreadingModuleTestCase.gs
input src/smalltalk/PythonTests/UnboundMethodTestCase.gs
input src/smalltalk/PythonTests/StarImportDynamicNamesTestCase.gs
input src/smalltalk/PythonTests/StringModuleTestCase.gs
input src/smalltalk/PythonTests/SubmoduleAutoBindTestCase.gs
input src/smalltalk/PythonTests/SysTestCase.gs
input src/smalltalk/PythonTests/TryTestCase.gs
input src/smalltalk/PythonTests/TupleTestCase.gs
input src/smalltalk/PythonTests/BaseExceptionTestCase.gs

! ------------------- Exception Test Classes
input src/smalltalk/PythonTests/ArithmeticErrorTestCase.gs
input src/smalltalk/PythonTests/AssertionErrorTestCase.gs
input src/smalltalk/PythonTests/AttributeErrorTestCase.gs
input src/smalltalk/PythonTests/BaseExceptionGroupTestCase.gs
input src/smalltalk/PythonTests/BlockingIOErrorTestCase.gs
input src/smalltalk/PythonTests/BrokenPipeErrorTestCase.gs
input src/smalltalk/PythonTests/BufferErrorTestCase.gs
input src/smalltalk/PythonTests/BytesWarningTestCase.gs
input src/smalltalk/PythonTests/ChildProcessErrorTestCase.gs
input src/smalltalk/PythonTests/ConnectionAbortedErrorTestCase.gs
input src/smalltalk/PythonTests/ConnectionErrorTestCase.gs
input src/smalltalk/PythonTests/ConnectionRefusedErrorTestCase.gs
input src/smalltalk/PythonTests/ConnectionResetErrorTestCase.gs
input src/smalltalk/PythonTests/DeprecationWarningTestCase.gs
input src/smalltalk/PythonTests/EOFErrorTestCase.gs
input src/smalltalk/PythonTests/ExitStackUsageTestCase.gs
input src/smalltalk/PythonTests/EncodingWarningTestCase.gs
input src/smalltalk/PythonTests/ExceptionGroupTestCase.gs
input src/smalltalk/PythonTests/ExceptionTestCase.gs
input src/smalltalk/PythonTests/FileExistsErrorTestCase.gs
input src/smalltalk/PythonTests/FileIoTestCase.gs
input src/smalltalk/PythonTests/FileNotFoundErrorTestCase.gs
input src/smalltalk/PythonTests/FloatingPointErrorTestCase.gs
input src/smalltalk/PythonTests/FutureWarningTestCase.gs
input src/smalltalk/PythonTests/GeneratorExitTestCase.gs
input src/smalltalk/PythonTests/ImportErrorTestCase.gs
input src/smalltalk/PythonTests/ImportWarningTestCase.gs
input src/smalltalk/PythonTests/IndentationErrorTestCase.gs
input src/smalltalk/PythonTests/IndexErrorTestCase.gs
input src/smalltalk/PythonTests/InterruptedErrorTestCase.gs
input src/smalltalk/PythonTests/IsADirectoryErrorTestCase.gs
input src/smalltalk/PythonTests/KeyErrorTestCase.gs
input src/smalltalk/PythonTests/KeyboardInterruptTestCase.gs
input src/smalltalk/PythonTests/KeywordOnlyParamsTestCase.gs
input src/smalltalk/PythonTests/LocalsTestCase.gs
input src/smalltalk/PythonTests/LookupErrorTestCase.gs
input src/smalltalk/PythonTests/MemoryErrorTestCase.gs
input src/smalltalk/PythonTests/ModuleNotFoundErrorTestCase.gs
input src/smalltalk/PythonTests/NameErrorTestCase.gs
input src/smalltalk/PythonTests/NotADirectoryErrorTestCase.gs
input src/smalltalk/PythonTests/NotImplementedErrorTestCase.gs
input src/smalltalk/PythonTests/OSErrorTestCase.gs
input src/smalltalk/PythonTests/OverflowErrorTestCase.gs
input src/smalltalk/PythonTests/PendingDeprecationWarningTestCase.gs
input src/smalltalk/PythonTests/PermissionErrorTestCase.gs
input src/smalltalk/PythonTests/ProcessLookupErrorTestCase.gs
input src/smalltalk/PythonTests/RecursionErrorTestCase.gs
input src/smalltalk/PythonTests/ReferenceErrorTestCase.gs
input src/smalltalk/PythonTests/ResourceWarningTestCase.gs
input src/smalltalk/PythonTests/RuntimeErrorTestCase.gs
input src/smalltalk/PythonTests/RuntimeWarningTestCase.gs
input src/smalltalk/PythonTests/StopAsyncIterationTestCase.gs
input src/smalltalk/PythonTests/StopIterationTestCase.gs
input src/smalltalk/PythonTests/SyntaxErrorTestCase.gs
input src/smalltalk/PythonTests/SyntaxWarningTestCase.gs
input src/smalltalk/PythonTests/SystemErrorTestCase.gs
input src/smalltalk/PythonTests/SystemExitTestCase.gs
input src/smalltalk/PythonTests/TabErrorTestCase.gs
input src/smalltalk/PythonTests/TimeoutErrorTestCase.gs
input src/smalltalk/PythonTests/TwilioClientTestCase.gs
input src/smalltalk/PythonTests/TwilioShapeTestCase.gs
input src/smalltalk/PythonTests/TwilioTier1TestCase.gs
input src/smalltalk/PythonTests/TypeErrorTestCase.gs
input src/smalltalk/PythonTests/UnboundLocalErrorTestCase.gs
input src/smalltalk/PythonTests/UrlsplitIndexingTestCase.gs
input src/smalltalk/PythonTests/UnicodeDecodeErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeEncodeErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeTranslateErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeWarningTestCase.gs
input src/smalltalk/PythonTests/UserWarningTestCase.gs
input src/smalltalk/PythonTests/VarargsAndImportsTestCase.gs
input src/smalltalk/PythonTests/ValueErrorTestCase.gs
input src/smalltalk/PythonTests/WarningTestCase.gs
input src/weakref/WeakReferenceTestCase.gs
input src/smalltalk/PythonTests/WeakrefModuleTestCase.gs
input src/smalltalk/PythonTests/ZeroDivisionErrorTestCase.gs

run
Transcript show: 'Step 6 complete: Test classes loaded'.
%

! ===============================================================================
! Step 7: Verify installation
! ===============================================================================
run
| userProfile symbolList names pythonDict pythonASTDict embeddedPythonDict pythonTestsDict embeddedPythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

Transcript cr; show: '==============================================='.
Transcript show: 'Installation Verification'.
Transcript show: '==============================================='.

"Check Python dictionary (loaded first)"
(names includes: #'Python') ifTrue: [
	pythonDict := symbolList objectNamed: #'Python'.
	Transcript show: 'Python dictionary: OK (', pythonDict size printString, ' types)'.
	Transcript show: '  - object -> ', (pythonDict at: #'object' ifAbsent: ['MISSING']) printString.
] ifFalse: [
	Transcript show: 'Python dictionary: MISSING!'.
].

"Check PythonAst dictionary (loaded second, can reference Python types)"
(names includes: #'PythonAst') ifTrue: [
	pythonASTDict := symbolList objectNamed: #'PythonAst'.
	Transcript show: 'PythonAst dictionary: OK (', pythonASTDict size printString, ' classes)'.
] ifFalse: [
	Transcript show: 'PythonAst dictionary: MISSING!'.
].

"Check EmbeddedPython dictionary (embedded-CPython production classes)"
(names includes: #'EmbeddedPython') ifTrue: [
	embeddedPythonDict := symbolList objectNamed: #'EmbeddedPython'.
	Transcript show: 'EmbeddedPython dictionary: OK (', embeddedPythonDict size printString, ' classes)'.
] ifFalse: [
	Transcript show: 'EmbeddedPython dictionary: MISSING!'.
].

"Check PythonTests dictionary (loaded last, can reference both Python and PythonAst)"
(names includes: #'PythonTests') ifTrue: [
	pythonTestsDict := symbolList objectNamed: #'PythonTests'.
	Transcript show: 'PythonTests dictionary: OK (', pythonTestsDict size printString, ' test classes)'.
] ifFalse: [
	Transcript show: 'PythonTests dictionary: MISSING!'.
].

"Check EmbeddedPythonTests dictionary (embedded-CPython test classes)"
(names includes: #'EmbeddedPythonTests') ifTrue: [
	embeddedPythonTestsDict := symbolList objectNamed: #'EmbeddedPythonTests'.
	Transcript show: 'EmbeddedPythonTests dictionary: OK (', embeddedPythonTestsDict size printString, ' test classes)'.
] ifFalse: [
	Transcript show: 'EmbeddedPythonTests dictionary: MISSING!'.
].
System commit .
Transcript show: '==============================================='.
Transcript show: ' Smalltail Installation complete!'.
Transcript show: '==============================================='.
%

! Register hashlib in sys.modules.  ``sys class >> modules`` lazy-inits
! on first access and caches; after the cache is committed an
! installer-edit can't add new entries unless we either reset the
! cache or post-bind the missing entries.  Post-binding is safer
! (won't drop transient registrations from earlier in the session).
run
(sys @env1:modules) @env0:at: #'hashlib' put: hashlib @env1:instance.
(sys @env1:modules) @env0:at: #'socket' put: socket @env1:instance.
(sys @env1:modules) @env0:at: #'_thread' put: _thread @env1:instance.
(sys @env1:modules) @env0:at: #'time' put: time @env1:instance.
(sys @env1:modules) @env0:at: #'secrets' put: secrets @env1:instance.
(sys @env1:modules) @env0:at: #'warnings' put: warnings @env1:instance.
(sys @env1:modules) @env0:at: #'struct' put: struct @env1:instance.
(sys @env1:modules) @env0:at: #'mimetypes' put: mimetypes @env1:instance.
(sys @env1:modules) @env0:at: #'ipaddress' put: ipaddress @env1:instance.
(sys @env1:modules) @env0:at: #'datetime' put: datetime @env1:instance.
(sys @env1:modules) @env0:at: #'json' put: json @env1:instance.
(sys @env1:modules) @env0:at: #'io' put: io @env1:instance.
"numbers must resolve to the Smalltalk ABC module (real
__instancecheck__ + Integer/Float/Fraction registrations); an
unregistered name would fall through to a filesystem probe."
(sys @env1:modules) @env0:at: #'numbers' put: numbers @env1:instance.
%

run
"Assert no name overlap between Python/EmbeddedPython or PythonTests/EmbeddedPythonTests.
(an accidental duplicate should fail fast rather than shadow silently)."
| symbolList overlapBetween |
symbolList := System myUserProfile symbolList.
overlapBetween := [:nameA :nameB |
	| a b |
	a := (symbolList objectNamed: nameA) keys.
	b := (symbolList objectNamed: nameB) keys.
	a select: [:k | b includes: k]
].
(overlapBetween value: #'Python' value: #'EmbeddedPython') ifNotEmpty: [:overlap |
	self error: 'Name overlap between Python and EmbeddedPython: ', overlap printString.
].
(overlapBetween value: #'PythonTests' value: #'EmbeddedPythonTests') ifNotEmpty: [:overlap |
	self error: 'Name overlap between PythonTests and EmbeddedPythonTests: ', overlap printString.
].
Transcript show: 'No-overlap assertion: OK'.
%

run
| libPath pyPath |
importlib grailDir: (System gemEnvironmentVariable: 'GRAIL_DIR').
"Pure-Smalltalk modules — registered unconditionally."
importlib registerModule: 'grail' with: grail ___instance___.
importlib registerModule: '_weakref' with: _weakref ___instance___.
"CPython's os.path is a real importable module (an alias of posixpath);
django.utils._os does ``from os.path import abspath, ...''."
importlib registerModule: 'os.path' with: os_path ___instance___.
libPath := System gemEnvironmentVariable:'SHIM_LIB_PATH'.
(libPath notNil and: [libPath notEmpty]) ifTrue: [
	"Only record the path (CPythonShim isConfigured then holds).  The shim
	and embedded backend coexist in one image, chosen per gem; registering
	the shim's built-ins here would force it image-wide, so they resolve
	lazily instead (see CPythonShim>>builtinModuleNamed:)."
	CPythonShim libraryPath: libPath .
].
pyPath := System gemEnvironmentVariable:'PYTHON_LIB_PATH' .
(pyPath notNil and: [pyPath notEmpty]) ifTrue: [
	CPythonLibrary libraryPath: pyPath .
	CPythonLibrary pythonHomePath: (System gemEnvironmentVariable:'PYTHON_PREFIX') .
	CPythonLibrary pythonPackagePath: (System gemEnvironmentVariable:'PYTHON_PACKAGE_PATH') .
].
%
commit

run
Transcript show: '==============================================='.
Transcript show: ' CPythonShim Installation complete!'.
Transcript show: '==============================================='.
%
