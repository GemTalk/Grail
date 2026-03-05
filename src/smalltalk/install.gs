! ===============================================================================
! Grail Installation Script
! ===============================================================================
! This script installs the Grail Python implementation in GemStone Smalltalk.
! It performs the following steps:
! 1. Removes existing SymbolDictionaries (Python, PythonAst, PythonTests)
!    and creates fresh ones in the correct order
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

! ===============================================================================
! Step 1: Remove and recreate SymbolDictionaries
! ===============================================================================
run
"Remove Python dictionary if it exists"
#(#'Python' #'PythonAst' #'PythonTests') do: [:each |
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
"Create Python dictionaries in reverse order"
#(#'PythonTests' #'PythonAst' #'Python') do: [:each |
	| dict |
	dict := SymbolDictionary new name: each; yourself.
	System myUserProfile insertDictionary: dict at: 1.
	Transcript show: 'Created ' , each , ' dictionary'.
].

Transcript show: 'Step 1 complete: Recreated dictionaries in correct order'.
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
	at: #'CPythonLibrary' put: nil;
	at: #'CPythonObject' put: nil;
	at: #'PyObject' put: nil;
	at: #'_statistics' put: nil;
	at: #'_bisect' put: nil;
	at: #'_crc32c' put: nil;
	at: #'_shimtest' put: nil;
	at: #'_sre' put: nil;
	at: #'builtins' put: nil;
	at: #'bytearray' put: nil;
	at: #'cmath' put: nil;
	at: #'complex' put: nil;
	at: #'copyreg' put: nil;
	at: #'enum' put: nil;
	at: #'fractions' put: nil;
	at: #'functools' put: nil;
	at: #'dict_itemiterator' put: nil;
	at: #'dict_keyiterator' put: nil;
	at: #'dict_valueiterator' put: nil;
	at: #'gemstone' put: nil;
	at: #'html' put: nil;
	at: #'html_entities' put: nil;
	at: #'importlib' put: nil;
	at: #'iterator' put: nil;
	at: #'list_iterator' put: nil;
	at: #'math' put: nil;
	at: #'module' put: nil;
	at: #'numbers' put: nil;
	at: #'numbers_Complex' put: nil;
	at: #'numbers_Integral' put: nil;
	at: #'numbers_Number' put: nil;
	at: #'numbers_Rational' put: nil;
	at: #'numbers_Real' put: nil;
	at: #'os' put: nil;
	at: #'os_path' put: nil;
	at: #'random' put: nil;
	at: #'range_iterator' put: nil;
	at: #'set' put: nil;
	at: #'set_iterator' put: nil;
	at: #'statistics' put: nil;
	at: #'str_iterator' put: nil;
	at: #'string' put: nil;
	at: #'string_formatter' put: nil;
	at: #'sys' put: nil;
	at: #'tuple_iterator' put: nil;
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
	at: #'BrokenPipeErrorTestCase' put: nil;
	at: #'BufferErrorTestCase' put: nil;
	at: #'BuiltinsTestCase' put: nil;
	at: #'BytearrayTestCase' put: nil;
	at: #'BytesTestCase' put: nil;
	at: #'BytesWarningTestCase' put: nil;
	at: #'CPythonShimTestCase' put: nil;
	at: #'CPythonTestCase' put: nil;
	at: #'CMathTestCase' put: nil;
	at: #'ChildProcessErrorTestCase' put: nil;
	at: #'ComplexTestCase' put: nil;
	at: #'ConnectionAbortedErrorTestCase' put: nil;
	at: #'ConnectionErrorTestCase' put: nil;
	at: #'ConnectionRefusedErrorTestCase' put: nil;
	at: #'ConnectionResetErrorTestCase' put: nil;
	at: #'DecimalTestCase' put: nil;
	at: #'DeprecationWarningTestCase' put: nil;
	at: #'DictTestCase' put: nil;
	at: #'EOFErrorTestCase' put: nil;
	at: #'EncodingWarningTestCase' put: nil;
	at: #'ExceptionGroupTestCase' put: nil;
	at: #'ExceptionTestCase' put: nil;
	at: #'FileExistsErrorTestCase' put: nil;
	at: #'FileNotFoundErrorTestCase' put: nil;
	at: #'FloatTestCase' put: nil;
	at: #'FloatingPointErrorTestCase' put: nil;
	at: #'FractionTestCase' put: nil;
	at: #'FrozensetTestCase' put: nil;
	at: #'FutureWarningTestCase' put: nil;
	at: #'GemStoneTestCase' put: nil;
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
	at: #'ListTestCase' put: nil;
	at: #'LookupErrorTestCase' put: nil;
	at: #'MathTestCase' put: nil;
	at: #'MemoryErrorTestCase' put: nil;
	at: #'ModuleNotFoundErrorTestCase' put: nil;
	at: #'ModuleTestCase' put: nil;
	at: #'NameErrorTestCase' put: nil;
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
	at: #'ResourceWarningTestCase' put: nil;
	at: #'RuntimeErrorTestCase' put: nil;
	at: #'RuntimeWarningTestCase' put: nil;
	at: #'SetTestCase' put: nil;
	at: #'StatisticsTestCase' put: nil;
	at: #'StopAsyncIterationTestCase' put: nil;
	at: #'StopIterationTestCase' put: nil;
	at: #'StrTestCase' put: nil;
	at: #'StringModuleTestCase' put: nil;
	at: #'SyntaxErrorTestCase' put: nil;
	at: #'SyntaxWarningTestCase' put: nil;
	at: #'SysTestCase' put: nil;
	at: #'SystemErrorTestCase' put: nil;
	at: #'SystemExitTestCase' put: nil;
	at: #'TabErrorTestCase' put: nil;
	at: #'TimeoutErrorTestCase' put: nil;
	at: #'TryTestCase' put: nil;
	at: #'TupleTestCase' put: nil;
	at: #'TypeErrorTestCase' put: nil;
	at: #'UnboundLocalErrorTestCase' put: nil;
	at: #'UnicodeDecodeErrorTestCase' put: nil;
	at: #'UnicodeEncodeErrorTestCase' put: nil;
	at: #'UnicodeErrorTestCase' put: nil;
	at: #'UnicodeTranslateErrorTestCase' put: nil;
	at: #'UnicodeWarningTestCase' put: nil;
	at: #'UserWarningTestCase' put: nil;
	at: #'ValueErrorTestCase' put: nil;
	at: #'WarningTestCase' put: nil;
	at: #'ZeroDivisionErrorTestCase' put: nil;
	yourself.
