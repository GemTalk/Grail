! ------- Create dictionary if it is not present
run
| aSymbol names userProfile |
aSymbol := #'Python'.
userProfile := System myUserProfile.
names := userProfile symbolList names.
(names includes: aSymbol) ifFalse: [
	| symbolDictionary |
	symbolDictionary := SymbolDictionary new name: aSymbol; yourself.
	userProfile insertDictionary: symbolDictionary at: names size + 1.
].
%
set compile_env: 0
! ------------------- Class definition for BaseException
expectvalue /Class
doit
Exception subclass: 'BaseException'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BaseException category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for Exception
expectvalue /Class
doit
BaseException subclass: 'Exception'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Exception category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ArithmeticError
expectvalue /Class
doit
Exception subclass: 'ArithmeticError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ArithmeticError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for FloatingPointError
expectvalue /Class
doit
ArithmeticError subclass: 'FloatingPointError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FloatingPointError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for OverflowError
expectvalue /Class
doit
ArithmeticError subclass: 'OverflowError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OverflowError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ZeroDivisionError
expectvalue /Class
doit
ArithmeticError subclass: 'ZeroDivisionError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ZeroDivisionError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for AssertionError
expectvalue /Class
doit
Exception subclass: 'AssertionError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AssertionError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for AttributeError
expectvalue /Class
doit
Exception subclass: 'AttributeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AttributeError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for BufferError
expectvalue /Class
doit
Exception subclass: 'BufferError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BufferError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for EOFError
expectvalue /Class
doit
Exception subclass: 'EOFError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
EOFError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ImportError
expectvalue /Class
doit
Exception subclass: 'ImportError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ModuleNotFoundError
expectvalue /Class
doit
ImportError subclass: 'ModuleNotFoundError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ModuleNotFoundError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for LookupError
expectvalue /Class
doit
Exception subclass: 'LookupError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LookupError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for IndexError
expectvalue /Class
doit
LookupError subclass: 'IndexError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IndexError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for KeyError
expectvalue /Class
doit
LookupError subclass: 'KeyError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
KeyError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for MemoryError
expectvalue /Class
doit
Exception subclass: 'MemoryError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
MemoryError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for NameError
expectvalue /Class
doit
Exception subclass: 'NameError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NameError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for UnboundLocalError
expectvalue /Class
doit
NameError subclass: 'UnboundLocalError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnboundLocalError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for OSError
expectvalue /Class
doit
Exception subclass: 'OSError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OSError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for BlockingIOError
expectvalue /Class
doit
OSError subclass: 'BlockingIOError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BlockingIOError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ChildProcessError
expectvalue /Class
doit
OSError subclass: 'ChildProcessError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ChildProcessError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ConnectionError
expectvalue /Class
doit
OSError subclass: 'ConnectionError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ConnectionError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for BrokenPipeError
expectvalue /Class
doit
ConnectionError subclass: 'BrokenPipeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BrokenPipeError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ConnectionAbortedError
expectvalue /Class
doit
ConnectionError subclass: 'ConnectionAbortedError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ConnectionAbortedError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ConnectionRefusedError
expectvalue /Class
doit
ConnectionError subclass: 'ConnectionRefusedError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ConnectionRefusedError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ConnectionResetError
expectvalue /Class
doit
ConnectionError subclass: 'ConnectionResetError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ConnectionResetError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for FileExistsError
expectvalue /Class
doit
OSError subclass: 'FileExistsError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FileExistsError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for FileNotFoundError
expectvalue /Class
doit
OSError subclass: 'FileNotFoundError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FileNotFoundError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for InterruptedError
expectvalue /Class
doit
OSError subclass: 'InterruptedError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
InterruptedError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for IsADirectoryError
expectvalue /Class
doit
OSError subclass: 'IsADirectoryError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IsADirectoryError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for NotADirectoryError
expectvalue /Class
doit
OSError subclass: 'NotADirectoryError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotADirectoryError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for PermissionError
expectvalue /Class
doit
OSError subclass: 'PermissionError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PermissionError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ProcessLookupError
expectvalue /Class
doit
OSError subclass: 'ProcessLookupError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ProcessLookupError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for TimeoutError
expectvalue /Class
doit
OSError subclass: 'TimeoutError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TimeoutError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ReferenceError
expectvalue /Class
doit
Exception subclass: 'ReferenceError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ReferenceError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for RuntimeError
expectvalue /Class
doit
Exception subclass: 'RuntimeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
RuntimeError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for NotImplementedError
expectvalue /Class
doit
RuntimeError subclass: 'NotImplementedError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotImplementedError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for RecursionError
expectvalue /Class
doit
RuntimeError subclass: 'RecursionError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
RecursionError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for StopAsyncIteration
expectvalue /Class
doit
Exception subclass: 'StopAsyncIteration'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StopAsyncIteration category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for StopIteration
expectvalue /Class
doit
Exception subclass: 'StopIteration'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StopIteration category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for SyntaxError
expectvalue /Class
doit
Exception subclass: 'SyntaxError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SyntaxError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for IndentationError
expectvalue /Class
doit
SyntaxError subclass: 'IndentationError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IndentationError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for TabError
expectvalue /Class
doit
IndentationError subclass: 'TabError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TabError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for SystemError
expectvalue /Class
doit
Exception subclass: 'SystemError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SystemError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for TypeError
expectvalue /Class
doit
Exception subclass: 'TypeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TypeError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ValueError
expectvalue /Class
doit
Exception subclass: 'ValueError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ValueError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for UnicodeError
expectvalue /Class
doit
ValueError subclass: 'UnicodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnicodeError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for UnicodeDecodeError
expectvalue /Class
doit
UnicodeError subclass: 'UnicodeDecodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnicodeDecodeError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for UnicodeEncodeError
expectvalue /Class
doit
UnicodeError subclass: 'UnicodeEncodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnicodeEncodeError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for UnicodeTranslateError
expectvalue /Class
doit
UnicodeError subclass: 'UnicodeTranslateError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnicodeTranslateError category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for Warning
expectvalue /Class
doit
Exception subclass: 'Warning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Warning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for BytesWarning
expectvalue /Class
doit
Warning subclass: 'BytesWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BytesWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for DeprecationWarning
expectvalue /Class
doit
Warning subclass: 'DeprecationWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DeprecationWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for FutureWarning
expectvalue /Class
doit
Warning subclass: 'FutureWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FutureWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ImportWarning
expectvalue /Class
doit
Warning subclass: 'ImportWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for PendingDeprecationWarning
expectvalue /Class
doit
Warning subclass: 'PendingDeprecationWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PendingDeprecationWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for ResourceWarning
expectvalue /Class
doit
Warning subclass: 'ResourceWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ResourceWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for RuntimeWarning
expectvalue /Class
doit
Warning subclass: 'RuntimeWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
RuntimeWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for SyntaxWarning
expectvalue /Class
doit
Warning subclass: 'SyntaxWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SyntaxWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for UnicodeWarning
expectvalue /Class
doit
Warning subclass: 'UnicodeWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnicodeWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for UserWarning
expectvalue /Class
doit
Warning subclass: 'UserWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UserWarning category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for GeneratorExit
expectvalue /Class
doit
BaseException subclass: 'GeneratorExit'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GeneratorExit category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for KeyboardInterrupt
expectvalue /Class
doit
BaseException subclass: 'KeyboardInterrupt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
KeyboardInterrupt category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for SystemExit
expectvalue /Class
doit
BaseException subclass: 'SystemExit'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SystemExit category: 'BuiltIns-Exceptions'
%
set compile_env: 0
! ------------------- Class definition for AbstractNode
expectvalue /Class
doit
Object subclass: 'AbstractNode'
  instVarNames: #( parent)
  classVars: #( escapeCharacters)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AbstractNode comment: 
'No class-specific documentation for AbstractNode, hierarchy is:
Object
  AbstractNode
'
%
expectvalue /Class
doit
AbstractNode category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AbstractLocationNode
expectvalue /Class
doit
AbstractNode subclass: 'AbstractLocationNode'
  instVarNames: #( beginLine beginColumn endLine
                    endColumn)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AbstractLocationNode comment: 
'No class-specific documentation for PyAstNodeWithLocation, hierarchy is:
Object
  AbstractNode(parent line column)
    PyAstNodeWithLocation
'
%
expectvalue /Class
doit
AbstractLocationNode category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ArgAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ArgAst'
  instVarNames: #( arg annotation type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ArgAst comment: 
'No class-specific documentation for ArgAst, hierarchy is:
Object
  AbstractNode(parent line column)
    ArgAst(arg annotation)
'
%
expectvalue /Class
doit
ArgAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExceptHandlerAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ExceptHandlerAst'
  instVarNames: #( type name body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExceptHandlerAst comment: 
'No class-specific documentation for ExceptHandlerAst, hierarchy is:
Object
  AbstractNode(parent)
    ExcepthandlerAst
      ExceptHandlerAst(type name body)
'
%
expectvalue /Class
doit
ExceptHandlerAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExpressionAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ExpressionAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExpressionAst comment: 
'No class-specific documentation for ExpressionAst, hierarchy is:
Object
  AbstractNode(line column)
    ExpressionAst
'
%
expectvalue /Class
doit
ExpressionAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AttributeAst
expectvalue /Class
doit
ExpressionAst subclass: 'AttributeAst'
  instVarNames: #( value attr ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AttributeAst comment: 
'No class-specific documentation for PyAttribute, hierarchy is:
Object
  AbstractNode(parent line column)
    ExpressionAst
      PyAttribute(value attribute context)
