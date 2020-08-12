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
AbstractException subclass: 'BaseException'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
BaseException comment: 
'https://docs.python.org/3/library/exceptions.html#exception-hierarchy

BaseException
 +-- SystemExit
 +-- KeyboardInterrupt
 +-- GeneratorExit
 +-- Exception
      +-- StopIteration
      +-- StopAsyncIteration
      +-- ArithmeticError
      |    +-- FloatingPointError
      |    +-- OverflowError
      |    +-- ZeroDivisionError
      +-- AssertionError
      +-- AttributeError
      +-- BufferError
      +-- EOFError
      +-- ImportError
      |    +-- ModuleNotFoundError
      +-- LookupError
      |    +-- IndexError
      |    +-- KeyError
      +-- MemoryError
      +-- NameError
      |    +-- UnboundLocalError
      +-- OSError
      |    +-- BlockingIOError
      |    +-- ChildProcessError
      |    +-- ConnectionError
      |    |    +-- BrokenPipeError
      |    |    +-- ConnectionAbortedError
      |    |    +-- ConnectionRefusedError
      |    |    +-- ConnectionResetError
      |    +-- FileExistsError
      |    +-- FileNotFoundError
      |    +-- InterruptedError
      |    +-- IsADirectoryError
      |    +-- NotADirectoryError
      |    +-- PermissionError
      |    +-- ProcessLookupError
      |    +-- TimeoutError
      +-- ReferenceError
      +-- RuntimeError
      |    +-- NotImplementedError
      |    +-- RecursionError
      +-- SyntaxError
      |    +-- IndentationError
      |         +-- TabError
      +-- SystemError
      +-- TypeError
      +-- ValueError
      |    +-- UnicodeError
      |         +-- UnicodeDecodeError
      |         +-- UnicodeEncodeError
      |         +-- UnicodeTranslateError
      +-- Warning
           +-- DeprecationWarning
           +-- PendingDeprecationWarning
           +-- RuntimeWarning
           +-- SyntaxWarning
           +-- UserWarning
           +-- FutureWarning
           +-- ImportWarning
           +-- UnicodeWarning
           +-- BytesWarning
           +-- ResourceWarning'
%
expectvalue /Class
doit
BaseException category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
Exception category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ArithmeticError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
FloatingPointError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
OverflowError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ZeroDivisionError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
AssertionError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
AttributeError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
BufferError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
EOFError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ImportError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ModuleNotFoundError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
LookupError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
IndexError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
KeyError comment: 
'No class-specific documentation for KeyError, hierarchy is: 
Object
  AbstractException( gsResumable gsTrappable gsNumber currGsHandler gsStack gsReason gsDetails tag messageText gsArgs)
    BaseException
      Exception
        KeyError
'
%
expectvalue /Class
doit
KeyError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
MemoryError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
NameError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
UnboundLocalError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
OSError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
BlockingIOError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ChildProcessError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ConnectionError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
BrokenPipeError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ConnectionAbortedError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ConnectionRefusedError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ConnectionResetError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
FileExistsError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
FileNotFoundError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
InterruptedError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
IsADirectoryError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
NotADirectoryError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
PermissionError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ProcessLookupError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
TimeoutError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ReferenceError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
RuntimeError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
NotImplementedError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
RecursionError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
StopAsyncIteration category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
StopIteration category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
SyntaxError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
IndentationError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
TabError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
SystemError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
TypeError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ValueError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
UnicodeError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
UnicodeDecodeError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
UnicodeEncodeError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
UnicodeTranslateError category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
Warning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
BytesWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
DeprecationWarning comment: 
'No class-specific documentation for DeprecationWarning, hierarchy is: 
Object
  AbstractException( gsResumable gsTrappable gsNumber currGsHandler gsStack gsReason gsDetails tag messageText gsArgs)
    BaseException
      Exception
        DeprecationWarning
'
%
expectvalue /Class
doit
DeprecationWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
FutureWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ImportWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
PendingDeprecationWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ResourceWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
RuntimeWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
SyntaxWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
UnicodeWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
UserWarning category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
GeneratorExit category: 'builtins'
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
  options: #( disallowGciStore)

%
expectvalue /Class
doit
KeyboardInterrupt category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for SystemException
expectvalue /Class
doit
BaseException subclass: 'SystemException'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
SystemException category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for BreakNotification
expectvalue /Class
doit
Notification subclass: 'BreakNotification'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
BreakNotification category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for CancelNotification
expectvalue /Class
doit
Notification subclass: 'CancelNotification'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
CancelNotification category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for ContinueNotification
expectvalue /Class
doit
Notification subclass: 'ContinueNotification'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ContinueNotification category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for ReturnNotification
expectvalue /Class
doit
Notification subclass: 'ReturnNotification'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ReturnNotification comment: 
'No class-specific documentation for ReturnNotification, hierarchy is: 
Object
  AbstractException( gsResumable gsTrappable gsNumber currGsHandler gsStack gsReason gsDetails tag messageText gsArgs)
    Exception
      Notification
        ReturnNotification
