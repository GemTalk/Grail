! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- sys class (Python 'sys' module)
expectvalue /Class
doit
module subclass: 'sys'
  instVarNames: #()
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
sys category: 'Grail-Modules'
%

! ===============================================================================
! sys Module (Python 'sys' module)
! ===============================================================================
! This file contains the Python sys module implementation.
! The sys module provides access to some variables used or maintained by the
! interpreter and to functions that interact strongly with the interpreter.
! ===============================================================================

! ------------------- Remove existing Python methods from sys
expectvalue /Metaclass3
doit
sys removeAllMethods: 1.
sys class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Module Registry'
classmethod: sys
initializeBuiltinModules
	"Initialize the registry with built-in modules"
	modules
		@env0:at: #builtins 	put: builtins 	instance;
		@env0:at: #copyreg 		put: copyreg 	instance;
		@env0:at: #math 		put: math 		instance;
		@env0:at: #hashlib 		put: hashlib 	instance;
		@env0:at: #time 		put: time 		instance;
		@env0:at: #secrets 		put: secrets 	instance;
		@env0:at: #enum 		put: enum 		instance;
		@env0:at: #fractions	put: fractions 	instance;
		@env0:at: #functools	put: functools 	instance;
		@env0:at: #gemstone 	put: gemstone 	instance;
		@env0:at: #html 		put: html 		instance;
		@env0:at: #cmath 		put: cmath 		instance;
		@env0:at: #random 		put: random 	instance;
		@env0:at: #os 			put: os 		instance;
		@env0:at: #string 		put: string 	instance;
		@env0:at: #sys 			put: sys 		instance;
		@env0:yourself.
%

category: 'Grail-Module Registry'
classmethod: sys
modules
	"Return the module registry (sys.modules).
	This is a SymbolDictionary mapping module names to module instances."
	modules == nil ifTrue: [
		modules := SymbolDictionary ___new___.
		"Register built-in modules"
		self initializeBuiltinModules.
	].
	^ modules
%

category: 'Grail-Accessors'
method: sys
__breakpointhook__
	^ self @env0:at: #__breakpointhook__
%


category: 'Grail-Accessors'
method: sys
__displayhook__
	^ self @env0:at: #__displayhook__
%


category: 'Grail-Accessors'
method: sys
__excepthook__
	^ self @env0:at: #__excepthook__
%


category: 'Grail-Accessors'
method: sys
__stderr__
	^ self @env0:at: #__stderr__
%


category: 'Grail-Accessors'
method: sys
__stdin__
	^ self @env0:at: #__stdin__
%


category: 'Grail-Accessors'
method: sys
__stdout__
	^ self @env0:at: #__stdout__
%


category: 'Grail-Accessors'
method: sys
__unraisablehook__
	^ self @env0:at: #__unraisablehook__
%


category: 'Grail-Accessors'
method: sys
addaudithook
	^ self @env0:at: #addaudithook
%


category: 'Grail-Accessors'
method: sys
api_version
	^ self @env0:at: #api_version
%


category: 'Grail-Accessors'
method: sys
argv
	^ self @env0:at: #argv
%


category: 'Grail-Accessors'
method: sys
audit
	^ self @env0:at: #audit
%


category: 'Grail-Accessors'
method: sys
base_exec_prefix
	^ self @env0:at: #base_exec_prefix
%


category: 'Grail-Accessors'
method: sys
base_prefix
	^ self @env0:at: #base_prefix
%


category: 'Grail-Accessors'
method: sys
breakpointhook
	^ self @env0:at: #breakpointhook
%


category: 'Grail-Accessors'
method: sys
builtin_module_names
	^ self @env0:at: #builtin_module_names
%


category: 'Grail-Accessors'
method: sys
byteorder
	^ self @env0:at: #byteorder
%


category: 'Grail-Accessors'
method: sys
call_tracing
	^ self @env0:at: #call_tracing
%


category: 'Grail-Accessors'
method: sys
copyright
	^ self @env0:at: #copyright
%


category: 'Grail-Accessors'
method: sys
displayhook
	^ self @env0:at: #displayhook
%


category: 'Grail-Accessors'
method: sys
dont_write_bytecode
	^ self @env0:at: #dont_write_bytecode