'
%
expectvalue /Class
doit
AttributeAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AwaitAst
expectvalue /Class
doit
ExpressionAst subclass: 'AwaitAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AwaitAst comment: 
'No class-specific documentation for PyAwait, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyAwait(value)
'
%
expectvalue /Class
doit
AwaitAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BinOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BinOpAst'
  instVarNames: #( left op right)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BinOpAst comment: 
'No class-specific documentation for PyBinOp, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyBinOp(left op right)
'
%
expectvalue /Class
doit
BinOpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BoolOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BoolOpAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BoolOpAst comment: 
'No class-specific documentation for BoolOpAst, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        BoolOpAst(op values)
'
%
expectvalue /Class
doit
BoolOpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AndAst
expectvalue /Class
doit
BoolOpAst subclass: 'AndAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AndAst comment: 
'No class-specific documentation for PyAnd, hierarchy is:
Object
  AbstractNode(parent)
    PyBoolop
      PyAnd
'
%
expectvalue /Class
doit
AndAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for OrAst
expectvalue /Class
doit
BoolOpAst subclass: 'OrAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OrAst comment: 
'No class-specific documentation for PyOr, hierarchy is:
Object
  AbstractNode(parent)
    PyBoolop
      PyOr
'
%
expectvalue /Class
doit
OrAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for CallAst
expectvalue /Class
doit
ExpressionAst subclass: 'CallAst'
  instVarNames: #( function arguments keywords)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
CallAst comment: 
'No class-specific documentation for CallAst, hierarchy is:
Object
  AbstractNode(parent line column)
    ExpressionAst
      CallAst(function arguments keywords)
'
%
expectvalue /Class
doit
CallAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for CompareAst
expectvalue /Class
doit
ExpressionAst subclass: 'CompareAst'
  instVarNames: #( left cmpopList comparatorList)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
CompareAst comment: 
'No class-specific documentation for PyCompare, hierarchy is:
Object
  AbstractNode(parent line column)
    ExpressionAst
      PyCompare(left cmpopList comparatorList)
'
%
expectvalue /Class
doit
CompareAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ConstantAst
expectvalue /Class
doit
ExpressionAst subclass: 'ConstantAst'
  instVarNames: #( value kind messagePrecedence)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ConstantAst comment: 
'Constant(constant value, string? kind)

A constant value. The value attribute of the Constant literal contains the Python object it represents.
The values represented can be simple types such as a number, string or None, but also immutable
container types (tuples and frozensets) if all of their elements are constant."'
%
expectvalue /Class
doit
ConstantAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DictAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictAst'
  instVarNames: #( keys values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DictAst comment: 
'No class-specific documentation for PyDict, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyDict(keys values)
'
%
expectvalue /Class
doit
DictAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DictCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictCompAst'
  instVarNames: #( key value generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DictCompAst comment: 
'No class-specific documentation for PyDictComp, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyDictComp(key value generators)
'
%
expectvalue /Class
doit
DictCompAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for FormattedValueAst
expectvalue /Class
doit
ExpressionAst subclass: 'FormattedValueAst'
  instVarNames: #( value conversion format_spec)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FormattedValueAst comment: 
'No class-specific documentation for PyFormattedValue, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyFormattedValue(value conversion format_spec)
'
%
expectvalue /Class
doit
FormattedValueAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GeneratorExpAst
expectvalue /Class
doit
ExpressionAst subclass: 'GeneratorExpAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GeneratorExpAst comment: 
'No class-specific documentation for PyGeneratorExp, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyGeneratorExp(elt generators)
'
%
expectvalue /Class
doit
GeneratorExpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IfExpAst
expectvalue /Class
doit
ExpressionAst subclass: 'IfExpAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IfExpAst comment: 
'No class-specific documentation for PyIfExp, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyIfExp(args body)
'
%
expectvalue /Class
doit
IfExpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for JoinedStrAst
expectvalue /Class
doit
ExpressionAst subclass: 'JoinedStrAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
JoinedStrAst comment: 
'No class-specific documentation for PyJoinedStr, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyJoinedStr(values)
'
%
expectvalue /Class
doit
JoinedStrAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LambdaAst
expectvalue /Class
doit
ExpressionAst subclass: 'LambdaAst'
  instVarNames: #( args body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LambdaAst comment: 
'No class-specific documentation for PyLambda, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyLambda(op values)
'
%
expectvalue /Class
doit
LambdaAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ListAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ListAst comment: 
'No class-specific documentation for PyList, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyList(elts ctx)
'
%
expectvalue /Class
doit
ListAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ListCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ListCompAst comment: 
'No class-specific documentation for PyListComp, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyListComp(elt generators)
'
%
expectvalue /Class
doit
ListCompAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NameAst
expectvalue /Class
doit
ExpressionAst subclass: 'NameAst'
  instVarNames: #( id ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NameAst comment: 
'Names refer to objects. Names are introduced by name binding operations.

The following constructs bind names: formal parameters to functions, import statements, class and function definitions (these bind the class or function name in the defining block), and targets that are identifiers if occurring in an assignment, for loop header, or after as in a with statement or except clause. The import statement of the form from ... import * binds all names defined in the imported module, except those beginning with an underscore. This form may only be used at the module level.

A target occurring in a del statement is also considered bound for this purpose (though the actual semantics are to unbind the name).

Each assignment or import statement occurs within a block defined by a class or function definition or at the module level (the top-level code block).

If a name is bound in a block, it is a local variable of that block, unless declared as nonlocal or global. If a name is bound at the module level, it is a global variable. (The variables of the module code block are local and global.) If a variable is used in a code block but not defined there, it is a free variable.

Each occurrence of a name in the program text refers to the binding of that name established by certain name resolution rules.




https://docs.python.org/3/reference/executionmodel.html#naming-and-binding'
%
expectvalue /Class
doit
NameAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for KeywordsAst
expectvalue /Class
doit
NameAst subclass: 'KeywordsAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
KeywordsAst comment: 
'No class-specific documentation for KeywordsAst, hierarchy is:
Object
  AbstractNode(parent)
    AbstractLocationNode(line column)
      ExpressionAst
        NameAst(assoc id ctx)
          KeywordsAst
'
%
expectvalue /Class
doit
KeywordsAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NamedExprAst
expectvalue /Class
doit
ExpressionAst subclass: 'NamedExprAst'
  instVarNames: #( target value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NamedExprAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SetAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetAst'
  instVarNames: #( elts)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SetAst comment: 
'No class-specific documentation for PySet, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PySet(elts)
'
%
expectvalue /Class
doit
SetAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SetCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SetCompAst comment: 
'No class-specific documentation for PySetComp, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PySetComp(elt generators)
'
%
expectvalue /Class
doit
SetCompAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StarredAst
expectvalue /Class
doit
ExpressionAst subclass: 'StarredAst'
  instVarNames: #( value ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StarredAst comment: 
'No class-specific documentation for PyStarred, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyStarred(value ctx)
'
%
expectvalue /Class
doit
StarredAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SubscriptAst
expectvalue /Class
doit
ExpressionAst subclass: 'SubscriptAst'
  instVarNames: #( value slice ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SubscriptAst comment: 
'Subscript(expr value, slice slice, expr_context ctx)'
%
expectvalue /Class
doit
SubscriptAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for TupleAst
expectvalue /Class
doit
ExpressionAst subclass: 'TupleAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TupleAst comment: 
'No class-specific documentation for PyTuple, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyTuple(elts ctx)
'
%
expectvalue /Class
doit
TupleAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for UnaryOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'UnaryOpAst'
  instVarNames: #( operand)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnaryOpAst comment: 
'No class-specific documentation for UnaryOpAst, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        UnaryOpAst(op operand)
'
%
expectvalue /Class
doit
UnaryOpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for InvertAst
expectvalue /Class
doit
UnaryOpAst subclass: 'InvertAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
InvertAst comment: 
'No class-specific documentation for PyInvert, hierarchy is:
Object
  AbstractNode(parent)
    PyUnaryop
      PyInvert
'
%
expectvalue /Class
doit
InvertAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NotAst
expectvalue /Class
doit
UnaryOpAst subclass: 'NotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotAst comment: 
'No class-specific documentation for PyNot, hierarchy is:
Object
  AbstractNode(parent)
    PyUnaryop
      PyNot
'
%
expectvalue /Class
doit
NotAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for UAddAst
expectvalue /Class
doit
UnaryOpAst subclass: 'UAddAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UAddAst comment: 
'No class-specific documentation for PyUAdd, hierarchy is:
Object
  AbstractNode(parent)
    PyUnaryop
      PyUAdd
'
%
expectvalue /Class
doit
UAddAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for USubAst
expectvalue /Class
doit
UnaryOpAst subclass: 'USubAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
USubAst comment: 
'No class-specific documentation for PyUSub, hierarchy is:
Object
  AbstractNode(parent)
    PyUnaryop
      PyUSub
'
%
expectvalue /Class
doit
USubAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for YieldAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
YieldAst comment: 
'No class-specific documentation for PyYield, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyYield(value)
'
%
expectvalue /Class
doit
YieldAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for YieldFromAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldFromAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
YieldFromAst comment: 
'No class-specific documentation for PyYieldFrom, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      ExpressionAst
        PyYieldFrom(value)
'
%
expectvalue /Class
doit
YieldFromAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for KeywordAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'KeywordAst'
  instVarNames: #( arg value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
KeywordAst comment: 
'No class-specific documentation for KeywordAst, hierarchy is:
Object
  AbstractNode(parent)
    KeywordAst(arg value)
'
%
expectvalue /Class
doit
KeywordAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SliceAbstractAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'SliceAbstractAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SliceAbstractAst comment: 
'No class-specific documentation for SliceAbstractAst, hierarchy is:
Object
  AbstractNode(parent)
    SliceAbstractAst
