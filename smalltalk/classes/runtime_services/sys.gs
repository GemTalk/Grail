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
__breakpointhook__: aValue
	self ___at___: #__breakpointhook__ put: aValue
%

category: 'Python-Accessors'
method: sys
__displayhook__
	^ self ___at___: #__displayhook__
%

category: 'Python-Accessors'
method: sys
__displayhook__: aValue
	self ___at___: #__displayhook__ put: aValue
%

category: 'Python-Accessors'
method: sys
__excepthook__
	^ self ___at___: #__excepthook__
%

category: 'Python-Accessors'
method: sys
__excepthook__: aValue
	self ___at___: #__excepthook__ put: aValue
%

category: 'Python-Accessors'
method: sys
__stderr__
	^ self ___at___: #__stderr__
%

category: 'Python-Accessors'
method: sys
__stderr__: aValue
	self ___at___: #__stderr__ put: aValue
%

category: 'Python-Accessors'
method: sys
__stdin__
	^ self ___at___: #__stdin__
%

category: 'Python-Accessors'
method: sys
__stdin__: aValue
	self ___at___: #__stdin__ put: aValue
%

category: 'Python-Accessors'
method: sys
__stdout__
	^ self ___at___: #__stdout__
%

category: 'Python-Accessors'
method: sys
__stdout__: aValue
	self ___at___: #__stdout__ put: aValue
%

category: 'Python-Accessors'
method: sys
__unraisablehook__
	^ self ___at___: #__unraisablehook__
%

category: 'Python-Accessors'
method: sys
__unraisablehook__: aValue
	self ___at___: #__unraisablehook__ put: aValue
%

category: 'Python-Accessors'
method: sys
addaudithook
	^ self ___at___: #addaudithook
%

category: 'Python-Accessors'
method: sys
addaudithook: aValue
	self ___at___: #addaudithook put: aValue
%

category: 'Python-Accessors'
method: sys
api_version
	^ self ___at___: #api_version
%

category: 'Python-Accessors'
method: sys
api_version: aValue
	self ___at___: #api_version put: aValue
%

category: 'Python-Accessors'
method: sys
argv
	^ self ___at___: #argv
%

category: 'Python-Accessors'
method: sys
argv: aValue
	self ___at___: #argv put: aValue
%

category: 'Python-Accessors'
method: sys
audit
	^ self ___at___: #audit
%

category: 'Python-Accessors'
method: sys
audit: aValue
	self ___at___: #audit put: aValue
%

category: 'Python-Accessors'
method: sys
base_exec_prefix
	^ self ___at___: #base_exec_prefix
%

category: 'Python-Accessors'
method: sys
base_exec_prefix: aValue
	self ___at___: #base_exec_prefix put: aValue
%

category: 'Python-Accessors'
method: sys
base_prefix
	^ self ___at___: #base_prefix
%

category: 'Python-Accessors'
method: sys
base_prefix: aValue
	self ___at___: #base_prefix put: aValue
%

category: 'Python-Accessors'
method: sys
breakpointhook
	^ self ___at___: #breakpointhook
%

category: 'Python-Accessors'
method: sys
breakpointhook: aValue
	self ___at___: #breakpointhook put: aValue
%

category: 'Python-Accessors'
method: sys
builtin_module_names
	^ self ___at___: #builtin_module_names
%

category: 'Python-Accessors'
method: sys
builtin_module_names: aValue
	self ___at___: #builtin_module_names put: aValue
%

category: 'Python-Accessors'
method: sys
byteorder
	^ self ___at___: #byteorder
%

category: 'Python-Accessors'
method: sys
byteorder: aValue
	self ___at___: #byteorder put: aValue
%

category: 'Python-Accessors'
method: sys
call_tracing
	^ self ___at___: #call_tracing
%

category: 'Python-Accessors'
method: sys
call_tracing: aValue
	self ___at___: #call_tracing put: aValue
%

category: 'Python-Accessors'
method: sys
copyright
	^ self ___at___: #copyright
