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
sys removeAllMethods: 2.
sys class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Class methods for sys

category: 'Python-Singleton'
classmethod: sys
new
	"Raise an error: use instance instead of new"
	TypeError ___signal___: 'Use instance instead of new for sys module'
%

category: 'Python-Singleton'
classmethod: sys
instance
	"Return the singleton instance of sys.
	Creates it if it doesn't exist."
	instance == nil ifTrue: [
		instance := self perform: #basicNew env: 0.
		instance initialize
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: sys
clearInstance
	"Clear the singleton instance (useful for testing)"
	instance := nil
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

category: 'Python-Module Registry'
classmethod: sys
initializeBuiltinModules
	"Initialize the registry with built-in modules"
	modules
		___at___: #builtins put: builtins 	instance;
		___at___: #math 	put: math 		instance;
		___at___: #cmath 	put: cmath 		instance;
		___at___: #os 		put: os 		instance;
		___at___: #sys 		put: sys 		instance;
		___yourself___.
%

! ------------------- Instance methods for sys - Initialization

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
initialize_version_info
	"Initialize version-related attributes using GemStone version info"
	| gsVersion gsVersionReport grailVersion |
	gsVersionReport := System perform: #gemVersionReport env: 0.
	gsVersion := gsVersionReport perform: #at:ifAbsent: env: 0 withArguments: {#gsVersion. ['unknown']}.
	grailVersion := '0.1.0'.

	"Build version string similar to Python's"
	version := (((('Grail ' ___concat___: grailVersion) ___concat___: ' (GemStone/S ') ___concat___: gsVersion) ___concat___: ')').

	"version_info tuple: (major, minor, micro, releaselevel, serial)"
	version_info := tuple ___withAll___: {0. 1. 0. 'alpha'. 0}.

	"API version and hexversion for compatibility checks"
	api_version := 0.
	hexversion := 16r00010000. "0.1.0.0"

	"Implementation info - simple dict for now"
	implementation := None. "TODO: Create SimpleNamespace for implementation"
%

category: 'Python-Initialization'
method: sys
initialize_platform_info
	"Initialize platform-related attributes using GemStone system info"
	| osName cpuArch |
	osName := System perform: #gemVersionAt: env: 0 withArguments: {#osName}.
	cpuArch := System perform: #gemVersionAt: env: 0 withArguments: {#cpuArchitecture}.

	"Map GemStone OS names to Python platform strings"
	platform := (osName ___eq___: 'Darwin')
		ifTrue: ['darwin']
		ifFalse: [(osName ___eq___: 'Linux')
			ifTrue: ['linux']
			ifFalse: [(osName ___eq___: 'SunOS')
				ifTrue: ['sunos']
				ifFalse: [(osName ___eq___: 'AIX')
					ifTrue: ['aix']
					ifFalse: [osName perform: #asLowercase env: 0]]]].

	"Determine byte order from CPU architecture"
	"SPARC is big-endian, x86/ARM are little-endian"
	byteorder := (cpuArch ___eq___: 'SPARC')
		ifTrue: ['big']
		ifFalse: ['little'].

	"Maximum size for integers and other limits"
	maxsize := SmallInteger perform: #maximumValue env: 0. "GemStone's SmallInteger max"
	maxunicode := 16r10FFFF. "Unicode max codepoint"
	platlibdir := 'lib'.
	float_repr_style := 'short'.
%

category: 'Python-Initialization'
method: sys
initialize_path_info
	"Initialize path-related attributes using GemStone info"
	| gsVersionReport gemNativeCodePath |
	gsVersionReport := System perform: #gemVersionReport env: 0.
	gemNativeCodePath := gsVersionReport perform: #at:ifAbsent: env: 0 withArguments: {'gemNativeCodePath'. ['']}.

	"Use GemStone installation paths"
	prefix := gemNativeCodePath.
	exec_prefix := gemNativeCodePath.
	base_prefix := gemNativeCodePath.
	base_exec_prefix := gemNativeCodePath.
	executable := gemNativeCodePath.

	"Initialize module path list"
	path := list ___new___.
	path_hooks := list ___new___.
	path_importer_cache := KeyValueDictionary perform: #new env: 0.
	meta_path := list ___new___.
	pycache_prefix := None.
	dont_write_bytecode := true. "GemStone doesn't use .pyc files"
%

category: 'Python-Initialization'
method: sys
initialize_io_streams
	"Initialize I/O stream attributes using GsFile"
	"Use GsFile directly for now; proper TextIO wrappers can be added later"
	stdin := GsFile perform: #stdin env: 0.
	stdout := GsFile perform: #stdout env: 0.
	stderr := GsFile perform: #stderr env: 0.
	__stdin__ := stdin.
	__stdout__ := stdout.
	__stderr__ := stderr.
%

category: 'Python-Initialization'
method: sys
initialize_runtime_info
	"Initialize runtime information attributes from GemStone"
	| cmdArgs |

	"Get command line arguments from GemStone"
	cmdArgs := System perform: #commandLineArguments env: 0.
	argv := list ___new___.
	orig_argv := list ___new___.
	cmdArgs perform: #do: env: 0 withArguments: {[:arg |
		argv append: arg.
		orig_argv append: arg.
	]}.

	"Module registry - get from class-level modules"
	modules := sys modules.

	"Built-in module names as tuple"
	builtin_module_names := tuple ___withAll___: {'builtins'. 'cmath'. 'importlib'. 'math'. 'os'. 'sys'}.
	stdlib_module_names := frozenset ___new___.

	"Copyright and other info"
	copyright := 'Copyright (c) GemTalk Systems LLC. All rights reserved.'.
	flags := None. "TODO: Create named tuple for flags"
	float_info := None. "TODO: Create named tuple for float_info"
	int_info := None. "TODO: Create named tuple for int_info"
	hash_info := None. "TODO: Create named tuple for hash_info"
	thread_info := None. "TODO: Create named tuple for thread_info"
	warnoptions := list ___new___.
	tracebacklimit := 1000.
	ps1 := '>>> '.
	ps2 := '... '.
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
	__breakpointhook__ := breakpointhook.
	__displayhook__ := displayhook.
	__excepthook__ := excepthook.
	__unraisablehook__ := unraisablehook.
%

! ------------------- Function initialization methods

category: 'Python-Initialization'
method: sys
initialize_exit
	"exit([arg]) - Raise SystemExit to exit the interpreter"
	exit := [:positional :keywords |
		| arg |
		arg := (positional __len__ ___gt___: 0)
			ifTrue: [positional ___at___: 1]
			ifFalse: [0].
		SystemExit ___signal___: arg
	]
%

category: 'Python-Initialization'
method: sys
initialize_exc_info
	"exc_info() - Return info about the current exception being handled"
	exc_info := [:positional :keywords |
		"Returns (type, value, traceback) tuple"
		"TODO: Integrate with GemStone exception handling"
		tuple ___withAll___: {None. None. None}
	]
%

category: 'Python-Initialization'
method: sys
initialize_exception
	"exception() - Return the current exception instance"
	exception := [:positional :keywords |
		"TODO: Integrate with GemStone exception handling"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_excepthook
	"excepthook(type, value, traceback) - Print exception and traceback to stderr"
	excepthook := [:positional :keywords |
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
initialize_displayhook
	"displayhook(value) - Print value to stdout and save in builtins._"
	displayhook := [:positional :keywords |
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
initialize_breakpointhook
	"breakpointhook(*args, **kws) - Hook function called by breakpoint()"
	breakpointhook := [:positional :keywords |
		"TODO: Implement debugger integration"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_getdefaultencoding
	"getdefaultencoding() - Return the default string encoding"
	getdefaultencoding := [:positional :keywords |
		'utf-8'
	]
%

category: 'Python-Initialization'
method: sys
initialize_getfilesystemencoding
	"getfilesystemencoding() - Get the filesystem encoding"
	getfilesystemencoding := [:positional :keywords |
		'utf-8'
	]
%

category: 'Python-Initialization'
method: sys
initialize_getfilesystemencodeerrors
	"getfilesystemencodeerrors() - Get the filesystem error handler"
	getfilesystemencodeerrors := [:positional :keywords |
		'surrogateescape'
	]
%

category: 'Python-Initialization'
method: sys
initialize_getrecursionlimit
	"getrecursionlimit() - Return the current recursion limit"
	getrecursionlimit := [:positional :keywords |
		1000 "Default Python recursion limit"
	]
%

category: 'Python-Initialization'
method: sys
initialize_setrecursionlimit
	"setrecursionlimit(limit) - Set the recursion limit"
	setrecursionlimit := [:positional :keywords |
		| limit |
		limit := positional ___at___: 1.
		"GemStone manages stack differently; this is a stub"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_getsizeof
	"getsizeof(object[, default]) - Return the size of an object in bytes"
	getsizeof := [:positional :keywords |
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
initialize_getrefcount
	"getrefcount(object) - Return the reference count of the object"
	getrefcount := [:positional :keywords |
		| obj |
		obj := positional ___at___: 1.
		"GemStone uses garbage collection, not reference counting"
		"Return a placeholder value"
		1
	]
%

category: 'Python-Initialization'
method: sys
initialize_intern
	"intern(string) - Enter string in interned strings table"
	intern := [:positional :keywords |
		| aString |
		aString := positional ___at___: 1.
		"GemStone automatically interns Symbols"
		(aString perform: #asSymbol env: 0) perform: #asString env: 0
	]
%

category: 'Python-Initialization'
method: sys
initialize_is_finalizing
	"is_finalizing() - Return True if interpreter is shutting down"
	is_finalizing := [:positional :keywords |
		false
	]
%

category: 'Python-Initialization'
method: sys
initialize_getallocatedblocks
	"getallocatedblocks() - Return number of memory blocks allocated"
	getallocatedblocks := [:positional :keywords |
		"GemStone manages memory differently"
		0
	]
%

category: 'Python-Initialization'
method: sys
initialize_get_int_max_str_digits
	"get_int_max_str_digits() - Get integer string conversion length limit"
	get_int_max_str_digits := [:positional :keywords |
		4300 "Default Python limit"
	]
%

category: 'Python-Initialization'
method: sys
initialize_set_int_max_str_digits
	"set_int_max_str_digits(maxdigits) - Set integer string conversion limit"
	set_int_max_str_digits := [:positional :keywords |
		| maxdigits |
		maxdigits := positional ___at___: 1.
		"GemStone doesn't have this limit; stub implementation"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_audit
	"audit(event, *args) - Raise an auditing event"
	audit := [:positional :keywords |
		"Auditing is not implemented in Grail"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_addaudithook
	"addaudithook(hook) - Add an auditing hook"
	addaudithook := [:positional :keywords |
		"Auditing is not implemented in Grail"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_settrace
	"settrace(tracefunc) - Set the system trace function"
	settrace := [:positional :keywords |
		"Tracing is not implemented in Grail"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_setprofile
	"setprofile(profilefunc) - Set the system profile function"
	setprofile := [:positional :keywords |
		"Profiling is not implemented in Grail"
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_gettrace
	"gettrace() - Get the current trace function"
	gettrace := [:positional :keywords |
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_getprofile
	"getprofile() - Get the current profile function"
	getprofile := [:positional :keywords |
		None
	]
%

category: 'Python-Initialization'
method: sys
initialize_call_tracing
	"call_tracing(func, args) - Call function with tracing enabled"
	call_tracing := [:positional :keywords |
		| func args |
		func := positional ___at___: 1.
		args := positional ___at___: 2.
		"Simply call the function; tracing not implemented"
		func value: args value: nil
	]
%

category: 'Python-Initialization'
method: sys
initialize_unraisablehook
	"unraisablehook(unraisable) - Handle an unraisable exception"
	unraisablehook := [:positional :keywords |
		| unraisable |
		unraisable := positional ___at___: 1.
		"TODO: Log unraisable exceptions"
		None
	]
%

! ------------------- Getter and setter methods for sys attributes

category: 'Python-Accessors'
method: sys
argv
	^ argv
%

category: 'Python-Accessors'
method: sys
argv: aValue
	argv := aValue
%

category: 'Python-Accessors'
method: sys
version
	^ version
%

category: 'Python-Accessors'
method: sys
version: aValue
	version := aValue
%

category: 'Python-Accessors'
method: sys
version_info
	^ version_info
%

category: 'Python-Accessors'
method: sys
version_info: aValue
	version_info := aValue
%

category: 'Python-Accessors'
method: sys
platform
	^ platform
%

category: 'Python-Accessors'
method: sys
platform: aValue
	platform := aValue
%

category: 'Python-Accessors'
method: sys
path
	^ path
%

category: 'Python-Accessors'
method: sys
path: aValue
	path := aValue
%

category: 'Python-Accessors'
method: sys
modules
	^ modules
%

category: 'Python-Accessors'
method: sys
modules: aValue
	modules := aValue
%

category: 'Python-Accessors'
method: sys
stdin
	^ stdin
%

category: 'Python-Accessors'
method: sys
stdin: aValue
	stdin := aValue
%

category: 'Python-Accessors'
method: sys
stdout
	^ stdout
%

category: 'Python-Accessors'
method: sys
stdout: aValue
	stdout := aValue
%

category: 'Python-Accessors'
method: sys
stderr
	^ stderr
%

category: 'Python-Accessors'
method: sys
stderr: aValue
	stderr := aValue
%

category: 'Python-Accessors'
method: sys
exit
	^ exit
%

category: 'Python-Accessors'
method: sys
exit: aValue
	exit := aValue
%

category: 'Python-Accessors'
method: sys
exc_info
	^ exc_info
%

category: 'Python-Accessors'
method: sys
exc_info: aValue
	exc_info := aValue
%

category: 'Python-Accessors'
method: sys
maxsize
	^ maxsize
%

category: 'Python-Accessors'
method: sys
maxsize: aValue
	maxsize := aValue
%

category: 'Python-Accessors'
method: sys
prefix
	^ prefix
%

category: 'Python-Accessors'
method: sys
prefix: aValue
	prefix := aValue
%

category: 'Python-Accessors'
method: sys
executable
	^ executable
%

category: 'Python-Accessors'
method: sys
executable: aValue
	executable := aValue
%

category: 'Python-Accessors'
method: sys
builtin_module_names
	^ builtin_module_names
%

category: 'Python-Accessors'
method: sys
builtin_module_names: aValue
	builtin_module_names := aValue
%

category: 'Python-Accessors'
method: sys
byteorder
	^ byteorder
%

category: 'Python-Accessors'
method: sys
byteorder: aValue
	byteorder := aValue
%

category: 'Python-Accessors'
method: sys
copyright
	^ copyright
%

category: 'Python-Accessors'
method: sys
copyright: aValue
	copyright := aValue
%

category: 'Python-Accessors'
method: sys
getdefaultencoding
	^ getdefaultencoding
%

category: 'Python-Accessors'
method: sys
getdefaultencoding: aValue
	getdefaultencoding := aValue
%

category: 'Python-Accessors'
method: sys
excepthook
	^ excepthook
%

category: 'Python-Accessors'
method: sys
excepthook: aValue
	excepthook := aValue
%

category: 'Python-Accessors'
method: sys
displayhook
	^ displayhook
%

category: 'Python-Accessors'
method: sys
displayhook: aValue
	displayhook := aValue
%

category: 'Python-Accessors'
method: sys
getfilesystemencoding
	^ getfilesystemencoding
%

category: 'Python-Accessors'
method: sys
getfilesystemencoding: aValue
	getfilesystemencoding := aValue
%

category: 'Python-Accessors'
method: sys
getrecursionlimit
	^ getrecursionlimit
%

category: 'Python-Accessors'
method: sys
getrecursionlimit: aValue
	getrecursionlimit := aValue
%

category: 'Python-Accessors'
method: sys
getsizeof
	^ getsizeof
%

category: 'Python-Accessors'
method: sys
getsizeof: aValue
	getsizeof := aValue
%

category: 'Python-Accessors'
method: sys
intern
	^ intern
%

category: 'Python-Accessors'
method: sys
intern: aValue
	intern := aValue
%

category: 'Python-Accessors'
method: sys
is_finalizing
	^ is_finalizing
%

category: 'Python-Accessors'
method: sys
is_finalizing: aValue
	is_finalizing := aValue
%

category: 'Python-Accessors'
method: sys
orig_argv
	^ orig_argv
%

category: 'Python-Accessors'
method: sys
orig_argv: aValue
	orig_argv := aValue
%

category: 'Python-Accessors'
method: sys
api_version
	^ api_version
%

category: 'Python-Accessors'
method: sys
api_version: aValue
	api_version := aValue
%

category: 'Python-Accessors'
method: sys
hexversion
	^ hexversion
%

category: 'Python-Accessors'
method: sys
hexversion: aValue
	hexversion := aValue
%

category: 'Python-Accessors'
method: sys
implementation
	^ implementation
%

category: 'Python-Accessors'
method: sys
implementation: aValue
	implementation := aValue
%

category: 'Python-Accessors'
method: sys
getrefcount
	^ getrefcount
%

category: 'Python-Accessors'
method: sys
getrefcount: aValue
	getrefcount := aValue
%

category: 'Python-Accessors'
method: sys
getallocatedblocks
	^ getallocatedblocks
%

category: 'Python-Accessors'
method: sys
getallocatedblocks: aValue
	getallocatedblocks := aValue
%

category: 'Python-Accessors'
method: sys
breakpointhook
	^ breakpointhook
%

category: 'Python-Accessors'
method: sys
breakpointhook: aValue
	breakpointhook := aValue
%

category: 'Python-Accessors'
method: sys
setrecursionlimit
	^ setrecursionlimit
%

category: 'Python-Accessors'
method: sys
setrecursionlimit: aValue
	setrecursionlimit := aValue
%

category: 'Python-Accessors'
method: sys
getfilesystemencodeerrors
	^ getfilesystemencodeerrors
%

category: 'Python-Accessors'
method: sys
getfilesystemencodeerrors: aValue
	getfilesystemencodeerrors := aValue
%

category: 'Python-Accessors'
method: sys
get_int_max_str_digits
	^ get_int_max_str_digits
%

category: 'Python-Accessors'
method: sys
get_int_max_str_digits: aValue
	get_int_max_str_digits := aValue
%

category: 'Python-Accessors'
method: sys
set_int_max_str_digits
	^ set_int_max_str_digits
%

category: 'Python-Accessors'
method: sys
set_int_max_str_digits: aValue
	set_int_max_str_digits := aValue
%

category: 'Python-Accessors'
method: sys
audit
	^ audit
%

category: 'Python-Accessors'
method: sys
audit: aValue
	audit := aValue
%

category: 'Python-Accessors'
method: sys
addaudithook
	^ addaudithook
%

category: 'Python-Accessors'
method: sys
addaudithook: aValue
	addaudithook := aValue
%

category: 'Python-Accessors'
method: sys
settrace
	^ settrace
%

category: 'Python-Accessors'
method: sys
settrace: aValue
	settrace := aValue
%

category: 'Python-Accessors'
method: sys
setprofile
	^ setprofile
%

category: 'Python-Accessors'
method: sys
setprofile: aValue
	setprofile := aValue
%

category: 'Python-Accessors'
method: sys
gettrace
	^ gettrace
%

category: 'Python-Accessors'
method: sys
gettrace: aValue
	gettrace := aValue
%

category: 'Python-Accessors'
method: sys
getprofile
	^ getprofile
%

category: 'Python-Accessors'
method: sys
getprofile: aValue
	getprofile := aValue
%

category: 'Python-Accessors'
method: sys
call_tracing
	^ call_tracing
%

category: 'Python-Accessors'
method: sys
call_tracing: aValue
	call_tracing := aValue
%

category: 'Python-Accessors'
method: sys
unraisablehook
	^ unraisablehook
%

category: 'Python-Accessors'
method: sys
unraisablehook: aValue
	unraisablehook := aValue
%

category: 'Python-Accessors'
method: sys
exception
	^ exception
%

category: 'Python-Accessors'
method: sys
exception: aValue
	exception := aValue
%

set compile_env: 0
