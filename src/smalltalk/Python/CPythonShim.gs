! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- CPythonShim class definition
expectvalue /Class
doit
Object subclass: 'CPythonShim'
  instVarNames: #(valueToPyObject noneWrapper typeAddresses wrapsSinceSweep callDepth shimEntryProcess shimEntryDepth)
  classVars: #()
  classInstVars: #( libraryPath)
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
CPythonShim comment:
'Server for the cpython C shim User Action library.

The singleton instance is passed to C at library load time. C stores it
and calls GciPerform(server, "PyXxx_Yyy:", ...) for every CPython API
function that needs Smalltalk knowledge. The C shim is a trivial
pass-through: it reads OOPs from PyObject* args, forwards to the server,
and converts the return type.

Instance methods are named after CPython C API functions and compiled in
env:0 so GciPerform can find them.

Wrapping state (noneWrapper, typeAddresses) lives on the instance since
this is a singleton.  The wrapper MAP does not: see >>valueToPyObject,
which keeps it in SessionTemps so that replacing the singleton cannot
orphan the wrappers that live C structures still point at.

Usage:
	| result |
	result := CPythonShim current
		callModule: ''_statistics'' method: ''_normal_dist_inv_cdf''
		with: 0.5 with: 0.0 with: 1.0.
	"result => 0.0 (median of standard normal distribution)"
'
%

expectvalue /Class
doit
CPythonShim category: 'Grail-CPython'
%

! ===============================================================================
! CPythonShim - Extension module loader via cpython User Action
! ===============================================================================

expectvalue /Metaclass3
doit
CPythonShim removeAllMethods.
CPythonShim class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! Class methods
! ===============================================================================