%


category: 'Grail-Accessors'
method: sys
exc_info
	^ self @env0:at: #exc_info
%


category: 'Grail-Accessors'
method: sys
excepthook
	^ self @env0:at: #excepthook
%


category: 'Grail-Accessors'
method: sys
exception
	^ self @env0:at: #exception
%


category: 'Grail-Accessors'
method: sys
exec_prefix
	^ self @env0:at: #exec_prefix
%


category: 'Grail-Accessors'
method: sys
executable
	^ self @env0:at: #executable
%


category: 'Grail-Accessors'
method: sys
exit
	^ self @env0:at: #exit
%


category: 'Grail-Accessors'
method: sys
flags
	^ self @env0:at: #flags
%


category: 'Grail-Accessors'
method: sys
float_info
	^ self @env0:at: #float_info
%


category: 'Grail-Accessors'
method: sys
float_repr_style
	^ self @env0:at: #float_repr_style
%


category: 'Grail-Accessors'
method: sys
get_int_max_str_digits
	^ self @env0:at: #get_int_max_str_digits
%


category: 'Grail-Accessors'
method: sys
getallocatedblocks
	^ self @env0:at: #getallocatedblocks
%


category: 'Grail-Accessors'
method: sys
getdefaultencoding
	^ self @env0:at: #getdefaultencoding
%


category: 'Grail-Accessors'
method: sys
getfilesystemencodeerrors
	^ self @env0:at: #getfilesystemencodeerrors
%


category: 'Grail-Accessors'
method: sys
getfilesystemencoding
	^ self @env0:at: #getfilesystemencoding
%


category: 'Grail-Accessors'
method: sys
getprofile
	^ self @env0:at: #getprofile
%


category: 'Grail-Accessors'
method: sys
getrecursionlimit
	^ self @env0:at: #getrecursionlimit
%


category: 'Grail-Accessors'
method: sys
getrefcount
	^ self @env0:at: #getrefcount
%


category: 'Grail-Accessors'
method: sys
getsizeof
	^ self @env0:at: #getsizeof
%


category: 'Grail-Accessors'
method: sys
gettrace
	^ self @env0:at: #gettrace
%


category: 'Grail-Accessors'
method: sys
hash_info
	^ self @env0:at: #hash_info
%


category: 'Grail-Accessors'
method: sys
hexversion
	^ self @env0:at: #hexversion
%


category: 'Grail-Accessors'
method: sys
implementation
	^ self @env0:at: #implementation
%



category: 'Grail-Initialization'
method: sys
initialize
	"Initialize all module attributes with their default values"
	self
		initialize_version_info;
		initialize_platform_info;
		initialize_path_info;
		initialize_runtime_info;
		yourself.
	"Store original hooks as dunder attributes (BoundMethod wraps the
	receiver + selector so the hook can be called as a first-class value)."
	self @env0:at: #__breakpointhook__ put: (BoundMethod receiver: self selector: #breakpointhook).
	self @env0:at: #__displayhook__ put: (BoundMethod receiver: self selector: #displayhook).
	self @env0:at: #__excepthook__ put: (BoundMethod receiver: self selector: #excepthook).
	self @env0:at: #__unraisablehook__ put: (BoundMethod receiver: self selector: #unraisablehook).
%

! ===============================================================================
! Fast-path callable methods
! ===============================================================================

! --- 0-arg callables ---

category: 'Grail-Built-in Functions'
method: sys
addaudithook
	"addaudithook(hook) - stub, auditing not implemented."
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
audit
	"audit(event, *args) - stub, auditing not implemented."
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
breakpointhook
	"breakpointhook(*args, **kws) - stub."
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
exc_info
	"exc_info() -> (type, value, traceback)"
	^ tuple @env0:withAll: {None. None. None}
%

category: 'Grail-Built-in Functions'
method: sys
exception
	"exception() -> current exception instance"
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
get_int_max_str_digits
	"get_int_max_str_digits() -> 4300"
	^ 4300
%

category: 'Grail-Built-in Functions'
method: sys
getallocatedblocks
	"getallocatedblocks() -> 0 (GemStone manages memory differently)"
	^ 0
%