%

category: 'Python-Accessors'
method: sys
copyright: aValue
	self ___at___: #copyright put: aValue
%

category: 'Python-Accessors'
method: sys
displayhook
	^ self ___at___: #displayhook
%

category: 'Python-Accessors'
method: sys
displayhook: aValue
	self ___at___: #displayhook put: aValue
%

category: 'Python-Accessors'
method: sys
dont_write_bytecode
	^ self ___at___: #dont_write_bytecode
%

category: 'Python-Accessors'
method: sys
dont_write_bytecode: aValue
	self ___at___: #dont_write_bytecode put: aValue
%

category: 'Python-Accessors'
method: sys
exc_info
	^ self ___at___: #exc_info
%

category: 'Python-Accessors'
method: sys
exc_info: aValue
	self ___at___: #exc_info put: aValue
%

category: 'Python-Accessors'
method: sys
excepthook
	^ self ___at___: #excepthook
%

category: 'Python-Accessors'
method: sys
excepthook: aValue
	self ___at___: #excepthook put: aValue
%

category: 'Python-Accessors'
method: sys
exception
	^ self ___at___: #exception
%

category: 'Python-Accessors'
method: sys
exception: aValue
	self ___at___: #exception put: aValue
%

category: 'Python-Accessors'
method: sys
exec_prefix
	^ self ___at___: #exec_prefix
%

category: 'Python-Accessors'
method: sys
exec_prefix: aValue
	self ___at___: #exec_prefix put: aValue
%

category: 'Python-Accessors'
method: sys
executable
	^ self ___at___: #executable
%

category: 'Python-Accessors'
method: sys
executable: aValue
	self ___at___: #executable put: aValue
%

category: 'Python-Accessors'
method: sys
exit
	^ self ___at___: #exit
%

category: 'Python-Accessors'
method: sys
exit: aValue
	self ___at___: #exit put: aValue
%

category: 'Python-Accessors'
method: sys
flags
	^ self ___at___: #flags
%

category: 'Python-Accessors'
method: sys
flags: aValue
	self ___at___: #flags put: aValue
%

category: 'Python-Accessors'
method: sys
float_info
	^ self ___at___: #float_info
%

category: 'Python-Accessors'
method: sys
float_info: aValue
	self ___at___: #float_info put: aValue
%

category: 'Python-Accessors'
method: sys
float_repr_style
	^ self ___at___: #float_repr_style
%

category: 'Python-Accessors'
method: sys
float_repr_style: aValue
	self ___at___: #float_repr_style put: aValue
%

category: 'Python-Accessors'
method: sys
get_int_max_str_digits
	^ self ___at___: #get_int_max_str_digits
%

category: 'Python-Accessors'
method: sys
get_int_max_str_digits: aValue
	self ___at___: #get_int_max_str_digits put: aValue
%

category: 'Python-Accessors'
method: sys
getallocatedblocks
	^ self ___at___: #getallocatedblocks
%

category: 'Python-Accessors'
method: sys
getallocatedblocks: aValue
	self ___at___: #getallocatedblocks put: aValue
%

category: 'Python-Accessors'
method: sys
getdefaultencoding
	^ self ___at___: #getdefaultencoding
%

category: 'Python-Accessors'
method: sys
getdefaultencoding: aValue
	self ___at___: #getdefaultencoding put: aValue
%

category: 'Python-Accessors'
method: sys
getfilesystemencodeerrors
	^ self ___at___: #getfilesystemencodeerrors
%

category: 'Python-Accessors'
method: sys
getfilesystemencodeerrors: aValue
	self ___at___: #getfilesystemencodeerrors put: aValue
%

category: 'Python-Accessors'
method: sys
getfilesystemencoding
	^ self ___at___: #getfilesystemencoding
%

category: 'Python-Accessors'
method: sys
getfilesystemencoding: aValue
	self ___at___: #getfilesystemencoding put: aValue
%