category: 'Grail-Instance Creation'
classmethod: CPythonShim
current
	"Ensure the user action library is loaded and return the singleton.
	The singleton lives in SessionTemps so each gem process holds its
	own CByteArray wrappers (backed by malloc'd C memory that is
	local to the OS process).  A committed classInstVar would cause
	two problems: stale C pointers after a session restart, and
	write-write conflicts between concurrent sessions."

	| temps shim |
	temps := SessionTemps current.
	shim := temps at: #CPythonShim ifAbsent: [nil].
	(shim notNil and: [(System hasUserAction: #shimCall) not]) ifTrue: [
		temps removeKey: #CPythonShim ifAbsent: [].
		shim := nil.
	].
	shim ifNil: [
		shim := self basicNew.
		temps at: #CPythonShim put: shim.
		self ensureLoaded: shim.
	].
	^ shim
%

category: 'Grail-Instance Creation'
classmethod: CPythonShim
reset
	"Release the singleton for this session."

	SessionTemps current removeKey: #CPythonShim ifAbsent: [].
%

category: 'Grail-Configuration'
classmethod: CPythonShim
libraryPath
	"Return the path to the shim user action library."

	libraryPath ifNil: [
		self error: 'CPythonShim library path not configured.'.
	].
	^ libraryPath
%

category: 'Grail-Configuration'
classmethod: CPythonShim
libraryPath: aString
	"Set the path to the shim user action library."

	| changed |
	"Discard the wrapper map only when the library actually CHANGES.

	A change must discard it: each wrapper caches a tp_* address from the old
	library at offset 8, those do not survive a reload, and any C structure
	still holding a wrapper pointer belongs to the library being replaced, so
	it is unreachable anyway.

	Re-setting the SAME path must NOT.  Nothing about the loaded library
	moved, every cached tp_* is still valid, and the C structures pointing
	into those wrappers are still live -- so dropping the map is a pure
	use-after-free generator.  The map is the ONLY strong reference to a
	wrapper AND (as the map's key) to the Smalltalk object whose OOP sits at
	the wrapper's offset 16; once it goes, the Smalltalk object is collected
	and C reads back a dangling OOP.  Because _Py_Dealloc is a no-op, a
	compiled regex lives for the whole PROCESS still pointing at its
	groupindex wrapper, so the damage surfaces arbitrarily far away: one
	same-path call in CPythonShimTestCase orphaned fractions'
	_RATIONAL_FORMAT and made DunderNewTestCase>>testVendoredFractionEndToEnd
	fail with ``a UndefinedObject does not understand #includesKey:'' -- 170
	reported errors from one line.  Sharded runs never saw it: the two test
	classes land in different shards, hence different sessions."
	changed := libraryPath ~= aString.
	libraryPath := aString.
	SessionTemps current removeKey: #CPythonShim ifAbsent: [].
	changed ifTrue: [
		SessionTemps current removeKey: #GrailShimWrapperMap ifAbsent: []].
%

category: 'Grail-Testing'
classmethod: CPythonShim
isActive
	"Return true if the shim singleton has been initialized in this session."

	^ (SessionTemps current at: #CPythonShim ifAbsent: [nil]) notNil
%
category: 'Grail-Testing'
classmethod: CPythonShim
isConfigured
	"True if the shim was built at install time (SHIM_LIB_PATH set)."

	^ libraryPath notNil
%

category: 'Grail-Testing'
classmethod: CPythonShim
isImportBackend
	"True when the shim is configured and the embedded backend has not been
	selected for this gem (see EmbeddedExtensionModule>>isImportBackend)."

	^ self isConfigured and: [EmbeddedExtensionModule isImportBackend not]
%

category: 'Grail-Backend Selection'
classmethod: CPythonShim
useAsImportBackend
	"Select the CPython shim as this session's import backend.  This is the
	default when the shim is configured, so it is only needed to override a
	prior #useAsImportBackend choice within the same gem."

	SessionTemps current at: #'grailImportBackend' put: #'shim'.
%

category: 'Grail-Loading'
classmethod: CPythonShim
builtinModuleNames
	"Names of the shim's pure-Smalltalk stand-ins for CPython C extensions."

	^ #( #'_sre' #'_statistics' #'_bisect' #'_crc32c' #'_shimtest' )
%

category: 'Grail-Loading'
classmethod: CPythonShim
builtinModuleNamed: aName
	"Return the shim built-in module singleton for aName, or nil for any
	other name.  importlib resolves these lazily on first import, only when
	the shim is this session's backend."

	| sym |
	sym := aName asSymbol.
	(self builtinModuleNames includes: sym) ifFalse: [^ nil].
	^ (Python at: sym) ___instance___
%

category: 'Grail-Loading'
classmethod: CPythonShim
ensureLoaded: aShim
	"Load the user action library if needed, then init aShim and its types.
	Takes the shim instance as a parameter rather than reading a classInstVar
	so that callers can manage the singleton's lifecycle independently."

	CPythonLibrary isActive ifTrue: [
		self error: 'Cannot use CPythonShim: CPythonLibrary is already active in this session.'.
	].
	(System hasUserAction: #shimCall) ifFalse: [
		libraryPath ifNil: [
			self error: 'CPythonShim library path not configured.'.
		].
		System loadUserActionLibrary: libraryPath.
	].
	"Always init for the current instance (idempotent on the C side)"
	System userAction: #shimInit withArgs: {
		aShim .
		(aShim wrap: None) memoryAddress .
		(aShim wrap: true) memoryAddress .
		(aShim wrap: false) memoryAddress
	}.
	aShim initTypeAddresses.
%

! ===============================================================================
! Instance methods - PyObject wrapping
! ===============================================================================

category: 'Grail-Private'
method: CPythonShim
storeOop: anOop in: aCByteArray at: offset
	"Store a 64-bit OOP into a CByteArray at the given byte offset.
	OOPs are unsigned 64-bit values but int64At:put: requires signed,
	so convert values >= 2^63 to their signed two's complement."

	| signed |
	signed := anOop >= 16r8000000000000000
		ifTrue: [ anOop - 16r10000000000000000 ]
		ifFalse: [ anOop ].
	aCByteArray int64At: offset put: signed.
%

category: 'Grail-Wrapping'
method: CPythonShim
valueToPyObject
	"The value -> CByteArray wrapper map, held in SESSION temps rather than
	only on the instance.

	It is the ONLY strong reference to every wrapper, and a wrapper's
	gcMalloc'd C memory is freed when GemStone reclaims its CByteArray.  Long-
	lived C structures hold raw pointers into that memory for the life of the
	process -- _PyObject_New calloc's a PatternObject and _Py_Dealloc is a
	no-op, so a compiled regex NEVER goes away and keeps pointing at the
	wrapper for its groupindex dict.

	Replacing the singleton (CPythonShim reset, or libraryPath:, both of which
	drop the SessionTemps entry) therefore used to orphan the whole map:
	measured 108 wrappers before a reset, 2 after.  Every C structure holding
	one of those 106 was left dangling.  Once the freed block is REUSED the
	sentinel at offset 24 no longer reads GRAILWP1, so is_foreign() calls it
	foreign and either mints a ShimForeignObject for it -- ``a
	ShimForeignObject does not understand #includesKey:'' -- or, when the
	stale ob_type is unreadable, SIGSEGVs in foreign_proxy_oop reading
	tp_name.  Both symptoms observed; see
	docs/Shim_Foreign_Proxy_Misattribution.md.

	Keying on the SESSION means a new singleton finds the same map, so the
	wrappers outlive it.  The instVar stays as a per-instance memo so the hot
	path in wrap: still costs one instVar read."

	valueToPyObject ifNil: [
		valueToPyObject := SessionTemps current
			at: #GrailShimWrapperMap
			ifAbsent: [
				| d |
				d := IdentityKeyValueDictionary new.
				SessionTemps current at: #GrailShimWrapperMap put: d.
				d]].
	^ valueToPyObject
%

category: 'Grail-Wrapping'
method: CPythonShim
wrap: aValue
	"Look up or create a CByteArray wrapper for aValue.
	Returns the CByteArray instance.
	nil and the Python ``None`` singleton both map to the same Py_None
	wrapper, but the embedded OOP is the singleton — so a round-trip
	through C yields ``None``, not nil."

	| pyObj |
	"Wrappers are 32 bytes: [refcnt:0][ob_type:8][oop:16][magic:24].  The
	magic sentinel at offset 24 lets the C shim positively identify a
	Grail-backed wrapper — a prebuilt wheel's own objects (e.g. numpy's
	DType type objects) carry the same ob_type (PyType_Type) the shim
	readied them under, so ob_type alone can't distinguish them; the
	sentinel can.  See is_foreign()/GRAIL_WRAP_MAGIC in cpython.cc."
	"A reverse proxy round-trips straight back to its original foreign
	PyObject* — numpy must get its own DType pointer again, not a wrapper."
	(aValue isKindOf: ShimForeignObject) ifTrue: [ ^ aValue pyObjectView ].
	(aValue == nil or: [aValue == None]) ifTrue: [
		noneWrapper ifNil: [
			noneWrapper := CByteArray gcMalloc: 32.
			noneWrapper int64At: 0 put: 1.
			noneWrapper int64At: 8 put: (self typeAddrFor: None).
			self storeOop: None asOop in: noneWrapper at: 16.
			noneWrapper int64At: 24 put: 16r475241494C575031.
		].
		^ noneWrapper
	].
	wrapsSinceSweep := (wrapsSinceSweep ifNil: [0]) + 1.
	"Sweep only between shim calls (callDepth = 0).  Server callbacks
	(PyList_New, PyUnicode_* creation, ...) re-enter wrap: THOUSANDS of
	times during one C call (e.g. one sre split); a sweep fired mid-call
	could reap a refcnt<=0 wrapper the in-flight C code still holds a raw
	pointer to -- dict removal makes the CByteArray garbage, the next
	scavenge frees its gcMalloc block, and pyobj_oop SEGVs on the stale
	address.  This was the GC-geometry-sensitive HostCoreDump in CPython
	test_textwrap's test_em_dash (crash/no-crash flipped with
	GEM_TEMPOBJ_CACHE_SIZE)."
	((wrapsSinceSweep \\ 1000) = 0 and: [self ___betweenShimCalls])
		ifTrue: [ self sweep ].
	pyObj := self valueToPyObject at: aValue otherwise: nil.
	pyObj notNil ifTrue: [
		"Resurrect: C may have decref'd this cached wrapper to zero after
		a previous call.  Handing it out at refcnt <= 0 would make it
		sweep-bait while in flight; reset to 1 so it survives until the
		C side is done with it again."
		(pyObj int64At: 0) <= 0 ifTrue: [pyObj int64At: 0 put: 1].
		^ pyObj].
	pyObj := CByteArray gcMalloc: 32.
	pyObj int64At: 0 put: 1.
	pyObj int64At: 8 put: (self typeAddrFor: aValue).
	self storeOop: aValue asOop in: pyObj at: 16.
	pyObj int64At: 24 put: 16r475241494C575031.
	self valueToPyObject at: aValue put: pyObj.
	^ pyObj
%

category: 'Grail-Wrapping'
method: CPythonShim
foreignProxyForPointer: ptrInt typeName: nameStr
	"Reverse proxy: return a Grail ShimForeignObject standing in for a
	foreign C PyObject* (a prebuilt wheel's own object, e.g. a numpy
	DType) so Grail code that receives it can use it.  Called from the C
	shim's pyobj_oop when a foreign object crosses into Grail.  The map is
	session-scoped (foreign pointers die with the process) and lives in
	SessionTemps, so the committed singleton's shape is untouched."

	| map |
	map := SessionTemps current
		at: #'GrailForeignProxies'
		ifAbsentPut: [ IdentityKeyValueDictionary new ].
	^ map at: ptrInt ifAbsent: [ | p |
		p := ShimForeignObject new.
		p setCPtr: ptrInt typeName: nameStr.
		map at: ptrInt put: p.
		p ]
%

category: 'Grail-Wrapping'
method: CPythonShim
typeAddrFor: aValue
	"Return the C type address for a Smalltalk value.  Returns 0 if type
	addresses are not yet initialized or the type is unregistered.
	No non-local returns (^) inside the ifAbsent: block: when this runs
	nested in an extension''s PyInit user action (dynamic module load), a
	^ out of a block raises RT_ERR_CANT_RETURN (2079).  Use a local +
	normal returns instead."

	| t |
	typeAddresses ifNil: [^ 0].
	^ typeAddresses at: aValue class ifAbsent: [
		(aValue isKindOf: String) ifTrue: [t := typeAddresses at: #str ifAbsent: [0]]
		ifFalse: [(aValue isKindOf: AbstractPyStr) ifTrue: [t := typeAddresses at: #str ifAbsent: [0]]
		ifFalse: [(aValue isKindOf: Integer) ifTrue: [t := typeAddresses at: #int ifAbsent: [0]]
		ifFalse: [(aValue isKindOf: Float) ifTrue: [t := typeAddresses at: #float ifAbsent: [0]]
		ifFalse: [(aValue isKindOf: ByteArray) ifTrue: [t := typeAddresses at: #bytes ifAbsent: [0]]
		ifFalse: [t := typeAddresses at: Object ifAbsent: [0]]]]]].
		t]
%

! ===============================================================================
! Instance methods - Type address initialization
! ===============================================================================

category: 'Grail-Initialization'
method: CPythonShim
initTypeAddresses
	"Fetch C type addresses via shimTypeAddr and build the class-to-address map.
	Also patches the None/True/False singletons created before types were known.
	Registers all subclasses of key types (String, Integer, etc.) so that
	typeAddrFor: works for Unicode7, Unicode16, SmallInteger, LargeInteger, etc."

	| addr |
	typeAddresses := Dictionary new.
	#('float' 'int' 'bool' 'str' 'bytes' 'list' 'dict' 'tuple' 'object' 'type' 'NoneType')
		do: [:name |
			typeAddresses at: name asSymbol put: (System userAction: #shimTypeAddr with: name).
		].
	"Map base classes"
	typeAddresses at: Object put: (typeAddresses at: #object).
	typeAddresses at: NoneType put: (typeAddresses at: #NoneType).
	typeAddresses at: UndefinedObject put: (typeAddresses at: #NoneType).
	typeAddresses at: Boolean put: (typeAddresses at: #bool).
	"Map Float and all subclasses"
	addr := typeAddresses at: #float.
	typeAddresses at: Float put: addr.
	Float allSubclasses do: [:each | typeAddresses at: each put: addr].
	"Map Integer and all subclasses"
	addr := typeAddresses at: #int.
	typeAddresses at: Integer put: addr.
	Integer allSubclasses do: [:each | typeAddresses at: each put: addr].
	"Map String and all subclasses"
	addr := typeAddresses at: #str.
	typeAddresses at: String put: addr.
	String allSubclasses do: [:each | typeAddresses at: each put: addr].
	"Map the boxed str hierarchy (AbstractPyStr) to the SAME `str` type.
	A PyStrSurrogate holds code points D800..DFFF that a GemStone Character
	cannot, so it is not a CharacterCollection -- but to Python it IS a str,
	and the shim decides that by reading tp_flags off the type address wired
	in here.  Left at `object`, Py_TPFLAGS_UNICODE_SUBCLASS was clear, so
	PyUnicode_Check answered false and _sre reported the pattern as
	``expected string or bytes-like object, got 'object''' -- the tell being
	that `object' is a tp_name, not anything Python was handed.
	StrEnum, the other AbstractPyStr subclass, is a str subclass in CPython
	too and passes PyUnicode_Check there for the same reason."
	typeAddresses at: AbstractPyStr put: addr.
	AbstractPyStr allSubclasses do: [:each | typeAddresses at: each put: addr].
	"Map ByteArray and all subclasses"
	addr := typeAddresses at: #bytes.
	typeAddresses at: ByteArray put: addr.
	ByteArray allSubclasses do: [:each | typeAddresses at: each put: addr].
	"Map collection types"
	typeAddresses at: OrderedCollection put: (typeAddresses at: #list).
	typeAddresses at: KeyValueDictionary put: (typeAddresses at: #dict).
	typeAddresses at: IdentityKeyValueDictionary put: (typeAddresses at: #dict).
	"Map Array and all subclasses (including the tuple class) to the tuple type."
	addr := typeAddresses at: #tuple.
	typeAddresses at: Array put: addr.
	Array allSubclasses do: [:each | typeAddresses at: each put: addr].
	"Patch singletons (created before types were known)"
	noneWrapper int64At: 8 put: (typeAddresses at: UndefinedObject).
	(self valueToPyObject at: true) int64At: 8 put: (typeAddresses at: Boolean).
	(self valueToPyObject at: false) int64At: 8 put: (typeAddresses at: Boolean).
%

! ===============================================================================
! Instance methods - Reference counting sweep
! ===============================================================================

category: 'Grail-Management'
method: CPythonShim
___noteShimEntry
	"Record WHERE the outermost shim call on this process started: the process,
	and its stack depth.  Two plain instance variables rather than an Array, so
	an entry costs no allocation; the singleton lives in SessionTemps and is
	rebuilt per session (see CPythonShim class>>current), so adding them is free.

	Called on EVERY entry, not just the 0->1 transition.  That matters: if it
	only ran at depth 1 then a callDepth left high by an earlier non-local exit
	would stop it running at all, and ___betweenShimCalls would have no entry to
	judge against.  Keeping the SHALLOWEST depth for the current process is what
	makes repeated and nested entries idempotent."

	| d p |
	d := System stackDepth.
	p := Processor activeProcess.
	(shimEntryProcess isNil
		or: [shimEntryProcess ~~ p or: [d <= shimEntryDepth]])
			ifTrue: [shimEntryProcess := p. shimEntryDepth := d]
%

category: 'Grail-Management'
method: CPythonShim
___betweenShimCalls
	"Is it safe to sweep -- i.e. is no shim call in progress?

	WHY THIS IS NOT JUST callDepth = 0.  The counter used to be decremented in
	``ensure: [callDepth := callDepth - 1]'', and that ensure: was a defect: an
	ensure: between a caller's handler and a live user-action C frame turns the
	VM's refusal of that unwind from a single reported 2758 into a REPEATING
	6011 that re-enters the handler until the stack is gone -- measured both ways
	in scripts/probe_handler_recursion.gs.  Dropping the ensure: removes the loop
	but means a non-local exit can skip the decrement, so the counter has to be
	REPAIRABLE rather than exact.

	The repair: if the counter says a call is in progress but we are back at or
	above the depth where the outermost one started, ON THE SAME PROCESS, then
	nothing can still be in flight.

	IN DOUBT, ANSWER FALSE.  Skipping a sweep only defers a reclaim; sweeping
	during a live call can reap a wrapper whose raw pointer in-flight C code
	still holds, which is a SEGV (see wrap:).  So both doubtful cases answer
	false: no recorded entry, and an entry belonging to ANOTHER process -- the
	latter is real, because a generator body runs on its own forked GsProcess
	with its own shallow stack depth, and comparing that depth against an entry
	recorded on the consumer's process would be meaningless."

	(callDepth isNil or: [callDepth <= 0]) ifTrue: [^ true].
	shimEntryProcess isNil ifTrue: [^ false].
	shimEntryProcess == Processor activeProcess ifFalse: [^ false].
	System stackDepth <= shimEntryDepth ifTrue: [
		callDepth := 0.
		shimEntryProcess := nil.
		^ true].
	^ false
%

category: 'Grail-Management'
method: CPythonShim
___duringCallDo: aBlock
	"Evaluate aBlock with callDepth raised, so wrap: defers sweeps for
	its duration (see wrap: for why sweeping mid-call is unsafe).

	NO ensure:.  See ___betweenShimCalls -- an ensure: here sits between any
	caller's handler and the user-action C frame, which is what turns a refused
	unwind into an unbounded 6011 loop.  A non-local exit therefore skips the
	decrement and ___betweenShimCalls repairs the counter instead."

	| r |
	callDepth := (callDepth ifNil: [0]) + 1.
	self ___noteShimEntry.
	r := aBlock value.
	callDepth := callDepth - 1.
	^ r
%

category: 'Grail-Management'
method: CPythonShim
sweep
	"Remove PyObject wrappers whose refcount has reached zero."

	| map toRemove |
	"Read the session's map directly so a sweep before anything has been
	wrapped does not create one."
	map := SessionTemps current at: #GrailShimWrapperMap otherwise: nil.
	map ifNil: [^ self].
	toRemove := OrderedCollection new.
	map keysAndValuesDo: [:key :pyObj |
		(pyObj int64At: 0) <= 0 ifTrue: [
			toRemove add: key.
		].
	].
	toRemove do: [:key | map removeKey: key].
%

! ===============================================================================
! Instance methods - General calling (0-5 args)
! ===============================================================================

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName
	"Call a module method with no arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		0 . 0 . 0 .
		0 . 0 . 0
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName with: arg1
	"Call a module method with 1 argument."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress . 0 . 0 .
		0 . 0 . 1
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName with: arg1 with: arg2
	"Call a module method with 2 arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress .
		(self wrap: arg2) memoryAddress . 0 .
		0 . 0 . 2
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName with: arg1 with: arg2 with: arg3
	"Call a module method with 3 arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress .
		(self wrap: arg2) memoryAddress .
		(self wrap: arg3) memoryAddress .
		0 . 0 . 3
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName with: arg1 with: arg2 with: arg3 with: arg4
	"Call a module method with 4 arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress .
		(self wrap: arg2) memoryAddress .
		(self wrap: arg3) memoryAddress .
		(self wrap: arg4) memoryAddress . 0 . 4
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName with: arg1 with: arg2 with: arg3 with: arg4 with: arg5
	"Call a module method with 5 arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress .
		(self wrap: arg2) memoryAddress .
		(self wrap: arg3) memoryAddress .
		(self wrap: arg4) memoryAddress .
		(self wrap: arg5) memoryAddress . 5
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName args: posArray kwargs: kwDictOrNil
	"Call a module method with positional args and keyword args (a
	Dictionary of String name -> value, or nil). Routes through the
	shimCallKw user action, which follows the METH_FASTCALL|METH_KEYWORDS
	vector convention (and builds a dict for METH_VARARGS|METH_KEYWORDS)."

	| posAddrs names vals |
	posAddrs := Array new: posArray size.
	1 to: posArray size do: [:i |
		posAddrs at: i put: (self wrap: (posArray at: i)) memoryAddress.
	].
	names := OrderedCollection new.
	vals := OrderedCollection new.
	kwDictOrNil ifNotNil: [
		kwDictOrNil keysAndValuesDo: [:k :v |
			names addLast: k asString.
			vals addLast: (self wrap: v) memoryAddress.
		].
	].
	^ self ___shimUserAction: #shimCallKw withArgs: {
		moduleName . methodName . posAddrs . names asArray . vals asArray }
%

category: 'Grail-Calling'
method: CPythonShim
callModuleReturnCPtr: moduleName method: methodName
	"Call a no-arg module method that returns a raw C pointer
	(SmallInteger address) instead of a Smalltalk value."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		0 . 0 . 0 .
		0 . 0 . 8
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTyped: moduleName type: typeName setattr: attrName selfPtr: ptr value: aValue
	"Invoke a tp_getset SETTER on a C-allocated typed object.
	Flags bit 4 selects the setter path in shimCallTyped."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . attrName . ptr .
		(self wrap: aValue) memoryAddress . 0 . 0 . (1 bitOr: 16)
	}
%

! ===============================================================================
! Instance methods - Backwards-compatible specialized calling
! ===============================================================================

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName doubles: anArrayOfDoubles
	"Call a METH_FASTCALL method that takes 3 doubles and returns a double."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: (anArrayOfDoubles at: 1)) memoryAddress .
		(self wrap: (anArrayOfDoubles at: 2)) memoryAddress .
		(self wrap: (anArrayOfDoubles at: 3)) memoryAddress .
		0 . 0 . 3
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName withList: anArray andDouble: aFloat
	"Call a method that takes (list, double) and returns an integer.
	Used for bisect_left / bisect_right style calls.
	Converts Array to OrderedCollection so PyList_Check passes."

	| list |
	list := (anArray isKindOf: OrderedCollection)
		ifTrue: [ anArray ]
		ifFalse: [ OrderedCollection withAll: anArray ].
	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: list) memoryAddress .
		(self wrap: aFloat) memoryAddress . 0 .
		0 . 0 . 2
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName insortList: anArray value: aFloat
	"Call a method that inserts a value into a sorted list.
	Converts to OrderedCollection so the C code can modify in place,
	then converts back to Array for the return value."

	| oc |
	oc := OrderedCollection withAll: anArray.
	self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: oc) memoryAddress .
		(self wrap: aFloat) memoryAddress . 0 .
		0 . 0 . 2
	}.
	^ oc asArray
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName withBytes: aByteArray
	"Call a method that takes (bytes) and returns an integer."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: aByteArray) memoryAddress . 0 . 0 .
		0 . 0 . 1
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName extendCrc: anInteger withBytes: aByteArray
	"Call a method that takes (int, bytes) and returns an integer."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: anInteger) memoryAddress .
		(self wrap: aByteArray) memoryAddress . 0 .
		0 . 0 . 2
	}
%

! ===============================================================================
! Instance methods - 6-arg calling (uses the same shimCall user action; the
! generic shimCall accepts up to 7 OOP args + an nargs slot, so 6 fits.)
! ===============================================================================

category: 'Grail-Calling'
method: CPythonShim
callModule6: modDotMethod with: a1 with: a2 with: a3 with: a4 with: a5 with: a6
	"Call a module method with 6 arguments. modDotMethod is 'module.method'.
	Returns a Smalltalk OOP (extracted from result PyObject offset 16)."

	^ self ___shimUserAction: #shimCall withArgs: {
		modDotMethod .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress .
		(self wrap: a3) memoryAddress .
		(self wrap: a4) memoryAddress .
		(self wrap: a5) memoryAddress .
		(self wrap: a6) memoryAddress . 6
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule6ReturnCPtr: modDotMethod with: a1 with: a2 with: a3 with: a4 with: a5 with: a6
	"Call a module method with 6 arguments. Returns a raw C pointer (SmallInteger).
	modDotMethod is 'module.method'."

	^ self ___shimUserAction: #shimCall withArgs: {
		modDotMethod .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress .
		(self wrap: a3) memoryAddress .
		(self wrap: a4) memoryAddress .
		(self wrap: a5) memoryAddress .
		(self wrap: a6) memoryAddress . (6 bitOr: 8)
	}
%

! ===============================================================================
! Instance methods - Typed object calling (via shimCallTyped)
! ===============================================================================

category: 'Grail-Calling'
method: CPythonShim
___shimUserAction: selector withArgs: argsArray
	"Invoke a Python-invoking shim user action (#shimCall, #shimCallKw,
	#shimCallTyped), translating a raw shim error into a catchable Grail
	exception.

	When a C extension (e.g. _sre) fails, the shim reports the Python
	exception as a bare GemStone Error (ERR_Error 2710) whose messageText
	is the exception's str, e.g. 'TypeError: expected string or
	bytes-like object, got dict' or 'RuntimeError: invalid SRE code'.  A
	GemStone Error is NOT a Grail BaseException (both descend from
	Exception as siblings), so Python try/except and
	unittest.assertRaises cannot catch it and it escapes as an
	uncatchable Smalltalk error.  Re-signal it as the matching Grail
	Python exception; a non-Python error is re-raised unchanged.

	THE HANDLER IS NARROW ON PURPOSE -- GrailShimError, not Error.  It used
	to be Error, which ALSO matched an exception signalled inside a CALLBACK
	the user action made back into Smalltalk.  Smalltalk runs a handler on top
	of the signalling frame, so such a handler runs with the user-action C
	frame still LIVE beneath it, and from there nothing terminating is legal:
	the re-signal below crosses the frame again and 2758 is raised repeatedly
	until the session dies of AlmostOutOfStack / UncontinuableError 6011.

	Matching only the shim's own class leaves a callback exception UNHANDLED,
	so the VM's default action runs, GciPerform traps it, and
	check_gci_error() in src/c/shim/cpython.cc translates
	GciErrSType>>exceptionObj and re-raises it HERE as a GrailShimError --
	with the C frames unwound first, which is what makes this re-signal safe.
	See GrailShimError's class comment and docs/GemStone_Feature_Requests.md
	1.5."

	"NO ensure: around this -- see ___betweenShimCalls.  This was the worst of
	the three, because EVERY caller's handler is outside it: it turned every
	refused unwind across this user action into a repeating 6011 that re-entered
	the caller's handler until the stack was gone.  Measured on the case that
	still reaches a handler here (a broad terminating Smalltalk handler outside a
	shim call): 22 handler turns before, 2 after, and the second is the bounded
	2758 report rather than another 6011."

	| r |
	callDepth := (callDepth ifNil: [0]) + 1.
	self ___noteShimEntry.
	r := [ System userAction: selector withArgs: argsArray ]
		on: GrailShimError
		do: [:ex | self ___translateShimError: ex].
	callDepth := callDepth - 1.
	^ r
%

category: 'Grail-Calling'
method: CPythonShim
___shimErrorTextFor: anException
	"Answer ``<PythonExceptionName>: <text>'' for an exception the C shim
	trapped at a failing GciPerform, or nil when there is nothing better to say.

	Called from check_gci_error() in src/c/shim/cpython.cc with
	GciErrSType>>exceptionObj, which is the ONLY place the original survives:
	for an exception raised in a callback, err.message and err.reason are both
	EMPTY.  Reading err.message is why every such failure used to reach Python
	as a RuntimeError with no text at all.

	The C side asks HERE rather than mapping in C for two reasons: the mapping
	needs the Python namespace, and the answer is wanted in the one shape
	___translateShimError: already parses -- name, colon, text."

	| baseExc clsName pyName text |
	anException isNil ifTrue: [^ nil].
	clsName := [anException class name asString]
		on: Error do: [:ex | ex return: nil].
	clsName isNil ifTrue: [^ nil].
	text := [anException messageText] on: Error do: [:ex | ex return: nil].
	text isNil ifTrue: [text := ''].

	"A Grail Python exception already knows its own Python name."
	baseExc := Python at: #'BaseException' otherwise: nil.
	(baseExc notNil and: [
		([anException isKindOf: baseExc] on: Error do: [:ex | ex return: false])])
			ifTrue: [^ clsName , ': ' , text].

	pyName := self ___pythonNameForSmalltalkErrorNamed: clsName.
	pyName isNil ifTrue: [
		"An unknown mapping must not masquerade as a known one: report
		 RuntimeError, but keep the Smalltalk class name in the TEXT so nothing
		 is lost and a wrong guess is not manufactured."
		^ 'RuntimeError: ' , clsName , ': ' , text].
	^ pyName , ': ' , text
%

category: 'Grail-Calling'
method: CPythonShim
___pythonNameForSmalltalkErrorNamed: aName
	"The Python exception name for a Smalltalk exception class name, or nil.

	Deliberately conservative, because a wrong entry here silently converts a
	Grail BUG into something Python code catches and ignores.  Two rules:

	  * a RENAME table, for the pairs where the two systems mean the same thing
	    under different spellings; and
	  * otherwise the SAME name, but only when Grail's Python namespace really
	    has a BaseException subclass by that name -- so LookupError, TypeError
	    and friends pass through unchanged.

	Everything else answers nil, and the caller falls back to RuntimeError with
	the Smalltalk name preserved.  Note what is NOT here: MessageNotUnderstood
	is not mapped to AttributeError.  A DNU inside the shim is a Grail bug far
	more often than a missing Python attribute, and turning it into a routinely
	caught AttributeError would hide exactly the failures worth seeing."

	| renamed cls baseExc |
	renamed := #(
		#'ZeroDivide'          #'ZeroDivisionError'
		#'OffsetError'         #'IndexError'
		#'ArgumentTypeError'   #'TypeError'
	).
	1 to: renamed size by: 2 do: [:i |
		(renamed at: i) asString = aName ifTrue: [
			^ (renamed at: i + 1) asString]].

	baseExc := Python at: #'BaseException' otherwise: nil.
	baseExc isNil ifTrue: [^ nil].
	cls := Python at: aName asSymbol otherwise: nil.
	(cls notNil and: [cls isBehavior and: [
		(cls == baseExc) or: [cls inheritsFrom: baseExc]]])
			ifTrue: [^ aName].
	^ nil
%

category: 'Grail-Calling'
method: CPythonShim
___translateShimError: ex
	"Parse ``<ExcName>: <message>'' out of a raw shim Error's messageText
	and re-signal the matching Grail Python exception (looked up in the
	Python namespace and verified to be a BaseException subclass).  If the
	text has no recognizable exception-name prefix, re-raise unchanged."

	| text idx name cls baseExc msg |
	text := ex messageText.
	text isNil ifTrue: [^ ex pass].
	idx := text indexOf: $:.
	idx = 0 ifTrue: [^ ex pass].
	name := text copyFrom: 1 to: idx - 1.
	cls := Python at: name asSymbol otherwise: nil.
	baseExc := Python at: #BaseException otherwise: nil.
	((cls ~~ nil) and: [(baseExc ~~ nil) and: [cls isBehavior
		and: [(cls == baseExc) or: [cls inheritsFrom: baseExc]]]]) ifFalse: [
			^ ex pass].
	msg := text copyFrom: idx + 1 to: text size.
	(msg size > 0 and: [msg first == $ ]) ifTrue: [msg := msg copyFrom: 2 to: msg size].
	^ cls @env1:___signal___: msg
%

category: 'Grail-Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr
	"Call a no-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		0 . 0 . 0 . 0
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1
	"Call a 1-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress . 0 . 0 . 1
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2
	"Call a 2-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress . 0 . 2
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2 with: a3
	"Call a 3-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress .
		(self wrap: a3) memoryAddress . 3
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr
	"Call a no-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		0 . 0 . 0 . 8
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1
	"Call a 1-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress . 0 . 0 . (1 bitOr: 8)
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2
	"Call a 2-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress . 0 . (2 bitOr: 8)
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2 with: a3
	"Call a 3-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress .
		(self wrap: a3) memoryAddress . (3 bitOr: 8)
	}
%

! ===============================================================================
! Instance methods - Module Loading (for tests)
! ===============================================================================

category: 'Grail-Module Loading'
method: CPythonShim
loadModule: moduleName
	"Load a C extension module via the shimLoadModule user action.
	The C side caches the module, so subsequent loads are fast.

	Returns true if the module loaded successfully, or signals an error."

	| r |
	callDepth := (callDepth ifNil: [0]) + 1.
	self ___noteShimEntry.
	r := System userAction: #shimLoadModule with: moduleName.
	callDepth := callDepth - 1.
	^ r
%

category: 'Grail-Module Loading'
method: CPythonShim
moduleAttrs: moduleName
	"Return a Dictionary of the module-level constants the C module
	registered via PyModule_AddIntConstant / AddStringConstant /
	AddObjectRef. C-only objects (heap types, capsules) are skipped
	by the export — they have no Smalltalk value to hand back."

	| flat dict |
	flat := System userAction: #shimModuleAttrs with: moduleName.
	dict := SymbolDictionary new.
	1 to: flat size by: 2 do: [:i |
		dict at: (flat at: i) asSymbol put: (flat at: i + 1).
	].
	^ dict
%

! ===============================================================================
! Instance methods - CPython API (called from C via GciPerform)
!
! These methods are the server-side implementation of the CPython C API.
! The C shim calls GciPerform(server, "PyXxx_Yyy:", ...) for every function.
! ===============================================================================

! --------------- Float API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyFloat_FromDouble: aFloat
	^ (self wrap: aFloat) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
___makeErrorWithText: aString
	"Build (do NOT signal) a GrailShimError whose messageText is aString,
	for the C shim's raise_error to attach as GciErrSType>>exceptionObj.

	The CLASS is load-bearing, not decoration: ___shimUserAction:withArgs:
	catches exactly GrailShimError, so this is what tells the wrapper's
	handler ``this came from raise_error, the C frames are already unwound,
	re-signalling is safe''.  A plain Error here would put the wrapper back to
	catching callback exceptions on a live user-action frame.
	On some images GciRaiseException does not surface err.message as the
	raised exception's messageText for a bare ERR_Error (2710) — observed on
	an image whose error handling is patched by a Squeak/GLASS/Seaside layer,
	where it comes back nil.  Raising an explicit Error instance (whose
	messageText we set) keeps shim error messages intact regardless of image."
	^ GrailShimError new messageText: aString; yourself
%

category: 'Grail-C API - Import'
method: CPythonShim
PyImport_ImportModule: aName
	"Resolve a module for a C extension's PyImport_ImportModule:
	 1. builtin module (Python dict) via ___instance___;
	 2. else load a .py submodule from the importlib search path
	    (importlib addSearchRoot: must have been told where the package is).
	The C-side import_cache dedups by name, so each module loads at most
	once.  No sys.modules check here — its env-1 lazy init would risk
	ERR_EXC_RETURN_DISALLOWED (2758) inside the PyInit user action.  NOTE:
	submodules with RELATIVE imports (numpy's do) pull in their parent
	package, whose __init__.py must itself compile/run in Grail — that is
	the current frontier (see docs/Shim_NumPy.md)."
	| nameStr sym path mod |
	nameStr := aName asString.
	sym := nameStr asSymbol.
	(Python includesKey: sym)
		ifTrue: [^ (self wrap: (Python at: sym) ___instance___) memoryAddress].
	"This server method runs in env-0 (it is invoked by C via GciPerform).
	``___moduleNameToPath___:'' is an env-1 classmethod, so it MUST be
	sent @env1: — a bare env-0 send DNUs, and inside the PyInit
	user-action callback that DNU surfaces to C as a NULL return
	(``No module named '<name>'''').  ``loadModuleFromPath:name:'' is an
	env-0 classmethod, so it is sent plainly (an @env1: send to it DNUs)."
	path := (Python at: #importlib) @env1:___moduleNameToPath___: nameStr.
	path isNil ifTrue: [^ 0].
	mod := (Python at: #importlib) loadModuleFromPath: path name: nameStr.
	mod isNil ifTrue: [^ 0].
	^ (self wrap: mod) memoryAddress
%

category: 'Grail-C API - Sys'
method: CPythonShim
PySys_GetObject: aName
	"Back PySys_GetObject(name): return the named attribute of the sys
	module wrapped as a PyObject, or 0 (C NULL) when sys has no such
	attribute (CPython returns NULL without setting an error).  Invoked
	from C via GciPerform (env-0); reads through the env-1 Python
	attribute protocol.  numpy's core init reads sys.flags."

	^ [ | sysInst |
	    sysInst := (Python at: #sys) ___instance___.
	    (self wrap: (sysInst @env1:___pyAttrLoad___: aName asString asSymbol))
	        memoryAddress
	  ] on: AbstractException do: [:ex | 0]
%

category: 'Grail-C API - ContextVar'
method: CPythonShim
PyContextVar_New: aName default: aDefault
	"Back PyContextVar_New(name, default): create a Grail
	contextvars.ContextVar so the C-created var and any Python-created one
	(numpy._core.printoptions) are the same kind of object.  ContextVar's
	__init__ is (name, default=_MISSING), so a supplied default is passed
	positionally; aDefault is nil when C passed no default (NULL)."

	| cvModule cvClass posArgs |
	cvModule := ((Python at: #importlib) ___instance___) @env1:import_module: 'contextvars'.
	cvClass := cvModule @env1:___pyAttrLoad___: #'ContextVar'.
	posArgs := aDefault == nil ifTrue: [{ aName }] ifFalse: [{ aName . aDefault }].
	"Instantiate via the class-call entry ``value:value:'' (positional
	array + kwargs); a Grail Python class is not callable through
	___pyCallValue___:kw:."
	^ (self wrap: (cvClass perform: #'value:value:' env: 1
		withArguments: { posArgs . nil })) memoryAddress
%

category: 'Grail-C API - ContextVar'
method: CPythonShim
PyContextVar_Get: aVar default: aDefault
	"Back PyContextVar_Get(var, default, &value): return var.get() — or
	var.get(default) when C supplied a default (aDefault not nil).  The C
	side writes the result through *value and returns 0."

	| getter posArgs |
	getter := aVar @env1:___pyAttrLoad___: #'get'.
	posArgs := aDefault == nil ifTrue: [{}] ifFalse: [{ aDefault }].
	^ (self wrap: (getter perform: #'value:value:' env: 1
		withArguments: { posArgs . nil })) memoryAddress
%

category: 'Grail-C API - ContextVar'
method: CPythonShim
PyContextVar_Set: aVar value: aValue
	"Back PyContextVar_Set(var, value): var.set(value) answers a Token
	(passed back to var.reset())."

	| setter |
	setter := aVar @env1:___pyAttrLoad___: #'set'.
	^ (self wrap: (setter perform: #'value:value:' env: 1
		withArguments: { { aValue } . nil })) memoryAddress
%

category: 'Grail-Diagnostics'
method: CPythonShim
___wrapProbe___: aValue
	"Diagnostic backing for the shimWrapProbe user action: wrap aValue and
	return its memoryAddress, the same path the real PyXxx server methods
	use.  Lets us test which operations trip RT_ERR_CANT_RETURN (2079) /
	ERR_EXC_RETURN_DISALLOWED (2758) at a single level of user-action
	reentrancy, isolated from the dlopen/PyInit path."
	^ (self wrap: aValue) memoryAddress
%

! --------------- Integer API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyLong_FromSsize_t: anInteger
	^ (self wrap: anInteger) memoryAddress
%

! --------------- String (Unicode) API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyUnicode_FromString: aString
	"aString arrives as a plain GciNewString-built kernel String (7-bit/
	byte-oriented) -- Grail's canonical Python str representation is
	Unicode7, not String, so wrapping the raw String unchanged leaked
	the wrong Smalltalk class through every C-shim-built str result
	(re.sub()/subn()/split() etc. via _sre's PyUnicode_Join ->
	PyUnicode_FromString): test_re.py's test_basic_re_sub expects
	type(re.sub(...)) to be the SAME class as a plain string literal.

	DECODE those bytes as UTF-8 rather than widening them one-for-one:
	CPython's PyUnicode_FromString takes a UTF-8 encoded C string, and
	the shim now genuinely hands one over (see PyUnicode_AsUTF8).
	asUnicodeString widens each BYTE to a code point -- latin-1
	semantics -- so a multi-byte character arrived as that many separate
	characters: re.sub on 'abࠀc' answered 'abà\\xa0\\x80c'.
	Decoding is a no-op for 7-bit content (and still answers Unicode7),
	so only the previously-mojibake cases change.

	Falls back to the old widening if the bytes are not valid UTF-8,
	which keeps any caller that really did pass latin-1 working rather
	than turning its output into an uncatchable ArgumentError."

	| decoded |
	decoded := [aString @env0:decodeFromUTF8]
		@env0:on: Error
		do: [:ex | ex @env0:return: aString @env0:asUnicodeString].
	^ (self wrap: decoded) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyUnicode_Substring: aString from: start to: end
	"Python slice semantics: 0-based, end exclusive, clamped to length.

	copyFrom:to: is species-preserving -- slicing a str-SUBCLASS
	instance (re.findall()/finditer() on a ``class S(str): ...``) would
	otherwise hand back MORE ``S`` instances instead of coercing to
	plain str, same class of bug as PyUnicode_FromString: above
	(test_re.py's test_re_findall/test_re_split).  asUnicodeString
	alone doesn't fix this: sent to something that's ALREADY a kind of
	Unicode (a str subclass qualifies via isKindOf:), it takes a
	same-species fast path and answers self unchanged -- exactly
	builtins.gs's str: has to work around for the same reason (see its
	comment).  Explicitly checking the exact class and routing through
	str __new__: (which always builds a genuine plain instance) is the
	only way to actually re-narrow it."

	| len lo hi sliced |
	len := aString size.
	lo := start max: 0.
	hi := end min: len.
	hi < lo ifTrue: [hi := lo].
	sliced := aString copyFrom: lo + 1 to: hi.
	((sliced @env0:class @env0:== Unicode7) or: [
		(sliced @env0:class @env0:== Unicode16) or: [
		(sliced @env0:class @env0:== Unicode32) or: [
		(sliced @env0:class @env0:== String) or: [
		(sliced @env0:class @env0:== Symbol) or: [
		"A span still holding a lone surrogate has no plain-str form to
		narrow to -- PyStrSurrogate IS the exact str here, and feeding it
		to str __new__: would lose the very code points it exists to
		carry.  (___fromCodePoints___: has already demoted any span that
		no longer contains one.)"
		sliced @env0:class @env0:== PyStrSurrogate]]]]]) ifFalse: [
		sliced := str @env1:__new__: sliced].
	^ (self wrap: sliced) memoryAddress
%

! --------------- Bytes API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyBytes_FromStringAndSize: aByteArray
	^ (self wrap: aByteArray) memoryAddress
%

! --------------- List API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyList_New: size
	^ (self wrap: OrderedCollection new) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_Append: aList item: anItem
	aList addLast: anItem.
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_GetItem: aList at: zeroBasedIndex
	^ (self wrap: (aList at: zeroBasedIndex + 1)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_SetItem: aList at: zeroBasedIndex put: aValue
	aList at: zeroBasedIndex + 1 put: aValue.
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_Insert: aList at: zeroBasedIndex item: anItem
	aList add: anItem beforeIndex: zeroBasedIndex + 1.
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_Size: aList
	^ aList size
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_SetSlice: aList from: lo to: hi with: replacement
	"Replace or delete elements in the range [lo, hi).
	If replacement is nil, delete the elements."

	| oneBasedLo oneBasedHi |
	oneBasedLo := lo + 1.
	oneBasedHi := hi.
	replacement ifNil: [
		"Delete the range [lo, hi)"
		oneBasedHi to: oneBasedLo by: -1 do: [:i |
			aList removeAtIndex: i.
		].
		^ self
	].
	"Replace is not yet implemented — only delete (nil) is used by heapq."
	self error: 'PyList_SetSlice with non-nil replacement not yet implemented'.
%

! --------------- Dict API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyDict_New
	^ (self wrap: KeyValueDictionary new) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_SetItem: aDictionary key: aKey value: aValue
	aDictionary at: aKey put: aValue.
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Next: aDictionary pos: posOop
	"Iterator helper for the C-side ``PyDict_Next``.  Returns
	``{ keyAddr. valueAddr. nextPos }`` for the entry at the given
	1-based position, or ``nil`` when the position is past the end.
	The caller threads the returned ``nextPos`` back in.

	The C side packages the key/value via ``addr_to_pyobj`` so they
	travel as PyObject* on the wire.  We wrap each value through
	``self wrap:`` to materialise a PyObject sized to expose the
	underlying OOP at offset 16 — keeping the round-trip lossless."

	| keys n key value |
	keys := aDictionary keys asArray.
	n := keys size.
	posOop >= n ifTrue: [^ nil].
	key := keys at: posOop + 1.
	value := aDictionary at: key.
	^ {
		(self wrap: key) memoryAddress.
		(self wrap: value) memoryAddress.
		posOop + 1.
	}
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_SetItemString: aDictionary key: aString value: aValue
	aDictionary at: aString put: aValue.
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_GetItem: aDictionary key: aKey
	(aDictionary includesKey: aKey) ifFalse: [ ^ 0 ].
	^ (self wrap: (aDictionary at: aKey)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_GetItemString: aDictionary key: aString
	^ self PyDict_GetItem: aDictionary key: aString
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Contains: aDictionary key: aKey
	^ aDictionary includesKey: aKey
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_DelItem: aDictionary key: aKey
	aDictionary removeKey: aKey.
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Size: aDictionary
	^ aDictionary size
%

! --------------- Tuple API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyTuple_New: size
	"A real Grail tuple, not a plain Array: since list/tuple __eq__
	became cross-kind-distinct, a C-API tuple surfacing as an Array
	compared equal to lists and unequal to tuples -- every
	assertEqual(m.span(), (x, y)) in CPython test_re failed on it.
	tuple is an Array subclass, so PyTuple_SetItem's at:put: still
	works during construction."
	^ (self wrap: (tuple new: size)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyTuple_SetItem: anArray at: zeroBasedIndex put: aValue
	anArray at: zeroBasedIndex + 1 put: aValue.
%

category: 'Grail-CPython API'
method: CPythonShim
PyTuple_GetItem: anArray at: zeroBasedIndex
	^ (self wrap: (anArray at: zeroBasedIndex + 1)) memoryAddress
%

! --------------- Object protocol ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyCallable_Check: obj
	"Server-side fallback for PyCallable_Check.  Returns true for
	anything callable from Python — Smalltalk BoundMethods, plain
	CompiledMethods, classes, and the legacy block-based callables
	stored in module dicts.  Used by re.sub to decide whether the
	replacement is a literal template or a function to apply per
	match.  Pure-value types (str/bytes/int/...) are filtered out
	on the C side before we get here."

	(obj isKindOf: BoundMethod) ifTrue: [^ true].
	(obj isKindOf: ExecBlock) ifTrue: [^ true].
	(obj isKindOf: GsNMethod) ifTrue: [^ true].
	(obj isKindOf: Behavior) ifTrue: [^ true].
	"Anything else: not callable."
	^ false
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_GetAttrString: obj name: nameString
	"Use Grail's Python attribute protocol (___pyAttrLoad___:), not a direct
	env-1 send.  A direct ``obj perform: #name'' DNUs for module-style
	attributes (e.g. math.floor) — and inside an extension's PyInit user
	action that DNU surfaces as ERR_EXC_RETURN_DISALLOWED (2758) rather than
	a recoverable AttributeError.  ___pyAttrLoad___: returns the bound
	method / value the way Python attribute access should."
	^ (self wrap: (obj perform: #'___pyAttrLoad___:' env: 1 withArguments: { nameString asSymbol }))
		memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_HasAttrString: obj name: nameString
	^ [obj perform: nameString asSymbol env: 1. true]
		on: MessageNotUnderstood, Error
		do: [:e | false]
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_Repr: obj
	^ (self wrap: (obj @env1:__repr__)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_Str: obj
	^ (self wrap: (obj @env1:__str__)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_Length: obj
	^ obj @env1:__len__
%

! --------------- Dynamic module loading ---------------

category: 'Grail-Dynamic Loading'
method: CPythonShim
callModuleDynamic: moduleName method: methodName args: anArray kwargs: kwDictOrNil
	"Keyword-aware entry point for dynamically loaded module methods.
	Falls back to the legacy positional-only path when there are no
	keyword arguments."

	(kwDictOrNil == nil or: [kwDictOrNil isEmpty]) ifTrue: [
		^ self callModuleDynamic: moduleName method: methodName args: anArray
	].
	^ self callModule: moduleName method: methodName args: anArray kwargs: kwDictOrNil
%

category: 'Grail-Dynamic Loading'
method: CPythonShim
callModuleDynamic: moduleName method: methodName args: anArray
	"Call a dynamically loaded module method with a variable number of arguments.
	anArray is an Array of Smalltalk values (0 to 5 elements)."

	| nargs a1 a2 a3 a4 a5 |
	nargs := anArray size.
	a1 := nargs >= 1 ifTrue: [(self wrap: (anArray at: 1)) memoryAddress] ifFalse: [0].
	a2 := nargs >= 2 ifTrue: [(self wrap: (anArray at: 2)) memoryAddress] ifFalse: [0].
	a3 := nargs >= 3 ifTrue: [(self wrap: (anArray at: 3)) memoryAddress] ifFalse: [0].
	a4 := nargs >= 4 ifTrue: [(self wrap: (anArray at: 4)) memoryAddress] ifFalse: [0].
	a5 := nargs >= 5 ifTrue: [(self wrap: (anArray at: 5)) memoryAddress] ifFalse: [0].
	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		a1 . a2 . a3 .
		a4 . a5 . nargs
	}
%

category: 'Grail-Dynamic Loading'
classmethod: CPythonShim
loadDynamicModule: moduleName fromPath: pathString
	"Dynamically load a .so extension module.
	Creates a module subclass with compiled env:1 methods for each C function.
	Returns an instance of the new class.

	Each C function is exposed as a `_name:kw:` varargs method on the module
	class. Python call sites of the form `mymod.somefunc(args)` dispatch via
	the attribute-call varargs fast path (see CallAst >>
	attributeCallVarargsSelector)."

	| methodNames moduleClass moduleInstance symbolList |
	self current.
	"Depth-track like ___shimUserAction:withArgs: -- a dynamic module's
	init exec re-enters wrap: via server callbacks; a sweep mid-load
	could reap in-flight wrappers (see wrap:)."
	methodNames := self current ___duringCallDo: [
		System userAction: #shimDynLoad withArgs: { pathString . moduleName }].
	"Create a module subclass for this C extension"
	moduleClass := module
		subclass: moduleName
		instVarNames: #()
		classVars: #()
		classInstVars: #()
		poolDictionaries: #()
		inDictionary: UserGlobals
		options: #().
	"Compile env:1 methods for each C function. Two selector shapes are
	generated: a `_name:kw:` varargs method (for first-class use and kw
	arg call sites), plus fixed-arity forwarders for arities 0..3 (which
	is the hot path — `mymod.func(x)` compiles to `(mymod) func: x`).
	Fixed-arity forwarders delegate to the varargs form so there is one
	place where the actual C call happens."
	symbolList := System myUserProfile symbolList.
	methodNames do: [:methName |
		| varargsSrc arity0Src arity1Src arity2Src arity3Src |
		"Varargs form — actually invokes the C function. Keyword args
		flow through the shimCallKw user action when present."
		varargsSrc := '_' , methName , ': positional kw: keywords
	^ (CPythonShim @env0:current) @env0:callModuleDynamic: ''' , moduleName , ''' method: ''' , methName , ''' args: positional kwargs: keywords'.
		moduleClass
			compileMethod: varargsSrc
			dictionaries: symbolList
			category: 'Grail-C Extension'
			environmentId: 1.

		"Fixed-arity forwarders 0..3 — delegate to the varargs form."
		arity0Src := methName , '
	^ self _' , methName , ': #() kw: nil'.
		arity1Src := methName , ': a1
	^ self _' , methName , ': { a1 } kw: nil'.
		arity2Src := methName , ': a1 _: a2
	^ self _' , methName , ': { a1 . a2 } kw: nil'.
		arity3Src := methName , ': a1 _: a2 _: a3
	^ self _' , methName , ': { a1 . a2 . a3 } kw: nil'.
		{ arity0Src . arity1Src . arity2Src . arity3Src } do: [:src |
			moduleClass
				compileMethod: src
				dictionaries: symbolList
				category: 'Grail-C Extension'
				environmentId: 1.
		].
	].
	"Create and initialize the instance"
	moduleInstance := moduleClass new.
	moduleInstance @env1:__name__: moduleName;
		 @env1:__package__: nil.
	"Expose module-level constants (PyModule_AddIntConstant /
	AddStringConstant / AddObjectRef) as dynamic instVars so Python
	attribute reads (mymod.CONST) resolve through the
	___pyAttrLoad___ dynamic-instVar probe."
	(self current moduleAttrs: moduleName) keysAndValuesDo: [:k :v |
		moduleInstance dynamicInstVarAt: k put: v.
	].
	^ moduleInstance
%

! --------------- Rich comparison ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyObject_RichCompareBool: v with: w op: opInt
	"Dispatch rich comparison to the appropriate Python dunder method.
	op: 0=LT, 1=LE, 2=EQ, 3=NE, 4=GT, 5=GE."

	| selectors selector |
	selectors := #(#'__lt__:' #'__le__:' #'__eq__:' #'__ne__:' #'__gt__:' #'__ge__:').
	selector := selectors at: opInt + 1.
	^ v perform: selector env: 1 withArguments: { w }
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_RichCompare: v with: w op: opInt
	"Like PyObject_RichCompareBool but returns the wrapped result object
	(normally a Boolean, but a dunder may return any object)."

	| selectors selector |
	selectors := #(#'__lt__:' #'__le__:' #'__eq__:' #'__ne__:' #'__gt__:' #'__ge__:').
	selector := selectors at: opInt + 1.
	^ (self wrap: (v perform: selector env: 1 withArguments: { w })) memoryAddress
%

! --------------- Generic calling / subscript / attribute store ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyObject_Call: callable args: argsArray
	"Invoke a Python callable with positional args. argsArray is the
	Smalltalk value behind the C-side args tuple (an Array or tuple
	subclass); nil means no arguments. Dispatches through the canonical
	___pyCallValue___:kw: entry point so BoundMethods, classes, and
	user-defined __call__ objects all work."

	| args result |
	args := argsArray ifNil: [ Array new ].
	(args class == Array) ifFalse: [ args := Array withAll: args ].
	result := callable perform: #'___pyCallValue___:kw:' env: 1 withArguments: { args . nil }.
	^ (self wrap: result) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_GetItem: obj key: aKey
	"obj[key] via __getitem__. A missing key raises (KeyError/IndexError)
	in env 1, which surfaces as a GCI error the C side converts."

	^ (self wrap: (obj perform: #'__getitem__:' env: 1 withArguments: { aKey })) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_SetItem: obj key: aKey value: aValue
	"obj[key] = value via __setitem__."

	obj perform: #'__setitem__:_:' env: 1 withArguments: { aKey . aValue }.
%

category: 'Grail-CPython API'
method: CPythonShim
PyObject_SetAttrString: obj name: nameString value: aValue
	"setattr(obj, name, value) — Grail compiles attribute stores as a
	`name:` setter in env 1."

	obj perform: (nameString , ':') asSymbol env: 1 withArguments: { aValue }.
%

category: 'Grail-CPython API'
method: CPythonShim
PySequence_GetItem: seq at: zeroBasedIndex
	"Fallback for sequences that are neither list nor tuple on the C side.
	Python __getitem__ handles negative indices and raises IndexError."

	^ (self wrap: (seq perform: #'__getitem__:' env: 1 withArguments: { zeroBasedIndex })) memoryAddress
%

! --------------- Iteration protocol ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyObject_GetIter: obj
	"iter(obj) via __iter__."

	^ (self wrap: (obj @env1:__iter__)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyIter_Next: anIterator
	"next(iterator). Returns 0 (C NULL, no error) when the iterator is
	exhausted — the C side translates StopIteration-as-end-of-iteration
	into the NULL-without-error protocol."

	| result |
	"Runtime lookup: StopIteration.gs compiles after CPythonShim.gs in
	install.gs, so a direct reference would not resolve here."
	result := [ anIterator @env1:__next__ ]
		on: (Python at: #StopIteration)
		do: [:e | ^ 0 ].
	^ (self wrap: result) memoryAddress
%

! --------------- Sequence / string helpers ---------------

category: 'Grail-CPython API'
method: CPythonShim
PySequence_Contains: seq item: anItem
	"item in seq via __contains__."

	^ seq perform: #'__contains__:' env: 1 withArguments: { anItem }
%

category: 'Grail-CPython API'
method: CPythonShim
PyUnicode_Concat: left with: right
	^ (self wrap: (left , right)) memoryAddress
%

! --------------- Dict API (additional) ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Clear: aDictionary
	aDictionary removeAllKeys: aDictionary keys.
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Keys: aDictionary
	"Returns a Python list (OrderedCollection) of the keys."

	^ (self wrap: (OrderedCollection withAll: aDictionary keys asArray)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Values: aDictionary
	| values |
	values := OrderedCollection new.
	aDictionary keysAndValuesDo: [:k :v | values addLast: v].
	^ (self wrap: values) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Items: aDictionary
	"Returns a Python list of (key, value) tuples."

	| items |
	items := OrderedCollection new.
	aDictionary keysAndValuesDo: [:k :v | items addLast: { k . v }].
	^ (self wrap: items) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Copy: aDictionary
	^ (self wrap: aDictionary copy) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_Merge: aDictionary with: otherDictionary override: aBoolean
	otherDictionary keysAndValuesDo: [:k :v |
		(aBoolean or: [(aDictionary includesKey: k) not]) ifTrue: [
			aDictionary at: k put: v.
		].
	].
%

category: 'Grail-CPython API'
method: CPythonShim
PyDict_SetDefault: aDictionary key: aKey default: aDefault
	"dict.setdefault — return the existing value, or store and return
	the default. A nil default (C NULL) means Python None; never store
	Smalltalk nil in a Python dict."

	| value |
	(aDictionary includesKey: aKey) ifTrue: [
		^ (self wrap: (aDictionary at: aKey)) memoryAddress
	].
	value := aDefault ifNil: [ None ].
	aDictionary at: aKey put: value.
	^ (self wrap: value) memoryAddress
%

! --------------- List / Tuple API (additional) ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyList_GetSlice: aList from: lo to: hi
	"Python slice semantics: 0-based, end exclusive, clamped to length.
	Returns a new list."

	| len oneLo oneHi |
	len := aList size.
	oneLo := (lo max: 0) + 1.
	oneHi := hi min: len.
	oneHi < oneLo ifTrue: [^ (self wrap: OrderedCollection new) memoryAddress].
	^ (self wrap: (OrderedCollection withAll: (aList copyFrom: oneLo to: oneHi))) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_AsTuple: aList
	^ (self wrap: (Array withAll: aList)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_Sort: aList
	"In-place sort using Python __lt__ — delegate to the Python-level
	list>>sort method."

	aList @env1:sort.
%

category: 'Grail-CPython API'
method: CPythonShim
PyList_Reverse: aList
	aList @env1:reverse.
%

category: 'Grail-CPython API'
method: CPythonShim
PyTuple_GetSlice: anArray from: lo to: hi
	"Returns a new tuple (Array) with Python slice clamping."

	| len oneLo oneHi |
	len := anArray size.
	oneLo := (lo max: 0) + 1.
	oneHi := hi min: len.
	oneHi < oneLo ifTrue: [^ (self wrap: (Array new: 0)) memoryAddress].
	^ (self wrap: (anArray copyFrom: oneLo to: oneHi)) memoryAddress
%

! --------------- Slice API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PySlice_New: start stop: stop step: step
	"slice() construction. The C side maps NULL args to None before
	delegating, so the three values are always present."

	^ (self wrap: (slice ___newStart: start stop: stop step: step)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PySlice_Unpack: aSlice
	"Return { startOrNil. stopOrNil. stepOrNil } with nil where the
	slice holds None. CPython's defaults (and the step ~= 0 check)
	are applied on the C side so the PY_SSIZE_T sentinel values never
	round-trip through Smalltalk. Returns nil for a non-slice."

	| s |
	(aSlice isKindOf: slice) ifFalse: [^ nil].
	s := Array new: 3.
	s at: 1 put: ((aSlice @env1:start) == None ifTrue: [nil] ifFalse: [aSlice @env1:start]).
	s at: 2 put: ((aSlice @env1:stop) == None ifTrue: [nil] ifFalse: [aSlice @env1:stop]).
	s at: 3 put: ((aSlice @env1:step) == None ifTrue: [nil] ifFalse: [aSlice @env1:step]).
	^ s
%

! --------------- Set API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PySet_New: iterableOrNil
	"PySet_New(NULL) -> empty set; with an iterable, add its elements.
	Smalltalk collections (list/tuple/set) enumerate via do:; Python
	iterator objects are not supported here. Runtime class lookup:
	set.gs compiles after CPythonShim.gs in install.gs."

	| s |
	s := (Python at: #set) new.
	iterableOrNil ifNotNil: [ iterableOrNil do: [:each | s add: each] ].
	^ (self wrap: s) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PySet_Add: aSet item: anItem
	aSet add: anItem.
%

category: 'Grail-CPython API'
method: CPythonShim
PySet_Contains: aSet item: anItem
	^ aSet includes: anItem
%

category: 'Grail-CPython API'
method: CPythonShim
PySet_Discard: aSet item: anItem
	"Returns true if the item was present and removed."

	(aSet includes: anItem) ifFalse: [^ false].
	aSet remove: anItem ifAbsent: [].
	^ true
%

category: 'Grail-CPython API'
method: CPythonShim
PySet_Clear: aSet
	aSet asArray do: [:each | aSet remove: each ifAbsent: []].
%

category: 'Grail-CPython API'
method: CPythonShim
PySet_Check: obj
	^ obj isKindOf: Set
%

! --------------- Bytearray API ---------------

category: 'Grail-CPython API'
method: CPythonShim
PyByteArray_FromStringAndSize: aByteArray
	^ (self wrap: (bytearray withAll: aByteArray)) memoryAddress
%

category: 'Grail-CPython API'
method: CPythonShim
PyByteArray_Check: obj
	^ obj isKindOf: bytearray
%

! --------------- Import helper ---------------

category: 'Grail-CPython API'
method: CPythonShim
importGetAttr: modName name: attrName
	"Backs _PyImport_GetModuleAttrString: import a module by name and
	return one attribute of it."

	| mod value |
	"Runtime lookup: importlib.gs compiles after CPythonShim.gs in
	install.gs, so a direct reference would not resolve here."
	mod := ((Python at: #importlib) ___instance___) @env1:import_module: modName.
	"Unary perform first (native-module VALUE attrs like math.pi are
	env-1 unary getters); fall back to the module attribute protocol
	when there is no unary form -- a multi-arg top-level def
	(re._compile_template(pattern, repl)) has none, and
	___moduleAttrLoad___: lazy-wraps it as a BoundMethod (sre.c fetches
	_compile_template this way for Match.expand / Pattern.sub)."
	value := [mod perform: attrName asSymbol env: 1]
		on: MessageNotUnderstood
		do: [:ex | mod @env1:___moduleAttrLoad___: attrName asSymbol].
	^ (self wrap: value) memoryAddress
%
