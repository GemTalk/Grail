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
sys category: 'Modules'
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

category: 'Python-Module Registry'
classmethod: sys
initializeBuiltinModules
	"Initialize the registry with built-in modules"
	modules
		___at___: #builtins 	put: builtins 	instance;
		___at___: #copyreg 		put: copyreg 	instance;
		___at___: #math 		put: math 		instance;
		___at___: #enum 		put: enum 		instance;
		___at___: #fractions	put: fractions 	instance;
		___at___: #functools	put: functools 	instance;
		___at___: #gemstone 	put: gemstone 	instance;
		___at___: #html 		put: html 		instance;
		___at___: #cmath 		put: cmath 		instance;
		___at___: #random 		put: random 	instance;
		___at___: #os 			put: os 		instance;
		___at___: #string 		put: string 	instance;
		___at___: #sys 			put: sys 		instance;
		___yourself___.
%

category: 'Python-Module Registry'
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

category: 'Python-Accessors'
method: sys
__breakpointhook__
	^ self ___at___: #__breakpointhook__
%


category: 'Python-Accessors'
method: sys
__displayhook__
	^ self ___at___: #__displayhook__
%


category: 'Python-Accessors'
method: sys
__excepthook__
	^ self ___at___: #__excepthook__
%


category: 'Python-Accessors'
method: sys
__stderr__
	^ self ___at___: #__stderr__
%


category: 'Python-Accessors'
method: sys
__stdin__
	^ self ___at___: #__stdin__
%


category: 'Python-Accessors'
method: sys
__stdout__
	^ self ___at___: #__stdout__
%


category: 'Python-Accessors'
method: sys
__unraisablehook__
	^ self ___at___: #__unraisablehook__
%


category: 'Python-Accessors'
method: sys
addaudithook
	^ self ___at___: #addaudithook
%


category: 'Python-Accessors'
method: sys
api_version
	^ self ___at___: #api_version
%


category: 'Python-Accessors'
method: sys
argv
	^ self ___at___: #argv
%


category: 'Python-Accessors'
method: sys
audit
	^ self ___at___: #audit
%


category: 'Python-Accessors'
method: sys
base_exec_prefix
	^ self ___at___: #base_exec_prefix
%


category: 'Python-Accessors'
method: sys
base_prefix
	^ self ___at___: #base_prefix
%


category: 'Python-Accessors'
method: sys
breakpointhook
	^ self ___at___: #breakpointhook
%


category: 'Python-Accessors'
method: sys
builtin_module_names
	^ self ___at___: #builtin_module_names
%


category: 'Python-Accessors'
method: sys
byteorder
	^ self ___at___: #byteorder
%


category: 'Python-Accessors'
method: sys
call_tracing
	^ self ___at___: #call_tracing
%


category: 'Python-Accessors'
method: sys
copyright
	^ self ___at___: #copyright
%


category: 'Python-Accessors'
method: sys
displayhook
	^ self ___at___: #displayhook
%


category: 'Python-Accessors'
method: sys
dont_write_bytecode
	^ self ___at___: #dont_write_bytecode
%


category: 'Python-Accessors'
method: sys
exc_info
	^ self ___at___: #exc_info
%


category: 'Python-Accessors'
method: sys
excepthook
	^ self ___at___: #excepthook
%


category: 'Python-Accessors'
method: sys
exception
	^ self ___at___: #exception
%


category: 'Python-Accessors'
method: sys
exec_prefix
	^ self ___at___: #exec_prefix
%


category: 'Python-Accessors'
method: sys
executable
	^ self ___at___: #executable
%


category: 'Python-Accessors'
method: sys
exit
	^ self ___at___: #exit
%


category: 'Python-Accessors'
method: sys
flags
	^ self ___at___: #flags
%


category: 'Python-Accessors'
method: sys
float_info
	^ self ___at___: #float_info
%


