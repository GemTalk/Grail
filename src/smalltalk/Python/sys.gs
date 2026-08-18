! ------------------- Superclass check
set compile_env: 0
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

! ------- sys_flags class (Python 'sys.flags' structseq)
expectvalue /Class
doit
module subclass: 'sys_flags'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
sys_flags comment:
'Python sys.flags — the command-line / environment interpreter flags
(PEP structseq).  Grail exposes attribute access (sys.flags.optimize,
etc.); numpy''s core init reads sys.flags.  All flags default to 0
(a normal, non-optimized, non-isolated interpreter).'
%

expectvalue /Class
doit
sys_flags category: 'Grail-Modules'
%

! ------- sys_implementation class (Python 'sys.implementation' namespace)
expectvalue /Class
doit
module subclass: 'sys_implementation'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
sys_implementation comment:
'Python sys.implementation — PEP 421 implementation metadata namespace.
Grail reports name=''grail'' with the CPython language level it tracks
in version/hexversion.  Django (django.utils.version) and other
packages read sys.implementation.name at import time.'
%

expectvalue /Class
doit
sys_implementation category: 'Grail-Modules'
%

! ------- sys_float_info class (Python 'sys.float_info' structseq)
expectvalue /Class
doit
module subclass: 'sys_float_info'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
sys_float_info comment:
'Python sys.float_info — IEEE 754 double-precision characteristics
(PEP structseq).  Grail exposes attribute access (sys.float_info.max,
.min, .epsilon, .dig, .mant_dig, ...); CPython''s test suite and math
code read these at import time.'
%

expectvalue /Class
doit
sys_float_info category: 'Grail-Modules'
%

! ------- sys_hash_info class (Python 'sys.hash_info' structseq)
expectvalue /Class
doit
module subclass: 'sys_hash_info'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
sys_hash_info comment:
'Python sys.hash_info — numeric-hash parameters (PEP structseq).
fractions.py computes _PyHASH_MODULUS / _PyHASH_INF from it at
import time.'
%

expectvalue /Class
doit
sys_hash_info category: 'Grail-Modules'
%

! ------- sys_int_info class (Python 'sys.int_info' structseq)
expectvalue /Class
doit
module subclass: 'sys_int_info'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
sys_int_info comment:
'Python sys.int_info — int-implementation parameters (PEP structseq).'
%

expectvalue /Class
doit
sys_int_info category: 'Grail-Modules'
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
sys_flags removeAllMethods: 1.
sys_flags class removeAllMethods: 1.
sys_implementation removeAllMethods: 1.
sys_implementation class removeAllMethods: 1.
sys_float_info removeAllMethods: 1.
sys_float_info class removeAllMethods: 1.
sys_hash_info removeAllMethods: 1.
sys_hash_info class removeAllMethods: 1.
sys_int_info removeAllMethods: 1.
sys_int_info class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Accessors'
classmethod: sys
breakpoint
   "Signal a Smalltalk Halt that will be signalled with _signalToDebugger, to be handled by the
    controlling GCI debugger.  Exception handlers on the stack will not be executed.

    Python invocation is like
      sys.breakpoint()
   "
   self @env0:pause
%

category: 'Grail-Initialization'
method: sys_implementation
initialize
	"PEP 421 required attributes.  The version here is the CPython
	language level Grail emulates (the vendored stdlib and _sre are
	3.14), which is what packages gate features on."

	self @env0:dynamicInstVarAt: #name put: 'grail'.
	self @env0:dynamicInstVarAt: #cache_tag put: None.
	self @env0:dynamicInstVarAt: #version put: (tuple @env0:withAll: {3. 14. 0. 'final'. 0}).
	self @env0:dynamicInstVarAt: #hexversion put: 16r030E00F0.
	self @env0:dynamicInstVarAt: #_multiarch put: 'gemstone'
%

