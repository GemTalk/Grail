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
	"Return the module registry (sys.modules) -- a PySysModules (a PyDict)
	mapping module names to module instances.  SESSION-LOCAL
	(SessionTemps): the old ``modules'' classInstVar sat on the
	committed sys class, so every import dirtied committed state
	(multi-user commit conflicts) and the whole loaded-module graph
	persisted on any commit.  The classInstVar declaration remains but
	is unused (removing it would restructure the committed class).

	It was a SymbolDictionary until the keys became genuine ``str'': a
	Symbol key satisfies ``isinstance(k, str)'' and then dies on
	``k.replace(...)'' (invariant object), which is what stopped
	requests/packages.py -- see PySysModules.gs for the whole story.
	PySysModules normalizes Symbol probes, so the Smalltalk callers that
	pass ``#re'' keep working."

	| reg |
	reg := SessionTemps @env0:current @env0:at: #GrailSysModules otherwise: nil.
	reg == nil ifTrue: [
		reg := PySysModules ___new___.
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
	"breakpointhook is stored in the module dict, NOT answered by an accessor
	method: a test replaces it (``sys.breakpointhook = my_mock'') and the
	replacement has to be what the next breakpoint() finds.  Both names start
	as the same BoundMethod, whose fixed-arity probe misses -- there is no
	unary ``breakpointhook'' method any more -- so it lands on the varargs
	_breakpointhook:kw: below."
	self @env0:at: #breakpointhook put: (BoundMethod receiver: self selector: #breakpointhook).
	self @env0:at: #__breakpointhook__ put: (BoundMethod receiver: self selector: #breakpointhook).
	self @env0:at: #__displayhook__ put: (BoundMethod receiver: self selector: #displayhook).
	self @env0:at: #__excepthook__ put: (BoundMethod receiver: self selector: #excepthook).
	self @env0:at: #__unraisablehook__ put: (BoundMethod receiver: self selector: #unraisablehook).
	"``audit'' is stored the same way and for the same reason: it has no unary
	method, so without a dict entry ``sys.audit()'' -- the zero-argument call
	CPython rejects with a TypeError -- fell through attribute lookup and raised
	a LookupError on the module dict instead.  The BoundMethod's fixed-arity
	probe misses and lands on the varargs _audit:kw: below, which then gives
	CPython's complaint.  It also makes ``hook = sys.audit'' a callable value."
	self @env0:at: #audit put: (BoundMethod receiver: self selector: #audit).
%

! ===============================================================================
! Fast-path callable methods
! ===============================================================================

! --- 0-arg callables ---

category: 'Grail-Built-in Functions'
method: sys
addaudithook
	"addaudithook(hook) - stub, auditing not implemented.  Kept UNARY so that
	reading the attribute stays harmless; a real call, which always carries
	the hook, lands on the varargs ``_addaudithook:kw:'' below and is refused
	there."
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
_addaudithook: positional kw: kwargs
	"addaudithook(hook) - REFUSED, and deliberately so.

	Grail has no audit-event dispatch: nothing in the runtime raises an event,
	so a hook installed here could never fire.  Accepting it silently would
	tell a caller that auditing is on when it is off -- the one answer worse
	than an error -- so say no out loud instead.  Before this the call failed
	anyway, on arity (``addaudithook() takes a different number of arguments
	(1 given)''), so nothing that worked stops working; what changes is that
	the failure now names the reason.

	This is the half that makes the ``audit'' no-op below CORRECT rather than
	merely convenient: CPython's own sys.audit() does nothing when the hook
	list is empty, and here the hook list can never be anything else."

	^ RuntimeError ___signal___:
		'sys.addaudithook() is not supported: Grail raises no audit events, '
			@env0:, 'so a hook installed here would never be called'
%

category: 'Grail-Built-in Functions'
method: sys
_audit: positional kw: kwargs
	"audit(event, *args) - accept the event and DISCARD it.

	This is CPython's exact behaviour with no audit hook installed, and
	sys.addaudithook above guarantees there is none, so the observable answer
	here matches CPython rather than approximating it.  What it does NOT mean
	is that auditing works: events are not recorded, not dispatched, and not
	retrievable.  Nothing can observe that they were raised.

	Was a ZERO-ARGUMENT stub, which made every real call a TypeError --
	``audit() takes a different number of arguments (4 given)'' -- because
	CPython's signature is variadic and callers use it that way.  urllib3's
	HTTPConnection._new_conn is a 4-argument call
	(``sys.audit('http.client.connect', self, self.host, self.port)'').

	The argument checks are CPython's, kept because a caller that gets them
	wrong should hear the same complaint on both runtimes: at least one
	argument, a str event, and no keywords."

	| ev |
	(positional __len__ @env0:> 0) ifFalse: [
		^ TypeError ___signal___: 'audit expected at least 1 argument, got 0'].
	kwargs @env0:ifNotNil: [:kw |
		(kw __len__ @env0:> 0) ifTrue: [
			^ TypeError ___signal___: 'sys.audit() takes no keyword arguments']].
	ev := positional @env0:at: 1.
	(ev isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: ('audit() argument 1 must be str, not '
			@env0:, ((Python @env0:at: #bytes) ___pyTypeNameOf___: ev))].
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
_set_asyncgen_hooks: positional kw: kwargs
	"sys.set_asyncgen_hooks(firstiter=..., finalizer=...) -- both keyword
	arguments optional, and CPython only changes the ones actually given.
	Stored session-locally; PythonAsyncGenerator fires firstiter at an async
	generator's first drive, which is how an event loop learns which
	generators to close in shutdown_asyncgens().  The FINALIZER half is
	stored but never fires: it is the destruction-time hook of the recorded
	platform gap (docs/Issues.md, 'no unawaited-coroutine warning') -- the
	shutdown sweep is the working substitute."

	kwargs @env0:ifNotNil: [
		(kwargs @env0:at: 'firstiter' ifAbsent: [nil]) @env0:ifNotNil: [:fi |
			SessionTemps @env0:current @env0:at: #'GrailAsyncgenFirstiter' put: fi].
		(kwargs @env0:at: 'finalizer' ifAbsent: [nil]) @env0:ifNotNil: [:fin |
			SessionTemps @env0:current @env0:at: #'GrailAsyncgenFinalizer' put: fin]].
	^ None
%

category: 'Grail-Built-in Functions'
method: sys
get_asyncgen_hooks
	"Answers the (firstiter, finalizer) pair -- a plain 2-tuple where CPython
	answers a named one; the loop machinery only unpacks it positionally."

	^ { (SessionTemps @env0:current @env0:at: #'GrailAsyncgenFirstiter' otherwise: None).
		(SessionTemps @env0:current @env0:at: #'GrailAsyncgenFinalizer' otherwise: None) }
%

category: 'Grail-Built-in Functions'
method: sys
_breakpointhook: positional kw: kwargs
	"sys.__breakpointhook__(*args, **kws) -- PEP 553's default, which is what
	the breakpoint() builtin calls unless sys.breakpointhook was replaced.

	The whole behaviour is driven by $PYTHONBREAKPOINT:
	  unset or empty  -- call pdb.set_trace()
	  ``0''           -- do nothing at all, and return None
	  anything else   -- a dotted name to import and call, so
	                     PYTHONBREAKPOINT=myapp.debug.hook redirects every
	                     breakpoint() in the program without editing it.
	A bare name means builtins, and an unimportable one is a RuntimeWarning
	rather than an error -- a mistyped environment variable must not take the
	program down at the first breakpoint.

	Read from os.environ rather than the process environment: that is what
	CPython consults, and it is what test.support's EnvironmentVarGuard
	mutates."

	| envDict hookname dotIdx modname funcname mod hook |
	envDict := ((Python @env0:at: #os) @env0:___instance___) @env1:environ.
	hookname := envDict @env1:get: 'PYTHONBREAKPOINT' _: None.
	(hookname == nil or: [hookname @env0:== None])
		ifTrue: [hookname := ''].
	hookname := hookname @env0:asString.
	hookname @env0:= '0' ifTrue: [^ None].
	hookname @env0:isEmpty ifTrue: [hookname := 'pdb.set_trace'].

	"rpartition('.'): everything after the LAST dot is the function; a name
	with no dot at all is looked up in builtins."
	dotIdx := 0.
	1 @env0:to: hookname @env0:size do: [:i |
		((hookname @env0:at: i) @env0:== $.) ifTrue: [dotIdx := i]].
	dotIdx @env0:= 0
		ifTrue: [modname := 'builtins'. funcname := hookname]
		ifFalse: [
			modname := hookname @env0:copyFrom: 1 to: dotIdx @env0:- 1.
			funcname := hookname @env0:copyFrom: dotIdx @env0:+ 1 to: hookname @env0:size].

	hook := [
		"import_module: is an INSTANCE method on the importlib module, so it is
		reached through ___instance___ rather than off the bare class name."
		mod := ((Python @env0:at: #importlib) @env0:___instance___)
			@env1:import_module: modname.
		mod @env1:___pyAttrLoad___: funcname @env0:asSymbol
	] @env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	hook == nil ifTrue: [
		((Python @env0:at: #warnings) @env0:___instance___)
			@env1:warn: ('Ignoring unimportable $PYTHONBREAKPOINT: "'
				@env0:, hookname @env0:, '"')
			_: RuntimeWarning.
		^ None].
	^ hook @env1:value: positional value: kwargs
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
	"RAISES, deliberately, rather than accepting the call and doing nothing.

	CPython's limit is a COUNTER checked on every Python call, so setting it takes
	effect immediately.  Grail has no such counter: the limit is physical Smalltalk
	stack exhaustion, the VM signals AlmostOutOfStack (or AlmostOutOfStackError,
	when AlmostOutOfStackError class>>enable has been sent), and the depth actually
	available is fixed at login by GEM_MAX_SMALLTALK_STACK_DEPTH -- a startup-only
	parameter, since System configurationAt:put: answers ImproperOperation for it.
	So there is nothing this method could set.

	IT USED TO ANSWER None SILENTLY, which is the worse failure: a caller that
	lowered the limit to bound a recursion got no error and no effect, and then
	measured whatever the gem's real ceiling happened to be.  An explicit failure
	is the honest answer to a request Grail cannot satisfy.

	NOTE the asymmetry with getrecursionlimit(), which still answers 1000: a READ
	has a defensible answer (the configured nominal depth) and real code branches on
	it -- django's query.py divides it by 16 -- while a WRITE has none."

	^ NotImplementedError ___signal___:
		'sys.setrecursionlimit() is unsupported (see GemStone issue #52046): Grail''s recursion limit is physical Smalltalk stack exhaustion, not a counter, and the depth is fixed at login by GEM_MAX_SMALLTALK_STACK_DEPTH'
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
	"exit() -> 0-arg fast path.  NO constructor argument, so ``args'' is the
	EMPTY tuple and ``code'' is None -- CPython's sys_exit() calls
	PyErr_SetObject(PyExc_SystemExit, NULL) when unpacking finds no argument.

	Not ``___signal___: 0''.  That filled args with ``(0,)'' and made code 0,
	and both 0 and None mean success to a shell -- so the difference was
	invisible until something READ code, and then ``if e.code is None'' (the
	documented test for ``exited without a status'', and what a
	``sys.exit(main())'' wrapper branches on) took the wrong arm.  It also put
	a spurious ``0'' in the repr: ``SystemExit(0)'' where CPython renders
	``SystemExit()''.

	___signalNew___:kw: rather than ___signal___:, because ___signal___: always
	builds a 1-element args tuple from its argument and there is no argument to
	give it here."
	^ SystemExit ___signalNew___: #() kw: nil
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
	"exit([arg]) - varargs form.  Same 0-argument rule as the ``exit'' fast path
	above: no argument means an EMPTY args tuple and a code of None, not
	``(0,)'' and 0."
	^ (positional __len__ @env0:> 0)
		ifTrue: [SystemExit ___signal___: (positional @env0:at: 1)]
		ifFalse: [SystemExit ___signalNew___: #() kw: nil]
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
___grailEnvVar___: aName
	"One environment variable of THIS gem as a Smalltalk String, or nil when the
	variable is unset OR set to the empty string.

	An exported-but-EMPTY variable must read as unset: ``VIRTUAL_ENV='' is what a
	shell leaves behind when a venv is deactivated, and it must not put a bogus
	site directory on sys.path.  Measured on GemStone 4.0/Darwin, ``System class
	>> gemEnvironmentVariable:'' already answers nil for an empty variable --
	both for one inherited from the shell and for one just stored as '''' -- so
	the isEmpty guard below is belt-and-braces rather than the thing doing the
	work.  It is kept because the caller's contract is about MEANING, not about
	which of the two layers happens to enforce it."

	| v |
	v := System @env0:gemEnvironmentVariable: aName.
	v == nil ifTrue: [^ nil].
	v := v @env0:asString.
	v @env0:isEmpty ifTrue: [^ nil].
	^ v
%

category: 'Grail-Initialization'
method: sys
___grailLastPathComponent___: aPath
	"The final component of a '/'-separated path.  ``GsFile class >>
	contentsOfDirectory:onClient:'' answers full paths, not bare names, so a
	caller matching on the leaf has to strip the directory first."

	| idx |
	idx := (aPath @env0:reverse) @env0:findString: '/' startingAt: 1.
	(idx @env0:= 0) ifTrue: [^ aPath].
	^ aPath @env0:copyFrom: (aPath @env0:size @env0:- idx @env0:+ 2) to: aPath @env0:size
%

category: 'Grail-Initialization'
method: sys
___grailPythonPathDirs___
	"$PYTHONPATH split on colons -- CPython's second sys.path source, after the
	script directory and before the site directories.

	Entries are taken as given, existing or not, exactly as CPython does: a
	PYTHONPATH naming a directory that has yet to be created is not an error.
	EMPTY components are dropped rather than becoming the cwd, because Grail's
	resolver (importlib class >> ___sysPathRoots___) skips the empty string
	anyway."

	| out raw |
	out := OrderedCollection @env0:new.
	raw := self ___grailEnvVar___: 'PYTHONPATH'.
	raw == nil ifTrue: [^ out].
	(raw @env0:subStrings: ':') @env0:do: [:each | | s |
		s := each @env0:asString.
		((s @env0:isEmpty) @env0:or: [out @env0:includes: s])
			ifFalse: [out @env0:add: s]].
	^ out
%

category: 'Grail-Initialization'
method: sys
___grailVenvSiteDirs___
	"The site-packages directories of an active $VIRTUAL_ENV, or an empty
	collection when no virtualenv is active.

	What is deliberately NOT here is the HOST CPython's site-packages -- neither
	site.getsitepackages() nor site.getusersitepackages() of the python3 on
	$PATH.  Those trees are full of wheels carrying compiled extensions Grail
	cannot load, so adopting them would turn a clean ModuleNotFoundError into a
	confusing dlopen/ABI failure.  A venv the caller built on purpose is the
	curated tree, so that one Grail does adopt.

	The interpreter version in <venv>/lib/pythonX.Y is DISCOVERED by listing
	rather than guessed: the venv was made by whatever python3 the caller has,
	and Grail has no CPython version of its own to guess with.  ``lib64'' is
	probed as well, for the Linux layout that splits it out; it is ordinarily
	absent, and probing a missing directory costs one stat.  The Windows
	``Lib'' spelling is NOT probed: it would answer the same tree twice on a
	case-insensitive filesystem (macOS), under two spellings."

	| venv out |
	out := OrderedCollection @env0:new.
	venv := self ___grailEnvVar___: 'VIRTUAL_ENV'.
	venv == nil ifTrue: [^ out].
	#('lib' 'lib64') @env0:do: [:libName | | libDir direct names leaves |
		libDir := (venv @env0:, '/') @env0:, libName.
		((GsFile @env0:isServerDirectory: libDir) == true) ifTrue: [
			"Some tools put site-packages straight under lib/."
			direct := libDir @env0:, '/site-packages'.
			(((GsFile @env0:isServerDirectory: direct) == true)
				@env0:and: [(out @env0:includes: direct) @env0:not])
					ifTrue: [out @env0:add: direct].
			names := GsFile @env0:contentsOfDirectory: libDir onClient: false.
			(names @env0:isKindOf: Array) ifTrue: [
				leaves := OrderedCollection @env0:new.
				names @env0:do: [:each |
					leaves @env0:add: (self ___grailLastPathComponent___: each @env0:asString)].
				"Sorted so a venv holding more than one pythonX.Y answers a stable
				order rather than whatever order the directory happens to list in."
				leaves @env0:asSortedCollection @env0:do: [:leaf | | sp |
					(leaf @env0:beginsWith: 'python') ifTrue: [
						sp := ((libDir @env0:, '/') @env0:, leaf) @env0:, '/site-packages'.
						(((GsFile @env0:isServerDirectory: sp) == true)
							@env0:and: [(out @env0:includes: sp) @env0:not])
								ifTrue: [out @env0:add: sp]]]]]].
	^ out
%

category: 'Grail-Initialization'
method: sys
___grailUserSiteDir___
	"Grail's OWN per-user site directory -- the tree to ``pip install --target''
	into for Grail -- or nil when $HOME is unset.

	$GRAIL_SITE_PACKAGES overrides it; otherwise ~/.grail/site-packages.  It is
	Grail-owned for the reason spelled out in ___grailVenvSiteDirs___: the point
	is a curated tree that does not drag in the host CPython's compiled wheels."

	| override home |
	override := self ___grailEnvVar___: 'GRAIL_SITE_PACKAGES'.
	override == nil ifFalse: [^ override].
	home := self ___grailEnvVar___: 'HOME'.
	home == nil ifTrue: [^ nil].
	^ home @env0:, '/.grail/site-packages'
%

category: 'Grail-Initialization'
method: sys
initialize_path_info
	"Initialize path-related attributes using GemStone info.

	sys.path is populated in CPython's ORDER, but from GRAIL-OWNED sources only:

	  0. the running script's directory -- installed separately, by
	     ``importlib class >> ___installScriptDir___:'', because a bare session
	     has no script and sys is initialised long before one runs;
	  1. $PYTHONPATH;
	  2. an active $VIRTUAL_ENV's site-packages;
	  3. Grail's own user site directory ($GRAIL_SITE_PACKAGES, else
	     ~/.grail/site-packages), when it exists.

	This used to be an EMPTY list, so ``pip install X; import X'' could not work
	at all -- every caller had to write sys.path.append() by hand, which nobody
	does in CPython.  The host CPython's own site-packages stay out; see
	___grailVenvSiteDirs___ for why.

	Nothing here can shadow Grail's stdlib: ``importlib class >>
	___moduleNameToPath___:'' searches sys.path LAST, deliberately, so a caller's
	directory cannot displace Grail's own ``os'' or ``traceback''."

	| gsVersionReport gemNativeCodePath dirs pathList sitePackages userSite spList metaPath |
	gsVersionReport := System @env0:gemVersionReport.
	gemNativeCodePath := gsVersionReport @env0:at: 'gemNativeCodePath' ifAbsent: [''].
	self @env0:at: #prefix put: gemNativeCodePath.
	self @env0:at: #exec_prefix put: gemNativeCodePath.
	self @env0:at: #base_prefix put: gemNativeCodePath.
	self @env0:at: #base_exec_prefix put: gemNativeCodePath.
	self @env0:at: #executable put: gemNativeCodePath.
	sitePackages := self ___grailVenvSiteDirs___.
	userSite := self ___grailUserSiteDir___.
	dirs := OrderedCollection @env0:new.
	self ___grailPythonPathDirs___ @env0:do: [:d |
		(dirs @env0:includes: d) ifFalse: [dirs @env0:add: d]].
	sitePackages @env0:do: [:d |
		(dirs @env0:includes: d) ifFalse: [dirs @env0:add: d]].
	"The user site goes ON the path only when the directory EXISTS -- CPython's
	rule for a site directory -- but it is REPORTED either way, because
	site.getusersitepackages() answers WHERE TO INSTALL, which is exactly what a
	caller needs before the directory is made."
	((userSite ~~ nil) @env0:and: [(GsFile @env0:isServerDirectory: userSite) == true])
		ifTrue: [(dirs @env0:includes: userSite) ifFalse: [dirs @env0:add: userSite]].
	pathList := list ___new___.
	dirs @env0:do: [:d | pathList @env0:add: d].
	self @env0:at: #path put: pathList.
	"Read by the ``site'' module (src/python/stdlib/site.py) so that it reports
	GRAIL's directories rather than the host CPython's -- one source of truth
	instead of two implementations of the same rules."
	spList := list ___new___.
	sitePackages @env0:do: [:d | spList @env0:add: d].
	self @env0:at: #'__grail_site_packages__' put: spList.
	self @env0:at: #'__grail_user_site__' put:
		(userSite == nil ifTrue: [None] ifFalse: [userSite]).
	self @env0:at: #path_hooks put: (list ___new___).
	self @env0:at: #path_importer_cache put: (KeyValueDictionary @env0:new).
	"sys.meta_path is CONSULTED now (PEP 302/451 -- importlib class >>
	___findViaMetaPath___:), and its first entry is PINNED to Grail's own
	finder, the same way CPython pins BuiltinImporter ahead of PathFinder.
	That entry -- not the search order -- is what keeps a caller's finder from
	shadowing Grail's ``os'' or ``traceback''; see GrailBuiltinImporter's class
	comment for the CPython behaviour it was measured against.  It is an
	ordinary list entry, and REMOVING it is the opt-out: a caller who pops it
	gets CPython's behaviour with BuiltinImporter deleted, which is to say, no
	protection.  Re-ordering does not opt out -- ___findViaMetaPath___: asks
	this finder first wherever it sits, because ``meta_path.insert(0, f)'' is
	the ordinary spelling of ``ask mine first'' and must not silently displace
	Grail's own stdlib."
	metaPath := list ___new___.
	metaPath @env0:add: (GrailBuiltinImporter @env0:new).
	self @env0:at: #meta_path put: metaPath.
	self @env0:at: #pycache_prefix put: None.
	self @env0:at: #dont_write_bytecode put: true.
%

category: 'Grail-Initialization'
classmethod: sys
___argvFromCommandLine___: cmdArgs
	"Answer the CPython-shaped ``sys.argv'' for a ./grail launch -- an Array of
	Strings -- or nil when cmdArgs is not a ./grail launch.

	./grail runs

	    topaz -lq -S scripts/grail.tpz -T ... -C ... -- <script> <args...>

	and scripts/grail.tpz splits on ``--'': everything before it is topaz's own
	configuration, everything after it is Python's.  This method applies THE SAME
	split (the last ``--'', exactly as the launcher's own scan does, so the two
	cannot disagree about which argument is the script) and then reproduces what
	CPython's launcher does with what is left.  All four shapes were measured
	against CPython 3.14.6 rather than recalled:

	    grail app.py a b      -> #('app.py' 'a' 'b')
	        argv[0] is the path AS GIVEN.  CPython does not absolutize it:
	        ``python3 pkg/mod.py'' answers 'pkg/mod.py', not '/abs/pkg/mod.py'.
	    grail -D app.py a b   -> #('app.py' 'a' 'b')
	        -D is an INTERPRETER option (Grail's pass-errors-to-topaz flag), and
	        CPython keeps its own options out of sys.argv.
	    grail -m pkg.mod a b  -> #('pkg.mod' 'a' 'b')
	        see the caveat below.
	    grail                 -> #('')
	        CPython's argv for the interactive interpreter, and for a script fed
	        on stdin with no name, is a list holding one empty string.

	CAVEAT for -m: CPython puts the module's RESOLVED FILE PATH in argv[0]
	(``python3 -m pkg.mod'' answers '/.../pkg/mod.py'), not the dotted name.
	Resolving needs importlib, which is not safely reachable from sys's OWN
	initialization -- that runs on first touch of ``sys instance'', which the
	import machinery itself provokes -- so this method leaves the dotted name and
	the LAUNCHER refines it: scripts/grail.tpz calls ___setArgv0___: with what
	___moduleNameToPath___: answered.  A name that does not resolve keeps the
	dotted spelling, and runModule: then raises ModuleNotFoundError anyway.

	Answering nil for ``no -- on the command line'' is what keeps this confined to
	./grail: it is the only topaz invocation in the tree that passes ``--'', so a
	plain topaz session (the SUnit shards, install.gs, the MCP gem) keeps the
	value sys.argv has always had there.

	PURE -- no globals, no importlib, no session state -- so SysTestCase can
	exercise every shape above without launching anything."

	| ofs n tail |
	cmdArgs == nil ifTrue: [^ nil].
	ofs := 0.
	n := cmdArgs @env0:size.
	1 @env0:to: n do: [:j |
		((cmdArgs @env0:at: j) @env0:= '--') ifTrue: [ofs := j]].
	(ofs @env0:= 0) ifTrue: [^ nil].
	tail := OrderedCollection @env0:new.
	(ofs @env0:+ 1) @env0:to: n do: [:j |
		tail @env0:add: ((cmdArgs @env0:at: j) @env0:asString)].
	(tail @env0:isEmpty) ifFalse: [
		((tail @env0:first) @env0:= '-D') ifTrue: [tail @env0:removeFirst]].
	(tail @env0:isEmpty) ifTrue: [^ Array @env0:with: ''].
	((tail @env0:first) @env0:= '-m') ifTrue: [
		tail @env0:removeFirst.
		"``-m'' with no module name after it.  grail.tpz raises for this; answer
		a deterministic argv rather than an empty one so nothing downstream has
		to cope with a zero-length sys.argv."
		(tail @env0:isEmpty) ifTrue: [^ Array @env0:with: '-m']].
	^ tail @env0:asArray
%

category: 'Grail-Initialization'
classmethod: sys
___setArgv0___: aString
	"Replace ``sys.argv[0]'' on the live sys instance, answering the string
	stored (or nil when there was no argv to patch).

	The one caller is scripts/grail.tpz, for ``-m'': CPython's launcher puts the
	module's RESOLVED FILE PATH in argv[0], and only the launcher has importlib
	in hand to resolve it -- see ___argvFromCommandLine___:."

	| inst av |
	aString == nil ifTrue: [^ nil].
	inst := self instance.
	av := inst @env0:at: #argv otherwise: nil.
	av == nil ifTrue: [^ nil].
	(av @env0:size @env0:> 0)
		ifTrue: [av @env0:at: 1 put: (aString @env0:asString)]
		ifFalse: [av @env0:add: (aString @env0:asString)].
	^ aString @env0:asString
%

category: 'Grail-Initialization'
method: sys
initialize_runtime_info
	"Initialize runtime information attributes from GemStone"
	| cmdArgs argvArgs |
	cmdArgs := System @env0:commandLineArguments.
	"``sys.orig_argv'' IS the interpreter's own command line in CPython
	(``python3 app.py a'' answers ['python3','app.py','a']), so the raw topaz
	arguments are the faithful value for it and are kept.

	``sys.argv'' is NOT that: CPython's launcher strips its own name and its own
	options and leaves the SCRIPT plus the script's arguments.  Grail fed the raw
	topaz command line to BOTH, so a script run by ./grail saw sys.argv[0] =
	'topaz' and sys.argv[1] = '-lq'.  That is not cosmetic -- the ordinary
	``dest = sys.argv[1]'' idiom then created a directory literally named ``-lq''.
	___argvFromCommandLine___: answers the CPython shape for a ./grail launch and
	nil for every other topaz session, whose argv is left exactly as it was."
	argvArgs := sys ___argvFromCommandLine___: cmdArgs.
	argvArgs == nil ifTrue: [argvArgs := cmdArgs].
	self @env0:at: #argv put: (list ___new___).
	self @env0:at: #orig_argv put: (list ___new___).
	argvArgs @env0:do: [:arg |
		(self @env0:at: #argv) append: arg.
	].
	cmdArgs @env0:do: [:arg |
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
	"``sys.stdout'' / ``sys.stderr'' -- writable stream objects, not None.
	Stored under the DUNDER names only: the ``stdout'' / ``stderr'' accessors
	already fall back through ``__stdout__'' / ``__stderr__'', so one entry
	serves both spellings and ``sys.stdout is sys.__stdout__'' holds, while a
	Python-level ``sys.stdout = buf'' still wins because it lands in the module
	instance's dynamic store, which ___pyAttrLoad___ consults FIRST.

	They were None, which is invisible while everything writes with print and
	fatal the moment vendored CPython source writes through the stream object:
	argparse's _print_message SWALLOWED the AttributeError (``--help'' rendered
	and printed nothing), traceback.print_exc raised it.  See PyConsoleStream
	for where the writes go and for why print does not change route."
	self @env0:at: #__stdout__ put: (PyConsoleStream @env0:___named___: '<stdout>').
	self @env0:at: #__stderr__ put: (PyConsoleStream @env0:___named___: '<stderr>').
%



set compile_env: 0