category: 'Python-Accessors'
method: sys
float_repr_style
	^ self ___at___: #float_repr_style
%


category: 'Python-Accessors'
method: sys
get_int_max_str_digits
	^ self ___at___: #get_int_max_str_digits
%


category: 'Python-Accessors'
method: sys
getallocatedblocks
	^ self ___at___: #getallocatedblocks
%


category: 'Python-Accessors'
method: sys
getdefaultencoding
	^ self ___at___: #getdefaultencoding
%


category: 'Python-Accessors'
method: sys
getfilesystemencodeerrors
	^ self ___at___: #getfilesystemencodeerrors
%


category: 'Python-Accessors'
method: sys
getfilesystemencoding
	^ self ___at___: #getfilesystemencoding
%


category: 'Python-Accessors'
method: sys
getprofile
	^ self ___at___: #getprofile
%


category: 'Python-Accessors'
method: sys
getrecursionlimit
	^ self ___at___: #getrecursionlimit
%


category: 'Python-Accessors'
method: sys
getrefcount
	^ self ___at___: #getrefcount
%


category: 'Python-Accessors'
method: sys
getsizeof
	^ self ___at___: #getsizeof
%


category: 'Python-Accessors'
method: sys
gettrace
	^ self ___at___: #gettrace
%


category: 'Python-Accessors'
method: sys
hash_info
	^ self ___at___: #hash_info
%


category: 'Python-Accessors'
method: sys
hexversion
	^ self ___at___: #hexversion
%


category: 'Python-Accessors'
method: sys
implementation
	^ self ___at___: #implementation
%



category: 'Python-Initialization'
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
	self ___at___: #__breakpointhook__ put: (BoundMethod receiver: self selector: #breakpointhook).
	self ___at___: #__displayhook__ put: (BoundMethod receiver: self selector: #displayhook).
	self ___at___: #__excepthook__ put: (BoundMethod receiver: self selector: #excepthook).
	self ___at___: #__unraisablehook__ put: (BoundMethod receiver: self selector: #unraisablehook).
%

! ===============================================================================
! Fast-path callable methods
! ===============================================================================

! --- 0-arg callables ---

category: 'Python-Built-in Functions'
method: sys
addaudithook
	"addaudithook(hook) - stub, auditing not implemented."
	^ None
%

category: 'Python-Built-in Functions'
method: sys
audit
	"audit(event, *args) - stub, auditing not implemented."
	^ None
%

category: 'Python-Built-in Functions'
method: sys
breakpointhook
	"breakpointhook(*args, **kws) - stub."
	^ None
%

category: 'Python-Built-in Functions'
method: sys
exc_info
	"exc_info() -> (type, value, traceback)"
	^ tuple ___withAll___: {None. None. None}
%

category: 'Python-Built-in Functions'
method: sys
exception
	"exception() -> current exception instance"
	^ None
%

category: 'Python-Built-in Functions'
method: sys
get_int_max_str_digits
	"get_int_max_str_digits() -> 4300"
	^ 4300
%

category: 'Python-Built-in Functions'
method: sys
getallocatedblocks
	"getallocatedblocks() -> 0 (GemStone manages memory differently)"
	^ 0
%

category: 'Python-Built-in Functions'
method: sys
getdefaultencoding
	"getdefaultencoding() -> 'utf-8'"
	^ 'utf-8'
%

category: 'Python-Built-in Functions'
method: sys
getfilesystemencodeerrors
	"getfilesystemencodeerrors() -> 'surrogateescape'"
	^ 'surrogateescape'
%

category: 'Python-Built-in Functions'
method: sys
getfilesystemencoding
	"getfilesystemencoding() -> 'utf-8'"
	^ 'utf-8'
%

category: 'Python-Built-in Functions'
method: sys
getprofile
	"getprofile() -> None"
	^ None
%

category: 'Python-Built-in Functions'
method: sys
getrecursionlimit
	"getrecursionlimit() -> 1000"
	^ 1000