'
%
expectvalue /Class
doit
SliceAbstractAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExtSliceAst
expectvalue /Class
doit
SliceAbstractAst subclass: 'ExtSliceAst'
  instVarNames: #( dims)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExtSliceAst comment: 
'No class-specific documentation for PyExtSlice, hierarchy is:
Object
  AbstractNode(parent)
    SliceAbstractAst
      PyExtSlice(dims)
'
%
expectvalue /Class
doit
ExtSliceAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IndexAst
expectvalue /Class
doit
SliceAbstractAst subclass: 'IndexAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IndexAst comment: 
'No class-specific documentation for PyIndex, hierarchy is:
Object
  AbstractNode(parent)
    SliceAbstractAst
      PyIndex(value)
'
%
expectvalue /Class
doit
IndexAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SliceAst
expectvalue /Class
doit
SliceAbstractAst subclass: 'SliceAst'
  instVarNames: #( lower upper step)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SliceAst comment: 
'No class-specific documentation for PySlice, hierarchy is:
Object
  AbstractNode(parent)
    SliceAbstractAst
      PySlice(lower upper step)
'
%
expectvalue /Class
doit
SliceAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StatementAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'StatementAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StatementAst comment: 
'No class-specific documentation for StatementAst, hierarchy is:
Object
  AbstractNode(line column)
    StatementAst
'
%
expectvalue /Class
doit
StatementAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AnnAssignAst
expectvalue /Class
doit
StatementAst subclass: 'AnnAssignAst'
  instVarNames: #( target annotation value
                    simple)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AnnAssignAst comment: 
'No class-specific documentation for PyAnnAssign, hierarchy is:
Object
  AbstractNode(parent line column)
    StatementAst
      PyAnnAssign(target annotation value simple)
'
%
expectvalue /Class
doit
AnnAssignAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AssertAst
expectvalue /Class
doit
StatementAst subclass: 'AssertAst'
  instVarNames: #( test msg)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AssertAst comment: 
'No class-specific documentation for PyAssert, hierarchy is:
Object
  AbstractNode(parent line column)
    StatementAst
      PyAssert(test msg)
'
%
expectvalue /Class
doit
AssertAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AssignAst
expectvalue /Class
doit
StatementAst subclass: 'AssignAst'
  instVarNames: #( targets value type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AssignAst comment: 
'Assign(expr* targets, expr value, string? type_comment)'
%
expectvalue /Class
doit
AssignAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AsyncForAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncForAst'
  instVarNames: #( target iter body
                    orelse type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AsyncForAst comment: 
'AsyncFor(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)'
%
expectvalue /Class
doit
AsyncForAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AsyncFunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncFunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AsyncFunctionDefAst comment: 
'AsyncFunctionDef(identifier name, arguments args,
                             stmt* body, expr* decorator_list, expr? returns,
                             string? type_comment)'
%
expectvalue /Class
doit
AsyncFunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AsyncWithAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncWithAst'
  instVarNames: #( items body type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AsyncWithAst comment: 
'No class-specific documentation for AsyncWithAst, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        AsyncWithAst(items body)
'
%
expectvalue /Class
doit
AsyncWithAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AugAssignAst
expectvalue /Class
doit
StatementAst subclass: 'AugAssignAst'
  instVarNames: #( target op value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AugAssignAst comment: 
'No class-specific documentation for PyAugAssign, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        PyAugAssign(target op value)
'
%
expectvalue /Class
doit
AugAssignAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BreakAst
expectvalue /Class
doit
StatementAst subclass: 'BreakAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BreakAst comment: 
'No class-specific documentation for PyBreak, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        PyBreak
'
%
expectvalue /Class
doit
BreakAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ClassDefAst
expectvalue /Class
doit
StatementAst subclass: 'ClassDefAst'
  instVarNames: #( name bases keywords
                    body decorator_list)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ClassDefAst comment: 
'No class-specific documentation for ClassDefAst, hierarchy is:
Object
  AbstractNode(parent line column)
    StatementAst
      ClassDefAst(name bases keywords body decorator_list)
'
%
expectvalue /Class
doit
ClassDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ContinueAst
expectvalue /Class
doit
StatementAst subclass: 'ContinueAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ContinueAst comment: 
'No class-specific documentation for PyContinue, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        PyContinue
'
%
expectvalue /Class
doit
ContinueAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DeleteAst
expectvalue /Class
doit
StatementAst subclass: 'DeleteAst'
  instVarNames: #( targets)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DeleteAst comment: 
'No class-specific documentation for PyDelete, hierarchy is:
Object
  AbstractNode(parent line column)
    ExpressionContextAst
      PyDelete
'
%
expectvalue /Class
doit
DeleteAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExprAst
expectvalue /Class
doit
StatementAst subclass: 'ExprAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExprAst comment: 
'No class-specific documentation for ExprAst, hierarchy is:
Object
  AbstractNode(parent line column)
    StatementAst
      ExprAst(expression)
'
%
expectvalue /Class
doit
ExprAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ForAst
expectvalue /Class
doit
StatementAst subclass: 'ForAst'
  instVarNames: #( target iter body
                    orelse type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ForAst comment: 
'For(expr target, expr iter, stmt* body, stmt* orelse) 									// 3.7
For(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)	// 3.8'
%
expectvalue /Class
doit
ForAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for FunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'FunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FunctionDefAst comment: 
'FunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns,
                       string? type_comment)'
%
expectvalue /Class
doit
FunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ClassFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'ClassFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ClassFunctionDefAst comment: 
'No class-specific documentation for ClassFunctionDefAst, hierarchy is:
Object
  AbstractNode(parent)
    AbstractLocationNode(line column)
      StatementAst
        FunctionDefAst(assoc name args body decorator_list returns)
          ClassFunctionDefAst
'
%
expectvalue /Class
doit
ClassFunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for InstanceFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'InstanceFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
InstanceFunctionDefAst comment: 
'No class-specific documentation for InstanceFunctionDefAst, hierarchy is:
Object
  AbstractNode(parent)
    AbstractLocationNode(line column)
      StatementAst
        FunctionDefAst(assoc name args body decorator_list returns)
          InstanceFunctionDefAst
'
%
expectvalue /Class
doit
InstanceFunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StaticFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'StaticFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StaticFunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GlobalAst
expectvalue /Class
doit
StatementAst subclass: 'GlobalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GlobalAst comment: 
'No class-specific documentation for PyGlobal, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        PyGlobal(names)
'
%
expectvalue /Class
doit
GlobalAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IfAst
expectvalue /Class
doit
StatementAst subclass: 'IfAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IfAst comment: 
'No class-specific documentation for IfAst, hierarchy is:
Object
  AbstractNode(line column)
    IfAst(test trueCase falseCase)
'
%
expectvalue /Class
doit
IfAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ImportAst
expectvalue /Class
doit
StatementAst subclass: 'ImportAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportAst comment: 
'No class-specific documentation for PyImport, hierarchy is:
Object
  AbstractNode
    PyImport(aliases)
'
%
expectvalue /Class
doit
ImportAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ImportFromAst
expectvalue /Class
doit
StatementAst subclass: 'ImportFromAst'
  instVarNames: #( module names level)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportFromAst comment: 
'No class-specific documentation for PyImportFrom, hierarchy is:
Object
  AbstractNode(parent line column)
    StatementAst
      PyImportFrom(identifier alias int)
'
%
expectvalue /Class
doit
ImportFromAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NonlocalAst
expectvalue /Class
doit
StatementAst subclass: 'NonlocalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NonlocalAst comment: 
'No class-specific documentation for PyNonlocal, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        PyNonlocal(names)
'
%
expectvalue /Class
doit
NonlocalAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PassAst
expectvalue /Class
doit
StatementAst subclass: 'PassAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PassAst comment: 
'No class-specific documentation for PassAst, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        PassAst
'
%
expectvalue /Class
doit
PassAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for RaiseAst
expectvalue /Class
doit
StatementAst subclass: 'RaiseAst'
  instVarNames: #( exc cause)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
RaiseAst comment: 
'No class-specific documentation for PyRaise, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        PyRaise(exc cause)
'
%
expectvalue /Class
doit
RaiseAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ReturnAst
expectvalue /Class
doit
StatementAst subclass: 'ReturnAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ReturnAst comment: 
'No class-specific documentation for ReturnAst, hierarchy is:
Object
  AbstractNode(parent line column)
    StatementAst
      ReturnAst(value)
'
%
expectvalue /Class
doit
ReturnAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for TryAst
expectvalue /Class
doit
StatementAst subclass: 'TryAst'
  instVarNames: #( body handlers orelse
                    finalbody)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TryAst comment: 
'No class-specific documentation for PyTry, hierarchy is:
Object
  AbstractNode(parent)
    PyAstNodeWithLocation(line column)
      StatementAst
        PyTry(body handlers orelse finalbody)
'
%
expectvalue /Class
doit
TryAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for WhileAst
expectvalue /Class
doit
StatementAst subclass: 'WhileAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
WhileAst comment: 
'No class-specific documentation for PyWhile, hierarchy is:
Object
  AbstractNode(parent line column)
    StatementAst
      PyWhile(test body orElse)
'
%
expectvalue /Class
doit
WhileAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for WithAst
expectvalue /Class
doit
StatementAst subclass: 'WithAst'
  instVarNames: #( items body type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
WithAst comment: 
'AsyncWith(withitem* items, stmt* body, string? type_comment)'
%
expectvalue /Class
doit
WithAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AliasAst
expectvalue /Class
doit
AbstractNode subclass: 'AliasAst'
  instVarNames: #( name asName)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AliasAst comment: 
'No class-specific documentation for AliasAst, hierarchy is:
Object
  AbstractNode
    AliasAst(name asName)