'
%
expectvalue /Class
doit
ReturnNotification category: 'builtins'
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
  instVarNames: #( line column)
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
  AbstractNode( parent line column)
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
  instVarNames: #( arg annotation)
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
  AbstractNode( parent line column)
    ArgAst( arg annotation)
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
  AbstractNode( parent)
    ExcepthandlerAst
      ExceptHandlerAst( type name body)
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
  AbstractNode( line column)
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
  AbstractNode( parent line column)
    ExpressionAst
      PyAttribute( value attribute context)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyAwait( value)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyBinOp( left op right)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        BoolOpAst( op values)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
    PyBoolop
      PyOr
'
%
expectvalue /Class
doit
OrAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BytesAst
expectvalue /Class
doit
ExpressionAst subclass: 'BytesAst'
  instVarNames: #( s)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BytesAst comment: 
'No class-specific documentation for BytesAst, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        BytesAst( s)
'
%
expectvalue /Class
doit
BytesAst category: 'Parser'
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
  AbstractNode( parent line column)
    ExpressionAst
      CallAst( function arguments keywords)
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
  AbstractNode( parent line column)
    ExpressionAst
      PyCompare( left cmpopList comparatorList)
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
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ConstantAst comment: 
'No class-specific documentation for PyConstant, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyConstant( value)
'
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyDict( keys values)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyDictComp( key value generators)
'
%
expectvalue /Class
doit
DictCompAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for EllipsisAst
expectvalue /Class
doit
ExpressionAst subclass: 'EllipsisAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
EllipsisAst comment: 
'No class-specific documentation for PyEllipsis, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyEllipsis
'
%
expectvalue /Class
doit
EllipsisAst category: 'Parser'
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyFormattedValue( value conversion format_spec)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyGeneratorExp( elt generators)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyIfExp( args body)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyJoinedStr( values)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyLambda( op values)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyList( elts ctx)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyListComp( elt generators)
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
  AbstractNode( parent)
    AbstractLocationNode( line column)
      ExpressionAst
        NameAst( assoc id ctx)
          KeywordsAst
'
%
expectvalue /Class
doit
KeywordsAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NameConstantAst
expectvalue /Class
doit
ExpressionAst subclass: 'NameConstantAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #( singleton)
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NameConstantAst comment: 
'No class-specific documentation for NameConstantAst, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        NameConstantAst( value)
'
%
expectvalue /Class
doit
NameConstantAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for FalseAst
expectvalue /Class
doit
NameConstantAst subclass: 'FalseAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FalseAst comment: 
'No class-specific documentation for FalseAst, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        NameConstantAst( value)
          FalseAst
'
%
expectvalue /Class
doit
FalseAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NoneAst
expectvalue /Class
doit
NameConstantAst subclass: 'NoneAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NoneAst comment: 
'No class-specific documentation for NoneAst, hierarchy is: 
Object
  NoneAst
'
%
expectvalue /Class
doit
NoneAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for TrueAst
expectvalue /Class
doit
NameConstantAst subclass: 'TrueAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TrueAst comment: 
'No class-specific documentation for TrueAst, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        NameConstantAst( value)
          TrueAst
'
%
expectvalue /Class
doit
TrueAst category: 'Parser'
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
! ------------------- Class definition for NumAst
expectvalue /Class
doit
ExpressionAst subclass: 'NumAst'
  instVarNames: #( n)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NumAst comment: 
'No class-specific documentation for NumAst, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        NumAst( n)
'
%
expectvalue /Class
doit
NumAst category: 'Parser'
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PySet( elts)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PySetComp( elt generators)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyStarred( value ctx)
'
%
expectvalue /Class
doit
StarredAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StrAst
expectvalue /Class
doit
ExpressionAst subclass: 'StrAst'
  instVarNames: #( s)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StrAst comment: 
'No class-specific documentation for str, hierarchy is: 
Object
  AbstractNode( parent line column)
    ExpressionAst
      str( string)
'
%
expectvalue /Class
doit
StrAst category: 'Parser'
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyTuple( elts ctx)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        UnaryOpAst( op operand)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyYield( value)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyYieldFrom( value)
'
%
expectvalue /Class
doit
YieldFromAst category: 'Parser'
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
  AbstractNode( line column)
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
  AbstractNode( parent line column)
    StatementAst
      PyAnnAssign( target annotation value simple)
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
  AbstractNode( parent line column)
    StatementAst
      PyAssert( test msg)
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
  instVarNames: #( targets value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AssignAst comment: 
'No class-specific documentation for PyAssign, hierarchy is: 
Object
  AbstractNode( parent line column)
    StatementAst
      PyAssign( target value)
'
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
                    orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AsyncForAst comment: 
'No class-specific documentation for AsyncForAst, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        AsyncForAst( target iter body orelse)
'
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
                    decorator_list returns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AsyncFunctionDefAst comment: 