Transcript show: 'Forward references created for PythonTests dictionary'.
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

run
(System myUserProfile symbolList objectNamed: #'Python')
  "Python names that map to existing GemStone globals"
	at: #'True'                       put: true;
	at: #'False'                      put: false;
	at: #'None'	                      put: nil;
  "Python names that map to existing GemStone classes"
	at: #'bool'                       put: Boolean;
	at: #'builtin_function_or_method' put: GsNMethod;
	at: #'bytes'                      put: ByteArray;
	at: #'Decimal'                    put: ScaledDecimal;
	at: #'dict'                       put: KeyValueDictionary;
	at: #'float'                      put: Float;
	at: #'frozenset'                  put: Set;
	at: #'int'                        put: Integer;
	at: #'list'                       put: OrderedCollection;
	at: #'object'                     put: Object;
	at: #'range'                      put: Interval;
	at: #'str'                        put: Unicode7;
	at: #'tuple'                      put: InvariantArray;
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

input src/smalltalk/Python/BaseException.gs
input src/smalltalk/Python/bytearray.gs
input src/smalltalk/Python/complex.gs
input src/smalltalk/Python/iterator.gs
input src/smalltalk/Python/module.gs
input src/smalltalk/Python/string_formatter.gs
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
input src/smalltalk/Python/tuple_iterator.gs
input src/smalltalk/Python/builtins.gs
input src/smalltalk/Python/copyreg.gs
input src/smalltalk/Python/cmath.gs
input src/smalltalk/Python/enum.gs
input src/smalltalk/Python/fractions.gs
input src/smalltalk/Python/functools.gs
input src/smalltalk/Python/gemstone.gs
input src/smalltalk/Python/PyObject.gs
input src/smalltalk/Python/CPythonShim.gs
input src/smalltalk/Python/CPythonLibrary.gs
input src/smalltalk/Python/CPythonObject.gs
input src/smalltalk/Python/ShimStatisticsModule.gs
input src/smalltalk/Python/ShimBisectModule.gs
input src/smalltalk/Python/ShimCrc32cModule.gs
input src/smalltalk/Python/ShimTestModule.gs
input src/smalltalk/Python/ShimSreModule.gs
input src/smalltalk/Python/importlib.gs
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

! ------------------- GemStone base class methods (as SystemUser)
input src/smalltalk/Python/bool.gs
input src/smalltalk/Python/builtin_function_or_method.gs
input src/smalltalk/Python/bytes.gs
input src/smalltalk/Python/Decimal.gs
input src/smalltalk/Python/Fraction.gs
input src/smalltalk/Python/dict.gs
input src/smalltalk/Python/ExecBlock.gs
input src/smalltalk/Python/float.gs
input src/smalltalk/Python/frozenset.gs
input src/smalltalk/Python/int.gs
input src/smalltalk/Python/list.gs
input src/smalltalk/Python/object.gs
input src/smalltalk/Python/range.gs
input src/smalltalk/Python/SequenceableCollection.gs
input src/smalltalk/Python/set.gs
input src/smalltalk/Python/str.gs
input src/smalltalk/Python/tuple.gs

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
numbers perform: #'instance' env: 1.
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
input src/smalltalk/PythonAst/AsyncForAst.gs
input src/smalltalk/PythonAst/AsyncFunctionDefAst.gs
input src/smalltalk/PythonAst/AsyncWithAst.gs
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
input src/smalltalk/PythonTests/BuiltinsTestCase.gs
input src/smalltalk/PythonTests/BytearrayTestCase.gs
input src/smalltalk/PythonTests/BytesTestCase.gs
input src/smalltalk/PythonTests/CMathTestCase.gs
input src/smalltalk/PythonTests/ComplexTestCase.gs
input src/smalltalk/PythonTests/DecimalTestCase.gs
input src/smalltalk/PythonTests/DictTestCase.gs
input src/smalltalk/PythonTests/FloatTestCase.gs
input src/smalltalk/PythonTests/FractionTestCase.gs
input src/smalltalk/PythonTests/FrozensetTestCase.gs
input src/smalltalk/PythonTests/GemStoneTestCase.gs
input src/smalltalk/PythonTests/HtmlTestCase.gs
input src/smalltalk/PythonTests/CPythonShimTestCase.gs
input src/smalltalk/PythonTests/CPythonTestCase.gs
input src/smalltalk/PythonTests/ImportlibTestCase.gs
input src/smalltalk/PythonTests/PackageImportTestCase.gs
input src/smalltalk/PythonTests/IntegerTestCase.gs
input src/smalltalk/PythonTests/IteratorTestCase.gs
input src/smalltalk/PythonTests/ListTestCase.gs
input src/smalltalk/PythonTests/MathTestCase.gs
input src/smalltalk/PythonTests/ModuleTestCase.gs
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
input src/smalltalk/PythonTests/SetTestCase.gs
input src/smalltalk/PythonTests/StatisticsTestCase.gs
input src/smalltalk/PythonTests/StrTestCase.gs
input src/smalltalk/PythonTests/StringModuleTestCase.gs
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
input src/smalltalk/PythonTests/EncodingWarningTestCase.gs
input src/smalltalk/PythonTests/ExceptionGroupTestCase.gs
input src/smalltalk/PythonTests/ExceptionTestCase.gs
input src/smalltalk/PythonTests/FileExistsErrorTestCase.gs
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
input src/smalltalk/PythonTests/TypeErrorTestCase.gs
input src/smalltalk/PythonTests/UnboundLocalErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeDecodeErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeEncodeErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeTranslateErrorTestCase.gs
input src/smalltalk/PythonTests/UnicodeWarningTestCase.gs
input src/smalltalk/PythonTests/UserWarningTestCase.gs
input src/smalltalk/PythonTests/ValueErrorTestCase.gs
input src/smalltalk/PythonTests/WarningTestCase.gs
input src/smalltalk/PythonTests/ZeroDivisionErrorTestCase.gs

run
Transcript show: 'Step 6 complete: Test classes loaded'.
%

! ===============================================================================
! Step 7: Verify installation
! ===============================================================================
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
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

"Check PythonTests dictionary (loaded last, can reference both Python and PythonAst)"
(names includes: #'PythonTests') ifTrue: [
	pythonTestsDict := symbolList objectNamed: #'PythonTests'.
	Transcript show: 'PythonTests dictionary: OK (', pythonTestsDict size printString, ' test classes)'.
] ifFalse: [
	Transcript show: 'PythonTests dictionary: MISSING!'.
].

Transcript show: '==============================================='.
Transcript show: 'Installation complete!'.
Transcript show: '==============================================='.
%