category: 'Python-Accessors'
method: sys
getprofile
	^ self ___at___: #getprofile
%

category: 'Python-Accessors'
method: sys
getprofile: aValue
	self ___at___: #getprofile put: aValue
%

category: 'Python-Accessors'
method: sys
getrecursionlimit
	^ self ___at___: #getrecursionlimit
%

category: 'Python-Accessors'
method: sys
getrecursionlimit: aValue
	self ___at___: #getrecursionlimit put: aValue
%

category: 'Python-Accessors'
method: sys
getrefcount
	^ self ___at___: #getrefcount
%

category: 'Python-Accessors'
method: sys
getrefcount: aValue
	self ___at___: #getrefcount put: aValue
%

category: 'Python-Accessors'
method: sys
getsizeof
	^ self ___at___: #getsizeof
%

category: 'Python-Accessors'
method: sys
getsizeof: aValue
	self ___at___: #getsizeof put: aValue
%

category: 'Python-Accessors'
method: sys
gettrace
	^ self ___at___: #gettrace
%

category: 'Python-Accessors'
method: sys
gettrace: aValue
	self ___at___: #gettrace put: aValue
%

category: 'Python-Accessors'
method: sys
hash_info
	^ self ___at___: #hash_info
%

category: 'Python-Accessors'
method: sys
hash_info: aValue
	self ___at___: #hash_info put: aValue
%

category: 'Python-Accessors'
method: sys
hexversion
	^ self ___at___: #hexversion
%

category: 'Python-Accessors'
method: sys
hexversion: aValue
	self ___at___: #hexversion put: aValue
%

category: 'Python-Accessors'
method: sys
implementation
	^ self ___at___: #implementation
%

category: 'Python-Accessors'
method: sys
implementation: aValue
	self ___at___: #implementation put: aValue
%

category: 'Python-Initialization'
method: sys
initialize
	"Initialize all module attributes with their default values"
	self 
		initialize_version_info;
		initialize_platform_info;
		initialize_path_info;
		"initialize_io_streams;"
		initialize_runtime_info;
		initialize_functions;
		yourself
%

category: 'Python-Initialization'
method: sys
initialize_addaudithook
	"addaudithook(hook) - Add an auditing hook"
	self ___at___: #addaudithook put: [:positional :keywords |
		"Auditing is not implemented in Grail"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_audit
	"audit(event, *args) - Raise an auditing event"
	self ___at___: #audit put: [:positional :keywords |
		"Auditing is not implemented in Grail"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_breakpointhook
	"breakpointhook(*args, **kws) - Hook function called by breakpoint()"
	self ___at___: #breakpointhook put: [:positional :keywords |
		"TODO: Implement debugger integration"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_call_tracing
	"call_tracing(func, args) - Call function with tracing enabled"
	self ___at___: #call_tracing put: [:positional :keywords |
		| func args |
		func := positional ___at___: 1.
		args := positional ___at___: 2.
		"Simply call the function; tracing not implemented"
		func value: args value: nil
	]
%

category: 'Python-Initialization'
method: sys
initialize_displayhook
	"displayhook(value) - Print value to stdout and save in builtins._"
	self ___at___: #displayhook put: [:positional :keywords |
		| value stdoutStream |
		value := positional ___at___: 1.
		value == None ifFalse: [
			"TODO: Print repr(value) to stdout"
			stdoutStream := GsFile perform: #stdout env: 0.
			stdoutStream perform: #nextPutAll: env: 0 withArguments: {value printString}.
			stdoutStream perform: #lf env: 0.
		].
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_exc_info
	"exc_info() - Return info about the current exception being handled"
	self ___at___: #exc_info put: [:positional :keywords |
		"Returns (type, value, traceback) tuple"
		"TODO: Integrate with GemStone exception handling"
		tuple ___withAll___: {None. None. None}
	]
%