'No class-specific documentation for AsyncFunctionDefAst, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        AsyncFunctionDefAst( name args body decorator_list returns)
'
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
  instVarNames: #( items body)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        AsyncWithAst( items body)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyAugAssign( target op value)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
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
  AbstractNode( parent line column)
    StatementAst
      ClassDefAst( name bases keywords body decorator_list)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
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
  AbstractNode( parent line column)
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
  AbstractNode( parent line column)
    StatementAst
      ExprAst( expression)
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
                    orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ForAst comment: 
'No class-specific documentation for ForAst, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        ForAst( target iter body orelse)
'
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
                    decorator_list returns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FunctionDefAst comment: 
'FunctionDef(identifier name, arguments args, stmt* body, expr* decorator_list, expr? returns)'
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
  AbstractNode( parent)
    AbstractLocationNode( line column)
      StatementAst
        FunctionDefAst( assoc name args body decorator_list returns)
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
  AbstractNode( parent)
    AbstractLocationNode( line column)
      StatementAst
        FunctionDefAst( assoc name args body decorator_list returns)
          InstanceFunctionDefAst
'
%
expectvalue /Class
doit
InstanceFunctionDefAst category: 'Parser'
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyGlobal( names)
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
  AbstractNode( line column)
    IfAst( test trueCase falseCase)
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
    PyImport( aliases)
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
  AbstractNode( parent line column)
    StatementAst
      PyImportFrom( identifier alias int)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyNonlocal( names)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyRaise( exc cause)
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
  AbstractNode( parent line column)
    StatementAst
      ReturnAst( value)
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
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyTry( body handlers orelse finalbody)
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
  AbstractNode( parent line column)
    StatementAst
      PyWhile( test body orElse)
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
  instVarNames: #( items body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
WithAst comment: 
'No class-specific documentation for PyWith, hierarchy is: 
Object
  AbstractNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyWith( items body)
'
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
    AliasAst( name asName)
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
  instVarNames: #( args vararg kwonlyargs
                    kw_defaults kwarg defaults)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ArgumentsAst comment: 
'No class-specific documentation for ArgumentsAst, hierarchy is: 
Object
  AbstractNode( parent)
    ArgumentsAst( args vararg kwonlyargs kw_defaults kwarg defaults)
'
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
    ComprehensionAst( target iter ifs is_async)
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
  AbstractNode( line column)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
    ExpressionContextAst
      StoreAst
'
%
expectvalue /Class
doit
StoreAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for KeywordAst
expectvalue /Class
doit
AbstractNode subclass: 'KeywordAst'
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
  AbstractNode( parent)
    KeywordAst( arg value)
'
%
expectvalue /Class
doit
KeywordAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ModuleAst
expectvalue /Class
doit
AbstractNode subclass: 'ModuleAst'
  instVarNames: #( body name path
                    source stream scope)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
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
  AbstractNode( parent)
    OperatorAst
      PySub
'
%
expectvalue /Class
doit
SubAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SliceAbstractAst
expectvalue /Class
doit
AbstractNode subclass: 'SliceAbstractAst'
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
  AbstractNode( parent)
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
  AbstractNode( parent)
    SliceAbstractAst
      PyExtSlice( dims)
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
  AbstractNode( parent)
    SliceAbstractAst
      PyIndex( value)
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
  AbstractNode( parent)
    SliceAbstractAst
      PySlice( lower upper step)
'
%
expectvalue /Class
doit
SliceAst category: 'Parser'
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
  AbstractNode( parent)
    SuiteAst( body variables)
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
  AbstractNode( parent)
    WithItemAst( context_expr optional_vars)
'
%
expectvalue /Class
doit
WithItemAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for Namespace
expectvalue /Class
doit
SymbolDictionary subclass: 'Namespace'
  instVarNames: #( d)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
Namespace comment: 
'No class-specific documentation for Namespace, hierarchy is: 
Object
  Collection
    AbstractDictionary
      KeyValueDictionary( numElements numCollisions collisionLimit tableSize)
        IdentityKeyValueDictionary
          IdentityDictionary
            SymbolDictionary
              Namespace
'
%
expectvalue /Class
doit
Namespace category: 'builtins'
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
'No class-specific documentation for PythonObject, hierarchy is: 
object
  PythonObject( classAst dictionary)
'
%
expectvalue /Class
doit
object category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for AbstractContainer
expectvalue /Class
doit
object subclass: 'AbstractContainer'
  instVarNames: #( container)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
AbstractContainer category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for bytearray
expectvalue /Class
doit
AbstractContainer subclass: 'bytearray'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
bytearray comment: 
'https://docs.python.org/3/library/stdtypes.html#bytearray'
%
expectvalue /Class
doit
bytearray category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for bytes
expectvalue /Class
doit
AbstractContainer subclass: 'bytes'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( instancesInvariant disallowGciStore)

%
expectvalue /Class
doit
bytes comment: 
'https://docs.python.org/3/library/stdtypes.html#bytes-objects'
%
expectvalue /Class
doit
bytes category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for dict
expectvalue /Class
doit
AbstractContainer subclass: 'dict'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
dict comment: 
'No class-specific documentation for dict, hierarchy is: 
Object
  Collection
    AbstractDictionary
      KeyValueDictionary( numElements numCollisions collisionLimit tableSize)
        IdentityKeyValueDictionary
          IdentityDictionary
            SymbolDictionary
              dict
