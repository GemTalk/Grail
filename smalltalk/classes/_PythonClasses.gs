! ===============================================================================
! Python Class Definitions and Method Imports
! ===============================================================================
! This file defines Python built-in types and imports their method implementations.
! Some types map to existing GemStone Smalltalk classes (e.g., object -> Object),
! while others are new classes specific to Python (e.g., complex).
!
! NOTE: This file assumes the Python SymbolDictionary already exists.
!       Use smalltalk/install.gs to create the dictionary structure.
!
! PERMISSIONS:
! - This file handles user switching internally
! - Type mappings are done as DataCurator
! - Adding methods to GemStone base classes requires SystemUser
! - Creating new Python classes is done as DataCurator
! ===============================================================================

! Start in GemStone Smalltalk environment
set compile_env: 0

! ===============================================================================
! Python Singletons - GemStone Singletons (as DataCurator)
! ===============================================================================
! Map Python type names to existing GemStone Smalltalk classes.
! These classes already exist in GemStone; we just add them to the Python dictionary.
! ===============================================================================

! ------- Add existing GemStone globals and classes as Python objects and classes
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
	at: #'dict'                       put: Dictionary;
	at: #'float'                      put: Float;
	at: #'frozenset'                  put: Set;
	at: #'int'                        put: Integer;
	at: #'list'                       put: OrderedCollection;
	at: #'object'                     put: Object;
	at: #'range'                      put: Interval;
	at: #'str'                        put: Unicode7;
	at: #'tuple'                      put: InvariantArray;
	yourself.
%

! ------- NOTE: All Python exceptions are now created as Python classes
! ------- to ensure proper inheritance from BaseException and access to __new__ methods.
! ------- Previously, some exceptions were mapped to GemStone classes, but this
! ------- broke the inheritance chain and prevented access to Python exception methods.

! ===============================================================================
! Python Exception Class Definitions (as DataCurator)
! ===============================================================================
! Define Python exception classes BEFORE switching to SystemUser.
! This ensures that exception classes like IndexError, ValueError, TypeError
! are available when we import methods for base classes (which may reference them).
! We use GemStone's Exception as the base for Python's BaseException to ensure
! compatibility with GemStone's exception handling mechanism.
! ===============================================================================