category: 'Grail-Initialization'
method: sys_float_info
initialize
	"IEEE 754 double-precision characteristics, matching CPython's
	sys.float_info on every platform Grail targets.  Reads
	(sys.float_info.max, .min, .epsilon, ...) resolve via the
	dynamic-instVar store, exactly like sys.flags."

	self @env0:dynamicInstVarAt: #max put: 1.7976931348623157e308.
	self @env0:dynamicInstVarAt: #max_exp put: 1024.
	self @env0:dynamicInstVarAt: #max_10_exp put: 308.
	self @env0:dynamicInstVarAt: #min put: 2.2250738585072014e-308.
	self @env0:dynamicInstVarAt: #min_exp put: -1021.
	self @env0:dynamicInstVarAt: #min_10_exp put: -307.
	self @env0:dynamicInstVarAt: #dig put: 15.
	self @env0:dynamicInstVarAt: #mant_dig put: 53.
	self @env0:dynamicInstVarAt: #epsilon put: 2.220446049250313e-16.
	self @env0:dynamicInstVarAt: #radix put: 2.
	self @env0:dynamicInstVarAt: #rounds put: 1
%

category: 'Grail-Initialization'
method: sys_hash_info
initialize
	"CPython's 64-bit numeric-hash parameters.  fractions.py reads
	.modulus/.inf at import; Grail's own hash need not match these,
	but the published constants do (they are interface, not
	implementation, for consumers like Fraction.__hash__)."

	self @env0:dynamicInstVarAt: #width put: 64.
	self @env0:dynamicInstVarAt: #modulus put: 2305843009213693951.
	self @env0:dynamicInstVarAt: #inf put: 314159.
	self @env0:dynamicInstVarAt: #nan put: 0.
	self @env0:dynamicInstVarAt: #imag put: 1000003.
	self @env0:dynamicInstVarAt: #algorithm put: 'siphash13'.
	self @env0:dynamicInstVarAt: #hash_bits put: 64.
	self @env0:dynamicInstVarAt: #seed_bits put: 128.
	self @env0:dynamicInstVarAt: #cutoff put: 0
%

category: 'Grail-Initialization'
method: sys_int_info
initialize
	"CPython 64-bit int-implementation parameters."

	self @env0:dynamicInstVarAt: #bits_per_digit put: 30.
	self @env0:dynamicInstVarAt: #sizeof_digit put: 4.
	self @env0:dynamicInstVarAt: #default_max_str_digits put: 4300.
	self @env0:dynamicInstVarAt: #str_digits_check_threshold put: 640
%

category: 'Grail-Initialization'
method: sys_flags
initialize
	"Populate the standard CPython interpreter flags, all 0 (a normal,
	non-optimized interpreter).  Attribute reads (sys.flags.optimize,
	sys.flags.debug, ...) resolve these via the dynamic-instVar store."

	#( #debug #inspect #interactive #optimize #dont_write_bytecode
	   #no_user_site #no_site #ignore_environment #verbose #bytes_warning
	   #quiet #hash_randomization #isolated #dev_mode #utf8_mode
	   #warn_default_encoding #safe_path
	   "3.14: context-local warning filters (PEP 793 groundwork) and whether a
	   new thread inherits the current context.  Both default to 0 in CPython
	   too, so the value is not a Grail compromise -- but the NAMES have to
	   exist, because _py_warnings reads context_aware_warnings at import."
	   #context_aware_warnings #thread_inherit_context ) @env0:do: [:f |
		self @env0:dynamicInstVarAt: f put: 0 ].
	"gil is 1 on a normal build; Grail has no free-threading mode."
	self @env0:dynamicInstVarAt: #gil put: 1.
	"int_max_str_digits: CPython's default cap (0 means ``no limit'')."
	self @env0:dynamicInstVarAt: #int_max_str_digits put: 4300
%