'
%
expectvalue /Class
doit
dict category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for list
expectvalue /Class
doit
AbstractContainer subclass: 'list'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
list comment: 
'No class-specific documentation for list, hierarchy is: 
Object
  Collection
    SequenceableCollection
      Array
        list
'
%
expectvalue /Class
doit
list category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for str
expectvalue /Class
doit
AbstractContainer subclass: 'str'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
str comment: 
'No class-specific documentation for str, hierarchy is: 
Object
  Collection
    SequenceableCollection
      CharacterCollection
        String
          Unicode7
            str
'
%
expectvalue /Class
doit
str category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for tuple
expectvalue /Class
doit
AbstractContainer subclass: 'tuple'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
tuple comment: 
'No class-specific documentation for tuple, hierarchy is: 
Object
  Collection
    SequenceableCollection
      Array
        tuple
'
%
expectvalue /Class
doit
tuple category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for AbstractNumber
expectvalue /Class
doit
object subclass: 'AbstractNumber'
  instVarNames: #( number)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AbstractNumber category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for complex
expectvalue /Class
doit
AbstractNumber subclass: 'complex'
  instVarNames: #( imaginary)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
complex comment: 
'No class-specific documentation for complex, hierarchy is: 
Object
  complex( real imaginary)
'
%
expectvalue /Class
doit
complex category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for float
expectvalue /Class
doit
AbstractNumber subclass: 'float'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
float comment: 
'No class-specific documentation for float, hierarchy is: 
Object
  object
    float
'
%
expectvalue /Class
doit
float category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for int
expectvalue /Class
doit
AbstractNumber subclass: 'int'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
int comment: 
'No class-specific documentation for int, hierarchy is: 
Object
  object
    int
'
%
expectvalue /Class
doit
int category: 'builtins'
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
'No class-specific documentation for bool, hierarchy is: 
Object
  object
    int
      bool
'
%
expectvalue /Class
doit
bool category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for class
expectvalue /Class
doit
object subclass: 'class'
  instVarNames: #( astNode scope)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
class comment: 
'This is the runtime artifact created by a class definition. Note that a class defined in a function will be created anew each time the function is called, so we don''t share the scope (as is done for a module).'
%
expectvalue /Class
doit
class category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for function
expectvalue /Class
doit
object subclass: 'function'
  instVarNames: #( astNode scope)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
function comment: 
'Instances of function are created by executing a FunctionDefAst.'
%
expectvalue /Class
doit
function category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for ClassFunction
expectvalue /Class
doit
function subclass: 'ClassFunction'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ClassFunction comment: 
'No class-specific documentation for ClassFunction, hierarchy is: 
Object
  function( astNode scope)
    ClassFunction
'
%
expectvalue /Class
doit
ClassFunction category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for InstanceFunction
expectvalue /Class
doit
function subclass: 'InstanceFunction'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
InstanceFunction comment: 
'No class-specific documentation for InstanceFunction, hierarchy is: 
Object
  function( astNode scope)
    InstanceFunction
'
%
expectvalue /Class
doit
InstanceFunction category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for Instance
expectvalue /Class
doit
object subclass: 'Instance'
  instVarNames: #( __class__ __dict__)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Instance comment: 
'No class-specific documentation for Instance, hierarchy is: 
Object
  SimpleObject( classAst)
    object( variables)
      Instance( attributes)
'
%
expectvalue /Class
doit
Instance category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for module
expectvalue /Class
doit
object subclass: 'module'
  instVarNames: #( globals)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
module comment: 
'module is the abstract superclass for modules coded in Smalltalk.'
%
expectvalue /Class
doit
module category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for _imp
expectvalue /Class
doit
module subclass: '_imp'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
_imp comment: 
'https://docs.python.org/3/library/importlib.html
cpython/Python/import.c