category: 'Python-Initialization'
method: sys
initialize_excepthook
	"excepthook(type, value, traceback) - Print exception and traceback to stderr"
	self ___at___: #excepthook put: [:positional :keywords |
		| excType excValue excTb |
		excType := positional ___at___: 1.
		excValue := positional ___at___: 2.
		excTb := positional ___at___: 3.
		"TODO: Format and print to stderr"
		GsFile perform: #gciLogServer: env: 0 withArguments: {'Exception: ', excValue printString}.
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_exception
	"exception() - Return the current exception instance"
	self ___at___: #exception put: [:positional :keywords |
		"TODO: Integrate with GemStone exception handling"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_exit
	"exit([arg]) - Raise SystemExit to exit the interpreter"
	self ___at___: #exit put: [:positional :keywords |
		| arg |
		arg := (positional __len__ ___gt___: 0)
			ifTrue: [positional ___at___: 1]
			ifFalse: [0].
		SystemExit ___signal___: arg
	]
%

category: 'Python-Initialization'
method: sys
initialize_functions
	"Initialize function attributes"
	self
		initialize_exit;
		initialize_exc_info;
		initialize_exception;
		initialize_excepthook;
		initialize_displayhook;
		initialize_breakpointhook;
		initialize_getdefaultencoding;
		initialize_getfilesystemencoding;
		initialize_getfilesystemencodeerrors;
		initialize_getrecursionlimit;
		initialize_setrecursionlimit;
		initialize_getsizeof;
		initialize_getrefcount;
		initialize_intern;
		initialize_is_finalizing;
		initialize_getallocatedblocks;
		initialize_get_int_max_str_digits;
		initialize_set_int_max_str_digits;
		initialize_audit;
		initialize_addaudithook;
		initialize_settrace;
		initialize_setprofile;
		initialize_gettrace;
		initialize_getprofile;
		initialize_call_tracing;
		initialize_unraisablehook;
		yourself.
	"Store original hooks"
	self ___at___: #__breakpointhook__ put: (self ___at___: #breakpointhook).
	self ___at___: #__displayhook__ put: (self ___at___: #displayhook).
	self ___at___: #__excepthook__ put: (self ___at___: #excepthook).
	self ___at___: #__unraisablehook__ put: (self ___at___: #unraisablehook).
%

category: 'Python-Initialization'
method: sys
initialize_get_int_max_str_digits
	"get_int_max_str_digits() - Get integer string conversion length limit"
	self ___at___: #get_int_max_str_digits put: [:positional :keywords |
		4300 "Default Python limit"
	]
%

category: 'Python-Initialization'
method: sys
initialize_getallocatedblocks
	"getallocatedblocks() - Return number of memory blocks allocated"
	self ___at___: #getallocatedblocks put: [:positional :keywords |
		"GemStone manages memory differently"
		0
	]
%

category: 'Python-Initialization'
method: sys
initialize_getdefaultencoding
	"getdefaultencoding() - Return the default string encoding"
	self ___at___: #getdefaultencoding put: [:positional :keywords |
		'utf-8'
	]
%

category: 'Python-Initialization'
method: sys
initialize_getfilesystemencodeerrors
	"getfilesystemencodeerrors() - Get the filesystem error handler"
	self ___at___: #getfilesystemencodeerrors put: [:positional :keywords |
		'surrogateescape'
	]
%

category: 'Python-Initialization'
method: sys
initialize_getfilesystemencoding
	"getfilesystemencoding() - Get the filesystem encoding"
	self ___at___: #getfilesystemencoding put: [:positional :keywords |
		'utf-8'
	]
%

category: 'Python-Initialization'
method: sys
initialize_getprofile
	"getprofile() - Get the current profile function"
	self ___at___: #getprofile put: [:positional :keywords |
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_getrecursionlimit
	"getrecursionlimit() - Return the current recursion limit"
	self ___at___: #getrecursionlimit put: [:positional :keywords |
		1000 "Default Python recursion limit"
	]
%

