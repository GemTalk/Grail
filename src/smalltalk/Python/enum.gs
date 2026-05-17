! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- enum class (Python 'enum' module)
expectvalue /Class
doit
module subclass: 'enum'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
enum comment:
'Python enum module (stub).

Provides support for enumerations.
Currently stubs IntFlag, KEEP, global_enum, and _simple_enum
to allow import re to proceed.
See https://docs.python.org/3/library/enum.html
'
%

expectvalue /Class
doit
enum category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
enum removeAllMethods: 1.
enum class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: enum
initialize
	"Initialize stored attributes."
	self @env0:at: #IntFlag put: int.
	self @env0:at: #KEEP put: #KEEP.
%

! ===============================================================================
! Stored-attribute accessors
! ===============================================================================

category: 'Grail-Accessors'
method: enum
IntFlag
	^ self @env0:at: #IntFlag
%

category: 'Grail-Accessors'
method: enum
KEEP
	^ self @env0:at: #KEEP
%

! ===============================================================================
! Fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: enum
global_enum: cls
	"global_enum(cls) -> cls (no-op decorator)."
	^ cls
%

category: 'Grail-Built-in Functions'
method: enum
_simple_enum: positional kw: kwargs
	"_simple_enum(cls) or _simple_enum(cls, boundary=...) -> decorator.
	Returns a decorator that returns the class unchanged.
	Used by re module: @enum._simple_enum(IntFlag, boundary=enum.KEEP)"

	^ [:positional2 :keywords2 | positional2 @env0:at: 1]
%

set compile_env: 0