category: 'Grail-Module Registry'
classmethod: sys
initializeBuiltinModules
	"Initialize the registry with built-in modules"
	self modules
		@env0:at: #builtins 	put: builtins 	instance;
		@env0:at: #copyreg 		put: copyreg 	instance;
		@env0:at: #math 		put: math 		instance;
		@env0:at: #hashlib 		put: hashlib 	instance;
		@env0:at: #time 		put: time 		instance;
		@env0:at: #secrets 		put: secrets 	instance;
		@env0:at: #warnings 	put: warnings 	instance;
		@env0:at: #struct 		put: struct 	instance;
		@env0:at: #mimetypes 	put: mimetypes 	instance;
		@env0:at: #ipaddress 	put: ipaddress 	instance;
		@env0:at: #datetime 	put: datetime 	instance;
		@env0:at: #json 		put: json 		instance;
		@env0:at: #io 			put: io 		instance;
		@env0:at: #enum 		put: enum 		instance;
		"fractions deliberately NOT seeded: ``import fractions`` resolves
		to the vendored CPython fractions.py (real Fraction semantics --
		user __new__, slots, Rational ABC).  The Smalltalk ``fractions``
		module (kernel-Fraction binding) remains for direct Smalltalk
		references (FractionTestCase) and the kernel Fraction dunders."
		@env0:at: #functools	put: functools 	instance;
		"_thread is native (GsProcess/Semaphore-backed); in cold sessions it
		enters sys.modules as a side effect of threading's lazy ``import
		_thread`` resolving through lookupModule's symbolList fallback, but
		code reached through a warm-bound committed closure (doc par.10)
		can hit import paths without that side effect -- seed it like the
		other natives."
		@env0:at: #'_thread' 	put: _thread 	instance;
		@env0:at: #gemstone 	put: gemstone 	instance;
		@env0:at: #html 		put: html 		instance;
		@env0:at: #cmath 		put: cmath 		instance;
		@env0:at: #random 		put: random 	instance;
		@env0:at: #os 			put: os 		instance;
		@env0:at: #string 		put: string 	instance;
		@env0:at: #sys 			put: sys 		instance;
		@env0:at: #zlib 		put: zlib 		instance;
		@env0:yourself.
%

category: 'Grail-Module Registry'
classmethod: sys
modules
	"Return the module registry (sys.modules) -- a SymbolDictionary
	mapping module names to module instances.  SESSION-LOCAL
	(SessionTemps): the old ``modules'' classInstVar sat on the
	committed sys class, so every import dirtied committed state
	(multi-user commit conflicts) and the whole loaded-module graph
	persisted on any commit.  The classInstVar declaration remains but
	is unused (removing it would restructure the committed class)."

	| reg |
	reg := SessionTemps @env0:current @env0:at: #GrailSysModules otherwise: nil.
	reg == nil ifTrue: [
		reg := SymbolDictionary ___new___.
		SessionTemps @env0:current @env0:at: #GrailSysModules put: reg.
		"Register built-in modules (AFTER the SessionTemps store --
		initializeBuiltinModules re-enters ``self modules'')."
		self initializeBuiltinModules.
	].
	^ reg
%

category: 'Grail-Accessors'
method: sys
modules
	"The Python-level ``sys.modules'' read.  Delegates to the class-side
	registry (SESSION-LOCAL, SessionTemps #GrailSysModules) so EVERY holder
	of a sys instance -- cold session-loaded modules AND canonical/deployed
	modules -- sees the SAME session dict.

	Without this instance accessor, ``sys.modules'' fell through
	``___pyAttrLoad___'' to the instance's captured ``#modules'' slot.  A
	deployed module (e.g. pickle) warm-binds a COMMITTED module instance whose
	``import sys'' global points at the DEPLOY session's sys instance, whose
	slot pins the DEPLOY session's (stale, committed) dict -- so the deployed
	module's ``sys.modules'' never saw a module the CURRENT session cold-loaded
	(via loadModuleFromPath:).  That broke pickle-by-reference of a cold class
	under canonical mode: pickle._find_global did ``sys.modules.get(modname)''
	against the stale dict.  Because method lookup is dynamic, this accessor
	shadows the stale slot even on a committed sys instance."

	^ sys modules
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
stderr
	"Current standard error stream.  Falls back to ``__stderr__''.
	Returns the Python None singleton (not Smalltalk nil) so
	downstream local-assignment ``errors_stream = sys.stderr''
	doesn't fall foul of UnboundLocalError on subsequent reads —
	the ___checkLocal: invariant treats nil as ``unbound''."
	^ self @env0:at: #stderr ifAbsent: [self @env0:at: #__stderr__ ifAbsent: [None]]
%


category: 'Grail-Accessors'
method: sys
stdout
	^ self @env0:at: #stdout ifAbsent: [self @env0:at: #__stdout__ ifAbsent: [None]]
%


category: 'Grail-Accessors'
method: sys
stdin
	^ self @env0:at: #stdin ifAbsent: [self @env0:at: #__stdin__ ifAbsent: [None]]
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
hash_info
	^ self @env0:at: #hash_info
%

category: 'Grail-Accessors'
method: sys
int_info
	^ self @env0:at: #int_info
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
	"exc_info() -> (type, value, traceback) of the exception currently being
	handled in this session (set by TryAst around an except handler), or
	(None, None, None) outside any except block.  Grail populates a real
	traceback for comprehension iterator-protocol errors today; other raises
	still carry an empty (None) traceback until general traceback population
	lands."

	| e |
	e := BaseException @env0:___currentException___.
	e ifNil: [ ^ tuple @env0:withAll: {None. None. None} ].
	^ tuple @env0:withAll: { e @env0:class. e. e @env1:__traceback__ }
%

category: 'Grail-Built-in Functions'
method: sys
exception
	"exception() -> the exception instance currently being handled (CPython
	3.11+), or None outside any except block."

	^ (BaseException @env0:___currentException___) ifNil: [ None ]