'
%
expectvalue /Class
doit
AliasAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ArgumentsAst
expectvalue /Class
doit
AbstractNode subclass: 'ArgumentsAst'
  instVarNames: #( posonlyargs args vararg
                    kwonlyargs kw_defaults kwarg defaults)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ArgumentsAst comment: 
'arguments = (arg* posonlyargs, arg* args, arg? vararg, arg* kwonlyargs,
                 expr* kw_defaults, arg? kwarg, expr* defaults)'
%
expectvalue /Class
doit
ArgumentsAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for CmpOpAst
expectvalue /Class
doit
AbstractNode subclass: 'CmpOpAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
CmpOpAst comment: 
'No class-specific documentation for CmpOpAst, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
'
%
expectvalue /Class
doit
CmpOpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for EqAst
expectvalue /Class
doit
CmpOpAst subclass: 'EqAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
EqAst comment: 
'No class-specific documentation for PyEq, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyEq
'
%
expectvalue /Class
doit
EqAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GtAst
expectvalue /Class
doit
CmpOpAst subclass: 'GtAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GtAst comment: 
'No class-specific documentation for PyGt, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyGt
'
%
expectvalue /Class
doit
GtAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GtEAst
expectvalue /Class
doit
CmpOpAst subclass: 'GtEAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GtEAst comment: 
'No class-specific documentation for PyGtE, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyGtE
'
%
expectvalue /Class
doit
GtEAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for InAst
expectvalue /Class
doit
CmpOpAst subclass: 'InAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
InAst comment: 
'No class-specific documentation for PyIn, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyIn
'
%
expectvalue /Class
doit
InAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IsAst
expectvalue /Class
doit
CmpOpAst subclass: 'IsAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IsAst comment: 
'No class-specific documentation for PyIs, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyIs
'
%
expectvalue /Class
doit
IsAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IsNotAst
expectvalue /Class
doit
CmpOpAst subclass: 'IsNotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IsNotAst comment: 
'No class-specific documentation for PyIsNot, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyIsNot
'
%
expectvalue /Class
doit
IsNotAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LtAst
expectvalue /Class
doit
CmpOpAst subclass: 'LtAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LtAst comment: 
'No class-specific documentation for PyLt, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyLt
'
%
expectvalue /Class
doit
LtAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LtEAst
expectvalue /Class
doit
CmpOpAst subclass: 'LtEAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LtEAst comment: 
'No class-specific documentation for PyLtE, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyLtE
'
%
expectvalue /Class
doit
LtEAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NotEqAst
expectvalue /Class
doit
CmpOpAst subclass: 'NotEqAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotEqAst comment: 
'No class-specific documentation for PyNotEq, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyNotEq
'
%
expectvalue /Class
doit
NotEqAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NotInAst
expectvalue /Class
doit
CmpOpAst subclass: 'NotInAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotInAst comment: 
'No class-specific documentation for PyNotIn, hierarchy is:
Object
  AbstractNode(parent)
    CmpOpAst
      PyNotIn
'
%
expectvalue /Class
doit
NotInAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ComprehensionAst
expectvalue /Class
doit
AbstractNode subclass: 'ComprehensionAst'
  instVarNames: #( target iter ifs
                    is_async)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ComprehensionAst comment: 
'No class-specific documentation for ComprehensionAst, hierarchy is:
Object
  AbstractNode(parent)
    ComprehensionAst(target iter ifs is_async)
'
%
expectvalue /Class
doit
ComprehensionAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExpressionContextAst
expectvalue /Class
doit
AbstractNode subclass: 'ExpressionContextAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExpressionContextAst comment: 
'No class-specific documentation for ExpressionContextAst, hierarchy is:
Object
  AbstractNode(line column)
    ExpressionContextAst
'
%
expectvalue /Class
doit
ExpressionContextAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AugLoadAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'AugLoadAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AugLoadAst comment: 
'No class-specific documentation for PyAugLoad, hierarchy is:
Object
  AbstractNode(parent)
    ExpressionContextAst
      PyAugLoad
'
%
expectvalue /Class
doit
AugLoadAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AugStoreAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'AugStoreAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AugStoreAst comment: 
'No class-specific documentation for PyAugStore, hierarchy is:
Object
  AbstractNode(parent)
    ExpressionContextAst
      PyAugStore
'
%
expectvalue /Class
doit
AugStoreAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DelAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'DelAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DelAst comment: 
'No class-specific documentation for PyDel, hierarchy is:
Object
  AbstractNode(parent)
    ExpressionContextAst
      PyDel
'
%
expectvalue /Class
doit
DelAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LoadAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'LoadAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LoadAst comment: 
'No class-specific documentation for LoadAst, hierarchy is:
Object
  AbstractNode(parent)
    ExpressionContextAst
      LoadAst
'
%
expectvalue /Class
doit
LoadAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ParamAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'ParamAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ParamAst comment: 
'No class-specific documentation for PyParam, hierarchy is:
Object
  AbstractNode(parent)
    ExpressionContextAst
      PyParam
'
%
expectvalue /Class
doit
ParamAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StoreAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'StoreAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StoreAst comment: 
'No class-specific documentation for StoreAst, hierarchy is:
Object
  AbstractNode(parent)
    ExpressionContextAst
      StoreAst
'
%
expectvalue /Class
doit
StoreAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ModuleAst
expectvalue /Class
doit
AbstractNode subclass: 'ModuleAst'
  instVarNames: #( body name path
                    source stream scope type_ignore)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ModuleAst comment: 
'A Module is a file containing Python definitions and statements. When a file (''script'') is executed from the command line, (e.g., ''python myFile.py''), the module global variable `__name__` is set to ''__main__''. A Module can be imported into another module using the `Import` command, and the module global variable `__name__` is then the name of the file.

https://docs.python.org/3/tutorial/modules.html?highlight=module'
%
expectvalue /Class
doit
ModuleAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for Package
expectvalue /Class
doit
ModuleAst subclass: 'Package'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Package comment: 
'Packages are a way of structuring Python’s module namespace by using “dotted module names”.
See https://docs.python.org/3/tutorial/modules.html#packages for details.'
%
expectvalue /Class
doit
Package category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for OperatorAst
expectvalue /Class
doit
AbstractNode subclass: 'OperatorAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OperatorAst comment: 
'No class-specific documentation for OperatorAst, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
'
%
expectvalue /Class
doit
OperatorAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AddAst
expectvalue /Class
doit
OperatorAst subclass: 'AddAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AddAst comment: 
'No class-specific documentation for PyAdd, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyAdd
'
%
expectvalue /Class
doit
AddAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BitAndAst
expectvalue /Class
doit
OperatorAst subclass: 'BitAndAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BitAndAst comment: 
'No class-specific documentation for PyBitAnd, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyBitAnd
'
%
expectvalue /Class
doit
BitAndAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BitOrAst
expectvalue /Class
doit
OperatorAst subclass: 'BitOrAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BitOrAst comment: 
'No class-specific documentation for PyBitOr, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyBitOr
'
%
expectvalue /Class
doit
BitOrAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BitXorAst
expectvalue /Class
doit
OperatorAst subclass: 'BitXorAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BitXorAst comment: 
'No class-specific documentation for PyBitXor, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyBitXor
'
%
expectvalue /Class
doit
BitXorAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DivAst
expectvalue /Class
doit
OperatorAst subclass: 'DivAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DivAst comment: 
'No class-specific documentation for PyDiv, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyDiv
'
%
expectvalue /Class
doit
DivAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for FloorDivAst
expectvalue /Class
doit
OperatorAst subclass: 'FloorDivAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FloorDivAst comment: 
'No class-specific documentation for PyFloorDiv, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyFloorDiv
'
%
expectvalue /Class
doit
FloorDivAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LShiftAst
expectvalue /Class
doit
OperatorAst subclass: 'LShiftAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LShiftAst comment: 
'No class-specific documentation for PyLShift, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyLShift
'
%
expectvalue /Class
doit
LShiftAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for MatMultAst
expectvalue /Class
doit
OperatorAst subclass: 'MatMultAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
MatMultAst comment: 
'No class-specific documentation for PyMatMult, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyMatMult
'
%
expectvalue /Class
doit
MatMultAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ModAst
expectvalue /Class
doit
OperatorAst subclass: 'ModAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ModAst comment: 
'No class-specific documentation for PyMod, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyMod
'
%
expectvalue /Class
doit
ModAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for MultAst
expectvalue /Class
doit
OperatorAst subclass: 'MultAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
MultAst comment: 
'No class-specific documentation for PyMult, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyMult
'
%
expectvalue /Class
doit
MultAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PowAst
expectvalue /Class
doit
OperatorAst subclass: 'PowAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PowAst comment: 
'No class-specific documentation for PyPow, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyPow
'
%
expectvalue /Class
doit
PowAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for RShiftAst
expectvalue /Class
doit
OperatorAst subclass: 'RShiftAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
RShiftAst comment: 
'No class-specific documentation for PyRShift, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PyRShift
'
%
expectvalue /Class
doit
RShiftAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SubAst
expectvalue /Class
doit
OperatorAst subclass: 'SubAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SubAst comment: 
'No class-specific documentation for PySub, hierarchy is:
Object
  AbstractNode(parent)
    OperatorAst
      PySub
'
%
expectvalue /Class
doit
SubAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SuiteAst
expectvalue /Class
doit
AbstractNode subclass: 'SuiteAst'
  instVarNames: #( body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SuiteAst comment: 
'No class-specific documentation for SuiteAst, hierarchy is:
Object
  AbstractNode(parent)
    SuiteAst(body variables)
'
%
expectvalue /Class
doit
SuiteAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BlockAst
expectvalue /Class
doit
SuiteAst subclass: 'BlockAst'
  instVarNames: #( variables)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BlockAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for TypeIgnoreAst