category: 'Python-Initialization'
method: sys
initialize_getrefcount
	"getrefcount(object) - Return the reference count of the object"
	self ___at___: #getrefcount put: [:positional :keywords |
		| obj |
		obj := positional ___at___: 1.
		"GemStone uses garbage collection, not reference counting"
		"Return a placeholder value"
		1
	]
%

category: 'Python-Initialization'
method: sys
initialize_getsizeof
	"getsizeof(object[, default]) - Return the size of an object in bytes"
	self ___at___: #getsizeof put: [:positional :keywords |
		| obj default |
		obj := positional ___at___: 1.
		default := (positional __len__ ___gt___: 1)
			ifTrue: [positional ___at___: 2]
			ifFalse: [nil].
		"Use GemStone's physicalSize (env 0)"
		[obj perform: #physicalSize env: 0] ___on___: Error do: [:ex |
			default ifNil: [TypeError ___signal___: 'object does not provide size'].
			default
		]
	]
%

category: 'Python-Initialization'
method: sys
initialize_gettrace
	"gettrace() - Get the current trace function"
	self ___at___: #gettrace put: [:positional :keywords |
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_intern
	"intern(string) - Enter string in interned strings table"
	self ___at___: #intern put: [:positional :keywords |
		| aString |
		aString := positional ___at___: 1.
		"GemStone automatically interns Symbols"
		(aString perform: #asSymbol env: 0) perform: #asString env: 0
	]
%

category: 'Python-Initialization'
method: sys
initialize_io_streams
	"Initialize I/O stream attributes using GsFile"
	"Use GsFile directly for now; proper TextIO wrappers can be added later"
	self ___at___: #stdin put: (GsFile perform: #stdin env: 0).
	self ___at___: #stdout put: (GsFile perform: #stdout env: 0).
	self ___at___: #stderr put: (GsFile perform: #stderr env: 0).
	self ___at___: #__stdin__ put: (self ___at___: #stdin).
	self ___at___: #__stdout__ put: (self ___at___: #stdout).
	self ___at___: #__stderr__ put: (self ___at___: #stderr).
%

category: 'Python-Initialization'
method: sys
initialize_is_finalizing
	"is_finalizing() - Return True if interpreter is shutting down"
	self ___at___: #is_finalizing put: [:positional :keywords |
		false
	]
%

category: 'Python-Initialization'
method: sys
initialize_path_info
	"Initialize path-related attributes using GemStone info"
	| gsVersionReport gemNativeCodePath |
	gsVersionReport := System perform: #gemVersionReport env: 0.
	gemNativeCodePath := gsVersionReport ___at___: 'gemNativeCodePath' ifAbsent: [''].

	"Use GemStone installation paths"
	self ___at___: #prefix put: gemNativeCodePath.
	self ___at___: #exec_prefix put: gemNativeCodePath.
	self ___at___: #base_prefix put: gemNativeCodePath.
	self ___at___: #base_exec_prefix put: gemNativeCodePath.
	self ___at___: #executable put: gemNativeCodePath.

	"Initialize module path list"
	self ___at___: #path put: (list ___new___).
	self ___at___: #path_hooks put: (list ___new___).
	self ___at___: #path_importer_cache put: (KeyValueDictionary perform: #new env: 0).
	self ___at___: #meta_path put: (list ___new___).
	self ___at___: #pycache_prefix put: None.
	self ___at___: #dont_write_bytecode put: true. "GemStone doesn't use .pyc files"
%

