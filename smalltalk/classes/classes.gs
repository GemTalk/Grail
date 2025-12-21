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

! ------- Add existing GemStone globals as Python objects
run
| pythonDict |
pythonDict := System myUserProfile symbolList objectNamed: #'Python'.
pythonDict
  "Python names that map to existing GemStone globals"
	at: #'True'   put: true;
	at: #'False'  put: false;
	at: #'None'	  put: nil;
	yourself.
%

! ===============================================================================
! Python Type Mappings - GemStone Base Classes (as DataCurator)
! ===============================================================================
! Map Python type names to existing GemStone Smalltalk classes.
! These classes already exist in GemStone; we just add them to the Python dictionary.
! ===============================================================================

! ------- Add existing GemStone classes as Python types
run
| pythonDict |
pythonDict := System myUserProfile symbolList objectNamed: #'Python'.
pythonDict
  "Python names that map to existing GemStone classes"
	at: #'bool'   put: Boolean;
	at: #'bytes'  put: ByteArray;
	at: #'dict'   put: Dictionary;
	at: #'float'  put: Float;
	at: #'frozenset' put: Set;
	at: #'int'    put: Integer;
	at: #'list'   put: OrderedCollection;
	at: #'object' put: Object;
	at: #'range'  put: Interval;
	at: #'str'    put: Unicode7;
	at: #'tuple'  put: InvariantArray;
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
input smalltalk/classes/bytearray.gs
input smalltalk/classes/complex.gs
input smalltalk/classes/dict_itemiterator.gs
input smalltalk/classes/dict_keyiterator.gs
input smalltalk/classes/dict_valueiterator.gs
input smalltalk/classes/Exception.gs
input smalltalk/classes/iterator.gs
input smalltalk/classes/list_iterator.gs
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
input smalltalk/classes/bytes.gs
input smalltalk/classes/dict.gs
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

! ------------------- Reset compile environment
set compile_env: 0
