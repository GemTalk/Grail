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
enum category: 'Modules'
%

expectvalue /Metaclass3
doit
enum removeAllMethods: 1.
enum class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Accessors'
method: enum
IntFlag
	^ self ___at___: #IntFlag
%

category: 'Python-Accessors'
method: enum
KEEP
	^ self ___at___: #KEEP
%

category: 'Python-Accessors'
method: enum
global_enum
	^ self ___at___: #global_enum
%

category: 'Python-Accessors'
method: enum
_simple_enum
	^ self ___at___: #_simple_enum
%

category: 'Python-Initialization'
method: enum
initialize
	self
		initialize_IntFlag;
		initialize_KEEP;
		initialize_global_enum;
		initialize_simple_enum;
		yourself
%

category: 'Python-Initialization'
method: enum
initialize_IntFlag
	"IntFlag - a placeholder class for integer-based flags.
	 Used by re.RegexFlag."
	self ___at___: #IntFlag put: int
%

category: 'Python-Initialization'
method: enum
initialize_KEEP
	"KEEP sentinel - used in enum boundary handling."
	self ___at___: #KEEP put: #KEEP
%

category: 'Python-Initialization'
method: enum
initialize_global_enum
	"global_enum(cls) -> cls  (no-op decorator)"
	self ___at___: #global_enum put: [:positional :keywords |
		positional ___at___: 1
	]
%

category: 'Python-Initialization'
method: enum
initialize_simple_enum
	"_simple_enum(cls) -> decorator that returns cls unchanged.
	 Used by re module: @enum._simple_enum(IntFlag)"
	self ___at___: #_simple_enum put: [:positional :keywords |
		"Returns a decorator that returns the class unchanged."
		[:positional2 :keywords2 |
			positional2 ___at___: 1
		]
	]
%

set compile_env: 0