dir(sys.modules[''_imp''])
[
    ''__doc__, 
    ''__loader__, 
    ''__name__, 
    ''__package__, 
    ''__spec__, 
    ''_fix_co_filename, 
    ''acquire_lock, 
    ''check_hash_based_pycs, 
    ''create_builtin, 
    ''create_dynamic, 
    ''exec_builtin, 
    ''exec_dynamic, 
    ''extension_suffixes, 
    ''get_frozen_object, 
    ''init_frozen, 
    ''is_builtin, 
    ''is_frozen, 
    ''is_frozen_package, 
    ''lock_held, 
    ''release_lock, 
    ''source_hash''
]'
%
expectvalue /Class
doit
_imp category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for _thread
expectvalue /Class
doit
module subclass: '_thread'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
_thread comment: 
'https://docs.python.org/3/library/_thread.html'
%
expectvalue /Class
doit
_thread category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for _warnings
expectvalue /Class
doit
module subclass: '_warnings'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
_warnings comment: 
'_warnings.__dict__
{
    ''__name__'': ''_warnings'', 
    ''__doc__'': ''_warnings provides basic warning filtering support.\nIt is a helper module to speed up interpreter start-up.'', 
    ''__package__'': '''', 
    ''__loader__'': <class ''_frozen_importlib.BuiltinImporter''>, 
    ''__spec__'': ModuleSpec(name=''_warnings'', loader=<class ''_frozen_importlib.BuiltinImporter''>, origin=''built-in''), 
    ''warn'': <built-in function warn>, 
    ''warn_explicit'': <built-in function warn_explicit>, 
    ''_filters_mutated'': <built-in function _filters_mutated>, 
    ''filters'': [
        (''default'', None, <class ''DeprecationWarning''>, ''__main__'', 0), 
        (''ignore'', None, <class ''DeprecationWarning''>, None, 0), 
        (''ignore'', None, <class ''PendingDeprecationWarning''>, None, 0), 
        (''ignore'', None, <class ''ImportWarning''>, None, 0), 
        (''ignore'', None, <class ''ResourceWarning''>, None, 0)
    ], 
    ''_onceregistry'': {}, 
    ''_defaultaction'': ''default''
}'
%
expectvalue /Class
doit
_warnings category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for _weakref
expectvalue /Class
doit
module subclass: '_weakref'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
_weakref comment: 
'_weakref.__dict__
{
    ''__name__'': ''_weakref'', 
    ''__doc__'': ''Weak-reference support module.'', 
    ''__package__'': '''', 
    ''__loader__'': <class ''_frozen_importlib.BuiltinImporter''>, 
    ''__spec__'': ModuleSpec(name=''_weakref'', loader=<class ''_frozen_importlib.BuiltinImporter''>, origin=''built-in''), 
    ''getweakrefcount'': <built-in function getweakrefcount>, 
    ''_remove_dead_weakref'': <built-in function _remove_dead_weakref>, 
    ''getweakrefs'': <built-in function getweakrefs>, 
    ''proxy'': <built-in function proxy>, 
    ''ref'': <class ''weakref''>, 
    ''ReferenceType'': <class ''weakref''>, 
    ''ProxyType'': <class ''weakproxy''>, 
    ''CallableProxyType'': <class ''weakcallableproxy''>
}'
%
expectvalue /Class
doit
_weakref category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for builtins
expectvalue /Class
doit
module subclass: 'builtins'
  instVarNames: #( stdout _sys)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
builtins comment: 
'https://docs.python.org/3/library/builtins.html'
%
expectvalue /Class
doit
builtins category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for sys
expectvalue /Class
doit
module subclass: 'sys'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
sys comment: 
'https://docs.python.org/3/library/sys.html'
%
expectvalue /Class
doit
sys category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for time
expectvalue /Class
doit
module subclass: 'time'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
time comment: 
'https://docs.python.org/3/library/time.html'
%
expectvalue /Class
doit
time category: 'builtins'
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
Singleton category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for ellipsis
expectvalue /Class
doit
Singleton subclass: 'ellipsis'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ellipsis comment: 
'https://docs.python.org/3/reference/datamodel.html'
%
expectvalue /Class
doit
ellipsis category: 'builtins'
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
  options: #( instancesInvariant)

%
expectvalue /Class
doit
NoneType comment: 
'https://docs.python.org/3/reference/datamodel.html'
%
expectvalue /Class
doit
NoneType category: 'builtins'
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
NotImplementedType comment: 
'https://docs.python.org/3/reference/datamodel.html'
%
expectvalue /Class
doit
NotImplementedType category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for Scope
expectvalue /Class
doit
Object subclass: 'Scope'
  instVarNames: #( astNode outer variables)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Scope comment: 
'No class-specific documentation for Scope, hierarchy is: 
Object
  Scope( outer variables)
'
%
expectvalue /Class
doit
Scope category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for GlobalScope
expectvalue /Class
doit
Scope subclass: 'GlobalScope'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GlobalScope comment: 
'No class-specific documentation for GlobalScope, hierarchy is: 
Object
  Scope( outer variables)
    GlobalScope
'
%
expectvalue /Class
doit
GlobalScope category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for LocalScope
expectvalue /Class
doit
Scope subclass: 'LocalScope'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LocalScope comment: 
'No class-specific documentation for LocalScope, hierarchy is: 
Object
  Scope( outer variables)
    LocalScope
'
%
expectvalue /Class
doit
LocalScope category: 'builtins'
%
set compile_env: 0
! ------------------- Class definition for Iterator
expectvalue /Class
doit
ReadStream subclass: 'Iterator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Iterator category: 'builtins'
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
ImportTestCase debug: #''tst_importlib''.'
%
expectvalue /Class
doit
PythonTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for BuiltinsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BuiltinsTestCase comment: 
'No class-specific documentation for BuiltinsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        BuiltinsTestCase
'
%
expectvalue /Class
doit
BuiltinsTestCase category: 'Tests'
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
    TestCase( testSelector)
      PythonTestCase( statements)
        ByteLiteralsTestCase