category: 'Grail-Built-in Functions'
method: sys
getdefaultencoding
	"getdefaultencoding() -> 'utf-8'"
	^ 'utf-8'
%

category: 'Grail-Built-in Functions'
method: sys
getfilesystemencodeerrors
	"getfilesystemencodeerrors() -> 'surrogateescape'"
	^ 'surrogateescape'
%

category: 'Grail-Built-in Functions'
method: sys
getfilesystemencoding
	"getfilesystemencoding() -> 'utf-8'"
	^ 'utf-8'
%

category: 'Grail-Built-in Functions'
method: sys
getprofile
	"getprofile() -> None"
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
getrecursionlimit
	"getrecursionlimit() -> 1000"
	^ 1000
%

category: 'Grail-Built-in Functions'
method: sys
gettrace
	"gettrace() -> None"
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
is_finalizing
	"is_finalizing() -> False"
	^ false
%

category: 'Grail-Built-in Functions'
method: sys
setprofile
	"setprofile(profilefunc) - stub."
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
settrace
	"settrace(tracefunc) - stub."
	^ None
%

! --- 1-arg callables ---

category: 'Grail-Built-in Functions'
method: sys
displayhook: value
	"displayhook(value) - print value to stdout."
	| stdoutStream |
	value == None ifFalse: [
		stdoutStream := GsFile @env0:stdout.
		stdoutStream @env0:nextPutAll: value printString.
		stdoutStream @env0:lf.
	].
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
getrefcount: obj
	"getrefcount(object) -> 1 (GemStone uses GC, not refcounting)"
	^ 1
%

category: 'Grail-Built-in Functions'
method: sys
intern: aString
	"intern(string) -> interned string"
	^ (aString @env0:asSymbol) @env0:asString
%

category: 'Grail-Built-in Functions'
method: sys
set_int_max_str_digits: maxdigits
	"set_int_max_str_digits(maxdigits) - stub."
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
setrecursionlimit: limit
	"setrecursionlimit(limit) - stub."
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
unraisablehook: unraisable
	"unraisablehook(unraisable) - stub."
	^ None
%

! --- 2-arg callables ---

category: 'Grail-Built-in Functions'
method: sys
call_tracing: func _: args
	"call_tracing(func, args) - call function (tracing not implemented)."
	^ func value: args value: nil
%

! --- 3-arg callables ---

category: 'Grail-Built-in Functions'
method: sys
excepthook: excType _: excValue _: excTb
	"excepthook(type, value, traceback) - print exception to stderr."
	GsFile @env0:gciLogServer: 'Exception: ', excValue printString.
	^ None
%

! --- Varargs callables ---

category: 'Grail-Built-in Functions'
method: sys
exit
	"exit() -> 0-arg fast path. Raise SystemExit with code 0."
	^ SystemExit ___signal___: 0
%

category: 'Grail-Built-in Functions'
method: sys
exit: code
	"exit(code) -> 1-arg fast path. Raise SystemExit with given code."
	^ SystemExit ___signal___: code
%

category: 'Grail-Built-in Functions'
method: sys
_exit: positional kw: kwargs
	"exit([arg]) - varargs form."
	| arg |
	arg := (positional __len__ @env0:> 0)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [0].
	^ SystemExit ___signal___: arg
%

category: 'Grail-Built-in Functions'
method: sys
_getsizeof: positional kw: kwargs
	"getsizeof(object[, default]) - Return size of object in bytes."
	| obj default |
	obj := positional @env0:at: 1.
	default := (positional __len__ @env0:> 1)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [nil].
	^ [obj @env0:physicalSize] @env0:on: Error do: [:ex |
		default ifNil: [TypeError ___signal___: 'object does not provide size'].
		default
	]
%

category: 'Grail-Built-in Functions'
method: sys
getsizeof: obj
	"getsizeof(obj) -> 1-arg fast path."
	^ self _getsizeof: { obj } kw: nil
%

! ===============================================================================
! Data-population initializers (kept from legacy — these populate stored attrs)
! ===============================================================================

