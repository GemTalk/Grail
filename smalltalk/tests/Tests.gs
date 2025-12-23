! ===============================================================================
! Python Test Class Definitions
! ===============================================================================
! This file defines test classes for Python built-in types.
!
! NOTE: This file assumes the PythonTests SymbolDictionary already exists.
!       Use smalltalk/install.gs to create the dictionary structure.
! ===============================================================================

set compile_env: 0

! ------------------- Class definition for PythonTestCase
expectvalue /Class
doit
TestCase subclass: 'PythonTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PythonTestCase category: 'SUnit'
%

input smalltalk/tests/PythonTestCase.gs

! ------------------- Class definition for ObjectTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ObjectTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ObjectTestCase category: 'SUnit'
%

! ------------------- Class definition for ComplexTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ComplexTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ComplexTestCase category: 'SUnit'
%

! ------------------- Class definition for BooleanTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BooleanTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BooleanTestCase category: 'SUnit'
%

! ------------------- Class definition for BuiltinsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BuiltinsTestCase category: 'SUnit'
%

! ------------------- Class definition for BytesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BytesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BytesTestCase category: 'SUnit'
%

! ------------------- Class definition for BytearrayTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BytearrayTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BytearrayTestCase category: 'SUnit'
%

! ------------------- Class definition for CMathTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CMathTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
CMathTestCase category: 'SUnit'
%

! ------------------- Class definition for DictTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DictTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
DictTestCase category: 'SUnit'
%

! ------------------- Class definition for DecimalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DecimalTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
DecimalTestCase category: 'SUnit'
%

! ------------------- Class definition for IntegerTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IntegerTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
IntegerTestCase category: 'SUnit'
%

! ------------------- Class definition for IteratorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IteratorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
IteratorTestCase category: 'SUnit'
%

! ------------------- Class definition for FloatTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FloatTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FloatTestCase category: 'SUnit'
%

! ------------------- Class definition for FrozensetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FrozensetTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FrozensetTestCase category: 'SUnit'
%

! ------------------- Class definition for SetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SetTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SetTestCase category: 'SUnit'
%

! ------------------- Class definition for StrTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StrTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
StrTestCase category: 'SUnit'
%

! ------------------- Class definition for ListTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ListTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ListTestCase category: 'SUnit'
%

! ------------------- Class definition for MathTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MathTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
MathTestCase category: 'SUnit'
%

! ------------------- Class definition for TupleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TupleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
TupleTestCase category: 'SUnit'
%

! ------------------- Class definition for RangeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RangeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
RangeTestCase category: 'SUnit'
%

! ===============================================================================
! Exception Test Classes
! ===============================================================================
! Test classes for Python exception hierarchy (67 exception types)
! ===============================================================================

! ------------------- Define all exception test classes
run
| dict testClasses |
testClasses := #(
	'ArithmeticErrorTestCase'
	'AssertionErrorTestCase'
	'AttributeErrorTestCase'
	'BaseExceptionGroupTestCase'
	'BaseExceptionTestCase'
	'BlockingIOErrorTestCase'
	'BrokenPipeErrorTestCase'
	'BufferErrorTestCase'
	'BytesWarningTestCase'
	'ChildProcessErrorTestCase'
	'ConnectionAbortedErrorTestCase'
	'ConnectionErrorTestCase'
	'ConnectionRefusedErrorTestCase'
	'ConnectionResetErrorTestCase'
	'DeprecationWarningTestCase'
	'EncodingWarningTestCase'
	'EOFErrorTestCase'
	'ExceptionGroupTestCase'
	'ExceptionTestCase'
	'FileExistsErrorTestCase'
	'FileNotFoundErrorTestCase'
	'FloatingPointErrorTestCase'
	'FutureWarningTestCase'
	'GeneratorExitTestCase'
	'ImportErrorTestCase'
	'ImportWarningTestCase'
	'IndentationErrorTestCase'
	'IndexErrorTestCase'
	'InterruptedErrorTestCase'
	'IsADirectoryErrorTestCase'
	'KeyboardInterruptTestCase'
	'KeyErrorTestCase'
	'LookupErrorTestCase'
	'MemoryErrorTestCase'
	'ModuleNotFoundErrorTestCase'
	'NameErrorTestCase'
	'NotADirectoryErrorTestCase'
	'NotImplementedErrorTestCase'
	'OSErrorTestCase'
	'OverflowErrorTestCase'
	'PendingDeprecationWarningTestCase'
	'PermissionErrorTestCase'
	'ProcessLookupErrorTestCase'
	'RecursionErrorTestCase'
	'ReferenceErrorTestCase'
	'ResourceWarningTestCase'
	'RuntimeErrorTestCase'
	'RuntimeWarningTestCase'
	'StopAsyncIterationTestCase'
	'StopIterationTestCase'
	'SyntaxErrorTestCase'
	'SyntaxWarningTestCase'
	'SystemErrorTestCase'
	'SystemExitTestCase'
	'TabErrorTestCase'
	'TimeoutErrorTestCase'
	'TypeErrorTestCase'
	'UnboundLocalErrorTestCase'
	'UnicodeDecodeErrorTestCase'
	'UnicodeEncodeErrorTestCase'
	'UnicodeErrorTestCase'
	'UnicodeTranslateErrorTestCase'
	'UnicodeWarningTestCase'
	'UserWarningTestCase'
	'ValueErrorTestCase'
	'WarningTestCase'
	'ZeroDivisionErrorTestCase'
).
dict := System myUserProfile symbolList objectNamed: #'PythonTests'.
testClasses do: [:className |
	PythonTestCase
		subclass: className
		instVarNames: #()
		classVars: #()
		classInstVars: #()
		poolDictionaries: #()
		inDictionary: dict
		options: #().
	(dict at: className asSymbol)
		category: 'SUnit'.
].
%

! ------------------- Load all built-in type test methods
input smalltalk/tests/BaseExceptionTestCase.gs
input smalltalk/tests/BooleanTestCase.gs
input smalltalk/tests/BuiltinsTestCase.gs
input smalltalk/tests/BytesTestCase.gs
input smalltalk/tests/BytearrayTestCase.gs
input smalltalk/tests/CMathTestCase.gs
input smalltalk/tests/ComplexTestCase.gs
input smalltalk/tests/DecimalTestCase.gs
input smalltalk/tests/DictTestCase.gs
input smalltalk/tests/FloatTestCase.gs
input smalltalk/tests/FrozensetTestCase.gs
input smalltalk/tests/IntegerTestCase.gs
input smalltalk/tests/IteratorTestCase.gs
input smalltalk/tests/ListTestCase.gs
input smalltalk/tests/MathTestCase.gs
input smalltalk/tests/ObjectTestCase.gs
input smalltalk/tests/RangeTestCase.gs
input smalltalk/tests/SetTestCase.gs
input smalltalk/tests/StrTestCase.gs
input smalltalk/tests/TupleTestCase.gs

! ------------------- Load all exception test methods
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
input smalltalk/tests/exceptions/EncodingWarningTestCase.gs
input smalltalk/tests/exceptions/EOFErrorTestCase.gs
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
input smalltalk/tests/exceptions/KeyboardInterruptTestCase.gs
input smalltalk/tests/exceptions/KeyErrorTestCase.gs
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