%

category: 'Python-Built-in Functions'
method: sys
gettrace
	"gettrace() -> None"
	^ None
%

category: 'Python-Built-in Functions'
method: sys
is_finalizing
	"is_finalizing() -> False"
	^ false
%

category: 'Python-Built-in Functions'
method: sys
setprofile
	"setprofile(profilefunc) - stub."
	^ None
%

category: 'Python-Built-in Functions'
method: sys
settrace
	"settrace(tracefunc) - stub."
	^ None
%

! --- 1-arg callables ---

category: 'Python-Built-in Functions'
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

category: 'Python-Built-in Functions'
method: sys
getrefcount: obj
	"getrefcount(object) -> 1 (GemStone uses GC, not refcounting)"
	^ 1
%

category: 'Python-Built-in Functions'
method: sys
intern: aString
	"intern(string) -> interned string"
	^ (aString @env0:asSymbol) @env0:asString
%

category: 'Python-Built-in Functions'
method: sys
set_int_max_str_digits: maxdigits
	"set_int_max_str_digits(maxdigits) - stub."
	^ None
%

category: 'Python-Built-in Functions'
method: sys
setrecursionlimit: limit
	"setrecursionlimit(limit) - stub."
	^ None
%

category: 'Python-Built-in Functions'
method: sys
unraisablehook: unraisable
	"unraisablehook(unraisable) - stub."
	^ None
%

! --- 2-arg callables ---

category: 'Python-Built-in Functions'
method: sys
call_tracing: func _: args
	"call_tracing(func, args) - call function (tracing not implemented)."
	^ func value: args value: nil
%

! --- 3-arg callables ---

category: 'Python-Built-in Functions'
method: sys
excepthook: excType _: excValue _: excTb
	"excepthook(type, value, traceback) - print exception to stderr."
	GsFile @env0:gciLogServer: 'Exception: ', excValue printString.
	^ None
%

! --- Varargs callables ---

category: 'Python-Built-in Functions'
method: sys
exit
	"exit() -> 0-arg fast path. Raise SystemExit with code 0."
	^ SystemExit ___signal___: 0
%

category: 'Python-Built-in Functions'
method: sys
exit: code
	"exit(code) -> 1-arg fast path. Raise SystemExit with given code."
	^ SystemExit ___signal___: code
%

category: 'Python-Built-in Functions'
method: sys
_exit: positional kw: kwargs
	"exit([arg]) - varargs form."
	| arg |
	arg := (positional __len__ ___gt___: 0)
		ifTrue: [positional ___at___: 1]
		ifFalse: [0].
	^ SystemExit ___signal___: arg
%

category: 'Python-Built-in Functions'
method: sys
_getsizeof: positional kw: kwargs
	"getsizeof(object[, default]) - Return size of object in bytes."
	| obj default |
	obj := positional ___at___: 1.
	default := (positional __len__ ___gt___: 1)
		ifTrue: [positional ___at___: 2]
		ifFalse: [nil].
	^ [obj @env0:physicalSize] ___on___: Error do: [:ex |
		default ifNil: [TypeError ___signal___: 'object does not provide size'].
		default
	]
%

category: 'Python-Built-in Functions'
method: sys
getsizeof: obj
	"getsizeof(obj) -> 1-arg fast path."
	^ self _getsizeof: { obj } kw: nil
%

! ===============================================================================
! Data-population initializers (kept from legacy — these populate stored attrs)
! ===============================================================================

category: 'Python-Initialization'
method: sys
initialize_version_info
	"Initialize version-related attributes using GemStone version info"
	| gsVersion gsVersionReport grailVersion |
	gsVersionReport := System @env0:gemVersionReport.
	gsVersion := gsVersionReport ___at___: #gsVersion ifAbsent: ['unknown'].
	grailVersion := '0.1.0'.
	self ___at___: #version put: (((('Grail ' ___concat___: grailVersion) ___concat___: ' (GemStone/S ') ___concat___: gsVersion) ___concat___: ')').
	self ___at___: #version_info put: (tuple ___withAll___: {0. 1. 0. 'alpha'. 0}).
	self ___at___: #api_version put: 0.
	self ___at___: #hexversion put: 16r00010000.
	self ___at___: #implementation put: None.