'
%
expectvalue /Class
doit
ByteLiteralsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for ClassesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ClassesTestCase comment: 
'Module([
	Assign([Name(''g'', Store(), lineno=4, col_offset=0)], Str(''G'', lineno=4, col_offset=4), lineno=4, col_offset=0), 
	ClassDef(''MyClass'', [], [], [
		Assign([Name(''iv1'', Store(), lineno=7, col_offset=4)], Str(''1'', lineno=7, col_offset=10), lineno=7, col_offset=4), 
		FunctionDef(''__init__'', arguments([arg(''self'', None, lineno=9, col_offset=17), arg(''p'', None, lineno=9, col_offset=23)], None, [], [], None, []), [
			Assign([Attribute(Name(''self'', Load(), lineno=10, col_offset=8), ''iv2'', Store(), lineno=10, col_offset=8)], Name(''p'', Load(), lineno=10, col_offset=19), lineno=10, col_offset=8)], [], None, lineno=9, col_offset=4), 
		FunctionDef(''foo'', arguments([arg(''self'', None, lineno=12, col_offset=12), arg(''p'', None, lineno=12, col_offset=18)], None, [], [], None, []), [
			Return(BinOp(BinOp(BinOp(BinOp(BinOp(BinOp(BinOp(Str(''MyClass>>foo('', lineno=13, col_offset=15), Add(), 
				Call(Name(''str'', Load(), lineno=13, col_offset=33), [Name(''self'', Load(), lineno=13, col_offset=37)], [], lineno=13, col_offset=33), lineno=13, col_offset=15), Add(), 
				Str('', '', lineno=13, col_offset=45), lineno=13, col_offset=43), Add(), 
				Name(''p'', Load(), lineno=13, col_offset=52), lineno=13, col_offset=50), Add(), 
				Str('') - '', lineno=13, col_offset=56), lineno=13, col_offset=54), Add(), 
				Attribute(Name(''self'', Load(), lineno=13, col_offset=65), ''iv1'', Load(), lineno=13, col_offset=65), lineno=13, col_offset=63), Add(), 
				Str('' - '', lineno=13, col_offset=76), lineno=13, col_offset=74), Add(), 
				Attribute(Name(''self'', Load(), lineno=13, col_offset=84), ''iv2'', Load(), lineno=13, col_offset=84), lineno=13, col_offset=82), lineno=13, col_offset=8)], [], None, lineno=12, col_offset=4), 
		FunctionDef(''bar1'', arguments([arg(''self'', None, lineno=15, col_offset=13), arg(''p'', None, lineno=15, col_offset=19)], None, [], [], None, []), [
			Return(BinOp(BinOp(BinOp(BinOp(Str(''MyClass>>bar1('', lineno=16, col_offset=15), Add(), 
				Call(Name(''str'', Load(), lineno=16, col_offset=34), [Name(''self'', Load(), lineno=16, col_offset=38)], [], lineno=16, col_offset=34), lineno=16, col_offset=15), Add(), 
				Str('', '', lineno=16, col_offset=46), lineno=16, col_offset=44), Add(), Name(''p'', Load(), lineno=16, col_offset=53), lineno=16, col_offset=51), Add(), 
				Str('')'', lineno=16, col_offset=57), lineno=16, col_offset=55), lineno=16, col_offset=8)], [], None, lineno=15, col_offset=4), 
		Assign([Name(''bar2'', Store(), lineno=18, col_offset=4)], Call(Name(''classmethod'', Load(), lineno=18, col_offset=11), [Name(''bar1'', Load(), lineno=18, col_offset=23)], [], lineno=18, col_offset=11), lineno=18, col_offset=4), 
		FunctionDef(''bar3'', arguments([arg(''self'', None, lineno=21, col_offset=13), arg(''p'', None, lineno=21, col_offset=19)], None, [], [], None, []), [
			Return(BinOp(BinOp(BinOp(BinOp(Str(''MyClass>>bar3('', lineno=22, col_offset=15), Add(), 
				Call(Name(''str'', Load(), lineno=22, col_offset=34), [Name(''self'', Load(), lineno=22, col_offset=38)], [], lineno=22, col_offset=34), lineno=22, col_offset=15), Add(), 
				Str('', '', lineno=22, col_offset=46), lineno=22, col_offset=44), Add(), 
				Name(''p'', Load(), lineno=22, col_offset=53), lineno=22, col_offset=51), Add(), 
				Str('')'', lineno=22, col_offset=57), lineno=22, col_offset=55), lineno=22, col_offset=8)], 
			[Name(''classmethod'', Load(), lineno=20, col_offset=5)], None, lineno=20, col_offset=4)
	], [], lineno=6, col_offset=0), 
	Assign([Name(''o'', Store(), lineno=24, col_offset=0)], Call(Name(''MyClass'', Load(), lineno=24, col_offset=4), [Str(''A'', lineno=24, col_offset=12)], [], lineno=24, col_offset=4), lineno=24, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=25, col_offset=0), [
		Call(Attribute(Name(''o'', Load(), lineno=25, col_offset=6), ''foo'', Load(), lineno=25, col_offset=6), [Str(''B'', lineno=25, col_offset=12)], [], lineno=25, col_offset=6)], [], lineno=25, col_offset=0), lineno=25, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=26, col_offset=0), [
		Call(Attribute(Name(''o'', Load(), lineno=26, col_offset=6), ''bar1'', Load(), lineno=26, col_offset=6), [Str(''B'', lineno=26, col_offset=13)], [], lineno=26, col_offset=6)], [], lineno=26, col_offset=0), lineno=26, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=27, col_offset=0), [
		Call(Attribute(Name(''o'', Load(), lineno=27, col_offset=6), ''bar2'', Load(), lineno=27, col_offset=6), [Str(''C'', lineno=27, col_offset=13)], [], lineno=27, col_offset=6)], [], lineno=27, col_offset=0), lineno=27, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=28, col_offset=0), [
		Call(Attribute(Name(''MyClass'', Load(), lineno=28, col_offset=6), ''bar1'', Load(), lineno=28, col_offset=6), [Str(''C'', lineno=28, col_offset=19), Str(''D'', lineno=28, col_offset=24)], [], lineno=28, col_offset=6)], [], lineno=28, col_offset=0), lineno=28, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=29, col_offset=0), [
		Call(Attribute(Name(''MyClass'', Load(), lineno=29, col_offset=6), ''bar2'', Load(), lineno=29, col_offset=6), [Str(''C'', lineno=29, col_offset=19)], [], lineno=29, col_offset=6)], [], lineno=29, col_offset=0), lineno=29, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=30, col_offset=0), [
		Call(Attribute(Name(''MyClass'', Load(), lineno=30, col_offset=6), ''bar3'', Load(), lineno=30, col_offset=6), [Str(''C'', lineno=30, col_offset=19)], [], lineno=30, col_offset=6)], [], lineno=30, col_offset=0), lineno=30, col_offset=0)])'