! ------- BaseException (Python's root exception class)
expectvalue /Class
doit
Exception subclass: 'BaseException'
  instVarNames: #( args )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
BaseException comment:
'Python BaseException - root of Python exception hierarchy.

This is the base class for all built-in exceptions in Python.
It inherits from GemStone''s Exception to integrate with GemStone''s
exception handling mechanism.

Instance variables:
  args - tuple of arguments passed to the exception constructor
         (Note: This is separate from GemStone''s gsArgs instance variable)
'
%
expectvalue /Class
doit
BaseException category: 'Exceptions'
%

! ------- Exception (Python's main exception class)
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
Exception comment:
'Python Exception - base class for most Python exceptions.

All built-in, non-system-exiting exceptions are derived from this class.
All user-defined exceptions should also be derived from this class.
'
%
expectvalue /Class
doit
Exception category: 'Exceptions'
%

! ------- LookupError (base for IndexError and KeyError)
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
LookupError category: 'Exceptions'
%

! ------- IndexError (used by list and tuple)
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
IndexError category: 'Exceptions'
%

! ------- TypeError (used by tuple for immutability)
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
TypeError category: 'Exceptions'
%

! ------- ValueError (used by list and tuple)
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
ValueError category: 'Exceptions'
%

! ------- StatisticsError (used by statistics module)
expectvalue /Class
doit
ValueError subclass: 'StatisticsError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
StatisticsError category: 'Exceptions'
%

! ------- ArithmeticError
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
ArithmeticError category: 'Exceptions'
%

! ------- OverflowError
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
OverflowError category: 'Exceptions'
%

! ------- FloatingPointError
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
FloatingPointError category: 'Exceptions'
%

! ------- ZeroDivisionError
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
ZeroDivisionError category: 'Exceptions'
%

! ------- AssertionError
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
AssertionError category: 'Exceptions'
%

! ------- AttributeError
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
AttributeError category: 'Exceptions'
%

! ------- BufferError
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
BufferError category: 'Exceptions'
%

! ------- EOFError
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
EOFError category: 'Exceptions'
%

! ------- MemoryError
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
MemoryError category: 'Exceptions'
%

! ------- ImportError
expectvalue /Class
doit
Exception subclass: 'ImportError'
  instVarNames: #( name path msg )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
ImportError comment:
'Python ImportError exception.

Instance variables:
  name - name of the module that failed to import
  path - path to the module file
  msg - error message
'
%
expectvalue /Class
doit
ImportError category: 'Exceptions'
%

! ------- ModuleNotFoundError
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
ModuleNotFoundError category: 'Exceptions'
%

! ------- KeyError (subclass of LookupError which maps to GemStone LookupError)
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
KeyError category: 'Exceptions'
%

! ------- NameError
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
NameError category: 'Exceptions'
%

! ------- UnboundLocalError
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
UnboundLocalError category: 'Exceptions'
%

! ------- ReferenceError
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
ReferenceError category: 'Exceptions'
%

! ------- RuntimeError
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
RuntimeError category: 'Exceptions'
%

! ------- NotImplementedError
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
NotImplementedError category: 'Exceptions'
%

! ------- RecursionError
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
RecursionError category: 'Exceptions'
%

! ------- StopIteration
expectvalue /Class
doit
Exception subclass: 'StopIteration'
  instVarNames: #( value )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
StopIteration comment:
'Python StopIteration exception.

Instance variables:
  value - the value returned by the iterator
'
%
expectvalue /Class
doit
StopIteration category: 'Exceptions'
%

! ------- StopAsyncIteration
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
StopAsyncIteration category: 'Exceptions'
%

! ------- SyntaxError
expectvalue /Class
doit
Exception subclass: 'SyntaxError'
  instVarNames: #( msg filename lineno offset text end_lineno end_offset )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
SyntaxError comment:
'Python SyntaxError exception.

Instance variables:
  msg - error message
  filename - name of the file with the syntax error
  lineno - line number where the error occurred
  offset - column offset where the error occurred
  text - text of the line with the error
  end_lineno - end line number (Python 3.10+)
  end_offset - end column offset (Python 3.10+)
'
%
expectvalue /Class
doit
SyntaxError category: 'Exceptions'
%

! ------- IndentationError
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
IndentationError category: 'Exceptions'
%

! ------- TabError
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
TabError category: 'Exceptions'
%

! ------- SystemError
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
SystemError category: 'Exceptions'
%

! ------- UnicodeError
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
UnicodeError category: 'Exceptions'
%

! ------- UnicodeDecodeError
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
UnicodeDecodeError category: 'Exceptions'
%

! ------- UnicodeEncodeError
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
UnicodeEncodeError category: 'Exceptions'
%

! ------- UnicodeTranslateError
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
UnicodeTranslateError category: 'Exceptions'
%

! ------- OSError (needs instance variables, so create as Python class)
expectvalue /Class
doit
Exception subclass: 'OSError'
  instVarNames: #( errno strerror filename filename2 )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
OSError comment:
'Python OSError exception.

Instance variables:
  errno - error number
  strerror - error message string
  filename - name of the file involved (if any)
  filename2 - second filename (for operations involving two files)
'
%
expectvalue /Class
doit
OSError category: 'Exceptions'
%

! ------- OSError subclasses
! ------- BlockingIOError
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
BlockingIOError category: 'Exceptions'
%

! ------- ChildProcessError
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
ChildProcessError category: 'Exceptions'
%

! ------- ConnectionError
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
ConnectionError category: 'Exceptions'
%

! ------- BrokenPipeError
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
BrokenPipeError category: 'Exceptions'
%

! ------- ConnectionAbortedError
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
ConnectionAbortedError category: 'Exceptions'
%

! ------- ConnectionRefusedError
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
ConnectionRefusedError category: 'Exceptions'
%

! ------- ConnectionResetError
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
ConnectionResetError category: 'Exceptions'
%

! ------- FileExistsError
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
FileExistsError category: 'Exceptions'
%

! ------- FileNotFoundError
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
FileNotFoundError category: 'Exceptions'
%

! ------- InterruptedError
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
InterruptedError category: 'Exceptions'
%

! ------- IsADirectoryError
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
IsADirectoryError category: 'Exceptions'
%

! ------- NotADirectoryError
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
NotADirectoryError category: 'Exceptions'
%

! ------- PermissionError
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
PermissionError category: 'Exceptions'
%

! ------- ProcessLookupError
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
ProcessLookupError category: 'Exceptions'
%

! ------- TimeoutError
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
TimeoutError category: 'Exceptions'
%

! ------- Warning
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
Warning category: 'Exceptions'
%

! ------- Warning subclasses
! ------- DeprecationWarning
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
DeprecationWarning category: 'Exceptions'
%

! ------- PendingDeprecationWarning
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
PendingDeprecationWarning category: 'Exceptions'
%

! ------- RuntimeWarning
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
RuntimeWarning category: 'Exceptions'
%

! ------- SyntaxWarning
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
SyntaxWarning category: 'Exceptions'
%

! ------- UserWarning
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
UserWarning category: 'Exceptions'
%

! ------- FutureWarning
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
FutureWarning category: 'Exceptions'
%

! ------- ImportWarning
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
ImportWarning category: 'Exceptions'
%

! ------- UnicodeWarning
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
UnicodeWarning category: 'Exceptions'
%

! ------- BytesWarning
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
BytesWarning category: 'Exceptions'
%

! ------- ResourceWarning
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
ResourceWarning category: 'Exceptions'
%

! ------- EncodingWarning
expectvalue /Class
doit
Warning subclass: 'EncodingWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
EncodingWarning category: 'Exceptions'
%

! ------- Special exceptions that inherit directly from BaseException
! ------- GeneratorExit
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
GeneratorExit comment:
'Request that a generator exit.

This exception is raised when a generator''s close() method is called.
It inherits directly from BaseException instead of Exception since it is
technically not an error.
'
%
expectvalue /Class
doit
GeneratorExit category: 'Exceptions'
%

! ------- KeyboardInterrupt
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
KeyboardInterrupt comment:
'Program interrupted by user.

This exception is raised when the user hits the interrupt key (normally
Control-C or Delete). It inherits from BaseException so that it is not
accidentally caught by code that catches Exception.
'
%
expectvalue /Class
doit
KeyboardInterrupt category: 'Exceptions'
%

! ------- SystemExit
expectvalue /Class
doit
BaseException subclass: 'SystemExit'
  instVarNames: #( code )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
SystemExit comment:
'Request to exit from the interpreter.

This exception is raised by the sys.exit() function. It inherits from
BaseException instead of Exception so that it is not accidentally caught
by code that catches Exception.

Instance variables:
  code - the exit status code
'
%
expectvalue /Class
doit
SystemExit category: 'Exceptions'
%

! ------- BaseExceptionGroup (Python 3.11+)
expectvalue /Class
doit
BaseException subclass: 'BaseExceptionGroup'
  instVarNames: #( message exceptions )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
BaseExceptionGroup comment:
'A group of unrelated exceptions.

Introduced in Python 3.11 to support exception groups.

Instance variables:
  message - description of the exception group
  exceptions - sequence of exceptions in the group
'
%
expectvalue /Class
doit
BaseExceptionGroup category: 'Exceptions'
%

! ------- ExceptionGroup (Python 3.11+)
expectvalue /Class
doit
BaseExceptionGroup subclass: 'ExceptionGroup'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
ExceptionGroup comment:
'A group of Exception instances.

This is a subclass of BaseExceptionGroup that can only contain Exception
instances (not BaseException instances like KeyboardInterrupt or SystemExit).
'
%
expectvalue /Class
doit
ExceptionGroup category: 'Exceptions'
%

! ===============================================================================
! Python Class Definitions - Other New Python Classes (as DataCurator)
! ===============================================================================
! Define new classes specific to Python that don't exist in GemStone.
! These are created as DataCurator.
! ===============================================================================

! ------- bytearray class (Python 'bytearray' type - mutable bytes)
expectvalue /Class
doit
bytes subclass: 'bytearray'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
bytearray comment:
'Python bytearray type - mutable sequence of bytes.

This is the mutable variant of bytes. It inherits all methods from ByteArray
(which implements Python''s bytes type) but allows mutation through __setitem__
and provides additional mutation methods like append, extend, insert, etc.

Unlike bytes (ByteArray), bytearray instances can be modified in place.
'
%
expectvalue /Class
doit
bytearray category: 'Collections-Ordered'
%

! ------- set class (Python 'set' type - mutable set)
expectvalue /Class
doit
frozenset subclass: 'set'
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
'Python set type - mutable unordered collection of unique hashable elements.

This is the mutable variant of frozenset. It inherits all methods from Set
(which implements Python''s frozenset type) but allows mutation through add,
remove, discard, pop, clear, and update methods.

Unlike frozenset (Set), set instances:
- Can be modified in place
- Are not hashable (cannot be used as dict keys or set elements)
- Support in-place set operations (&=, |=, -=, ^=)

Set uses equality-based comparison (via __eq__ and __hash__) for membership
testing, not identity-based comparison.
'
%
expectvalue /Class
doit
set category: 'Collections-Unordered'
%

! ------- complex class (Python 'complex' type)
expectvalue /Class
doit
object subclass: 'complex'
  instVarNames: #( real imag)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
complex comment:
'Python complex number type.

Represents complex numbers with real and imaginary parts.
Both parts are stored as Float values internally.

Instance variables:
  real - the real part (Float)
  imag - the imaginary part (Float)
'
%
expectvalue /Class
doit
complex category: 'Numbers'
%
	
! ------- module class (Python 'module' type)
expectvalue /Class
doit
object subclass: 'module'
	  instVarNames: #('__name__' '__package__' '__loader__' '__spec__' '__doc__')
  classVars: #()
  classInstVars: #('instance')
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
module comment:
'Python module type.

This is the type of all module objects (e.g., sys, math, os).
It represents Python modules as first-class objects. Concrete
modules like sys, math, and importlib are implemented as
singleton classes that conceptually have this type.
'
%
expectvalue /Class
doit
module category: 'Modules'
%

! ------- builtins class (Python 'builtins' module)
expectvalue /Class
doit
module subclass: 'builtins'
  instVarNames: #('abs' 'len' 'type' 'repr' 'str' 'hash' 'hex' 'oct' 'bin' 'chr' 'ord' 'min' 'max' 'sum' 'all' 'any' 'isinstance' 'callable' 'dir' 'id' 'pow' 'powWithMod' 'round' 'roundWithDigits' 'divmod' 'print' 'input' 'inputWithPrompt' 'sorted' 'reversed' 'enumerate' 'zip' '__import__')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
builtins comment:
'Python builtins module.

This class provides access to Python''s built-in functions like abs(), len(), print(), etc.
Each method in this class corresponds to a Python built-in function.

See https://docs.python.org/3/library/functions.html for the complete list.
'
%
expectvalue /Class
doit
builtins category: 'Modules'
%

! ------- math class (Python 'math' module)
expectvalue /Class
doit
module subclass: 'math'
  instVarNames: #('pi' 'e' 'tau' 'inf' 'nan' 'sqrt' 'pow' 'exp' 'log' 'logWithBase' 'log10' 'log2' 'sin' 'cos' 'tan' 'asin' 'acos' 'atan' 'atan2' 'sinh' 'cosh' 'tanh' 'asinh' 'acosh' 'atanh' 'ceil' 'floor' 'trunc' 'factorial' 'gcd' 'lcm' 'fabs' 'isnan' 'isinf' 'isfinite' 'degrees' 'radians')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
math comment:
'Python math module.

This class provides access to mathematical functions and constants.
Each method in this class corresponds to a Python math module function.

See https://docs.python.org/3/library/math.html for the complete list.
'
%
expectvalue /Class
doit
math category: 'Modules'
%

! ------- gemstone class (Python 'gemstone' module)
expectvalue /Class
doit
module subclass: 'gemstone'
  instVarNames: #('version')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
gemstone comment:
'Python gemstone module.

This class provides basic metadata about the Grail runtime.
'
%
expectvalue /Class
doit
gemstone category: 'Modules'
%

! ------- cmath class (Python 'cmath' module)
expectvalue /Class
doit
module subclass: 'cmath'
  instVarNames: #('pi' 'e' 'tau' 'inf' 'infj' 'nan' 'nanj' 'sin' 'cos' 'tan' 'sinh' 'cosh' 'tanh' 'exp' 'log' 'log10' 'sqrt' 'phase' 'polar' 'rect' 'isnan' 'isinf' 'isfinite')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
cmath comment:
'Python cmath module.

This class provides access to mathematical functions for complex numbers.
Each method in this class corresponds to a Python cmath module function.

See https://docs.python.org/3/library/cmath.html for the complete list.
'
%
expectvalue /Class
doit
cmath category: 'Modules'
%

! ------- random class (Python 'random' module)
expectvalue /Class
doit
module subclass: 'random'
  instVarNames: #('_generator' 'random' 'seed' 'getstate' 'setstate' 'getrandbits' 'randbytes' 'randrange' 'randint' 'choice' 'choices' 'shuffle' 'sample' 'uniform' 'triangular' 'gauss' 'normalvariate' 'lognormvariate' 'expovariate' 'gammavariate' 'betavariate' 'paretovariate' 'weibullvariate' 'binomialvariate')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
random comment:
'Python random module.

This class provides pseudo-random number generation for various distributions.
The module uses GemStone''s Random class as the underlying generator.

Core functions:
- random() - Return a random float in [0.0, 1.0)
- seed(a) - Initialize the random number generator
- randint(a, b) - Return random integer in [a, b]
- randrange(start, stop, step) - Return random element from range

Sequence functions:
- choice(seq) - Return random element from sequence
- choices(pop, weights, k) - Return k elements with replacement
- shuffle(x) - Shuffle list in place
- sample(pop, k) - Return k unique elements

Distribution functions:
- uniform(a, b) - Return random float in [a, b]
- gauss(mu, sigma) - Gaussian distribution
- expovariate(lambd) - Exponential distribution

See https://docs.python.org/3/library/random.html for the complete list.
'
%
expectvalue /Class
doit
random category: 'Modules'
%

! ------- statistics class (Python 'statistics' module)
expectvalue /Class
doit
module subclass: 'statistics'
  instVarNames: #('mean' 'fmean' 'geometric_mean' 'harmonic_mean' 'median' 'median_low' 'median_high' 'median_grouped' 'mode' 'multimode' 'quantiles' 'pstdev' 'pvariance' 'stdev' 'variance' 'covariance' 'correlation' 'linear_regression')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
statistics comment:
'Python statistics module.

This class provides functions for calculating mathematical statistics of numeric data.

Averages and measures of central location:
- mean(data) - Arithmetic mean
- fmean(data) - Fast floating-point mean
- geometric_mean(data) - Geometric mean
- harmonic_mean(data) - Harmonic mean
- median(data) - Median (middle value)
- median_low(data) - Low median
- median_high(data) - High median
- median_grouped(data, interval) - Median of grouped data
- mode(data) - Single mode (most common value)
- multimode(data) - List of modes

Measures of spread:
- pstdev(data, mu) - Population standard deviation
- pvariance(data, mu) - Population variance
- stdev(data, xbar) - Sample standard deviation
- variance(data, xbar) - Sample variance

Statistics for relations between two inputs:
- covariance(x, y) - Sample covariance
- correlation(x, y) - Pearson correlation coefficient
- linear_regression(x, y) - Slope and intercept for linear regression

See https://docs.python.org/3/library/statistics.html for the complete list.
'
%
expectvalue /Class
doit
statistics category: 'Modules'
%

! ------- fractions class (Python 'fractions' module)
expectvalue /Class
doit
module subclass: 'fractions'
  instVarNames: #('fractionClass')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
fractions comment:
'Python fractions module.

This class provides rational number functionality via the Fraction type.
Currently implemented as an empty stub module.
'
%
expectvalue /Class
doit
fractions category: 'Modules'
%

! ------- numbers module ABC classes (Python 'numbers' module)
! These are Abstract Base Classes that form the numeric tower (PEP 3141)

! ------- numbers_Number class (root of numeric hierarchy)
expectvalue /Class
doit
object subclass: 'numbers_Number'
  instVarNames: #()
  classVars: #()
  classInstVars: #('registeredTypes')
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
numbers_Number comment:
'Python numbers.Number - root of the numeric hierarchy (PEP 3141).

This is an Abstract Base Class. Use isinstance(x, Number) to check
if an argument x is a number, without caring what kind.

Class instance variable:
  registeredTypes - Set of classes registered with this ABC
'
%
expectvalue /Class
doit
numbers_Number category: 'Numbers-ABC'
%

! ------- numbers_Complex class (complex number operations)
expectvalue /Class
doit
numbers_Number subclass: 'numbers_Complex'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
numbers_Complex comment:
'Python numbers.Complex - complex number operations (PEP 3141).

Defines operations that work on the builtin complex type:
conversion to complex and bool, real, imag, +, -, *, /, **, abs(),
conjugate(), ==, and !=.
'
%
expectvalue /Class
doit
numbers_Complex category: 'Numbers-ABC'
%

! ------- numbers_Real class (real number operations)
expectvalue /Class
doit
numbers_Complex subclass: 'numbers_Real'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
numbers_Real comment:
'Python numbers.Real - real number operations (PEP 3141).

Adds operations that work on real numbers: conversion to float,
trunc(), floor(), ceil(), round(), divmod(), //, %, <, <=, >, >=.
'
%
expectvalue /Class
doit
numbers_Real category: 'Numbers-ABC'
%

! ------- numbers_Rational class (rational number operations)
expectvalue /Class
doit
numbers_Real subclass: 'numbers_Rational'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
numbers_Rational comment:
'Python numbers.Rational - rational number operations (PEP 3141).

Adds numerator and denominator properties. The values should be
in lowest terms with a positive denominator.
'
%
expectvalue /Class
doit
numbers_Rational category: 'Numbers-ABC'
%

! ------- numbers_Integral class (integral number operations)
expectvalue /Class
doit
numbers_Rational subclass: 'numbers_Integral'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
numbers_Integral comment:
'Python numbers.Integral - integral number operations (PEP 3141).

Adds conversion to int, pow with modulus, and bit-string operations:
<<, >>, &, ^, |, ~.
'
%
expectvalue /Class
doit
numbers_Integral category: 'Numbers-ABC'
%

! ------- numbers class (Python 'numbers' module)
expectvalue /Class
doit
module subclass: 'numbers'
  instVarNames: #('Number' 'Complex' 'Real' 'Rational' 'Integral')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
numbers comment:
'Python numbers module (PEP 3141).

This module defines a hierarchy of numeric Abstract Base Classes (ABCs)
which progressively define more operations. None of the types defined
in this module are intended to be instantiated.

The numeric tower:
  Number - root of the hierarchy
  Complex - complex number operations
  Real - real number operations
  Rational - numerator/denominator properties
  Integral - integer operations

Use isinstance(x, numbers.Number) to check if x is any kind of number.
'
%
expectvalue /Class
doit
numbers category: 'Modules'
%

! ------- os class (Python 'os' module)
expectvalue /Class
doit
module subclass: 'os'
  instVarNames: #('getcwd' 'chdir' 'listdir' 'mkdir' 'mkdirWithMode' 'makedirs' 'remove' 'rmdir' 'rename' 'exists' 'isdir' 'isfile' 'stat' 'lstat' 'system' 'getenv' 'getenvWithDefault' 'putenv' 'sep' 'pathsep' 'linesep' 'path')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
os comment:
'Python os module.

This class provides access to operating system interfaces.
Each method in this class corresponds to a Python os module function.

See https://docs.python.org/3/library/os.html for the complete list.
'
%
expectvalue /Class
doit
os category: 'Modules'
%

! ------- os_path class (Python 'os.path' module)
expectvalue /Class
doit
module subclass: 'os_path'
  instVarNames: #('join' 'basename' 'dirname' 'split' 'splitext' 'isabs' 'normpath' 'abspath' 'exists' 'isdir' 'isfile' 'commonpath' 'commonprefix')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
os_path comment:
'Python os.path module.

This class provides common pathname manipulations.
Each method in this class corresponds to a Python os.path function.

See https://docs.python.org/3/library/os.path.html for the complete list.
'
%
expectvalue /Class
doit
os_path category: 'Modules'
%

! ------- sys class (Python 'sys' module)
expectvalue /Class
doit
module subclass: 'sys'
  instVarNames: #('argv' 'base_exec_prefix' 'base_prefix' 'byteorder' 'builtin_module_names' 'copyright' 'exec_prefix' 'executable' 'exit' 'flags' 'float_info' 'float_repr_style' 'getdefaultencoding' 'getfilesystemencoding' 'getfilesystemencodeerrors' 'getrecursionlimit' 'getsizeof' 'getrefcount' 'hash_info' 'hexversion' 'implementation' 'int_info' 'intern' 'maxsize' 'maxunicode' 'modules' 'path' 'path_hooks' 'path_importer_cache' 'platform' 'platlibdir' 'prefix' 'ps1' 'ps2' 'setrecursionlimit' 'stdin' 'stdout' 'stderr' 'stdlib_module_names' 'thread_info' 'version' 'version_info' 'api_version' 'warnoptions' 'exc_info' 'exception' 'excepthook' 'displayhook' 'breakpointhook' 'audit' 'addaudithook' 'settrace' 'setprofile' 'gettrace' 'getprofile' 'call_tracing' 'is_finalizing' 'getallocatedblocks' 'get_int_max_str_digits' 'set_int_max_str_digits' 'unraisablehook' '__breakpointhook__' '__displayhook__' '__excepthook__' '__unraisablehook__' '__stdin__' '__stdout__' '__stderr__' 'meta_path' 'orig_argv' 'tracebacklimit' 'dont_write_bytecode' 'pycache_prefix')
  classVars: #()
  classInstVars: #('modules')
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
sys comment:
'Python sys module.

This class provides access to some variables used or maintained by the
interpreter and to functions that interact strongly with the interpreter.

Key attributes:
- argv: Command line arguments
- path: Module search path
- modules: Dictionary of loaded modules
- stdin/stdout/stderr: Standard I/O streams
- version/version_info: Python version information
- platform: Platform identifier
- exit(): Exit the interpreter
- exc_info(): Current exception information

See https://docs.python.org/3/library/sys.html for the complete list.
'
%
expectvalue /Class
doit
sys category: 'Modules'
%

! ------- importlib class (Python 'importlib' module)
expectvalue /Class
doit
module subclass: 'importlib'
  instVarNames: #('import_module' 'reload' 'invalidate_caches' '__import__')
  classVars: #()
  classInstVars: #('pprintast' 'grailDir')
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
importlib comment:
'Python importlib module.

This class provides the implementation of the import statement.
It enables programmatic importing of modules.

Key functions:
- import_module(name, package=None): Import a module by name
- reload(module): Reload a previously imported module
- invalidate_caches(): Invalidate finder caches
- __import__(name, globals, locals, fromlist, level): Low-level import function

Class methods for loading modules from files:
- pprintast: / pprintast - Get/set the path to pprintast executable
- astStringForPath: - Generate AST text from a Python file
- astStringForSource: - Generate AST text from Python source code
- astForPath: - Create a ModuleAst from a Python file
- astForSource: - Create a ModuleAst from Python source
- runPath: - Execute a Python file as __main__

The module registry is maintained in sys.modules (accessed via sys class>>modules).

See https://docs.python.org/3/library/importlib.html for documentation.
'
%
expectvalue /Class
doit
importlib category: 'Modules'
%

! ------- string class (Python 'string' module)
expectvalue /Class
doit
module subclass: 'string'
  instVarNames: #('ascii_letters' 'ascii_lowercase' 'ascii_uppercase' 'digits' 'hexdigits' 'octdigits' 'punctuation' 'printable' 'whitespace' 'capwords' 'Formatter' 'Template')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
string comment:
'Python string module.

This class provides string constants and utility functions.

String constants:
- ascii_letters: Concatenation of ascii_lowercase and ascii_uppercase
- ascii_lowercase: Lowercase letters ''abcdefghijklmnopqrstuvwxyz''
- ascii_uppercase: Uppercase letters ''ABCDEFGHIJKLMNOPQRSTUVWXYZ''
- digits: String containing digits ''0123456789''
- hexdigits: String containing hexadecimal digits ''0123456789abcdefABCDEF''
- octdigits: String containing octal digits ''01234567''
- punctuation: String of ASCII punctuation characters
- printable: String of printable ASCII characters
- whitespace: String of all whitespace characters

Utility functions:
- capwords(s, sep=None): Split string into words, capitalize first letter of each word, and join
- Formatter: Class for custom string formatting
- Template: Class for string templates with placeholders

See https://docs.python.org/3/library/string.html for documentation.
'
%
expectvalue /Class
doit
string category: 'Modules'
%
! ------- string_formatter class (Python 'string.Formatter' type)
expectvalue /Class
doit
object subclass: 'string_formatter'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
string_formatter comment:
'Python string.Formatter class.

This class provides a way to create and customize your own string formatting
behavior using the same mechanism as the built-in format() function and
str.format() method.

The Formatter class has the following public methods:
- format(format_string, *args, **kwargs): Format a string
- vformat(format_string, args, kwargs): Format using args and kwargs dicts
- parse(format_string): Parse format string into tuples
- get_field(field_name, args, kwargs): Get field value
- get_value(key, args, kwargs): Get value for a key
- format_field(value, format_spec): Format a single field
- convert_field(value, conversion): Convert field value
- check_unused_args(used_args, args, kwargs): Check for unused args

See https://docs.python.org/3/library/string.html#string.Formatter for documentation.
'
%
expectvalue /Class
doit
string_formatter category: 'Modules-String'
%

! ------- iterator class (Python base iterator type)
expectvalue /Class
doit
object subclass: 'iterator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
iterator comment:
'Python iterator base type.

An iterator is an object representing a stream of data. Repeated calls to the
iterator''s __next__() method return successive items in the stream. When no
more data are available, a StopIteration exception is raised.

Iterators are required to have an __iter__() method that returns the iterator
object itself, so every iterator is also iterable.

This is the abstract base class for all Python iterators. Concrete iterator
types (list_iterator, tuple_iterator, etc.) inherit from this class.
'
%
expectvalue /Class
doit
iterator category: 'Collections-Iterators'
%

! ------- list_iterator class (Python 'list_iterator' type)
expectvalue /Class
doit
iterator subclass: 'list_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
list_iterator comment:
'Python list_iterator type.

An iterator over a list (OrderedCollection). Created by calling iter() on a list.

Instance variables:
  collection - the list being iterated over
  position - current position (0-based Python index)
'
%
expectvalue /Class
doit
list_iterator category: 'Collections-Iterators'
%

! ------- tuple_iterator class (Python 'tuple_iterator' type)
expectvalue /Class
doit
iterator subclass: 'tuple_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
tuple_iterator comment:
'Python tuple_iterator type.

An iterator over a tuple (InvariantArray). Created by calling iter() on a tuple.

Instance variables:
  collection - the tuple being iterated over
  position - current position (0-based Python index)
'
%
expectvalue /Class
doit
tuple_iterator category: 'Collections-Iterators'
%

! ------- str_iterator class (Python 'str_iterator' type)
expectvalue /Class
doit
iterator subclass: 'str_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
str_iterator comment:
'Python str_iterator type.

An iterator over a string (Unicode7). Created by calling iter() on a string.
Returns one character at a time as a single-character string.

Instance variables:
  collection - the string being iterated over
  position - current position (0-based Python index)
'
%
expectvalue /Class
doit
str_iterator category: 'Collections-Iterators'
%

! ------- range_iterator class (Python 'range_iterator' type)
expectvalue /Class
doit
iterator subclass: 'range_iterator'
  instVarNames: #( collection position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
range_iterator comment:
'Python range_iterator type.

An iterator over a range (Interval). Created by calling iter() on a range.

Instance variables:
  collection - the range being iterated over
  position - current position (0-based Python index)
'
%
expectvalue /Class
doit
range_iterator category: 'Collections-Iterators'
%

! ------- set_iterator class (Python 'set_iterator' type)
expectvalue /Class
doit
iterator subclass: 'set_iterator'
  instVarNames: #( collection elements position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
set_iterator comment:
'Python set_iterator type.

An iterator over a set or frozenset (Set). Created by calling iter() on a set/frozenset.

Since GemStone Sets don''t have indexed access, we convert the set to an array
of elements when the iterator is created, then iterate over that array.

Instance variables:
  collection - the set/frozenset being iterated over (kept for reference)
  elements - array of elements from the set (created at initialization)
  position - current position (0-based Python index)
'
%
expectvalue /Class
doit
set_iterator category: 'Collections-Iterators'
%

! ------- dict_keyiterator class (Python 'dict_keyiterator' type)
expectvalue /Class
doit
iterator subclass: 'dict_keyiterator'
  instVarNames: #( dict keys position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
dict_keyiterator comment:
'Python dict_keyiterator type.

An iterator over dictionary keys. Created by calling iter() on a dict.

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  keys - array of keys from the dict (snapshot at creation)
  position - current position (0-based index)
'
%
expectvalue /Class
doit
dict_keyiterator category: 'Collections-Iterators'
%

! ------- dict_valueiterator class (Python 'dict_valueiterator' type)
expectvalue /Class
doit
iterator subclass: 'dict_valueiterator'
  instVarNames: #( dict values position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
dict_valueiterator comment:
'Python dict_valueiterator type.

An iterator over dictionary values. Created by calling iter() on dict.values().

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  values - array of values from the dict (snapshot at creation)
  position - current position (0-based index)
'
%
expectvalue /Class
doit
dict_valueiterator category: 'Collections-Iterators'
%

! ------- dict_itemiterator class (Python 'dict_itemiterator' type)
expectvalue /Class
doit
iterator subclass: 'dict_itemiterator'
  instVarNames: #( dict items position)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%
expectvalue /Class
doit
dict_itemiterator comment:
'Python dict_itemiterator type.

An iterator over dictionary items (key-value pairs). Created by calling iter() on dict.items().

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  items - array of (key, value) tuples from the dict (snapshot at creation)
  position - current position (0-based index)
'
%
expectvalue /Class
doit
dict_itemiterator category: 'Collections-Iterators'
%

! ===============================================================================
! Method Imports - New Python Classes (as DataCurator)
! ===============================================================================
! Import method implementations for new Python classes.
! These are loaded as DataCurator.
! Note: BaseException and Exception methods were already loaded earlier
! (before sequence collection methods) so they are not imported here.
! ===============================================================================

input smalltalk/classes/BaseException.gs
input smalltalk/classes/builtins.gs
input smalltalk/classes/bytearray.gs
input smalltalk/classes/cmath.gs
input smalltalk/classes/complex.gs
input smalltalk/classes/dict_itemiterator.gs
input smalltalk/classes/dict_keyiterator.gs
input smalltalk/classes/dict_valueiterator.gs
input smalltalk/classes/Exception.gs
input smalltalk/classes/importlib.gs
input smalltalk/classes/module.gs
input smalltalk/classes/iterator.gs
input smalltalk/classes/list_iterator.gs
input smalltalk/classes/math.gs
input smalltalk/classes/gemstone.gs
input smalltalk/classes/fractions.gs
input smalltalk/classes/numbers.gs
input smalltalk/classes/random.gs
input smalltalk/classes/statistics.gs
input smalltalk/classes/string.gs
input smalltalk/classes/string_formatter.gs

input smalltalk/classes/os.gs
input smalltalk/classes/os_path.gs
input smalltalk/classes/sys.gs
input smalltalk/classes/range_iterator.gs
input smalltalk/classes/set_iterator.gs
input smalltalk/classes/str_iterator.gs
input smalltalk/classes/tuple_iterator.gs

! ===============================================================================
! Switch to SystemUser for Adding Methods to Base Classes
! ===============================================================================
commit
logout
set user SystemUser pass swordfish
login

! ------- Add Python dictionary to SystemUser's symbol list
! This makes Python exception classes (IndexError, ValueError, TypeError, etc.)
! visible when we import methods for base classes.
run
| pythonDict systemUserProfile dataCurator |
systemUserProfile := System myUserProfile.
dataCurator := AllUsers userWithId: 'DataCurator' ifAbsent: [self error: 'DataCurator not found'].
pythonDict := dataCurator symbolList objectNamed: #'Python'.
pythonDict ifNil: [self error: 'Python dictionary not found in DataCurator''s symbol list'].
systemUserProfile insertDictionary: pythonDict at: 1.
Transcript show: 'Added Python dictionary to SystemUser''s symbol list'.
%

! ===============================================================================
! Method Imports - GemStone Base Classes (as SystemUser)
! ===============================================================================
! Import method implementations for GemStone base classes.
! These imports add methods to GemStone base classes and require SystemUser.
! ===============================================================================

input smalltalk/classes/bool.gs
input smalltalk/classes/builtin_function_or_method.gs
input smalltalk/classes/bytes.gs
input smalltalk/classes/Decimal.gs
input smalltalk/classes/Fraction.gs
input smalltalk/classes/dict.gs
input smalltalk/classes/ExecBlock.gs
input smalltalk/classes/float.gs
input smalltalk/classes/frozenset.gs
input smalltalk/classes/int.gs
input smalltalk/classes/list.gs
input smalltalk/classes/object.gs
input smalltalk/classes/range.gs
input smalltalk/classes/SequenceableCollection.gs
input smalltalk/classes/set.gs
input smalltalk/classes/str.gs
input smalltalk/classes/tuple.gs

! ------- Remove Python dictionary from SystemUser's symbol list
! Clean up before switching back to DataCurator
run
| systemUserProfile names |
systemUserProfile := System myUserProfile.
names := systemUserProfile symbolList names.
(names includes: #'Python') ifTrue: [
	systemUserProfile symbolList removeAtIndex: (names indexOf: #'Python').
	Transcript show: 'Removed Python dictionary from SystemUser''s symbol list'.
].
%

! ===============================================================================
! Switch back to DataCurator
! ===============================================================================
commit
logout
set user DataCurator pass swordfish
login

! ------- Register built-in numeric types with numbers module ABCs
! This makes isinstance(5, numbers.Integral) work immediately
run
numbers perform: #'instance' env: 2.
%
commit