category: 'Grail-Initialization'
method: sys
initialize_version_info
	"Initialize version-related attributes using GemStone version info"
	| gsVersion gsVersionReport grailVersion |
	gsVersionReport := System @env0:gemVersionReport.
	gsVersion := gsVersionReport @env0:at: #gsVersion ifAbsent: ['unknown'].
	grailVersion := '0.1.0'.
	self @env0:at: #version put: (((('Grail ' @env0:, grailVersion) @env0:, ' (GemStone/S ') @env0:, gsVersion) @env0:, ')').
	self @env0:at: #version_info put: (tuple @env0:withAll: {0. 1. 0. 'alpha'. 0}).
	self @env0:at: #api_version put: 0.
	self @env0:at: #hexversion put: 16r00010000.
	self @env0:at: #implementation put: None.
%

category: 'Grail-Initialization'
method: sys
initialize_platform_info
	"Initialize platform-related attributes using GemStone system info"
	| osName cpuArch |
	osName := System @env0:gemVersionAt: #osName.
	cpuArch := System @env0:gemVersionAt: #cpuArchitecture.
	self @env0:at: #platform put: ((osName @env0:= 'Darwin')
		ifTrue: ['darwin']
		ifFalse: [(osName @env0:= 'Linux')
			ifTrue: ['linux']
			ifFalse: [(osName @env0:= 'SunOS')
				ifTrue: ['sunos']
				ifFalse: [(osName @env0:= 'AIX')
					ifTrue: ['aix']
					ifFalse: [osName @env0:asLowercase]]]]).
	self @env0:at: #byteorder put: ((cpuArch @env0:= 'SPARC')
		ifTrue: ['big']
		ifFalse: ['little']).
	self @env0:at: #maxsize put: (SmallInteger @env0:maximumValue).
	self @env0:at: #maxunicode put: 16r10FFFF.
	self @env0:at: #platlibdir put: 'lib'.
	self @env0:at: #float_repr_style put: 'short'.
%

category: 'Grail-Initialization'
method: sys
initialize_path_info
	"Initialize path-related attributes using GemStone info"
	| gsVersionReport gemNativeCodePath |
	gsVersionReport := System @env0:gemVersionReport.
	gemNativeCodePath := gsVersionReport @env0:at: 'gemNativeCodePath' ifAbsent: [''].
	self @env0:at: #prefix put: gemNativeCodePath.
	self @env0:at: #exec_prefix put: gemNativeCodePath.
	self @env0:at: #base_prefix put: gemNativeCodePath.
	self @env0:at: #base_exec_prefix put: gemNativeCodePath.
	self @env0:at: #executable put: gemNativeCodePath.
	self @env0:at: #path put: (list ___new___).
	self @env0:at: #path_hooks put: (list ___new___).
	self @env0:at: #path_importer_cache put: (KeyValueDictionary @env0:new).
	self @env0:at: #meta_path put: (list ___new___).
	self @env0:at: #pycache_prefix put: None.
	self @env0:at: #dont_write_bytecode put: true.
%

category: 'Grail-Initialization'
method: sys
initialize_runtime_info
	"Initialize runtime information attributes from GemStone"
	| cmdArgs |
	cmdArgs := System @env0:commandLineArguments.
	self @env0:at: #argv put: (list ___new___).
	self @env0:at: #orig_argv put: (list ___new___).
	cmdArgs @env0:do: [:arg |
		(self @env0:at: #argv) append: arg.
		(self @env0:at: #orig_argv) append: arg.
	].
	self @env0:at: #modules put: (sys modules).
	self @env0:at: #builtin_module_names put: (tuple @env0:withAll: {'builtins'. 'cmath'. 'fractions'. 'gemstone'. 'importlib'. 'math'. 'os'. 'string'. 'sys'}).
	self @env0:at: #stdlib_module_names put: (frozenset ___new___).
	self @env0:at: #copyright put: 'Copyright (c) GemTalk Systems LLC. All rights reserved.'.
	self @env0:at: #flags put: None.
	self @env0:at: #float_info put: None.
	self @env0:at: #int_info put: None.
	self @env0:at: #hash_info put: None.
	self @env0:at: #thread_info put: None.
	self @env0:at: #warnoptions put: (list ___new___).
	self @env0:at: #tracebacklimit put: 1000.
	self @env0:at: #ps1 put: '>>> '.
	self @env0:at: #ps2 put: '... '.
%



set compile_env: 0