%
expectvalue /Class
doit
ClassesTestCase category: 'Tests'
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
'No class-specific documentation for CompoundStatementsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        CompoundStatementsTestCase
'
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
    TestCase( testSelector)
      PythonTestCase( statements)
        DelimitersTestCase
'
%
expectvalue /Class
doit
DelimitersTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for EvaluateTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EvaluateTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
EvaluateTestCase comment: 
'No class-specific documentation for EvaluateTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        EvaluateTestCase
'
%
expectvalue /Class
doit
EvaluateTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for ExceptionsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptionsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExceptionsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for ExecuteTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecuteTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExecuteTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for ImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportTestCase comment: 
'This is the wrapper for Python''s built-in regression test suite.'
%
expectvalue /Class
doit
ImportTestCase category: 'Tests'
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
    TestCase( testSelector)
      PythonTestCase( statements)
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
    TestCase( testSelector)
      PythonTestCase( statements)
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
    TestCase( testSelector)
      PythonTestCase( statements)
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
    TestCase( testSelector)
      PythonTestCase
        StringLiteralsTestCase( statements)
'
%
expectvalue /Class
doit
StringLiteralsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for SysTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SysTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SysTestCase comment: 
'No class-specific documentation for SysTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements stdout)
        SysTestCase
'
%
expectvalue /Class
doit
SysTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for TimeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TimeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TimeTestCase comment: 
'No class-specific documentation for TimeTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements stdout)
        TimeTestCase
'
%
expectvalue /Class
doit
TimeTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for VariableTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'VariableTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
VariableTestCase comment: 
'No class-specific documentation for VariableTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        VariableTestCase
'
%
expectvalue /Class
doit
VariableTestCase category: 'Tests'
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
    TestResource( name description)
      PythonTestResource( statements)
'
%
expectvalue /Class
doit
PythonTestResource category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for UserInteraction
expectvalue /Class
doit
Object subclass: 'UserInteraction'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UserInteraction category: 'builtins'
%