%

category: 'Grail-Built-in Functions'
method: sys
get_int_max_str_digits
	"get_int_max_str_digits() -> the per-session limit on the number of
	digits in an int<->str conversion (CPython's default is 4300; 0 means
	no limit).  Stored in SessionTemps so it resets per session and never
	commits to the DB."
	^ (SessionTemps @env0:current) @env0:at: #GrailIntMaxStrDigits ifAbsent: [4300]
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
_getframe
	"_getframe() -> the CALLER's frame.  CPython's default depth is 0, which
	means the frame of whoever called _getframe, not _getframe's own."

	^ self @env1:_getframe: 0
%

category: 'Grail-Built-in Functions'
method: sys
_getframe: depth
	"_getframe(depth) -> the frame ``depth'' levels above the caller.

	Grail has no interpreter frames to hand out, so this reconstructs them from
	the VM's raise-time stack capture -- see
	BaseException class>>___liveFrameChain___ for why raising is the only way a
	RUNNING gem can read its own stack.  The frames are real PyFrames, carrying
	f_code / f_lineno / f_back, which is what traceback.walk_stack and
	StackSummary.extract need.

	Deliberately NOT carrying f_locals.  A Python function's locals are Smalltalk
	method TEMPS, and the capture records only (method, ip, receiver) -- so the
	values are not in it, and their NAMES are not either.  Reporting an empty
	f_locals would be worse than having none: code that reads it would silently
	see a frame with no variables rather than an AttributeError telling it the
	truth."

	| frame n |
	frame := BaseException @env0:___liveFrameChain___.
	"Drop this implementation's own frames.  Both _getframe and _getframe: decode
	to the Python name ``_getframe'', so this skips either arrival route, and what
	is left innermost is the caller -- CPython's depth 0."
	[(frame @env0:~~ nil) and: [(frame @env0:~~ None) and: [
		(self @env1:___frameName___: frame) @env0:= '_getframe']]]
		whileTrue: [frame := frame @env0:dynamicInstVarAt: #'f_back'].
	n := depth.
	[(n @env0:notNil) and: [n @env0:> 0]] whileTrue: [
		((frame @env0:== nil) or: [frame @env0:== None]) ifTrue: [
			^ ValueError ___signal___: 'call stack is not deep enough'].
		frame := frame @env0:dynamicInstVarAt: #'f_back'.
		n := n @env0:- 1].
	((frame @env0:== nil) or: [frame @env0:== None]) ifTrue: [
		^ ValueError ___signal___: 'call stack is not deep enough'].
	^ frame
%

category: 'Grail-Built-in Functions'
method: sys
___frameName___: aFrame
	"The co_name of a frame, or nil.  PyFrame/PyCode keep their fields in dynamic
	instVars with no accessors, so this reads the slots."

	| code |
	code := [aFrame @env0:dynamicInstVarAt: #'f_code']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	code isNil ifTrue: [^ nil].
	^ [code @env0:dynamicInstVarAt: #'co_name']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]
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
	"set_int_max_str_digits(maxdigits): set the per-session limit on the
	number of digits int(str) will convert.  0 disables the limit; CPython
	rejects a positive value below 640 (the minimum threshold)."
	(maxdigits @env0:isKindOf: Integer) ifFalse: [
		TypeError ___signal___: 'an integer is required'].
	((maxdigits @env0:~= 0) and: [maxdigits @env0:< 640]) ifTrue: [
		ValueError ___signal___: 'maxdigits must be 0 or larger than 640'].
	(SessionTemps @env0:current) @env0:at: #GrailIntMaxStrDigits put: maxdigits.
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
getswitchinterval
	"getswitchinterval() -> float.  The thread switch interval in seconds,
	CPython's 0.005 default unless setswitchinterval changed it.

	Grail's threads are cooperative GsProcess green threads, so the value does
	not drive a preemption timer the way CPython's does -- but it has to
	round-trip, because test code saves it, lowers it to shake out races, and
	restores it (test.support.setswitchinterval).  Answering nothing at all
	made that an AttributeError before the test under it ever ran.

	Session-local, matching set_int_max_str_digits: the setting belongs to the
	running session, not the committed image."

	^ (SessionTemps @env0:current) @env0:at: #GrailSwitchInterval ifAbsent: [0.005]
%

category: 'Grail-Built-in Functions'
method: sys
setswitchinterval: interval
	"setswitchinterval(n).  Stores the value for getswitchinterval to answer;
	see there for why a cooperative scheduler still keeps it.  CPython rejects
	a non-positive interval, so this does too rather than accept a value it
	would then report back as legitimate."

	| v |
	(interval @env0:isKindOf: Number) ifFalse: [
		TypeError ___signal___: 'a float is required'].
	v := interval @env0:asFloat.
	v @env0:<= 0.0 ifTrue: [
		ValueError ___signal___: 'switch interval must be strictly positive'].
	(SessionTemps @env0:current) @env0:at: #GrailSwitchInterval put: v.
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
unraisablehook: unraisable
	"unraisablehook(args) - the DEFAULT hook: report an exception that had
	nowhere to propagate to.

	CPython writes ``Exception ignored in: <obj>'' plus the traceback to stderr.
	Grail writes the same line to the GEM LOG, the channel sys.excepthook
	already uses -- deliberately not to sys.stdout, because an unraisable can
	surface in the middle of a test run and stdout is where the harness reads
	its GRAIL_TEST| lines from.

	Reporting rather than discarding is the whole point: the exception is
	already un-propagatable, so a silent hook would erase it completely."

	| obj msg exc line |
	obj := [unraisable @env1:___pyAttrLoad___: #'object']
		@env0:on: AbstractException do: [:ex | ex @env0:return: None].
	msg := [unraisable @env1:___pyAttrLoad___: #'err_msg']
		@env0:on: AbstractException do: [:ex | ex @env0:return: None].
	exc := [unraisable @env1:___pyAttrLoad___: #'exc_value']
		@env0:on: AbstractException do: [:ex | ex @env0:return: None].
	"CPython's default prints ``{err_msg}: {object!r}'' when it has a message and
	``Exception ignored in: {object!r}'' when it does not -- and the two callers
	fill exactly one of the pair, so appending the object unconditionally would
	print ``: None'' after every formatted message."
	line := ((msg @env0:== None) @env0:or: [msg @env0:isNil])
		ifTrue: ['Exception ignored in: ' @env0:, ([obj @env0:printString]
			@env0:on: AbstractException do: [:ex | ex @env0:return: '<unprintable>'])]
		ifFalse: [msg @env0:asString].
	line := line @env0:, ' -- ' @env0:, ([exc @env0:printString]
		@env0:on: AbstractException do: [:ex | ex @env0:return: '<unprintable>']).
	GsFile @env0:gciLogServer: line.
	^ None
%

category: 'Grail-Private'
method: sys
___callUnraisableHook___: anException object: obj errMsg: errMsg
	"Hand an UNRAISABLE exception to whatever ``sys.unraisablehook'' currently
	is -- CPython's PyErr_WriteUnraisable / PyErr_FormatUnraisable.  Which of the
	pair a caller means is expressed by which argument it fills: ``object'' for
	the plain form, ``errMsg'' (with the object's repr inside it) for the
	formatted one.

	Read through the PYTHON attribute protocol rather than off a Smalltalk
	accessor, because the point of the hook is that it can be REPLACED:
	``sys.unraisablehook = my_hook'' stores a module attribute, and
	test.support.catch_unraisable_exception is built on exactly that.  A missing
	or unreadable attribute falls back to the default hook.

	An exception raised by the HOOK ITSELF is swallowed.  There is by
	construction no one to report it to -- the caller is already unwinding for
	another reason -- and letting it out would replace the exception the caller
	IS propagating with one from the reporting machinery."

	| args hook |
	args := PyUnraisableHookArgs @env0:excType: (anException @env0:class)
		excValue: anException
		excTraceback: ([anException @env1:__traceback__]
			@env0:on: AbstractException do: [:ex | ex @env0:return: None])
		errMsg: (errMsg @env0:isNil ifTrue: [None] ifFalse: [errMsg])
		object: (obj @env0:isNil ifTrue: [None] ifFalse: [obj]).
	hook := [self @env1:___pyAttrLoad___: #'unraisablehook']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	^ [hook @env0:isNil
		ifTrue: [self @env1:unraisablehook: args]
		ifFalse: [hook @env1:value: { args } value: nil]]
			@env0:on: AbstractException do: [:ex | ex @env0:return: None]
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
	"version_info reports the CPython language level Grail emulates —
	packages (Django's PY310..PY314 gates, typing backports) branch on
	it, and the pre-3.10 branches assume interpreter features Grail
	never had.  The Grail release number stays in the version string."
	self @env0:at: #version_info put: (tuple @env0:withAll: {3. 14. 0. 'final'. 0}).
	self @env0:at: #api_version put: 0.
	self @env0:at: #hexversion put: 16r030E00F0.
	self @env0:at: #implementation put: (sys_implementation instance).
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
	"``sys.modules'' is served by the instance accessor (-> the session-local
	class-side registry), so do NOT snapshot the dict into a #modules instance
	slot here: a committed/deployed sys instance would otherwise pin a stale
	deploy-time dict (the canonical sys.modules seam)."
	self @env0:at: #builtin_module_names put: (tuple @env0:withAll: {'builtins'. 'cmath'. 'fractions'. 'gemstone'. 'importlib'. 'math'. 'os'. 'string'. 'sys'}).
	"CPython's ``sys.stdlib_module_names'' is a BUILD-TIME CONSTANT compiled into
	the interpreter, not a runtime scan of the stdlib directory, so vendoring the
	name list is the faithful implementation rather than a shortcut.  The names
	are the 297 of CPython 3.14.6, kept in scripts/cpython_314_stdlib_modules.txt
	-- which is the SOURCE OF TRUTH, shared with scripts/cpython_import_census.py;
	StdlibModuleNamesTestCase fails if this literal drifts from that file.

	It was an empty frozenset, which traceback.py reads to answer ``Did you forget
	to import 'io'?'' for a NameError naming a stdlib module -- so the hint could
	never fire.  Note the list describes PYTHON's standard library, not what Grail
	currently ships (there is no io.py or _io here yet): the hint is advice about
	the language, and a follow-up import of a module Grail lacks fails loudly on
	its own rather than silently."
	self @env0:at: #stdlib_module_names put: (frozenset @env0:withAll: {
		'__future__'. '_abc'. '_aix_support'. '_android_support'.
		'_apple_support'. '_ast'. '_ast_unparse'. '_asyncio'. '_bisect'.
		'_blake2'. '_bz2'. '_codecs'. '_codecs_cn'. '_codecs_hk'.
		'_codecs_iso2022'. '_codecs_jp'. '_codecs_kr'. '_codecs_tw'.
		'_collections'. '_collections_abc'. '_colorize'. '_compat_pickle'.
		'_contextvars'. '_csv'. '_ctypes'. '_curses'. '_curses_panel'.
		'_datetime'. '_dbm'. '_decimal'. '_elementtree'. '_frozen_importlib'.
		'_frozen_importlib_external'. '_functools'. '_gdbm'. '_hashlib'.
		'_heapq'. '_hmac'. '_imp'. '_interpchannels'. '_interpqueues'.
		'_interpreters'. '_io'. '_ios_support'. '_json'. '_locale'. '_lsprof'.
		'_lzma'. '_markupbase'. '_md5'. '_multibytecodec'. '_multiprocessing'.
		'_opcode'. '_opcode_metadata'. '_operator'. '_osx_support'.
		'_overlapped'. '_pickle'. '_posixshmem'. '_posixsubprocess'. '_py_abc'.
		'_py_warnings'. '_pydatetime'. '_pydecimal'. '_pyio'. '_pylong'.
		'_pyrepl'. '_queue'. '_random'. '_remote_debugging'. '_scproxy'. '_sha1'.
		'_sha2'. '_sha3'. '_signal'. '_sitebuiltins'. '_socket'. '_sqlite3'.
		'_sre'. '_ssl'. '_stat'. '_statistics'. '_string'. '_strptime'.
		'_struct'. '_suggestions'. '_symtable'. '_sysconfig'. '_thread'.
		'_threading_local'. '_tkinter'. '_tokenize'. '_tracemalloc'. '_types'.
		'_typing'. '_uuid'. '_warnings'. '_weakref'. '_weakrefset'. '_winapi'.
		'_wmi'. '_zoneinfo'. '_zstd'. 'abc'. 'annotationlib'. 'antigravity'.
		'argparse'. 'array'. 'ast'. 'asyncio'. 'atexit'. 'base64'. 'bdb'.
		'binascii'. 'bisect'. 'builtins'. 'bz2'. 'cProfile'. 'calendar'. 'cmath'.
		'cmd'. 'code'. 'codecs'. 'codeop'. 'collections'. 'colorsys'.
		'compileall'. 'compression'. 'concurrent'. 'configparser'. 'contextlib'.
		'contextvars'. 'copy'. 'copyreg'. 'csv'. 'ctypes'. 'curses'.
		'dataclasses'. 'datetime'. 'dbm'. 'decimal'. 'difflib'. 'dis'. 'doctest'.
		'email'. 'encodings'. 'ensurepip'. 'enum'. 'errno'. 'faulthandler'.
		'fcntl'. 'filecmp'. 'fileinput'. 'fnmatch'. 'fractions'. 'ftplib'.
		'functools'. 'gc'. 'genericpath'. 'getopt'. 'getpass'. 'gettext'. 'glob'.
		'graphlib'. 'grp'. 'gzip'. 'hashlib'. 'heapq'. 'hmac'. 'html'. 'http'.
		'idlelib'. 'imaplib'. 'importlib'. 'inspect'. 'io'. 'ipaddress'.
		'itertools'. 'json'. 'keyword'. 'linecache'. 'locale'. 'logging'. 'lzma'.
		'mailbox'. 'marshal'. 'math'. 'mimetypes'. 'mmap'. 'modulefinder'.
		'msvcrt'. 'multiprocessing'. 'netrc'. 'nt'. 'ntpath'. 'nturl2path'.
		'numbers'. 'opcode'. 'operator'. 'optparse'. 'os'. 'pathlib'. 'pdb'.
		'pickle'. 'pickletools'. 'pkgutil'. 'platform'. 'plistlib'. 'poplib'.
		'posix'. 'posixpath'. 'pprint'. 'profile'. 'pstats'. 'pty'. 'pwd'.
		'py_compile'. 'pyclbr'. 'pydoc'. 'pydoc_data'. 'pyexpat'. 'queue'.
		'quopri'. 'random'. 're'. 'readline'. 'reprlib'. 'resource'.
		'rlcompleter'. 'runpy'. 'sched'. 'secrets'. 'select'. 'selectors'.
		'shelve'. 'shlex'. 'shutil'. 'signal'. 'site'. 'smtplib'. 'socket'.
		'socketserver'. 'sqlite3'. 'sre_compile'. 'sre_constants'. 'sre_parse'.
		'ssl'. 'stat'. 'statistics'. 'string'. 'stringprep'. 'struct'.
		'subprocess'. 'symtable'. 'sys'. 'sysconfig'. 'syslog'. 'tabnanny'.
		'tarfile'. 'tempfile'. 'termios'. 'textwrap'. 'this'. 'threading'.
		'time'. 'timeit'. 'tkinter'. 'token'. 'tokenize'. 'tomllib'. 'trace'.
		'traceback'. 'tracemalloc'. 'tty'. 'turtle'. 'turtledemo'. 'types'.
		'typing'. 'unicodedata'. 'unittest'. 'urllib'. 'uuid'. 'venv'.
		'warnings'. 'wave'. 'weakref'. 'webbrowser'. 'winreg'. 'winsound'.
		'wsgiref'. 'xml'. 'xmlrpc'. 'zipapp'. 'zipfile'. 'zipimport'. 'zlib'.
		'zoneinfo' }).
	self @env0:at: #copyright put: 'Copyright (c) GemTalk Systems LLC. All rights reserved.'.
	self @env0:at: #flags put: (sys_flags instance).
	self @env0:at: #float_info put: (sys_float_info instance).
	self @env0:at: #int_info put: (sys_int_info instance).
	self @env0:at: #hash_info put: (sys_hash_info instance).
	self @env0:at: #thread_info put: None.
	self @env0:at: #warnoptions put: (list ___new___).
	self @env0:at: #tracebacklimit put: 1000.
	self @env0:at: #ps1 put: '>>> '.
	self @env0:at: #ps2 put: '... '.
%



set compile_env: 0