category: 'Python-Initialization'
method: sys
initialize_platform_info
	"Initialize platform-related attributes using GemStone system info"
	| osName cpuArch |
	osName := System perform: #gemVersionAt: env: 0 withArguments: {#osName}.
	cpuArch := System perform: #gemVersionAt: env: 0 withArguments: {#cpuArchitecture}.

	"Map GemStone OS names to Python platform strings"
	self ___at___: #platform put: ((osName ___eq___: 'Darwin')
		ifTrue: ['darwin']
		ifFalse: [(osName ___eq___: 'Linux')
			ifTrue: ['linux']
			ifFalse: [(osName ___eq___: 'SunOS')
				ifTrue: ['sunos']
				ifFalse: [(osName ___eq___: 'AIX')
					ifTrue: ['aix']
					ifFalse: [osName perform: #asLowercase env: 0]]]]).

	"Determine byte order from CPU architecture"
	"SPARC is big-endian, x86/ARM are little-endian"
	self ___at___: #byteorder put: ((cpuArch ___eq___: 'SPARC')
		ifTrue: ['big']
		ifFalse: ['little']).

	"Maximum size for integers and other limits"
	self ___at___: #maxsize put: (SmallInteger perform: #maximumValue env: 0). "GemStone's SmallInteger max"
	self ___at___: #maxunicode put: 16r10FFFF. "Unicode max codepoint"
	self ___at___: #platlibdir put: 'lib'.
	self ___at___: #float_repr_style put: 'short'.
%

category: 'Python-Initialization'
method: sys
initialize_runtime_info
	"Initialize runtime information attributes from GemStone"
	| cmdArgs |

	"Get command line arguments from GemStone"
	cmdArgs := System perform: #commandLineArguments env: 0.
	self ___at___: #argv put: (list ___new___).
	self ___at___: #orig_argv put: (list ___new___).
	cmdArgs perform: #do: env: 0 withArguments: {[:arg |
		(self ___at___: #argv) append: arg.
		(self ___at___: #orig_argv) append: arg.
	]}.

	"Module registry - get from class-level modules"
	self ___at___: #modules put: (sys modules).

		"Built-in module names as tuple"
	self ___at___: #builtin_module_names put: (tuple ___withAll___: {'builtins'. 'cmath'. 'fractions'. 'gemstone'. 'importlib'. 'math'. 'os'. 'string'. 'sys'}).
	self ___at___: #stdlib_module_names put: (frozenset ___new___).

	"Copyright and other info"
	self ___at___: #copyright put: 'Copyright (c) GemTalk Systems LLC. All rights reserved.'.
	self ___at___: #flags put: None. "TODO: Create named tuple for flags"
	self ___at___: #float_info put: None. "TODO: Create named tuple for float_info"
	self ___at___: #int_info put: None. "TODO: Create named tuple for int_info"
	self ___at___: #hash_info put: None. "TODO: Create named tuple for hash_info"
	self ___at___: #thread_info put: None. "TODO: Create named tuple for thread_info"
	self ___at___: #warnoptions put: (list ___new___).
	self ___at___: #tracebacklimit put: 1000.
	self ___at___: #ps1 put: '>>> '.
	self ___at___: #ps2 put: '... '.
%

category: 'Python-Initialization'
method: sys
initialize_set_int_max_str_digits
	"set_int_max_str_digits(maxdigits) - Set integer string conversion limit"
	self ___at___: #set_int_max_str_digits put: [:positional :keywords |
		| maxdigits |
		maxdigits := positional ___at___: 1.
		"GemStone doesn't have this limit; stub implementation"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_setprofile
	"setprofile(profilefunc) - Set the system profile function"
	self ___at___: #setprofile put: [:positional :keywords |
		"Profiling is not implemented in Grail"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_setrecursionlimit
	"setrecursionlimit(limit) - Set the recursion limit"
	self ___at___: #setrecursionlimit put: [:positional :keywords |
		| limit |
		limit := positional ___at___: 1.
		"GemStone manages stack differently; this is a stub"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_settrace
	"settrace(tracefunc) - Set the system trace function"
	self ___at___: #settrace put: [:positional :keywords |
		"Tracing is not implemented in Grail"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_unraisablehook
	"unraisablehook(unraisable) - Handle an unraisable exception"
	self ___at___: #unraisablehook put: [:positional :keywords |
		| unraisable |
		unraisable := positional ___at___: 1.
		"TODO: Log unraisable exceptions"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_version_info
	"Initialize version-related attributes using GemStone version info"
	| gsVersion gsVersionReport grailVersion |
	gsVersionReport := System perform: #gemVersionReport env: 0.
	gsVersion := gsVersionReport ___at___: #gsVersion ifAbsent: ['unknown'].
	grailVersion := '0.1.0'.

	"Build version string similar to Python's"
	self ___at___: #version put: (((('Grail ' ___concat___: grailVersion) ___concat___: ' (GemStone/S ') ___concat___: gsVersion) ___concat___: ')').

	"version_info tuple: (major, minor, micro, releaselevel, serial)"
	self ___at___: #version_info put: (tuple ___withAll___: {0. 1. 0. 'alpha'. 0}).

	"API version and hexversion for compatibility checks"
	self ___at___: #api_version put: 0.
	self ___at___: #hexversion put: 16r00010000. "0.1.0.0"

	"Implementation info - simple dict for now"
	self ___at___: #implementation put: None. "TODO: Create SimpleNamespace for implementation"
%

category: 'Python-Accessors'
method: sys
int_info
	^ self ___at___: #int_info
%

category: 'Python-Accessors'
method: sys
int_info: aValue
	self ___at___: #int_info put: aValue
%

category: 'Python-Accessors'
method: sys
intern
	^ self ___at___: #intern
%

category: 'Python-Accessors'
method: sys
intern: aValue
	self ___at___: #intern put: aValue
%

category: 'Python-Accessors'
method: sys
is_finalizing
	^ self ___at___: #is_finalizing
%

category: 'Python-Accessors'
method: sys
is_finalizing: aValue
	self ___at___: #is_finalizing put: aValue
%

category: 'Python-Accessors'
method: sys
maxsize
	^ self ___at___: #maxsize
%

category: 'Python-Accessors'
method: sys
maxsize: aValue
	self ___at___: #maxsize put: aValue
%

category: 'Python-Accessors'
method: sys
maxunicode
	^ self ___at___: #maxunicode
%

category: 'Python-Accessors'
method: sys
maxunicode: aValue
	self ___at___: #maxunicode put: aValue
%

category: 'Python-Accessors'
method: sys
meta_path
	^ self ___at___: #meta_path
%

category: 'Python-Accessors'
method: sys
meta_path: aValue
	self ___at___: #meta_path put: aValue
%

category: 'Python-Accessors'
method: sys
modules
	^ self ___at___: #modules
%

category: 'Python-Accessors'
method: sys
modules: aValue
	self ___at___: #modules put: aValue
%

category: 'Python-Accessors'
method: sys
orig_argv
	^ self ___at___: #orig_argv
%

category: 'Python-Accessors'
method: sys
orig_argv: aValue
	self ___at___: #orig_argv put: aValue
%

category: 'Python-Accessors'
method: sys
path
	^ self ___at___: #path
%

category: 'Python-Accessors'
method: sys
path: aValue
	self ___at___: #path put: aValue
%

category: 'Python-Accessors'
method: sys
path_hooks
	^ self ___at___: #path_hooks
%

category: 'Python-Accessors'
method: sys
path_hooks: aValue
	self ___at___: #path_hooks put: aValue
%

category: 'Python-Accessors'
method: sys
path_importer_cache
	^ self ___at___: #path_importer_cache
%

category: 'Python-Accessors'
method: sys
path_importer_cache: aValue
	self ___at___: #path_importer_cache put: aValue
%

category: 'Python-Accessors'
method: sys
platform
	^ self ___at___: #platform
%

category: 'Python-Accessors'
method: sys
platform: aValue
	self ___at___: #platform put: aValue
%

category: 'Python-Accessors'
method: sys
platlibdir
	^ self ___at___: #platlibdir
%

category: 'Python-Accessors'
method: sys
platlibdir: aValue
	self ___at___: #platlibdir put: aValue
%

category: 'Python-Accessors'
method: sys
prefix
	^ self ___at___: #prefix
%

category: 'Python-Accessors'
method: sys
prefix: aValue
	self ___at___: #prefix put: aValue
%

category: 'Python-Accessors'
method: sys
ps1
	^ self ___at___: #ps1
%

category: 'Python-Accessors'
method: sys
ps1: aValue
	self ___at___: #ps1 put: aValue
%

category: 'Python-Accessors'
method: sys
ps2
	^ self ___at___: #ps2
%

category: 'Python-Accessors'
method: sys
ps2: aValue
	self ___at___: #ps2 put: aValue
%

category: 'Python-Accessors'
method: sys
pycache_prefix
	^ self ___at___: #pycache_prefix
%

category: 'Python-Accessors'
method: sys
pycache_prefix: aValue
	self ___at___: #pycache_prefix put: aValue
%

category: 'Python-Accessors'
method: sys
set_int_max_str_digits
	^ self ___at___: #set_int_max_str_digits
%

category: 'Python-Accessors'
method: sys
set_int_max_str_digits: aValue
	self ___at___: #set_int_max_str_digits put: aValue
%

category: 'Python-Accessors'
method: sys
setprofile
	^ self ___at___: #setprofile
%

category: 'Python-Accessors'
method: sys
setprofile: aValue
	self ___at___: #setprofile put: aValue
%

category: 'Python-Accessors'
method: sys
setrecursionlimit
	^ self ___at___: #setrecursionlimit
%

category: 'Python-Accessors'
method: sys
setrecursionlimit: aValue
	self ___at___: #setrecursionlimit put: aValue
%

category: 'Python-Accessors'
method: sys
settrace
	^ self ___at___: #settrace
%

category: 'Python-Accessors'
method: sys
settrace: aValue
	self ___at___: #settrace put: aValue
%

category: 'Python-Accessors'
method: sys
stderr
	^ self ___at___: #stderr
%

category: 'Python-Accessors'
method: sys
stderr: aValue
	self ___at___: #stderr put: aValue
%

category: 'Python-Accessors'
method: sys
stdin
	^ self ___at___: #stdin
%

category: 'Python-Accessors'
method: sys
stdin: aValue
	self ___at___: #stdin put: aValue
%

category: 'Python-Accessors'
method: sys
stdlib_module_names
	^ self ___at___: #stdlib_module_names
%

category: 'Python-Accessors'
method: sys
stdlib_module_names: aValue
	self ___at___: #stdlib_module_names put: aValue
%

category: 'Python-Accessors'
method: sys
stdout
	^ self ___at___: #stdout
%

category: 'Python-Accessors'
method: sys
stdout: aValue
	self ___at___: #stdout put: aValue
%

category: 'Python-Accessors'
method: sys
thread_info
	^ self ___at___: #thread_info
%

category: 'Python-Accessors'
method: sys
thread_info: aValue
	self ___at___: #thread_info put: aValue
%

category: 'Python-Accessors'
method: sys
tracebacklimit
	^ self ___at___: #tracebacklimit
%

category: 'Python-Accessors'
method: sys
tracebacklimit: aValue
	self ___at___: #tracebacklimit put: aValue
%

category: 'Python-Accessors'
method: sys
unraisablehook
	^ self ___at___: #unraisablehook
%

category: 'Python-Accessors'
method: sys
unraisablehook: aValue
	self ___at___: #unraisablehook put: aValue
%

category: 'Python-Accessors'
method: sys
version
	^ self ___at___: #version
%

category: 'Python-Accessors'
method: sys
version: aValue
	self ___at___: #version put: aValue
%

category: 'Python-Accessors'
method: sys
version_info
	^ self ___at___: #version_info
%

category: 'Python-Accessors'
method: sys
version_info: aValue
	self ___at___: #version_info put: aValue
%

category: 'Python-Accessors'
method: sys
warnoptions
	^ self ___at___: #warnoptions
%

category: 'Python-Accessors'
method: sys
warnoptions: aValue
	self ___at___: #warnoptions put: aValue
%

set compile_env: 0