expectvalue /Class
doit
AbstractNode subclass: 'TypeIgnoreAst'
  instVarNames: #( lineno tag)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TypeIgnoreAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for WithItemAst
expectvalue /Class
doit
AbstractNode subclass: 'WithItemAst'
  instVarNames: #( context_expr optional_vars)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
WithItemAst comment: 
'No class-specific documentation for WithItemAst, hierarchy is:
Object
  AbstractNode(parent)
    WithItemAst(context_expr optional_vars)
'
%
expectvalue /Class
doit
WithItemAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for object
expectvalue /Class
doit
Object subclass: 'object'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
object comment: 
'
I implement the behavior found in Python''s object. From Python, we find the following attributes:

>>> dir(object())
[''__class__'', ''__delattr__'', ''__dir__'', ''__doc__'', ''__eq__'', ''__format__'', ''__ge__'', ''__getattribute__'', ''__gt__'', ''__hash__'', ''__init__'', ''__init_subclass__'', ''__le__'', ''__lt__'', ''__ne__'', ''__new__'', ''__reduce__'', ''__reduce_ex__'', ''__repr__'', ''__setattr__'', ''__sizeof__'', ''__str__'', ''__subclasshook__'']

These should be implemented in the "Python" method category and follow the Python name (with parameters added as needed; see below). Smalltalk methods added to support the Python implementation will have a ''___'' prefix (but nothing extra at the end). In a few rare cases we will have Smalltalk names (including #printOn:). We will see if this becomes an issue.

Attributes such as ''__doc__'' that return something other than a function or method simply return the correct item. Attributes such as ''__dir__'' that in Python return a function or method are implemented as if they were called so return the result of their execution. This is done to make the code cleaner and look more like Smalltalk. We should add a way to distinguish the two cases (perhaps a pragma?), and then if the Python code retrieves a function-style attribute but does not call it, we should find a way to return a callable (a block?) instead. This makes the common case (calling a function) fast and simple, while making the uncommon case still workable. Note also that the Smalltalk functions have names that include an indication of the number of arguments. We will not bother to create Smalltalk methods for ''__eq__'' but just go ahead and make one for ''__eq__:''. Also, if a Python method takes multiple parameters, we will simply append ''_:'' rather than trying to be creative with the name.'
%
expectvalue /Class
doit
object category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for builtin_function_or_method
expectvalue /Class
doit
object subclass: 'builtin_function_or_method'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
builtin_function_or_method category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for BuiltinImporter
expectvalue /Class
doit
object subclass: 'BuiltinImporter'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BuiltinImporter category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for bytearray
expectvalue /Class
doit
object subclass: 'bytearray'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
bytearray category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for classmethod
expectvalue /Class
doit
object subclass: 'classmethod'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
classmethod category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for complex
expectvalue /Class
doit
object subclass: 'complex'
  instVarNames: #( value real imaginary)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
complex comment: 
'https://docs.python.org/3/library/functions.html#complex

>>> complex.mro()
[<class ''complex''>, <class ''object''>]

>>> sorted(set(dir(complex)) - set(dir(object)))
[''__abs__'', ''__add__'', ''__bool__'', ''__getnewargs__'', ''__mul__'', ''__neg__'', ''__pos__'', ''__pow__'', ''__radd__'', ''__rmul__'', ''__rpow__'', ''__rsub__'', ''__rtruediv__'', ''__sub__'', ''__truediv__'', ''conjugate'', ''imag'', ''real'']

>>> dir(object)
[''__class__'', ''__delattr__'', ''__dir__'', ''__doc__'', ''__eq__'', ''__format__'', ''__ge__'', ''__getattribute__'', ''__gt__'', ''__hash__'', ''__init__'', ''__init_subclass__'', ''__le__'', ''__lt__'', ''__ne__'', ''__new__'', ''__reduce__'', ''__reduce_ex__'', ''__repr__'', ''__setattr__'', ''__sizeof__'', ''__str__'', ''__subclasshook__'']'
%
expectvalue /Class
doit
complex category: 'BuiltIns-Numbers'
%
set compile_env: 0
! ------------------- Class definition for Container
expectvalue /Class
doit
object subclass: 'Container'
  instVarNames: #( container)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Container comment: 
'
I am an abstract superclass for Python containers and implement what would otherwise be duplicate code. This includes the following (listed here so it can be copied to subclass comments):

self ___dir
a Set(''__gt__'' ''__ge__'' ''__eq__'' ''__imul__'' ''__add__'' ''__contains__'' ''__format__'' ''__str__'' ''__delattr__'' ''index'' ''__setattr__'' ''__getattribute__'' ''__subclasshook__'' ''__ne__'' ''__sizeof__'' ''__dir__'' ''__mul__'' ''__class__'' ''clear'' ''__doc__'' ''__repr__'' ''copy'' ''__new__'' ''__lt__'' ''__le__'' ''count'' ''__hash__'' ''__len__'' ''__getitem__'')
'
%
expectvalue /Class
doit
Container category: 'BuiltIns-Containers'
%
set compile_env: 0
! ------------------- Class definition for bytes
expectvalue /Class
doit
Container subclass: 'bytes'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
bytes comment: 
'
bytes() method returns a bytes object which is an immutable (cannot be modified) sequence of integers in the range 0 <=x < 256.

class bytes(object)
 |  bytes(iterable_of_ints) -> bytes
 |  bytes(string, encoding[, errors]) -> bytes
 |  bytes(bytes_or_buffer) -> immutable copy of bytes_or_buffer
 |  bytes(int) -> bytes object of size given by the parameter initialized with null bytes
 |  bytes() -> empty bytes object
 |
 |  Construct an immutable array of bytes from:
 |    - an iterable yielding integers in range(256)
 |    - a text string encoded using the specified encoding
 |    - any object implementing the buffer API.
 |    - an integer


>>> dir(bytes)
[''__add__'', ''__class__'', ''__contains__'', ''__delattr__'', ''__dir__'', ''__doc__'', ''__eq__'', ''__format__'', ''__ge__'', ''__getattribute__'', ''__getitem__'', ''__getnewargs__'', ''__gt__'', ''__hash__'', ''__init__'', ''__init_subclass__'', ''__iter__'', ''__le__'', ''__len__'', ''__lt__'', ''__mod__'', ''__mul__'', ''__ne__'', ''__new__'', ''__reduce__'', ''__reduce_ex__'', ''__repr__'', ''__rmod__'', ''__rmul__'', ''__setattr__'', ''__sizeof__'', ''__str__'', ''__subclasshook__'', ''capitalize'', ''center'', ''count'', ''decode'', ''endswith'', ''expandtabs'', ''find'', ''fromhex'', ''hex'', ''index'', ''isalnum'', ''isalpha'', ''isascii'', ''isdigit'', ''islower'', ''isspace'', ''istitle'', ''isupper'', ''join'', ''ljust'', ''lower'', ''lstrip'', ''maketrans'', ''partition'', ''removeprefix'', ''removesuffix'', ''replace'', ''rfind'', ''rindex'', ''rjust'', ''rpartition'', ''rsplit'', ''rstrip'', ''split'', ''splitlines'', ''startswith'', ''strip'', ''swapcase'', ''title'', ''translate'', ''upper'', ''zfill'']

>>> bytes.mro()
[<class ''bytes''>, <class ''object''>]

https://www.programiz.com/python-programming/methods/built-in/bytes
https://docs.python.org/3/library/stdtypes.html#binary-sequence-types-bytes-bytearray-memoryview'
%
expectvalue /Class
doit
bytes category: 'BuiltIns-Containers'
%
set compile_env: 0
! ------------------- Class definition for dict
expectvalue /Class
doit
Container subclass: 'dict'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
dict comment: 
'
|  dict() -> new empty dictionary
 |  dict(mapping) -> new dictionary initialized from a mapping object''s
 |      (key, value) pairs
 |  dict(iterable) -> new dictionary initialized as if via:
 |      d = {}
 |      for k, v in iterable:
 |          d[k] = v
 |  dict(**kwargs) -> new dictionary initialized with the name=value pairs
 |      in the keyword argument list.  For example:  dict(one=1, two=2)
 |

>>> dict.mro()
[<class ''dict''>, <class ''object''>]
>>> sorted(set(dir(dict)) - set(dir(object)))
[''__class_getitem__'', ''__contains__'', ''__delitem__'', ''__getitem__'', ''__ior__'', ''__iter__'', ''__len__'', ''__or__'', ''__reversed__'', ''__ror__'', ''__setitem__'', ''clear'', ''copy'', ''fromkeys'', ''get'', ''items'', ''keys'', ''pop'', ''popitem'', ''setdefault'', ''update'', ''values'']

The following are implemented in Container:
Container ___dir
 a Set(''__gt__'' ''__ge__'' ''__eq__'' ''__imul__'' ''__add__'' ''__contains__'' ''__format__'' ''__str__'' ''__delattr__'' ''index'' ''__setattr__'' ''__getattribute__'' ''__subclasshook__'' ''__ne__'' ''__sizeof__'' ''__dir__'' ''__mul__'' ''__class__'' ''clear'' ''__doc__'' ''__repr__'' ''copy'' ''__new__'' ''__lt__'' ''__le__'' ''count'' ''__hash__'' ''__len__'' ''__getitem__'')

https://www.programiz.com/python-programming/methods/built-in/dict
https://docs.python.org/3/tutorial/datastructures.html#dictionaries'
%
expectvalue /Class
doit
dict category: 'BuiltIns-Containers'
%
set compile_env: 0
! ------------------- Class definition for frozenset
expectvalue /Class
doit
Container subclass: 'frozenset'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
frozenset comment: 
'
Build an immutable unordered collection of unique elements.

>>> frozenset.mro()
[<class ''frozenset''>, <class ''object''>]
>>> sorted(set(dir(frozenset)) - set(dir(object)))
[''__and__'', ''__class_getitem__'', ''__contains__'', ''__iter__'', ''__len__'', ''__or__'', ''__rand__'', ''__ror__'', ''__rsub__'', ''__rxor__'', ''__sub__'', ''__xor__'', ''copy'', ''difference'', ''intersection'', ''isdisjoint'', ''issubset'', ''issuperset'', ''symmetric_difference'', ''union'']

The following are implemented in Container:
Container ___dir
 a Set(''__gt__'' ''__ge__'' ''__eq__'' ''__imul__'' ''__add__'' ''__contains__'' ''__format__'' ''__str__'' ''__delattr__'' ''index'' ''__setattr__'' ''__getattribute__'' ''__subclasshook__'' ''__ne__'' ''__sizeof__'' ''__dir__'' ''__mul__'' ''__class__'' ''clear'' ''__doc__'' ''__repr__'' ''copy'' ''__new__'' ''__lt__'' ''__le__'' ''count'' ''__hash__'' ''__len__'' ''__getitem__'')

https://docs.python.org/3/tutorial/datastructures.html'
%
expectvalue /Class
doit
frozenset category: 'BuiltIns-Containers'
%
set compile_env: 0
! ------------------- Class definition for list
expectvalue /Class
doit
Container subclass: 'list'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
list comment: 
'
I am a mutable sequence of arbitrary Python objects.

>>> list.mro()
[<class ''list''>, <class ''object''>]
>>> sorted(set(dir(list)) - set(dir(object)))
[''__add__'', ''__class_getitem__'', ''__contains__'', ''__delitem__'', ''__getitem__'', ''__iadd__'', ''__imul__'', ''__iter__'', ''__len__'', ''__mul__'', ''__reversed__'', ''__rmul__'', ''__setitem__'', ''append'', ''clear'', ''copy'', ''count'', ''extend'', ''index'', ''insert'', ''pop'', ''remove'', ''reverse'', ''sort'']
>>>

The following are implemented in Container:
Container ___dir
 a Set(''__gt__'' ''__ge__'' ''__eq__'' ''__imul__'' ''__add__'' ''__contains__'' ''__format__'' ''__str__'' ''__setattr__'' ''index'' ''__delattr__'' ''__getattribute__'' ''__subclasshook__'' ''__ne__'' ''__sizeof__'' ''__dir__'' ''__mul__'' ''__class__'' ''__doc__'' ''__repr__'' ''__new__'' ''__lt__'' ''__le__'' ''count'' ''__hash__'' ''__len__'' ''__getitem__'')

https://docs.python.org/3/tutorial/datastructures.html'
%
expectvalue /Class
doit
list category: 'BuiltIns-Containers'
%
set compile_env: 0
! ------------------- Class definition for set
expectvalue /Class
doit
Container subclass: 'set'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
set comment: 
'
Python also includes a data type for sets. A set is an unordered collection with no duplicate elements. Basic uses include membership testing and eliminating duplicate entries. Set objects also support mathematical operations like union, intersection, difference, and symmetric difference.


>>> set.mro()
[<class ''set''>, <class ''object''>]
>>> sorted(set(dir(set)) - set(dir(object)))
[''__and__'', ''__class_getitem__'', ''__contains__'', ''__iand__'', ''__ior__'', ''__isub__'', ''__iter__'', ''__ixor__'', ''__len__'', ''__or__'', ''__rand__'', ''__ror__'', ''__rsub__'', ''__rxor__'', ''__sub__'', ''__xor__'', ''add'', ''clear'', ''copy'', ''difference'', ''difference_update'', ''discard'', ''intersection'', ''intersection_update'', ''isdisjoint'', ''issubset'', ''issuperset'', ''pop'', ''remove'', ''symmetric_difference'', ''symmetric_difference_update'', ''union'', ''update'']


The following are implemented in Container:
Container ___dir
 a Set(''__gt__'' ''__ge__'' ''__eq__'' ''__imul__'' ''__add__'' ''__contains__'' ''__format__'' ''__str__'' ''__delattr__'' ''index'' ''__setattr__'' ''__getattribute__'' ''__subclasshook__'' ''__ne__'' ''__sizeof__'' ''__dir__'' ''__mul__'' ''__class__'' ''clear'' ''__doc__'' ''__repr__'' ''copy'' ''__new__'' ''__lt__'' ''__le__'' ''count'' ''__hash__'' ''__len__'' ''__getitem__'')

https://docs.python.org/3/tutorial/datastructures.html#tuples-and-sequences
https://docs.python.org/3/tutorial/datastructures.html'
%
expectvalue /Class
doit
set category: 'BuiltIns-Containers'
%
set compile_env: 0
! ------------------- Class definition for tuple
expectvalue /Class
doit
Container subclass: 'tuple'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
tuple comment: 
'
I am an immutable sequence of arbitrary Python objects.

>>> tuple.mro()
[<class ''tuple''>, <class ''object''>]
>>> sorted(set(dir(tuple)) - set(dir(object)))
[''__add__'', ''__class_getitem__'', ''__contains__'', ''__getitem__'', ''__getnewargs__'', ''__iter__'', ''__len__'', ''__mul__'', ''__rmul__'', ''count'', ''index'']
>>>

The following are implemented in Container:
Container ___dir
 a Set(''__gt__'' ''__ge__'' ''__eq__'' ''__imul__'' ''__add__'' ''__contains__'' ''__format__'' ''__str__'' ''__setattr__'' ''index'' ''__delattr__'' ''__getattribute__'' ''__subclasshook__'' ''__ne__'' ''__sizeof__'' ''__dir__'' ''__mul__'' ''__class__'' ''__doc__'' ''__repr__'' ''__new__'' ''__lt__'' ''__le__'' ''count'' ''__hash__'' ''__len__'' ''__getitem__'')

https://docs.python.org/3/tutorial/datastructures.html#tuples-and-sequences'
%
expectvalue /Class
doit
tuple category: 'BuiltIns-Containers'
%
set compile_env: 0
! ------------------- Class definition for enumerate
expectvalue /Class
doit
object subclass: 'enumerate'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
enumerate category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for filter
expectvalue /Class
doit
object subclass: 'filter'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
filter category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for float
expectvalue /Class
doit
object subclass: 'float'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
float comment: 
'>>> float.mro()
[<class ''float''>, <class ''object''>]

>>> sorted(set(dir(float)) - set(dir(object)))
[''__abs__'', ''__add__'', ''__bool__'', ''__ceil__'', ''__divmod__'', ''__float__'', ''__floor__'', ''__floordiv__'', ''__getformat__'', ''__getnewargs__'', ''__int__'', ''__mod__'', ''__mul__'', ''__neg__'', ''__pos__'', ''__pow__'', ''__radd__'', ''__rdivmod__'', ''__rfloordiv__'', ''__rmod__'', ''__rmul__'', ''__round__'', ''__rpow__'', ''__rsub__'', ''__rtruediv__'', ''__set_format__'', ''__sub__'', ''__truediv__'', ''__trunc__'', ''as_integer_ratio'', ''conjugate'', ''fromhex'', ''hex'', ''imag'', ''is_integer'', ''real'']

>>> dir(object)
[''__class__'', ''__delattr__'', ''__dir__'', ''__doc__'', ''__eq__'', ''__format__'', ''__ge__'', ''__getattribute__'', ''__gt__'', ''__hash__'', ''__init__'', ''__init_subclass__'', ''__le__'', ''__lt__'', ''__ne__'', ''__new__'', ''__reduce__'', ''__reduce_ex__'', ''__repr__'', ''__setattr__'', ''__sizeof__'', ''__str__'', ''__subclasshook__'']'
%
expectvalue /Class
doit
float category: 'BuiltIns-Numbers'
%
set compile_env: 0
! ------------------- Class definition for function
expectvalue /Class
doit
object subclass: 'function'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
function category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for int
expectvalue /Class
doit
object subclass: 'int'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
int comment: 
'>>> int.mro()
[<class ''int''>, <class ''object''>]

>>> sorted(set(dir(int)) - set(dir(object)))
[''__abs__'', ''__add__'', ''__and__'', ''__bool__'', ''__ceil__'', ''__divmod__'', ''__float__'', ''__floor__'', ''__floordiv__'', ''__getnewargs__'', ''__index__'', ''__int__'', ''__invert__'', ''__lshift__'', ''__mod__'', ''__mul__'', ''__neg__'', ''__or__'', ''__pos__'', ''__pow__'', ''__radd__'', ''__rand__'', ''__rdivmod__'', ''__rfloordiv__'', ''__rlshift__'', ''__rmod__'', ''__rmul__'', ''__ror__'', ''__round__'', ''__rpow__'', ''__rrshift__'', ''__rshift__'', ''__rsub__'', ''__rtruediv__'', ''__rxor__'', ''__sub__'', ''__truediv__'', ''__trunc__'', ''__xor__'', ''as_integer_ratio'', ''bit_length'', ''conjugate'', ''denominator'', ''from_bytes'', ''imag'', ''numerator'', ''real'', ''to_bytes'']

>>> dir(object)
[''__class__'', ''__delattr__'', ''__dir__'', ''__doc__'', ''__eq__'', ''__format__'', ''__ge__'', ''__getattribute__'', ''__gt__'', ''__hash__'', ''__init__'', ''__init_subclass__'', ''__le__'', ''__lt__'', ''__ne__'', ''__new__'', ''__reduce__'', ''__reduce_ex__'', ''__repr__'', ''__setattr__'', ''__sizeof__'', ''__str__'', ''__subclasshook__'']'
%
expectvalue /Class
doit
int category: 'BuiltIns-Numbers'
%
set compile_env: 0
! ------------------- Class definition for bool
expectvalue /Class
doit
int subclass: 'bool'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
bool comment: 
'>>> bool.mro()
[<class ''bool''>, <class ''int''>, <class ''object''>]

>>> sorted(set(dir(bool)) - set(dir(int)))
[]

>>> dir(int)
[''__abs__'', ''__add__'', ''__and__'', ''__bool__'', ''__ceil__'', ''__class__'', ''__delattr__'', ''__dir__'', ''__divmod__'', ''__doc__'', ''__eq__'', ''__float__'', ''__floor__'', ''__floordiv__'', ''__format__'', ''__ge__'', ''__getattribute__'', ''__getnewargs__'', ''__gt__'', ''__hash__'', ''__index__'', ''__init__'', ''__init_subclass__'', ''__int__'', ''__invert__'', ''__le__'', ''__lshift__'', ''__lt__'', ''__mod__'', ''__mul__'', ''__ne__'', ''__neg__'', ''__new__'', ''__or__'', ''__pos__'', ''__pow__'', ''__radd__'', ''__rand__'', ''__rdivmod__'', ''__reduce__'', ''__reduce_ex__'', ''__repr__'', ''__rfloordiv__'', ''__rlshift__'', ''__rmod__'', ''__rmul__'', ''__ror__'', ''__round__'', ''__rpow__'', ''__rrshift__'', ''__rshift__'', ''__rsub__'', ''__rtruediv__'', ''__rxor__'', ''__setattr__'', ''__sizeof__'', ''__str__'', ''__sub__'', ''__subclasshook__'', ''__truediv__'', ''__trunc__'', ''__xor__'', ''as_integer_ratio'', ''bit_count'', ''bit_length'', ''conjugate'', ''denominator'', ''from_bytes'', ''imag'', ''numerator'', ''real'', ''to_bytes'']'
%
expectvalue /Class
doit
bool category: 'BuiltIns-Numbers'
%
set compile_env: 0
! ------------------- Class definition for map
expectvalue /Class
doit
object subclass: 'map'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
map category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for memoryview
expectvalue /Class
doit
object subclass: 'memoryview'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
memoryview category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for module
expectvalue /Class
doit
object subclass: 'module'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
module category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for property
expectvalue /Class
doit
object subclass: 'property'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
property category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for range
expectvalue /Class
doit
object subclass: 'range'
  instVarNames: #( container)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
range comment: 
'
https://pynative.com/python-range-function/

>>> range.mro()
[<class ''range''>, <class ''object''>]

>>> sorted(set(dir(range)) - set(dir(object)))
[''__bool__'', ''__contains__'', ''__getitem__'', ''__iter__'', ''__len__'', ''__reversed__'', ''count'', ''index'', ''start'', ''step'', ''stop'']
'
%
expectvalue /Class
doit
range category: 'BuiltIns-Containers'
%
set compile_env: 0
! ------------------- Class definition for reversed
expectvalue /Class
doit
object subclass: 'reversed'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
reversed category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for Singleton
expectvalue /Class
doit
object subclass: 'Singleton'
  instVarNames: #()
  classVars: #()
  classInstVars: #( singleton)
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Singleton category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for NoneType
expectvalue /Class
doit
Singleton subclass: 'NoneType'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NoneType category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for NotImplementedType
expectvalue /Class
doit
Singleton subclass: 'NotImplementedType'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotImplementedType category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for slice
expectvalue /Class
doit
object subclass: 'slice'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
slice category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for staticmethod
expectvalue /Class
doit
object subclass: 'staticmethod'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
staticmethod category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for str
expectvalue /Class
doit
object subclass: 'str'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
str category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for super
expectvalue /Class
doit
object subclass: 'super'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
super category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for type
expectvalue /Class
doit
object subclass: 'type'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
type category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for zip
expectvalue /Class
doit
object subclass: 'zip'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
zip category: 'BuiltIns-Kernel'
%
set compile_env: 0
! ------------------- Class definition for Scripter
expectvalue /Class
doit
Object subclass: 'Scripter'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Scripter category: 'BuiltIns-Extras'
%
set compile_env: 0
! ------------------- Class definition for Base_Class_Test
expectvalue /Class
doit
TestCase subclass: 'Base_Class_Test'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Base_Class_Test category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for passing
expectvalue /Class
doit
Base_Class_Test subclass: 'passing'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
passing category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for boolTest
expectvalue /Class
doit
passing subclass: 'boolTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
boolTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for bytearrayTest
expectvalue /Class
doit
passing subclass: 'bytearrayTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
bytearrayTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for bytesTest
expectvalue /Class
doit
passing subclass: 'bytesTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
bytesTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for complexTest
expectvalue /Class
doit
passing subclass: 'complexTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
complexTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for dictTest
expectvalue /Class
doit
passing subclass: 'dictTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
dictTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for floatTest
expectvalue /Class
doit
passing subclass: 'floatTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
floatTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for frozensetTest
expectvalue /Class
doit
passing subclass: 'frozensetTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
frozensetTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for intTest
expectvalue /Class
doit
passing subclass: 'intTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
intTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for listTest
expectvalue /Class
doit
passing subclass: 'listTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
listTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for memoryviewTest
expectvalue /Class
doit
passing subclass: 'memoryviewTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
memoryviewTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for objectTest
expectvalue /Class
doit
passing subclass: 'objectTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
objectTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for rangeTest
expectvalue /Class
doit
passing subclass: 'rangeTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
rangeTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for setTest
expectvalue /Class
doit
passing subclass: 'setTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
setTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for strTest
expectvalue /Class
doit
passing subclass: 'strTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
strTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for tupleTest
expectvalue /Class
doit
passing subclass: 'tupleTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
tupleTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for Base_Exception_Test
expectvalue /Class
doit
TestCase subclass: 'Base_Exception_Test'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Base_Exception_Test category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for BaseExceptionTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'BaseExceptionTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BaseExceptionTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for ImportErrorTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'ImportErrorTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportErrorTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for OSErrorTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'OSErrorTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OSErrorTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for StopIterationTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'StopIterationTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StopIterationTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for SyntaxErrorTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'SyntaxErrorTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SyntaxErrorTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for SystemExitTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'SystemExitTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SystemExitTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for UnicodeDecodeErrorTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'UnicodeDecodeErrorTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnicodeDecodeErrorTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for UnicodeEncodeErrorTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'UnicodeEncodeErrorTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnicodeEncodeErrorTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for UnicodeTranslateErrorTest
expectvalue /Class
doit
Base_Exception_Test subclass: 'UnicodeTranslateErrorTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnicodeTranslateErrorTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for BuiltinImporterTest
expectvalue /Class
doit
TestCase subclass: 'BuiltinImporterTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BuiltinImporterTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for Other_Test
expectvalue /Class
doit
TestCase subclass: 'Other_Test'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Other_Test category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for builtin_function_or_methodTest
expectvalue /Class
doit
Other_Test subclass: 'builtin_function_or_methodTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
builtin_function_or_methodTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for classmethodTest
expectvalue /Class
doit
Other_Test subclass: 'classmethodTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
classmethodTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for enumerateTest
expectvalue /Class
doit
Other_Test subclass: 'enumerateTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
enumerateTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for filterTest
expectvalue /Class
doit
Other_Test subclass: 'filterTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
filterTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for functionTest
expectvalue /Class
doit
Other_Test subclass: 'functionTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
functionTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for mapTest
expectvalue /Class
doit
Other_Test subclass: 'mapTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
mapTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for moduleTest
expectvalue /Class
doit
Other_Test subclass: 'moduleTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
moduleTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for propertyTest
expectvalue /Class
doit
Other_Test subclass: 'propertyTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
propertyTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for reversedTest
expectvalue /Class
doit
Other_Test subclass: 'reversedTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
reversedTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for sliceTest
expectvalue /Class
doit
Other_Test subclass: 'sliceTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
sliceTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for staticmethodTest
expectvalue /Class
doit
Other_Test subclass: 'staticmethodTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
staticmethodTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for superTest
expectvalue /Class
doit
Other_Test subclass: 'superTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
superTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for typeTest
expectvalue /Class
doit
Other_Test subclass: 'typeTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
typeTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for zipTest
expectvalue /Class
doit
Other_Test subclass: 'zipTest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
zipTest category: 'BuiltIns-Tests'
%
set compile_env: 0
! ------------------- Class definition for PythonTestCase
expectvalue /Class
doit
TestCase subclass: 'PythonTestCase'
  instVarNames: #( module stdout aScope)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PythonTestCase comment: 
'Abstract superclass for all Python tests.

PythonTestCase suite run.
builtins stackFor: (Object _objectForOop: 71048449).
mro() - method resolution order
ImportTestCase debug: #''tst_importlib''.'
%
expectvalue /Class
doit
PythonTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for ByteLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ByteLiteralsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ByteLiteralsTestCase comment: 
'No class-specific documentation for ByteLiteralsTestCase, hierarchy is:
Object
  TestAsserter
    TestCase(testSelector)
      PythonTestCase(statements)
        ByteLiteralsTestCase
'
%
expectvalue /Class
doit
ByteLiteralsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for CompoundStatementsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CompoundStatementsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
CompoundStatementsTestCase comment: 
'ModuleAst astForPath: ''$HOME/code/Python/GemStoneP/tests/CompoundStatements.py''.'
%
expectvalue /Class
doit
CompoundStatementsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for DelimitersTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DelimitersTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DelimitersTestCase comment: 
'No class-specific documentation for DelimitersTestCase, hierarchy is:
Object
  TestAsserter
    TestCase(testSelector)
      PythonTestCase(statements)
        DelimitersTestCase
'
%
expectvalue /Class
doit
DelimitersTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for NumericLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NumericLiteralsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NumericLiteralsTestCase comment: 
'No class-specific documentation for NumericLiteralsTestCase, hierarchy is:
Object
  TestAsserter
    TestCase(testSelector)
      PythonTestCase(statements)
        NumericLiteralsTestCase
'
%
expectvalue /Class
doit
NumericLiteralsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for OperatorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OperatorsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OperatorsTestCase comment: 
'No class-specific documentation for OperatorsTestCase, hierarchy is:
Object
  TestAsserter
    TestCase(testSelector)
      PythonTestCase(statements)
        OperatorsTestCase
'
%
expectvalue /Class
doit
OperatorsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for SimpleStatementsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SimpleStatementsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SimpleStatementsTestCase comment: 
'No class-specific documentation for SimpleStatementsTestCase, hierarchy is:
Object
  TestAsserter
    TestCase(testSelector)
      PythonTestCase(statements)
        SimpleStatementsTestCase
'
%
expectvalue /Class
doit
SimpleStatementsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for StringLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StringLiteralsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StringLiteralsTestCase comment: 
'No class-specific documentation for StringLiteralsTestCase, hierarchy is:
Object
  TestAsserter
    TestCase(testSelector)
      PythonTestCase
        StringLiteralsTestCase(statements)
'
%
expectvalue /Class
doit
StringLiteralsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for TranslatorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TranslatorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TranslatorTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for TranslateBinaryOperatorsTestCase
expectvalue /Class
doit
TranslatorTestCase subclass: 'TranslateBinaryOperatorsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TranslateBinaryOperatorsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for TranslateComparisonOperatorsTestCase
expectvalue /Class
doit
TranslatorTestCase subclass: 'TranslateComparisonOperatorsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TranslateComparisonOperatorsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for TranslateStatementsTestCase
expectvalue /Class
doit
TranslatorTestCase subclass: 'TranslateStatementsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TranslateStatementsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for TranslateUnaryOperatorsTestCase
expectvalue /Class
doit
TranslatorTestCase subclass: 'TranslateUnaryOperatorsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TranslateUnaryOperatorsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for PythonTestResource
expectvalue /Class
doit
TestResource subclass: 'PythonTestResource'
  instVarNames: #( path module statements)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PythonTestResource comment: 
'No class-specific documentation for PythonTestResource, hierarchy is:
Object
  TestAsserter
    TestResource(name description)
      PythonTestResource(statements)
'
%
expectvalue /Class
doit
PythonTestResource category: 'Tests'
%

input AbstractLocationNode.gs
input AbstractNode.gs
input AddAst.gs
input AliasAst.gs
input AndAst.gs
input AnnAssignAst.gs
input ArgAst.gs
input ArgumentsAst.gs
input ArithmeticError.gs
input AssertAst.gs
input AssertionError.gs
input AssignAst.gs
input AsyncForAst.gs
input AsyncFunctionDefAst.gs
input AsyncWithAst.gs
input AttributeAst.gs
input AttributeError.gs
input AugAssignAst.gs
input AugLoadAst.gs
input AugStoreAst.gs
input AwaitAst.gs
input Base_Class_Test.gs
input Base_Exception_Test.gs
input BaseException.gs
input BaseExceptionTest.gs
input BinOpAst.gs
input BitAndAst.gs
input BitOrAst.gs
input BitXorAst.gs
input BlockAst.gs
input BlockingIOError.gs
input bool.gs
input BoolOpAst.gs
input boolTest.gs
input BreakAst.gs
input BrokenPipeError.gs
input BufferError.gs
input builtin_function_or_method.gs
input builtin_function_or_methodTest.gs
input BuiltinImporter.gs
input BuiltinImporterTest.gs
input bytearray.gs
input bytearrayTest.gs
input ByteLiteralsTestCase.gs
input bytes.gs
input bytesTest.gs
input BytesWarning.gs
input CallAst.gs
input ChildProcessError.gs
input ClassDefAst.gs
input ClassFunctionDefAst.gs
input classmethod.gs
input classmethodTest.gs
input CmpOpAst.gs
input CompareAst.gs
input complex.gs
input complexTest.gs
input CompoundStatementsTestCase.gs
input ComprehensionAst.gs
input ConnectionAbortedError.gs
input ConnectionError.gs
input ConnectionRefusedError.gs
input ConnectionResetError.gs
input ConstantAst.gs
input Container.gs
input ContinueAst.gs
input DelAst.gs
input DeleteAst.gs
input DelimitersTestCase.gs
input DeprecationWarning.gs
input dict.gs
input DictAst.gs
input DictCompAst.gs
input dictTest.gs
input DivAst.gs
input enumerate.gs
input enumerateTest.gs
input EOFError.gs
input EqAst.gs
input ExceptHandlerAst.gs
input Exception.gs
input ExprAst.gs
input ExpressionAst.gs
input ExpressionContextAst.gs
input ExtSliceAst.gs
input FileExistsError.gs
input FileNotFoundError.gs
input filter.gs
input filterTest.gs
input float.gs
input FloatingPointError.gs
input floatTest.gs
input FloorDivAst.gs
input ForAst.gs
input FormattedValueAst.gs
input frozenset.gs
input frozensetTest.gs
input function.gs
input FunctionDefAst.gs
input functionTest.gs
input FutureWarning.gs
input GeneratorExit.gs
input GeneratorExpAst.gs
input GlobalAst.gs
input GtAst.gs
input GtEAst.gs
input IfAst.gs
input IfExpAst.gs
input ImportAst.gs
input ImportError.gs
input ImportErrorTest.gs
input ImportFromAst.gs
input ImportWarning.gs
input InAst.gs
input IndentationError.gs
input IndexAst.gs
input IndexError.gs
input InstanceFunctionDefAst.gs
input int.gs
input InterruptedError.gs
input intTest.gs
input InvertAst.gs
input IsADirectoryError.gs
input IsAst.gs
input IsNotAst.gs
input JoinedStrAst.gs
input KeyboardInterrupt.gs
input KeyError.gs
input KeywordAst.gs
input KeywordsAst.gs
input LambdaAst.gs
input list.gs
input ListAst.gs
input ListCompAst.gs
input listTest.gs
input LoadAst.gs
input LookupError.gs
input LShiftAst.gs
input LtAst.gs
input LtEAst.gs
input map.gs
input mapTest.gs
input MatMultAst.gs
input MemoryError.gs
input memoryview.gs
input memoryviewTest.gs
input ModAst.gs
input module.gs
input ModuleAst.gs
input ModuleNotFoundError.gs
input moduleTest.gs
input MultAst.gs
input NameAst.gs
input NamedExprAst.gs
input NameError.gs
input NoneType.gs
input NonlocalAst.gs
input NotADirectoryError.gs
input NotAst.gs
input NotEqAst.gs
input NotImplementedError.gs
input NotImplementedType.gs
input NotInAst.gs
input NumericLiteralsTestCase.gs
input object.gs
input objectTest.gs
input OperatorAst.gs
input OperatorsTestCase.gs
input OrAst.gs
input OSError.gs
input OSErrorTest.gs
input Other_Test.gs
input OverflowError.gs
input Package.gs
input ParamAst.gs
input PassAst.gs
input passing.gs
input PendingDeprecationWarning.gs
input PermissionError.gs
input PowAst.gs
input ProcessLookupError.gs
input property.gs
input propertyTest.gs
input PythonTestCase.gs
input PythonTestResource.gs
input RaiseAst.gs
input range.gs
input rangeTest.gs
input RecursionError.gs
input ReferenceError.gs
input ResourceWarning.gs
input ReturnAst.gs
input reversed.gs
input reversedTest.gs
input RShiftAst.gs
input RuntimeError.gs
input RuntimeWarning.gs
input Scripter.gs
input set.gs
input SetAst.gs
input SetCompAst.gs
input setTest.gs
input SimpleStatementsTestCase.gs
input Singleton.gs
input slice.gs
input SliceAbstractAst.gs
input SliceAst.gs
input sliceTest.gs
input StarredAst.gs
input StatementAst.gs
input StaticFunctionDefAst.gs
input staticmethod.gs
input staticmethodTest.gs
input StopAsyncIteration.gs
input StopIteration.gs
input StopIterationTest.gs
input StoreAst.gs
input str.gs
input StringLiteralsTestCase.gs
input strTest.gs
input SubAst.gs
input SubscriptAst.gs
input SuiteAst.gs
input super.gs
input superTest.gs
input SyntaxError.gs
input SyntaxErrorTest.gs
input SyntaxWarning.gs
input SystemError.gs
input SystemExit.gs
input SystemExitTest.gs
input TabError.gs
input TimeoutError.gs
input TranslateBinaryOperatorsTestCase.gs
input TranslateComparisonOperatorsTestCase.gs
input TranslateStatementsTestCase.gs
input TranslateUnaryOperatorsTestCase.gs
input TranslatorTestCase.gs
input TryAst.gs
input tuple.gs
input TupleAst.gs
input tupleTest.gs
input type.gs
input TypeError.gs
input TypeIgnoreAst.gs
input typeTest.gs
input UAddAst.gs
input UnaryOpAst.gs
input UnboundLocalError.gs
input UnicodeDecodeError.gs
input UnicodeDecodeErrorTest.gs
input UnicodeEncodeError.gs
input UnicodeEncodeErrorTest.gs
input UnicodeError.gs
input UnicodeTranslateError.gs
input UnicodeTranslateErrorTest.gs
input UnicodeWarning.gs
input UserWarning.gs
input USubAst.gs
input ValueError.gs
input Warning.gs
input WhileAst.gs
input WithAst.gs
input WithItemAst.gs
input YieldAst.gs
input YieldFromAst.gs
input ZeroDivisionError.gs
input zip.gs
input zipTest.gs