%

category: 'Python-Initialization'
method: sys
initialize_platform_info
	"Initialize platform-related attributes using GemStone system info"
	| osName cpuArch |
	osName := System @env0:gemVersionAt: #osName.
	cpuArch := System @env0:gemVersionAt: #cpuArchitecture.
	self ___at___: #platform put: ((osName ___eq___: 'Darwin')
		ifTrue: ['darwin']
		ifFalse: [(osName ___eq___: 'Linux')
			ifTrue: ['linux']
			ifFalse: [(osName ___eq___: 'SunOS')
				ifTrue: ['sunos']
				ifFalse: [(osName ___eq___: 'AIX')
					ifTrue: ['aix']
					ifFalse: [osName @env0:asLowercase]]]]).
	self ___at___: #byteorder put: ((cpuArch ___eq___: 'SPARC')
		ifTrue: ['big']
		ifFalse: ['little']).
	self ___at___: #maxsize put: (SmallInteger @env0:maximumValue).
	self ___at___: #maxunicode put: 16r10FFFF.
	self ___at___: #platlibdir put: 'lib'.
	self ___at___: #float_repr_style put: 'short'.
%

category: 'Python-Initialization'
method: sys
initialize_path_info
	"Initialize path-related attributes using GemStone info"
	| gsVersionReport gemNativeCodePath |
	gsVersionReport := System @env0:gemVersionReport.
	gemNativeCodePath := gsVersionReport ___at___: 'gemNativeCodePath' ifAbsent: [''].
	self ___at___: #prefix put: gemNativeCodePath.
	self ___at___: #exec_prefix put: gemNativeCodePath.
	self ___at___: #base_prefix put: gemNativeCodePath.
	self ___at___: #base_exec_prefix put: gemNativeCodePath.
	self ___at___: #executable put: gemNativeCodePath.
	self ___at___: #path put: (list ___new___).
	self ___at___: #path_hooks put: (list ___new___).
	self ___at___: #path_importer_cache put: (KeyValueDictionary @env0:new).
	self ___at___: #meta_path put: (list ___new___).
	self ___at___: #pycache_prefix put: None.
	self ___at___: #dont_write_bytecode put: true.
%

category: 'Python-Initialization'
method: sys
initialize_runtime_info
	"Initialize runtime information attributes from GemStone"
	| cmdArgs |
	cmdArgs := System @env0:commandLineArguments.
	self ___at___: #argv put: (list ___new___).
	self ___at___: #orig_argv put: (list ___new___).
	cmdArgs @env0:do: [:arg |
		(self ___at___: #argv) append: arg.
		(self ___at___: #orig_argv) append: arg.
	].
	self ___at___: #modules put: (sys modules).
	self ___at___: #builtin_module_names put: (tuple ___withAll___: {'builtins'. 'cmath'. 'fractions'. 'gemstone'. 'importlib'. 'math'. 'os'. 'string'. 'sys'}).
	self ___at___: #stdlib_module_names put: (frozenset ___new___).
	self ___at___: #copyright put: 'Copyright (c) GemTalk Systems LLC. All rights reserved.'.
	self ___at___: #flags put: None.
	self ___at___: #float_info put: None.
	self ___at___: #int_info put: None.
	self ___at___: #hash_info put: None.
	self ___at___: #thread_info put: None.
	self ___at___: #warnoptions put: (list ___new___).
	self ___at___: #tracebacklimit put: 1000.
	self ___at___: #ps1 put: '>>> '.
	self ___at___: #ps2 put: '... '.
%



set compile_env: 0