input _imp.gs
input _thread.gs
input _warnings.gs
input _weakref.gs
input AbstractContainer.gs
input AbstractLocationNode.gs
input AbstractNode.gs
input AbstractNumber.gs
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
input BaseException.gs
input BinOpAst.gs
input BitAndAst.gs
input BitOrAst.gs
input BitXorAst.gs
input BlockAst.gs
input BlockingIOError.gs
input bool.gs
input BoolOpAst.gs
input BreakAst.gs
input BreakNotification.gs
input BrokenPipeError.gs
input BufferError.gs
input builtins.gs
input BuiltinsTestCase.gs
input bytearray.gs
input ByteLiteralsTestCase.gs
input bytes.gs
input BytesAst.gs
input BytesWarning.gs
input CallAst.gs
input CancelNotification.gs
input ChildProcessError.gs
input class.gs
input ClassDefAst.gs
input ClassesTestCase.gs
input ClassFunction.gs
input ClassFunctionDefAst.gs
input CmpOpAst.gs
input CompareAst.gs
input complex.gs
input CompoundStatementsTestCase.gs
input ComprehensionAst.gs
input ConnectionAbortedError.gs
input ConnectionError.gs
input ConnectionRefusedError.gs
input ConnectionResetError.gs
input ConstantAst.gs
input ContinueAst.gs
input ContinueNotification.gs
input DelAst.gs
input DeleteAst.gs
input DelimitersTestCase.gs
input DeprecationWarning.gs
input dict.gs
input DictAst.gs
input DictCompAst.gs
input DivAst.gs
input ellipsis.gs
input EllipsisAst.gs
input EOFError.gs
input EqAst.gs
input EvaluateTestCase.gs
input ExceptHandlerAst.gs
input Exception.gs
input ExceptionsTestCase.gs
input ExecuteTestCase.gs
input ExprAst.gs
input ExpressionAst.gs
input ExpressionContextAst.gs
input ExtSliceAst.gs
input FalseAst.gs
input FileExistsError.gs
input FileNotFoundError.gs
input float.gs
input FloatingPointError.gs
input FloorDivAst.gs
input ForAst.gs
input FormattedValueAst.gs
input function.gs
input FunctionDefAst.gs
input FutureWarning.gs
input GeneratorExit.gs
input GeneratorExpAst.gs
input GlobalAst.gs
input GlobalScope.gs
input GtAst.gs
input GtEAst.gs
input IfAst.gs
input IfExpAst.gs
input ImportAst.gs
input ImportError.gs
input ImportFromAst.gs
input ImportTestCase.gs
input ImportWarning.gs
input InAst.gs
input IndentationError.gs
input IndexAst.gs
input IndexError.gs
input Instance.gs
input InstanceFunction.gs
input InstanceFunctionDefAst.gs
input int.gs
input InterruptedError.gs
input InvertAst.gs
input IsADirectoryError.gs
input IsAst.gs
input IsNotAst.gs
input Iterator.gs
input JoinedStrAst.gs
input KeyboardInterrupt.gs
input KeyError.gs
input KeywordAst.gs
input KeywordsAst.gs
input LambdaAst.gs
input list.gs
input ListAst.gs
input ListCompAst.gs
input LoadAst.gs
input LocalScope.gs
input LookupError.gs
input LShiftAst.gs
input LtAst.gs
input LtEAst.gs
input MatMultAst.gs
input MemoryError.gs
input ModAst.gs
input module.gs
input ModuleAst.gs
input ModuleNotFoundError.gs
input MultAst.gs
input NameAst.gs
input NameConstantAst.gs
input NamedExprAst.gs
input NameError.gs
input Namespace.gs
input NoneAst.gs
input NoneType.gs
input NonlocalAst.gs
input NotADirectoryError.gs
input NotAst.gs
input NotEqAst.gs
input NotImplementedError.gs
input NotImplementedType.gs
input NotInAst.gs
input NumAst.gs
input NumericLiteralsTestCase.gs
input object.gs
input OperatorAst.gs
input OperatorsTestCase.gs
input OrAst.gs
input OSError.gs
input OverflowError.gs
input Package.gs
input ParamAst.gs
input PassAst.gs
input PendingDeprecationWarning.gs
input PermissionError.gs
input PowAst.gs
input ProcessLookupError.gs
input PythonTestCase.gs
input PythonTestResource.gs
input RaiseAst.gs
input RecursionError.gs
input ReferenceError.gs
input ResourceWarning.gs
input ReturnAst.gs
input ReturnNotification.gs
input RShiftAst.gs
input RuntimeError.gs
input RuntimeWarning.gs
input Scope.gs
input SetAst.gs
input SetCompAst.gs
input SimpleStatementsTestCase.gs
input Singleton.gs
input SliceAbstractAst.gs
input SliceAst.gs
input StarredAst.gs
input StatementAst.gs
input StopAsyncIteration.gs
input StopIteration.gs
input StoreAst.gs
input str.gs
input StrAst.gs
input StringLiteralsTestCase.gs
input SubAst.gs
input SubscriptAst.gs
input SuiteAst.gs
input SyntaxError.gs
input SyntaxWarning.gs
input sys.gs
input SystemError.gs
input SystemException.gs
input SysTestCase.gs
input TabError.gs
input time.gs
input TimeoutError.gs
input TimeTestCase.gs
input TrueAst.gs
input TryAst.gs
input tuple.gs
input TupleAst.gs
input TypeError.gs
input UAddAst.gs
input UnaryOpAst.gs
input UnboundLocalError.gs
input UnicodeDecodeError.gs
input UnicodeEncodeError.gs
input UnicodeError.gs
input UnicodeTranslateError.gs
input UnicodeWarning.gs
input UserInteraction.gs
input UserWarning.gs
input USubAst.gs
input ValueError.gs
input VariableTestCase.gs
input Warning.gs
input WhileAst.gs
input WithAst.gs
input WithItemAst.gs
input YieldAst.gs
input YieldFromAst.gs
input ZeroDivisionError.gs
