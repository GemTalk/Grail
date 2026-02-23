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
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

"Remove PythonTests dictionary if it exists"
(names includes: #'PythonTests') ifTrue: [
	symbolList removeAtIndex: (names indexOf: #'PythonTests').
	Transcript show: 'Removed PythonTests dictionary'.
] ifFalse: [
	Transcript show: 'PythonTests dictionary not found (OK)'.
].
%
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

"Remove Python dictionary if it exists"
(names includes: #'Python') ifTrue: [
	symbolList removeAtIndex: (names indexOf: #'Python').
	Transcript show: 'Removed Python dictionary'.
] ifFalse: [
	Transcript show: 'Python dictionary not found (OK)'.
].
%
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

"Remove PythonAst dictionary if it exists"
(names includes: #'PythonAst') ifTrue: [
	symbolList removeAtIndex: (names indexOf: #'PythonAst').
	Transcript show: 'Removed PythonAst dictionary'.
] ifFalse: [
	Transcript show: 'PythonAst dictionary not found (OK)'.
].
%
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

"Create Python dictionary (first in order)"
pythonDict := SymbolDictionary new name: #'Python'; yourself.
userProfile insertDictionary: pythonDict at: 1.
Transcript show: 'Created Python dictionary'.

"Create PythonAst dictionary (second in order)"
pythonASTDict := SymbolDictionary new name: #'PythonAst'; yourself.
userProfile insertDictionary: pythonASTDict at: 2.
Transcript show: 'Created PythonAst dictionary'.

"Create PythonTests dictionary (third in order)"
pythonTestsDict := SymbolDictionary new name: #'PythonTests'; yourself.
userProfile insertDictionary: pythonTestsDict at: 3.
Transcript show: 'Created PythonTests dictionary'.

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
| pythonDict |
pythonDict := System myUserProfile symbolList objectNamed: #'Python'.
pythonDict
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
	at: #'PyObject' put: nil;
	at: #'_statistics' put: nil;
	at: #'_bisect' put: nil;
	at: #'_crc32c' put: nil;
	at: #'_shimtest' put: nil;
	at: #'builtins' put: nil;
	at: #'bytearray' put: nil;
	at: #'cmath' put: nil;
	at: #'complex' put: nil;
	at: #'dict_itemiterator' put: nil;
	at: #'dict_keyiterator' put: nil;
	at: #'dict_valueiterator' put: nil;
	at: #'fractions' put: nil;
	at: #'gemstone' put: nil;
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
| dict |
dict := System myUserProfile symbolList objectNamed: #'PythonAst'.
dict
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
| dict |
dict := System myUserProfile symbolList objectNamed: #'PythonTests'.
dict
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
| pythonDict |
pythonDict := System myUserProfile symbolList objectNamed: #'Python'.
pythonDict
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

input smalltalk/classes/exceptions/BaseException.gs
input smalltalk/classes/built-in_types/bytearray.gs
input smalltalk/classes/built-in_types/complex.gs
input smalltalk/classes/built-in_types/iterator.gs
input smalltalk/classes/importing/module.gs
input smalltalk/classes/text/string_formatter.gs
input smalltalk/classes/exceptions/BaseExceptionGroup.gs
input smalltalk/classes/exceptions/Exception.gs
input smalltalk/classes/exceptions/GeneratorExit.gs
input smalltalk/classes/exceptions/KeyboardInterrupt.gs
input smalltalk/classes/exceptions/SystemExit.gs
input smalltalk/classes/built-in_types/dict_itemiterator.gs
input smalltalk/classes/built-in_types/dict_keyiterator.gs
input smalltalk/classes/built-in_types/dict_valueiterator.gs
input smalltalk/classes/built-in_types/list_iterator.gs
input smalltalk/classes/built-in_types/range_iterator.gs
input smalltalk/classes/built-in_types/set_iterator.gs
input smalltalk/classes/built-in_types/str_iterator.gs
input smalltalk/classes/built-in_types/tuple_iterator.gs
input smalltalk/classes/runtime_services/builtins.gs
input smalltalk/classes/numerics/cmath.gs
input smalltalk/classes/numerics/fractions.gs
input smalltalk/classes/gemstone/gemstone.gs
input smalltalk/cpython/PyObject.gs
input smalltalk/cpython/CPythonShim.gs
input smalltalk/cpython/ShimStatisticsModule.gs
input smalltalk/cpython/ShimBisectModule.gs
input smalltalk/cpython/ShimCrc32cModule.gs
input smalltalk/cpython/ShimTestModule.gs
input smalltalk/classes/importing/importlib.gs
input smalltalk/classes/numerics/math.gs
input smalltalk/classes/numerics/numbers.gs
input smalltalk/classes/os_services/os.gs
input smalltalk/classes/os_services/os_path.gs
input smalltalk/classes/numerics/random.gs
input smalltalk/classes/numerics/statistics.gs
input smalltalk/classes/text/string.gs
input smalltalk/classes/runtime_services/sys.gs
input smalltalk/classes/exceptions/ExceptionGroup.gs
input smalltalk/classes/exceptions/ArithmeticError.gs
input smalltalk/classes/exceptions/AssertionError.gs
input smalltalk/classes/exceptions/AttributeError.gs
input smalltalk/classes/exceptions/BufferError.gs
input smalltalk/classes/exceptions/EOFError.gs
input smalltalk/classes/exceptions/ImportError.gs
input smalltalk/classes/exceptions/LookupError.gs
input smalltalk/classes/exceptions/MemoryError.gs
input smalltalk/classes/exceptions/NameError.gs
input smalltalk/classes/exceptions/OSError.gs
input smalltalk/classes/exceptions/ReferenceError.gs
input smalltalk/classes/exceptions/RuntimeError.gs
input smalltalk/classes/exceptions/StopAsyncIteration.gs
input smalltalk/classes/exceptions/StopIteration.gs
input smalltalk/classes/exceptions/SyntaxError.gs
input smalltalk/classes/exceptions/SystemError.gs
input smalltalk/classes/exceptions/TypeError.gs
input smalltalk/classes/exceptions/ValueError.gs
input smalltalk/classes/exceptions/Warning.gs
input smalltalk/classes/exceptions/FloatingPointError.gs
input smalltalk/classes/exceptions/OverflowError.gs
input smalltalk/classes/exceptions/ZeroDivisionError.gs
input smalltalk/classes/exceptions/ModuleNotFoundError.gs
input smalltalk/classes/exceptions/IndexError.gs
input smalltalk/classes/exceptions/KeyError.gs
input smalltalk/classes/exceptions/UnboundLocalError.gs
input smalltalk/classes/exceptions/BlockingIOError.gs
input smalltalk/classes/exceptions/ChildProcessError.gs
input smalltalk/classes/exceptions/ConnectionError.gs
input smalltalk/classes/exceptions/FileExistsError.gs
input smalltalk/classes/exceptions/FileNotFoundError.gs
input smalltalk/classes/exceptions/InterruptedError.gs
input smalltalk/classes/exceptions/IsADirectoryError.gs
input smalltalk/classes/exceptions/NotADirectoryError.gs
input smalltalk/classes/exceptions/PermissionError.gs
input smalltalk/classes/exceptions/ProcessLookupError.gs
input smalltalk/classes/exceptions/TimeoutError.gs
input smalltalk/classes/exceptions/NotImplementedError.gs
input smalltalk/classes/exceptions/RecursionError.gs
input smalltalk/classes/exceptions/IndentationError.gs
input smalltalk/classes/exceptions/StatisticsError.gs
input smalltalk/classes/exceptions/UnicodeError.gs
input smalltalk/classes/exceptions/BytesWarning.gs
input smalltalk/classes/exceptions/DeprecationWarning.gs
input smalltalk/classes/exceptions/EncodingWarning.gs
input smalltalk/classes/exceptions/FutureWarning.gs
input smalltalk/classes/exceptions/ImportWarning.gs
input smalltalk/classes/exceptions/PendingDeprecationWarning.gs
input smalltalk/classes/exceptions/ResourceWarning.gs
input smalltalk/classes/exceptions/RuntimeWarning.gs
input smalltalk/classes/exceptions/SyntaxWarning.gs
input smalltalk/classes/exceptions/UnicodeWarning.gs
input smalltalk/classes/exceptions/UserWarning.gs
input smalltalk/classes/exceptions/BrokenPipeError.gs
input smalltalk/classes/exceptions/ConnectionAbortedError.gs
input smalltalk/classes/exceptions/ConnectionRefusedError.gs
input smalltalk/classes/exceptions/ConnectionResetError.gs
input smalltalk/classes/exceptions/TabError.gs
input smalltalk/classes/exceptions/UnicodeDecodeError.gs
input smalltalk/classes/exceptions/UnicodeEncodeError.gs
input smalltalk/classes/exceptions/UnicodeTranslateError.gs

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
input smalltalk/classes/built-in_types/bool.gs
input smalltalk/classes/built-in_types/builtin_function_or_method.gs
input smalltalk/classes/built-in_types/bytes.gs
input smalltalk/classes/numerics/Decimal.gs
input smalltalk/classes/numerics/Fraction.gs
input smalltalk/classes/built-in_types/dict.gs
input smalltalk/classes/built-in_types/ExecBlock.gs
input smalltalk/classes/built-in_types/float.gs
input smalltalk/classes/built-in_types/frozenset.gs
input smalltalk/classes/built-in_types/int.gs
input smalltalk/classes/built-in_types/list.gs
input smalltalk/classes/built-in_types/object.gs
input smalltalk/classes/built-in_types/range.gs
input smalltalk/classes/built-in_types/SequenceableCollection.gs
input smalltalk/classes/built-in_types/set.gs
input smalltalk/classes/built-in_types/str.gs
input smalltalk/classes/built-in_types/tuple.gs

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
numbers perform: #'instance' env: 2.
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

input smalltalk/ast/AbstractNode.gs
input smalltalk/ast/PrettyWriteStream.gs
input smalltalk/ast/PythonParser.gs
input smalltalk/ast/PythonToken.gs
input smalltalk/ast/PythonTokenizer.gs
input smalltalk/ast/AbstractLocationNode.gs
input smalltalk/ast/ArgumentsAst.gs
input smalltalk/ast/CmpOpAst.gs
input smalltalk/ast/ComprehensionAst.gs
input smalltalk/ast/ExpressionContextAst.gs
input smalltalk/ast/ModuleAst.gs
input smalltalk/ast/OperatorAst.gs
input smalltalk/ast/SuiteAst.gs
input smalltalk/ast/TypeIgnoreAst.gs
input smalltalk/ast/TypeParamAst.gs
input smalltalk/ast/WithItemAst.gs
input smalltalk/ast/AliasAst.gs
input smalltalk/ast/ArgAst.gs
input smalltalk/ast/ExceptHandlerAst.gs
input smalltalk/ast/ExpressionAst.gs
input smalltalk/ast/KeywordAst.gs
input smalltalk/ast/SliceAst.gs
input smalltalk/ast/StatementAst.gs
input smalltalk/ast/EqAst.gs
input smalltalk/ast/GtAst.gs
input smalltalk/ast/GtEAst.gs
input smalltalk/ast/InAst.gs
input smalltalk/ast/IsAst.gs
input smalltalk/ast/IsNotAst.gs
input smalltalk/ast/LtAst.gs
input smalltalk/ast/LtEAst.gs
input smalltalk/ast/NotEqAst.gs
input smalltalk/ast/NotInAst.gs
input smalltalk/ast/DelAst.gs
input smalltalk/ast/LoadAst.gs
input smalltalk/ast/ParamAst.gs
input smalltalk/ast/StoreAst.gs
input smalltalk/ast/Package.gs
input smalltalk/ast/AddAst.gs
input smalltalk/ast/BitAndAst.gs
input smalltalk/ast/BitOrAst.gs
input smalltalk/ast/BitXorAst.gs
input smalltalk/ast/DivAst.gs
input smalltalk/ast/FloorDivAst.gs
input smalltalk/ast/LShiftAst.gs
input smalltalk/ast/MatMultAst.gs
input smalltalk/ast/ModAst.gs
input smalltalk/ast/MultAst.gs
input smalltalk/ast/PowAst.gs
input smalltalk/ast/RShiftAst.gs
input smalltalk/ast/SubAst.gs
input smalltalk/ast/BlockAst.gs
input smalltalk/ast/AttributeAst.gs
input smalltalk/ast/AwaitAst.gs
input smalltalk/ast/BinOpAst.gs
input smalltalk/ast/BoolOpAst.gs
input smalltalk/ast/CallAst.gs
input smalltalk/ast/CompareAst.gs
input smalltalk/ast/ConstantAst.gs
input smalltalk/ast/DictAst.gs
input smalltalk/ast/DictCompAst.gs
input smalltalk/ast/FormattedValueAst.gs
input smalltalk/ast/GeneratorExpAst.gs
input smalltalk/ast/IfExpAst.gs
input smalltalk/ast/JoinedStrAst.gs
input smalltalk/ast/LambdaAst.gs
input smalltalk/ast/ListAst.gs
input smalltalk/ast/ListCompAst.gs
input smalltalk/ast/NameAst.gs
input smalltalk/ast/NamedExprAst.gs
input smalltalk/ast/SetAst.gs
input smalltalk/ast/SetCompAst.gs
input smalltalk/ast/StarredAst.gs
input smalltalk/ast/SubscriptAst.gs
input smalltalk/ast/TupleAst.gs
input smalltalk/ast/UnaryOpAst.gs
input smalltalk/ast/YieldAst.gs
input smalltalk/ast/YieldFromAst.gs
input smalltalk/ast/AnnAssignAst.gs
input smalltalk/ast/AssertAst.gs
input smalltalk/ast/AssignAst.gs
input smalltalk/ast/AsyncForAst.gs
input smalltalk/ast/AsyncFunctionDefAst.gs
input smalltalk/ast/AsyncWithAst.gs
input smalltalk/ast/AugAssignAst.gs
input smalltalk/ast/BreakAst.gs
input smalltalk/ast/ClassDefAst.gs
input smalltalk/ast/ContinueAst.gs
input smalltalk/ast/DeleteAst.gs
input smalltalk/ast/ExprAst.gs
input smalltalk/ast/ForAst.gs
input smalltalk/ast/FunctionDefAst.gs
input smalltalk/ast/GlobalAst.gs
input smalltalk/ast/IfAst.gs
input smalltalk/ast/ImportAst.gs
input smalltalk/ast/ImportFromAst.gs
input smalltalk/ast/NonlocalAst.gs
input smalltalk/ast/PassAst.gs
input smalltalk/ast/RaiseAst.gs
input smalltalk/ast/ReturnAst.gs
input smalltalk/ast/TryAst.gs
input smalltalk/ast/WhileAst.gs
input smalltalk/ast/WithAst.gs
input smalltalk/ast/AndAst.gs
input smalltalk/ast/OrAst.gs
input smalltalk/ast/KeywordsAst.gs
input smalltalk/ast/InvertAst.gs
input smalltalk/ast/NotAst.gs
input smalltalk/ast/UAddAst.gs
input smalltalk/ast/USubAst.gs
input smalltalk/ast/ClassFunctionDefAst.gs
input smalltalk/ast/InstanceFunctionDefAst.gs
input smalltalk/ast/StaticFunctionDefAst.gs

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

input smalltalk/tests/PythonTestCase.gs
input smalltalk/tests/BooleanTestCase.gs
input smalltalk/tests/BuiltinsTestCase.gs
input smalltalk/tests/BytearrayTestCase.gs
input smalltalk/tests/BytesTestCase.gs
input smalltalk/tests/CMathTestCase.gs
input smalltalk/tests/ComplexTestCase.gs
input smalltalk/tests/DecimalTestCase.gs
input smalltalk/tests/DictTestCase.gs
input smalltalk/tests/FloatTestCase.gs
input smalltalk/tests/FractionTestCase.gs
input smalltalk/tests/FrozensetTestCase.gs
input smalltalk/tests/GemStoneTestCase.gs
input smalltalk/tests/CPythonShimTestCase.gs
input smalltalk/tests/ImportlibTestCase.gs
input smalltalk/tests/IntegerTestCase.gs
input smalltalk/tests/IteratorTestCase.gs
input smalltalk/tests/ListTestCase.gs
input smalltalk/tests/MathTestCase.gs
input smalltalk/tests/ModuleTestCase.gs
input smalltalk/tests/NumbersTestCase.gs
input smalltalk/tests/ObjectTestCase.gs
input smalltalk/tests/OsTestCase.gs
input smalltalk/tests/PassTestCase.gs
input smalltalk/tests/PythonParserTestCase.gs
input smalltalk/tests/PythonTokenizerTestCase.gs
input smalltalk/tests/RaiseTestCase.gs
input smalltalk/tests/RandomTestCase.gs
input smalltalk/tests/RangeTestCase.gs
input smalltalk/tests/ReturnTestCase.gs
input smalltalk/tests/SetTestCase.gs
input smalltalk/tests/StatisticsTestCase.gs
input smalltalk/tests/StrTestCase.gs
input smalltalk/tests/StringModuleTestCase.gs
input smalltalk/tests/SysTestCase.gs
input smalltalk/tests/TryTestCase.gs
input smalltalk/tests/TupleTestCase.gs
input smalltalk/tests/BaseExceptionTestCase.gs

! ------------------- Exception Test Classes
input smalltalk/tests/exceptions/ArithmeticErrorTestCase.gs
input smalltalk/tests/exceptions/AssertionErrorTestCase.gs
input smalltalk/tests/exceptions/AttributeErrorTestCase.gs
input smalltalk/tests/exceptions/BaseExceptionGroupTestCase.gs
input smalltalk/tests/exceptions/BlockingIOErrorTestCase.gs
input smalltalk/tests/exceptions/BrokenPipeErrorTestCase.gs
input smalltalk/tests/exceptions/BufferErrorTestCase.gs
input smalltalk/tests/exceptions/BytesWarningTestCase.gs
input smalltalk/tests/exceptions/ChildProcessErrorTestCase.gs
input smalltalk/tests/exceptions/ConnectionAbortedErrorTestCase.gs
input smalltalk/tests/exceptions/ConnectionErrorTestCase.gs
input smalltalk/tests/exceptions/ConnectionRefusedErrorTestCase.gs
input smalltalk/tests/exceptions/ConnectionResetErrorTestCase.gs
input smalltalk/tests/exceptions/DeprecationWarningTestCase.gs
input smalltalk/tests/exceptions/EOFErrorTestCase.gs
input smalltalk/tests/exceptions/EncodingWarningTestCase.gs
input smalltalk/tests/exceptions/ExceptionGroupTestCase.gs
input smalltalk/tests/exceptions/ExceptionTestCase.gs
input smalltalk/tests/exceptions/FileExistsErrorTestCase.gs
input smalltalk/tests/exceptions/FileNotFoundErrorTestCase.gs
input smalltalk/tests/exceptions/FloatingPointErrorTestCase.gs
input smalltalk/tests/exceptions/FutureWarningTestCase.gs
input smalltalk/tests/exceptions/GeneratorExitTestCase.gs
input smalltalk/tests/exceptions/ImportErrorTestCase.gs
input smalltalk/tests/exceptions/ImportWarningTestCase.gs
input smalltalk/tests/exceptions/IndentationErrorTestCase.gs
input smalltalk/tests/exceptions/IndexErrorTestCase.gs
input smalltalk/tests/exceptions/InterruptedErrorTestCase.gs
input smalltalk/tests/exceptions/IsADirectoryErrorTestCase.gs
input smalltalk/tests/exceptions/KeyErrorTestCase.gs
input smalltalk/tests/exceptions/KeyboardInterruptTestCase.gs
input smalltalk/tests/exceptions/LookupErrorTestCase.gs
input smalltalk/tests/exceptions/MemoryErrorTestCase.gs
input smalltalk/tests/exceptions/ModuleNotFoundErrorTestCase.gs
input smalltalk/tests/exceptions/NameErrorTestCase.gs
input smalltalk/tests/exceptions/NotADirectoryErrorTestCase.gs
input smalltalk/tests/exceptions/NotImplementedErrorTestCase.gs
input smalltalk/tests/exceptions/OSErrorTestCase.gs
input smalltalk/tests/exceptions/OverflowErrorTestCase.gs
input smalltalk/tests/exceptions/PendingDeprecationWarningTestCase.gs
input smalltalk/tests/exceptions/PermissionErrorTestCase.gs
input smalltalk/tests/exceptions/ProcessLookupErrorTestCase.gs
input smalltalk/tests/exceptions/RecursionErrorTestCase.gs
input smalltalk/tests/exceptions/ReferenceErrorTestCase.gs
input smalltalk/tests/exceptions/ResourceWarningTestCase.gs
input smalltalk/tests/exceptions/RuntimeErrorTestCase.gs
input smalltalk/tests/exceptions/RuntimeWarningTestCase.gs
input smalltalk/tests/exceptions/StopAsyncIterationTestCase.gs
input smalltalk/tests/exceptions/StopIterationTestCase.gs
input smalltalk/tests/exceptions/SyntaxErrorTestCase.gs
input smalltalk/tests/exceptions/SyntaxWarningTestCase.gs
input smalltalk/tests/exceptions/SystemErrorTestCase.gs
input smalltalk/tests/exceptions/SystemExitTestCase.gs
input smalltalk/tests/exceptions/TabErrorTestCase.gs
input smalltalk/tests/exceptions/TimeoutErrorTestCase.gs
input smalltalk/tests/exceptions/TypeErrorTestCase.gs
input smalltalk/tests/exceptions/UnboundLocalErrorTestCase.gs
input smalltalk/tests/exceptions/UnicodeDecodeErrorTestCase.gs
input smalltalk/tests/exceptions/UnicodeEncodeErrorTestCase.gs
input smalltalk/tests/exceptions/UnicodeErrorTestCase.gs
input smalltalk/tests/exceptions/UnicodeTranslateErrorTestCase.gs
input smalltalk/tests/exceptions/UnicodeWarningTestCase.gs
input smalltalk/tests/exceptions/UserWarningTestCase.gs
input smalltalk/tests/exceptions/ValueErrorTestCase.gs
input smalltalk/tests/exceptions/WarningTestCase.gs
input smalltalk/tests/exceptions/ZeroDivisionErrorTestCase.gs

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
