"Server for the cpython C shim User Action library.

The singleton instance is passed to C at library load time. C stores it
and calls GciPerform(server, ""PyXxx_Yyy:"", ...) for every CPython API
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
		callModule: '_statistics' method: '_normal_dist_inv_cdf'
		with: 0.5 with: 0.0 with: 1.0.
	""result => 0.0 (median of standard normal distribution)""

"
Class {
	#name : 'CPythonShim',
	#superclass : 'Object',
	#instVars : [
		'valueToPyObject',
		'noneWrapper',
		'typeAddresses',
		'wrapsSinceSweep',
		'callDepth',
		'shimEntryProcess',
		'shimEntryDepth'
	],
	#classInstVars : [
		'libraryPath'
	],
	#category : 'Grail-CPython'
}

{ #category : 'Grail-Dynamic Loading' }
CPythonShim class >> ___buildDynamicModule: moduleName fromPath: pathString methodNames: methodNames [
	"The Grail module for a loaded .so: its class, a method per C function,
	its spec and its exported attributes.  methodNames is what shimDynLoad
	answered, as a user action (loadDynamicModule:fromPath:) or called from C
	(finishDynLoad:path:methodNames:)."

	| moduleClass moduleInstance symbolList existing |
	"ONE MODULE OBJECT PER EXTENSION, as in CPython, where a module is in
	sys.modules while its exec runs and the same object is complete when it
	ends.  A cycle of C imports (numpy.random's _generator, bit_generator,
	_common) registers the module from the middle of its own exec
	(finishDynLoad:path:methodNames:); building it again when the load ends
	refreshes THAT object's attributes, so whoever got it mid-exec sees
	everything its exec defined.  A fresh object left the first one a
	snapshot without them -- cannot import name Generator."
	existing := [importlib lookupModule: moduleName] on: Error do: [:e | e return: nil].
	(existing notNil and: [existing class respondsTo: #'___shimModuleName___']) ifTrue: [
		(existing class ___shimModuleName___ = moduleName) ifTrue: [
			(self current moduleAttrs: moduleName) keysAndValuesDo: [:k :v |
				existing dynamicInstVarAt: k put: v].
			^ existing]].
	"Create a module subclass for this C extension.  Named by a legal
	IDENTIFIER derived from the module name, not by the name itself: an
	in-package extension arrives dotted (pydantic_core._pydantic_core,
	numpy._core._multiarray_umath), and GemStone 4.0 refuses that as a class
	name with ArgumentError 2149 -- which is not a GrailShimError, so the
	importer's handler could not turn it into an ImportError and the session
	ended with no traceback at all.  Nothing looks this class up by name: the
	C side is keyed by moduleName, and __name__ comes from the spec below."
	moduleClass := module
		subclass: (moduleName collect: [:c |
			(c isLetter or: [c isDigit or: [c = $_]]) ifTrue: [c] ifFalse: [$_]])
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
	"The C module this class fronts, for wrap: -- a function read off the
	module is a BoundMethod on it, and goes back to C as that module's
	function object (___functionObjectFor:)."
	moduleClass class
		compileMethod: '___shimModuleName___
	^ ' , moduleName printString
		dictionaries: symbolList
		category: 'Grail-C Extension'
		environmentId: 0.
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
	"PEP 451, through importlib's shared seam, so a C-extension module carries a
	real ``__spec__'' like every other module rather than None.

	ORIGIN IS THE .so PATH when the caller knows it, and that is what makes
	``__file__'' right here -- CPython gives an extension module the shared
	library's path.  When the path is unknown the spec has no location and
	__file__ comes out None, which is the built-in shape.

	``__package__'' was nil, which is not None and not '' -- a raw Smalltalk nil
	reaching Python.  The spec's ``parent'' replaces it with '' for a top-level
	extension, which is what CPython reports."
	importlib
		___initModuleAttrsFrom___: (importlib
			___specFor___: moduleName
			origin: (pathString ifNil: ['built-in'])
			loader: nil
			locations: nil)
		on: moduleInstance.
	"Expose module-level constants (PyModule_AddIntConstant /
	AddStringConstant / AddObjectRef) as dynamic instVars so Python
	attribute reads (mymod.CONST) resolve through the
	___pyAttrLoad___ dynamic-instVar probe."
	(self current moduleAttrs: moduleName) keysAndValuesDo: [:k :v |
		moduleInstance dynamicInstVarAt: k put: v.
	].
	^ moduleInstance

]

{ #category : 'Grail-Management' }
CPythonShim class >> ___userActionActiveHere [
	"Is the running process on top of C frames -- inside a user action, an FFI
	call or an IntRecur -- where the VM refuses a process switch (``GsProcess
	switch not allowed while FFI, UserAction or IntRecur call is active'',
	uncontinuable)?  A Python generator started there cannot fork its body
	(PythonGenerator >> ___mustRunInline___).

	The VM's OWN test, read directly: it refuses the switch when the current
	stack's entry count is above 1 (intloopsup.c, IntLpSupProcessSwitch), and
	``System _vmStEntryCount'' answers that count.  The first two cuts kept a
	record of user actions instead: by depth alone, a user action an exception
	unwound past left an entry that made every later generator in the gem run
	inline; checked against the entering frame with ``GsProcess
	_frameContentsAt:'', it read every live entry as stale under native code
	(Linux x86_64, CI), where frames are not introspectable that way."

	^ System _vmStEntryCount > 1

]

{ #category : 'Grail-Loading' }
CPythonShim class >> builtinModuleNamed: aName [
	"Return the shim built-in module singleton for aName, or nil for any
	other name.  importlib resolves these lazily on first import, only when
	the shim is this session's backend."

	| sym |
	sym := aName asSymbol.
	(self builtinModuleNames includes: sym) ifFalse: [^ nil].
	^ (Python at: sym) ___instance___

]

{ #category : 'Grail-Loading' }
CPythonShim class >> builtinModuleNames [
	"Names of the shim's pure-Smalltalk stand-ins for CPython C extensions."

	^ #( #'_sre' #'_statistics' #'_bisect' #'_crc32c' #'_shimtest' )

]

{ #category : 'Grail-Instance Creation' }
CPythonShim class >> current [
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

]

{ #category : 'Grail-Loading' }
CPythonShim class >> ensureLoaded: aShim [
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
	"The fifth argument is THIS session's token, made once per session: the C
	side cannot otherwise tell a logout and re-login in one gem process from a
	re-init in the same session, and objects of the old session must not be
	reached (docs/Support_Pydantic.md, W8).  Time plus session id, so two
	sessions of one process never share it."
	System userAction: #shimInit withArgs: {
		aShim .
		(aShim wrap: None) memoryAddress .
		(aShim wrap: true) memoryAddress .
		(aShim wrap: false) memoryAddress .
		(SessionTemps current at: #'GrailShimSessionToken' ifAbsentPut: [
			((Time millisecondClockValue \\ 16r1000000000) * 1000) + (System session \\ 1000) + 1])
	}.
	aShim initTypeAddresses.

]

{ #category : 'Grail-Testing' }
CPythonShim class >> isActive [
	"Return true if the shim singleton has been initialized in this session."

	^ (SessionTemps current at: #CPythonShim ifAbsent: [nil]) notNil

]

{ #category : 'Grail-Testing' }
CPythonShim class >> isConfigured [
	"True if the shim was built at install time (SHIM_LIB_PATH set)."

	^ libraryPath notNil

]

{ #category : 'Grail-Testing' }
CPythonShim class >> isImportBackend [
	"True when the shim is configured and the embedded backend has not been
	selected for this gem (see EmbeddedExtensionModule>>isImportBackend)."

	^ self isConfigured and: [EmbeddedExtensionModule isImportBackend not]

]

{ #category : 'Grail-Configuration' }
CPythonShim class >> libraryPath [
	"Return the path to the shim user action library."

	libraryPath ifNil: [
		self error: 'CPythonShim library path not configured.'.
	].
	^ libraryPath

]

{ #category : 'Grail-Configuration' }
CPythonShim class >> libraryPath: aString [
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

]

{ #category : 'Grail-Dynamic Loading' }
CPythonShim class >> loadDynamicModule: moduleName fromPath: pathString [
	"Dynamically load a .so extension module.
	Creates a module subclass with compiled env:1 methods for each C function.
	Returns an instance of the new class.

	Each C function is exposed as a `_name:kw:` varargs method on the module
	class. Python call sites of the form `mymod.somefunc(args)` dispatch via
	the attribute-call varargs fast path (see CallAst >>
	attributeCallVarargsSelector)."

	| methodNames |
	self current.
	"An import C asked for does the load in C, inside the user action already
	in flight (GrailDynLoadRequest): handled, this does not return.  Signalled
	only while such an import is on the stack -- a Notification still reaches
	every broad handler, and SUnit's took it for a test error."
	((SessionTemps current at: #'GrailCImportDepth' otherwise: 0) > 0) ifTrue: [
		(GrailDynLoadRequest new moduleName: moduleName path: pathString) signal].
	"Depth-track like ___shimUserAction:withArgs: -- a dynamic module's
	init exec re-enters wrap: via server callbacks; a sweep mid-load
	could reap in-flight wrappers (see wrap:)."
	methodNames := self current ___duringCallDo: [
		System userAction: #shimDynLoad withArgs: { pathString . moduleName }].
	^ self ___buildDynamicModule: moduleName fromPath: pathString methodNames: methodNames

]

{ #category : 'Grail-Instance Creation' }
CPythonShim class >> reset [
	"Release the singleton for this session."

	SessionTemps current removeKey: #CPythonShim ifAbsent: [].

]

{ #category : 'Grail-Backend Selection' }
CPythonShim class >> useAsImportBackend [
	"Select the CPython shim as this session's import backend.  This is the
	default when the shim is configured, so it is only needed to override a
	prior #useAsImportBackend choice within the same gem."

	SessionTemps current at: #'grailImportBackend' put: #'shim'.

]

{ #category : 'Grail-Management' }
CPythonShim >> ___betweenShimCalls [
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
	recorded on the consumer's process would be meaningless.

	THIS GUARD IS BEST-EFFORT AND IS MEASURED TO FAIL.  Instrumenting the sweep
	over a CPython test.test_re run logged, repeatedly,

		GRAIL-SWEEP removed=3 mapSize=434 callDepth=-1 depth=59 entryDepth=51

	-- callDepth NEGATIVE with the stack deeper than the recorded entry, i.e. a
	call in flight.  The drift is self-inflicted: the repair below sets
	callDepth := 0, and the live call's own decrement then takes it to -1, after
	which the first line here answers true unconditionally for the rest of the
	session.  So NOTHING may depend on this guard for correctness.  What keeps a
	wrapper alive is its REFCOUNT: every raw PyObject* the C side retains past
	the call that produced it must be covered by a count, which is why
	PyList_Append increfs what it stores into a real-layout list (round 4 of
	docs/Shim_Foreign_Proxy_Misattribution.md)."

	(callDepth isNil or: [callDepth <= 0]) ifTrue: [^ true].
	shimEntryProcess isNil ifTrue: [^ false].
	shimEntryProcess == Processor activeProcess ifFalse: [^ false].
	System stackDepth <= shimEntryDepth ifTrue: [
		callDepth := 0.
		shimEntryProcess := nil.
		^ true].
	^ false

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___buildForeignExceptionClass: nameStr base: base pointer: ptrInt classMethods: cmNames [
	"type(<tail of nameStr>, (base,), ns): __module__ / __qualname__ split from
	the C tp_name the way CPython reports a type's, and a __getattr__ that
	forwards to the C instance each Grail instance carries (a Smalltalk block
	is an acceptable namespace function: it receives { self. name }).

	The __getattr__ serves INSTANCES only, so the C type's own class and static
	methods -- cmNames -- are put on the class as staticmethods that call them
	off the C type: ``ValidationError.from_exception_data'' was an
	AttributeError, and pydantic raises a frozen-model or validate_assignment
	error through it.  The C type binds a classmethod's cls itself, so no cls is
	passed.  A result that is the C side's instance of this very exception comes
	back as an instance of the Grail class, carrying it, exactly as a raised one
	does in ___translateShimError: -- so it can be raised, and caught as the
	class it is."

	| dot tail modName ns cls |
	dot := 0.
	nameStr size to: 1 by: -1 do: [:i | (dot = 0 and: [(nameStr at: i) == $.]) ifTrue: [dot := i]].
	tail := dot = 0 ifTrue: [nameStr] ifFalse: [nameStr copyFrom: dot + 1 to: nameStr size].
	modName := dot = 0 ifTrue: ['builtins'] ifFalse: [nameStr copyFrom: 1 to: dot - 1].
	ns := (Python at: #dict) new.
	ns @env1:__setitem__: '__module__' _: modName.
	ns @env1:__setitem__: '__qualname__' _: tail.
	ns @env1:__setitem__: '__getattr__' _: [:positional :kw | | fo |
		fo := (positional at: 1) dynamicInstVarAt: #'___grailForeign___'.
		fo isNil
			ifTrue: [(Python at: #AttributeError) @env1:___signal___:
				'''' , tail , ''' object has no attribute ''' , (positional at: 2) asString , '''']
			ifFalse: [fo @env1:___pyAttrLoad___: (positional at: 2) asString asSymbol]].
	(cmNames isNil or: [cmNames isEmpty]) ifFalse: [
		(cmNames subStrings: ' ') do: [:cm | | sel |
			sel := cm asSymbol.
			ns @env1:__setitem__: cm _: ((Python at: #staticmethod) @env1:__new__:
				[:positional :kw | | r |
					r := ((self foreignProxyForPointer: ptrInt typeName: nameStr)
						@env1:___pyAttrLoad___: sel) @env1:value: positional value: kw.
					((r isKindOf: ShimForeignObject) and: [cls notNil])
						ifTrue: [ | e |
							e := cls @env1:value: {
								[r @env1:__str__] on: AbstractException do: [:x | x return: '']
							} value: nil.
							e dynamicInstVarAt: #'___grailForeign___' put: r.
							e]
						ifFalse: [r]])]].
	cls := (Python at: #type) @env1:value: {
		tail.
		(Python at: #tuple) @env0:with: base.
		ns } value: nil.
	^ cls

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___buildSubtypeMirrorFor: aClass [
	"The C type of a Python class whose base is a wheel's own type --
	``class memmap(ndarray)'' -- as CPython's heap type for it is: a copy of
	the base's PyTypeObject, so every slot is the base's, with tp_base the
	base, tp_name the class's, HEAPTYPE, and one more word of tp_basicsize for
	the OOP of an instance's Grail half (none for a subclass of such a class,
	whose base already has it).  tp_alloc makes both halves together
	(PyType_AllocForeignSubclass:type:basicSize:), so numpy's own views and
	results of a subclass instance are instances too.  The mirror magic and the
	class OOP are where a type mirror keeps them, and the subtype marker in
	tp_subclasses tells the shim a body from a wrapper (docs/
	Shim_Foreign_Subclassing.md, option A)."

	| lay size baseAddr base m nameBytes basicSize mro |
	lay := self ___mirrorLayout.
	size := lay at: 1.
	baseAddr := aClass superclass == ShimForeignSubclass
		ifTrue: [(ShimForeignSubclass ___foreignBaseOf: aClass) cPtr]
		ifFalse: [(self typeObjectFor: aClass superclass) memoryAddress].
	base := CByteArray fromCPointer: (CPointer forAddress: baseAddr) numBytes: size.
	m := CByteArray gcMalloc: size.
	0 to: size - 8 by: 8 do: [:off | m int64At: off put: (base int64At: off)].
	m int64At: 0 put: 16r10000000.
	nameBytes := self ___cStringFor: (self ___mirrorNameFor: aClass).
	m int64At: (lay at: 2) put: nameBytes memoryAddress.
	basicSize := base int64At: (lay at: 3).
	(base int64At: (lay at: 13)) = (lay at: 16) ifFalse: [basicSize := basicSize + 8].
	m int64At: (lay at: 3) put: basicSize.
	m int64At: (lay at: 4) put: ((base int64At: (lay at: 4)) bitOr: ((1 bitShift: 9) bitOr: (1 bitShift: 10))).
	m int64At: (lay at: 5) put: baseAddr.
	m int64At: (lay at: 6) put: 16r524F5252494D4C47.
	self storeOop: aClass asOop in: m at: (lay at: 7).
	m int64At: (lay at: 11) put: (lay at: 14).
	m int64At: (lay at: 12) put: (lay at: 15).
	m int64At: (lay at: 13) put: (lay at: 16).
	m int64At: (lay at: 17) put: (lay at: 19).
	m int64At: (lay at: 18) put: (lay at: 20).
	mro := self ___mroTupleFor: m base: baseAddr.
	m int64At: (lay at: 21) put: mro memoryAddress.
	"The name's bytes and the MRO tuple must live as long as the mirror."
	(SessionTemps current
		at: #'GrailTypeMirrorNames'
		ifAbsentPut: [ IdentityKeyValueDictionary new ]) at: aClass put: { nameBytes. mro }.
	^ m

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___buildTypeMirrorFor: aClass [
	"A full-size PyTypeObject standing for aClass in C: metatype type, tp_name
	``module.qualname'' (what the shim's PyType_GetName/QualName/ModuleName
	split), tp_basicsize the wrapper's 32, tp_flags BASETYPE|READY|HEAPTYPE
	plus the subclass bits CPython would set from the MRO (so PyLong_Check,
	PyDict_Check, PyExceptionClass_Check... see a subclass of int / dict /
	BaseException as one), tp_base the type object of __base__ (recursively),
	and in tp_cache / tp_weaklist the mirror magic and aClass's OOP -- which is
	how the shim's pyobj_oop / is_type_mirror recognise it.  Zeroed first:
	gcMalloc memory is not."

	| lay m modName qual nameStr nameBytes base flags mro |
	lay := self ___mirrorLayout.
	m := CByteArray gcMalloc: (lay at: 1).
	0 to: (lay at: 1) - 8 by: 8 do: [:off | m int64At: off put: 0].
	m int64At: 0 put: 16r10000000.
	m int64At: 8 put: (typeAddresses at: #type).
	modName := [aClass @env1:___pyAttrLoad___: #'__module__'] on: AbstractException do: [:e | e return: nil].
	qual := [aClass @env1:___pyAttrLoad___: #'__qualname__'] on: AbstractException do: [:e | e return: nil].
	(qual isKindOf: CharacterCollection) ifFalse: [qual := aClass name asString].
	nameStr := ((modName isKindOf: CharacterCollection) and: [modName asString ~= 'builtins'])
		ifTrue: [modName asString , '.' , qual asString]
		ifFalse: [qual asString].
	nameBytes := self ___cStringFor: nameStr.
	m int64At: (lay at: 2) put: nameBytes memoryAddress.
	m int64At: (lay at: 3) put: 32.
	base := [aClass @env1:___pyAttrLoad___: #'__base__'] on: AbstractException do: [:e | e return: nil].
	(base isNil or: [base == None or: [base isBehavior not]]) ifTrue: [base := Object].
	"A METACLASS'S BASE IS ``type''.  Grail's Python metaclasses are Smalltalk
	metaclass subclasses, and their __base__ reads as one -- EnumType's is
	``PythonInstance class'', the rest of its __mro__ Object class, Class,
	Metaclass3, Module, Behavior -- where CPython's chain is (type, object).
	Mirroring that chain gave pydantic_core a tp_base no Python name answers
	for, and its getattr(enum, 'EnumMeta') failed on the way."
	(base isBehavior and: [base isMeta]) ifTrue: [
		base := Python at: #type otherwise: base.
		flags := 1 bitShift: 31].
	base == aClass ifFalse: [
		m int64At: (lay at: 5) put: (self typeObjectFor: base) memoryAddress].
	flags := (flags ifNil: [0]) bitOr:
		((1 bitShift: 9) bitOr: ((1 bitShift: 10) bitOr: (1 bitShift: 12))).
	mro := [aClass @env1:___pyAttrLoad___: #'__mro__'] on: AbstractException do: [:e | e return: #()].
	{ #int -> 24. #list -> 25. #tuple -> 26. #bytes -> 27. #str -> 28. #dict -> 29.
	  #BaseException -> 30. #type -> 31 } do: [:assoc | | c |
		c := Python at: assoc key otherwise: nil.
		(c notNil and: [mro includes: c]) ifTrue: [flags := flags bitOr: (1 bitShift: assoc value)]].
	m int64At: (lay at: 4) put: flags.
	"tp_iter / tp_iternext for a class that iterates or is an iterator, as
	CPython''s type slots have them: a wheel calls them INLINE -- Cython''s
	``next(it)'' is ``Py_TYPE(it)->tp_iternext(it)'', and numpy.random''s
	SeedSequence.generate_state answered NULL with no error on a Grail
	itertools.cycle.  Only a class that really defines the method: a
	tp_iternext is also what the inline PyIter_Check tests."
	(self ___classDefinesReal: #'__iter__' in: aClass) ifTrue: [
		m int64At: (lay at: 23) put: (lay at: 25)].
	(self ___classDefinesReal: #'__next__' in: aClass) ifTrue: [
		m int64At: (lay at: 24) put: (lay at: 26)].
	"tp_descr_get for a class whose instances bind -- a function, an
	UnboundMethod, a descriptor class: Cython binds a special method it looked
	up on the type through it (``with lock:'' in numpy.random)."
	(self ___classDefinesReal: #'__get__:_:' in: aClass) ifTrue: [
		m int64At: (lay at: 27) put: (lay at: 28)].
	"tp_as_number with nb_int / nb_float / nb_index for a class that converts,
	each only if the class defines it: cffi converts a non-int through an
	inline ``tp_as_number->nb_int'', and a NULL slot is its ''an integer is
	required''."
	self ___installNumberSlotsIn: m for: aClass layout: lay.
	"tp_new: the shim's trampoline into cls.__new__(cls) (PyType_GenericNew:)."
	m int64At: (lay at: 9) put: (lay at: 10).
	m int64At: (lay at: 6) put: 16r524F5252494D4C47.
	self storeOop: aClass asOop in: m at: (lay at: 7).
	"The name's C bytes must live as long as the mirror."
	(SessionTemps current
		at: #'GrailTypeMirrorNames'
		ifAbsentPut: [ IdentityKeyValueDictionary new ]) at: aClass put: nameBytes.
	^ m

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___cBufferHolding: aByteObject [
	"A gcMalloc'd copy of aByteObject's bytes with a NUL after them."

	| b |
	b := CByteArray gcMalloc: aByteObject size + 1.
	self ___copyBytesOf: aByteObject into: b.
	b uint8At: aByteObject size put: 0.
	^ b

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___classDefinesReal: aSelector in: aClass [
	"Does aClass define the env-1 method aSelector as its CPython type would
	have it -- not PythonInstance''s, nor a <grailProtocolRefusal> that exists
	only to raise (see object>>___hasOwnGetitem___)?"

	| defCls meth |
	aClass isBehavior ifFalse: [^ false].
	defCls := aClass whichClassIncludesSelector: aSelector environmentId: 1.
	(defCls isNil or: [defCls == PythonInstance]) ifTrue: [^ false].
	meth := defCls compiledMethodAt: aSelector environmentId: 1 otherwise: nil.
	^ (meth notNil and: [meth pragmas anySatisfy: [:p | p keyword == #grailProtocolRefusal]]) not

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___copyBytesOf: aByteObject into: aCByteArray [
	"Copy every byte, NULs included: copyBytesFrom:from:to:into: alone has C
	string semantics and refuses a zero byte (ArgumentError, ``code point zero
	in source data'')."

	aByteObject size > 0 ifTrue: [
		aCByteArray copyBytesFrom: aByteObject from: 1 to: aByteObject size
			into: 0 allowCodePointZero: true]

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___cStringFor: aString [
	"A NUL-terminated UTF-8 copy of aString in gcMalloc'd C memory."

	| utf b |
	utf := aString encodeAsUTF8.
	b := CByteArray gcMalloc: utf size + 1.
	1 to: utf size do: [:i | b uint8At: i - 1 put: (utf at: i)].
	b uint8At: utf size put: 0.
	^ b

]

{ #category : 'Grail-Management' }
CPythonShim >> ___duringCallDo: aBlock [
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

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___ellipsis [
	"Grail's Ellipsis, which the shim's pyobj_oop answers for C's Py_Ellipsis
	(asked once per session)."

	^ Python at: #Ellipsis

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___fillByteArrayBody: aBody from: anEntry [
	"Point a bytearray's PyByteArrayObject body at its bytes, anEntry being
	PyBytes_Buffer:''s { block. size. old blocks }: ob_size, ob_alloc (with
	the NUL), ob_bytes and ob_start.  Rewritten whenever the bytes are,
	since a resize moves them to a new block."

	| addr |
	addr := (anEntry at: 1) memoryAddress.
	aBody int64At: 16 put: (anEntry at: 2).
	aBody int64At: 24 put: (anEntry at: 2) + 1.
	aBody int64At: 32 put: addr.
	aBody int64At: 40 put: addr

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___functionObjectFor: aBoundMethod [
	"C's builtin_function_or_method for aBoundMethod, as a CByteArray, when it
	is a function of a dynamically loaded C module; nil for any other
	BoundMethod, which crosses as an ordinary wrapper.

	Such a module's functions are methods of its module class
	(loadDynamicModule:fromPath:), so ``mod.f'' is a BoundMethod, and C code
	that checks the type of what it is handed refused it: numpy's
	add_docstring writes a module function's ml_doc only when
	``Py_TYPE(obj) == &PyCFunction_Type'', and ``import numpy'' stopped at
	the first one (_core/overrides.py).

	The class answers ___shimModuleName___, compiled on it by
	loadDynamicModule:fromPath: and tested by includesSelector: so that only
	that class qualifies.  The C name is the selector up to its first colon:
	``mod.f'' reads as #f, a call site's forwarder is #f: or #f:_:, and the
	varargs form is #_f:kw:."

	| rcvClass sel name addr |
	rcvClass := aBoundMethod receiver class.
	(rcvClass class includesSelector: #'___shimModuleName___') ifFalse: [^ nil].
	sel := aBoundMethod selector.
	sel isNil ifTrue: [^ nil].
	name := sel asString.
	(name includes: $:) ifTrue: [
		((name endsWith: ':kw:') and: [(name at: 1) == $_])
			ifTrue: [name := name copyFrom: 2 to: (name indexOf: $:) - 1]
			ifFalse: [name := name copyFrom: 1 to: (name indexOf: $:) - 1]].
	addr := self ___duringCallDo: [
		System userAction: #shimFunctionObject
			withArgs: { rcvClass ___shimModuleName___ . name }].
	addr isNil ifTrue: [^ nil].
	"Kept for the way back (foreignProxyForPointer:typeName:ops:): the first
	BoundMethod to cross for each C function object stands for it."
	(SessionTemps current at: #'GrailFunctionObjects' ifAbsentPut: [IntegerKeyValueDictionary new])
		at: addr ifAbsentPut: [aBoundMethod].
	^ CByteArray fromCPointer: (CPointer forAddress: addr) numBytes: 64

]

{ #category : 'Grail-Calling' }
CPythonShim >> ___guardCallback: aBlock [
	"Run aBlock -- a server method's work on behalf of C -- so that a PYTHON
	exception it raises becomes C's pending error instead of searching Grail's
	handlers.

	The block runs INSIDE a user action's callback.  An outer Python
	``except'' that matches the exception lies below the user-action frame;
	Smalltalk would run it on top of the live C frames, the unwind across them
	is refused, and it re-signals until the session dies.  With no matching
	handler the exception escapes the extension altogether: pydantic_core
	never saw a validator's ValueError, so instead of a ValidationError the
	script died with UncontinuableError (docs/Support_Pydantic.md, Phase 5).
	Caught HERE, above the user-action frame, ``return:'' is legal.  The
	exception is recorded and the shim's flag set through a view of it; the
	shim's check_gci_error(), run after every GciPerform, takes it
	(___takeCallbackError).  Only Python exceptions: a Smalltalk error keeps the
	existing path, which GciPerform traps.  nil is the block's answer on error;
	C does not use it, the flag having told it to fail."

	^ aBlock on: BaseException ___catchAll___ do: [:ex |
		SessionTemps current at: #'GrailShimCallbackException' put: (BaseException ___payloadOf___: ex).
		(typeAddresses at: #'___cbErrorFlag___' otherwise: nil)
			ifNotNil: [:flag | flag int32At: 0 put: 1].
		ex return: nil]

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___installNumberSlotsIn: aMirror for: aClass layout: lay [
	"Give aMirror a PyNumberMethods whose nb_int / nb_float / nb_index are the
	shim's PyNumber_Long / Float / Index -- each only where aClass defines
	__int__ / __float__ / __index__, so a wheel testing the slot for NULL
	sees what CPython's type would show it.  None defined: no table at all.
	The table lives as long as the mirror."

	| slots table |
	slots := { #'__int__' -> 31. #'__float__' -> 32. #'__index__' -> 33 }
		select: [:assoc | self ___classDefinesReal: assoc key in: aClass].
	slots isEmpty ifTrue: [^ self].
	table := CByteArray gcMalloc: (lay at: 30).
	0 to: (lay at: 30) - 8 by: 8 do: [:off | table int64At: off put: 0].
	slots do: [:assoc |
		table int64At: (lay at: assoc value) put: (lay at: assoc value + 3)].
	aMirror int64At: (lay at: 29) put: table memoryAddress.
	(SessionTemps current
		at: #'GrailTypeMirrorNumberTables'
		ifAbsentPut: [ IdentityKeyValueDictionary new ]) at: aClass put: table

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___makeErrorWithText: aString [
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

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___mirrorLayout [
	"{ size. tp_name. tp_basicsize. tp_flags. tp_base. tp_cache. tp_weaklist.
	tp_doc. tp_new } -- PyTypeObject offsets, from the shim
	(shimTypeMirrorLayout) -- and then the mirror tp_new's address."

	^ typeAddresses at: #'___mirrorLayout___'

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___mirrorNameFor: aClass [
	"The class's __name__ -- a mirror's tp_name, bare as a CPython heap
	type's is (``'%s' % Py_TYPE(self)->tp_name'' reads 'Sub', not
	'__main__.Sub').  The shim's PyType_GetQualName / GetModuleName ask the
	class for the rest."

	| name |
	name := [aClass @env1:___pyAttrLoad___: #'__name__'] on: AbstractException do: [:e | e return: nil].
	^ (name isKindOf: CharacterCollection)
		ifTrue: [name asString]
		ifFalse: [aClass name asString]

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___mroTupleFor: aMirror base: baseAddr [
	"A subtype mirror's tp_mro: a tuple in CPython's layout -- refcount,
	PyTuple_Type, size, the 3.14 hash cache, then the items inline -- holding
	the mirror and each type along its tp_base chain.  numpy reads it inline
	for a subclass of one of its scalar types (_descr_from_subtype takes item
	1), and the shim's PyType_Ready computes no tp_mro, so the copy of the
	base's was NULL and np.dtype(F) for ``class F(np.float64)'' crashed the
	gem."

	| lay size chain addr t |
	lay := self ___mirrorLayout.
	size := lay at: 1.
	chain := OrderedCollection with: aMirror memoryAddress.
	addr := baseAddr.
	[addr ~= 0] whileTrue: [
		chain add: addr.
		addr := (CByteArray fromCPointer: (CPointer forAddress: addr) numBytes: size)
			int64At: (lay at: 5)].
	t := CByteArray gcMalloc: 32 + (8 * chain size).
	t int64At: 0 put: 16r10000000.
	t int64At: 8 put: (lay at: 22).
	t int64At: 16 put: chain size.
	t int64At: 24 put: -1.
	chain doWithIndex: [:a :i | t int64At: 24 + (8 * i) put: a].
	^ t

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___nativeTypeAddrFor: aValue [
	"The C type of an object none of typeAddrFor:'s cases claims: its class's
	MIRROR when Python's type() of it IS that class, as it is for Grail's
	natively implemented types -- datetime.date is PyDate, a plain Smalltalk
	class -- and object's otherwise.

	Before, every such value crossed typed as ``object'', so C's
	Py_TYPE(date) was not the type datetime.date crossed as and
	PyObject_TypeCheck failed: pydantic_core's date validator refused a real
	date with ``input_type=object'', and the date it built itself with ``'object'
	object is not an instance of 'date'''.  A value whose Python type is some
	OTHER class (a function is a BoundMethod or a block underneath) keeps
	object's, as before.

	Decided once per class, since wrap: is the hot path; session state, like
	the mirrors themselves.  No ^ inside a block: this runs inside a user
	action (see typeAddrFor:)."

	| cache cls addr pyType |
	cls := aValue class.
	cache := SessionTemps current
		at: #'GrailShimNativeTypeAddrs'
		ifAbsentPut: [ IdentityKeyValueDictionary new ].
	addr := cache at: cls otherwise: nil.
	addr notNil ifTrue: [^ addr].
	addr := typeAddresses at: Object ifAbsent: [0].
	(cls ~~ Object and: [typeAddresses includesKey: #'___mirrorLayout___']) ifTrue: [
		pyType := [(builtins @env1:instance) @env1:type: aValue]
			on: AbstractException do: [:e | e return: nil].
		pyType == cls ifTrue: [
			addr := [(self typeObjectFor: cls) memoryAddress]
				on: AbstractException do: [:e | e return: addr]]].
	cache at: cls put: addr.
	^ addr

]

{ #category : 'Grail-Calling' }
CPythonShim >> ___noteCallbackExceptionInstance: anObject [
	"C made a Grail exception OBJECT its pending error (PyErr_SetObject /
	PyErr_Restore with an instance): keep it as ___guardCallback: keeps a
	callback's, so if C hands the error back unhandled it is raised as itself.
	False for anything that is not an exception instance."

	(anObject isKindOf: BaseException) ifFalse: [^ false].
	SessionTemps current at: #'GrailShimCallbackExceptionTaken' put: anObject.
	^ true

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___noteForeignException: instPtr type: typePtr typeName: nameStr [
	"Called by the shim's check_and_raise_error just before it raises the text
	of an error whose indicator holds a wheel's exception INSTANCE: remember it,
	so ___translateShimError: raises a Grail exception built around it rather
	than a bare one of the base class the text names.  Session state, consumed
	by the very next translation."

	SessionTemps current at: #'GrailShimPendingForeignException'
		put: { instPtr. typePtr. nameStr }

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___noteRealTuple: aTuple origin: ptrInt [
	"Remember that aTuple is the Grail copy of the real-layout tuple at ptrInt,
	so that wrap: hands C that original back.

	A prebuilt wheel reads tuples with CPython's inline macros
	(PyTuple_GET_ITEM is a load at a fixed offset), so a tuple it built has to
	come back in that layout.  It used to come back as a 32-byte wrapper:
	numpy stores (DTypes, ArrayMethod) tuples in each ufunc's _loops dict,
	reads one back with PyDict_GetItemRef and then PyTuple_GET_ITEM(info, 1)
	-- which read past the wrapper and found NULL, so numpy's ufunc setup
	(InitOperators -> get_info_no_cast) failed with no exception set.

	Tuples only: they are immutable, so the original is always an accurate
	answer.  The shim never frees a real-layout object (_Py_Dealloc is a
	no-op), so the pointer stays valid.  Session-scoped like the foreign-proxy
	map, and it holds each bridged tuple for the session."

	(SessionTemps current
		at: #'GrailRealTupleOrigins'
		ifAbsentPut: [IdentityKeyValueDictionary new])
			at: aTuple put: ptrInt.
	^ 0

]

{ #category : 'Grail-Calling' }
CPythonShim >> ___noteReraiseCallbackException [
	"C is raising, unhandled, an error that came from a Grail callback: have
	___translateShimError: raise the original exception object."

	| ex |
	ex := SessionTemps current at: #'GrailShimCallbackExceptionTaken' otherwise: nil.
	ex notNil ifTrue: [
		SessionTemps current at: #'GrailShimPendingReraise' put: ex]

]

{ #category : 'Grail-Management' }
CPythonShim >> ___noteShimEntry [
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

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___notImplemented [
	"Grail's NotImplemented, which the shim's pyobj_oop answers for C's
	Py_NotImplemented (asked once per session)."

	^ Python at: #NotImplemented

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___pendingDynLoad [
	"{ path. moduleName } of the load PyImport_ImportModuleLevel:... handed
	back to C, taken once."

	^ SessionTemps current removeKey: #'GrailPendingDynLoad' ifAbsent: [nil]

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___prefixBlock: bodySize for: aValue [
	"{ block. body } for a prefixed wrapper of aValue: a zeroed gcMalloc block
	of 16 + bodySize bytes, the prefix -- GRAILPX1 and aValue''s OOP -- written,
	the body''s refcount 1, and a view of the body.  The block is kept in
	#GrailShimWrapperBlocks under aValue until the wrapper is swept."

	| block body |
	block := CByteArray gcMalloc: 16 + bodySize.
	block int64At: 0 put: 16r475241494C505831.
	self storeOop: aValue asOop in: block at: 8.
	body := CByteArray fromCPointer: (CPointer forAddress: block memoryAddress + 16) numBytes: bodySize.
	body int64At: 0 put: 1.
	(SessionTemps current at: #'GrailShimWrapperBlocks' ifAbsentPut: [IdentityKeyValueDictionary new])
		at: aValue put: block.
	^ { block. body }

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___prefixedWrapperFor: aValue [
	"An exact int, str, bytes, complex or slice, or a bytearray, in CPython 3.14''s OWN layout, or nil for
	anything else.  A Cython module reads both INLINE -- an int''s lv_tag and digits, a
	str''s length, hash, state and data -- and a 32-byte wrapper keeps the OOP
	at offset 16, which Cython read as an int''s sign (every SmallInteger came
	out negative) and a str''s length.

	The OOP goes in a hidden PREFIX, [magic][oop] in the 16 bytes BEFORE the
	object, as CPython hides its PyGC_Head (docs/Shim_Object_Model.md, section
	2); the C side recognises it by ob_type first (has_grail_prefix in
	cpython.cc), so it never reads in front of a wheel''s own object.  One
	gcMalloc block holds prefix and body; what the wrapper map holds is a VIEW
	of the body, whose memoryAddress is the PyObject* -- so every caller''s
	(self wrap: x) memoryAddress is unchanged -- and the block itself is kept
	in #GrailShimWrapperBlocks, swept with the wrapper."

	| block body size |
	((aValue class == SmallInteger) or: [aValue class == LargeInteger]) ifTrue: [
		| mag digits |
		mag := aValue abs.
		digits := OrderedCollection new.
		[mag > 0] whileTrue: [
			digits add: (mag bitAnd: 16r3FFFFFFF).
			mag := mag bitShift: -30].
		size := 24 + (4 * (digits size max: 1)).
		size := size + 7 // 8 * 8.
		block := self ___prefixBlock: size for: aValue.
		body := block at: 2.
		body int64At: 8 put: (typeAddresses at: #int).
		body int64At: 16 put: (aValue = 0
			ifTrue: [1]
			ifFalse: [(digits size bitShift: 3) + (aValue < 0 ifTrue: [2] ifFalse: [0])]).
		digits doWithIndex: [:d :i | body uint32At: 20 + (4 * i) put: d].
		^ body].
	((aValue isKindOf: CharacterCollection)
			and: [(aValue isKindOf: AbstractPyStr) not
			and: [(self typeAddrFor: aValue) = (typeAddresses at: #str ifAbsent: [nil])]]) ifTrue: [
		| u n kind ascii hdr |
		u := aValue class == Unicode7 ifTrue: [aValue] ifFalse: [aValue asUnicodeString].
		n := u size.
		ascii := u class == Unicode7.
		kind := ascii
			ifTrue: [1]
			ifFalse: [u class == Unicode32
				ifTrue: [4]
				ifFalse: [(u detect: [:c | c codePoint > 255] ifNone: [nil]) isNil
					ifTrue: [1] ifFalse: [2]]].
		hdr := ascii ifTrue: [40] ifFalse: [56].
		size := hdr + (n + 1 * kind).
		size := size + 7 // 8 * 8.
		block := self ___prefixBlock: size for: aValue.
		body := block at: 2.
		body int64At: 8 put: (typeAddresses at: #str).
		body int64At: 16 put: n.
		body int64At: 24 put: -1.
		body uint32At: 32 put: ((kind bitShift: 2) bitOr: (16r20 bitOr: (ascii ifTrue: [16r40] ifFalse: [0]))).
		kind = 1
			ifTrue: [
				ascii
					ifTrue: [n > 0 ifTrue: [body copyBytesFrom: u from: 1 to: n into: hdr allowCodePointZero: true]]
					ifFalse: [1 to: n do: [:i | body uint8At: hdr + i - 1 put: (u at: i) codePoint]]]
			ifFalse: [kind = 2
				ifTrue: [1 to: n do: [:i | body uint16At: hdr + (2 * (i - 1)) put: (u at: i) codePoint]]
				ifFalse: [1 to: n do: [:i | body uint32At: hdr + (4 * (i - 1)) put: (u at: i) codePoint]]].
		^ body].
	"bytes, not bytearray, whose contents can change after they crossed:
	[ob_size@16][ob_shash@24][data@32], NUL-terminated."
	((aValue isKindOf: ByteArray)
			and: [(aValue isKindOf: (Python at: #bytearray)) not
			and: [(self typeAddrFor: aValue) = (typeAddresses at: #bytes ifAbsent: [nil])]]) ifTrue: [
		| n |
		n := aValue size.
		size := 32 + n + 1.
		size := size + 7 // 8 * 8.
		block := self ___prefixBlock: size for: aValue.
		body := block at: 2.
		body int64At: 8 put: (typeAddresses at: #bytes).
		body int64At: 16 put: n.
		body int64At: 24 put: -1.
		n > 0 ifTrue: [body copyBytesFrom: aValue from: 1 to: n into: 32 allowCodePointZero: true].
		^ body].
	"An exact complex: [cval.real@16][cval.imag@24], as numpy reads it
	(PyComplexObject)."
	(aValue class == (Python at: #complex otherwise: nil)
			and: [(typeAddresses at: #complex otherwise: 0) ~= 0]) ifTrue: [
		block := self ___prefixBlock: 32 for: aValue.
		body := block at: 2.
		body int64At: 8 put: (typeAddresses at: #complex).
		body doubleAt: 16 put: (aValue dynamicInstVarAt: #real) asFloat.
		body doubleAt: 24 put: (aValue dynamicInstVarAt: #imag) asFloat.
		^ body].
	"An exact slice: [start@16][stop@24][step@32], each a PyObject*
	(PySliceObject).  cffi reads a cdata slice's bounds inline
	(_cdata_getslicearg), and read this OOP and the wrapper magic as them.
	The slice takes a reference to each, as CPython's does, so none is swept
	while the slice is live.  A sweep of the slice does not give them back
	(the sweep knows only the map), so its bounds' wrappers stay for the
	session."
	(aValue class == (Python at: #slice otherwise: nil)
			and: [typeAddresses notNil
			and: [(typeAddresses at: #slice otherwise: 0) ~= 0]]) ifTrue: [
		| fields |
		fields := { aValue @env1:start. aValue @env1:stop. aValue @env1:step }
			collect: [:each | | w |
				w := self wrap: each.
				w int64At: 0 put: (w int64At: 0) + 1.
				w memoryAddress].
		block := self ___prefixBlock: 40 for: aValue.
		body := block at: 2.
		body int64At: 8 put: (typeAddresses at: #slice).
		fields doWithIndex: [:addr :i | body int64At: 8 + (8 * i) put: addr].
		^ body].
	"A bytearray: [ob_size@16][ob_alloc@24][ob_bytes@32][ob_start@40]
	[ob_exports@48] (PyByteArrayObject), its bytes the copy PyBytes_Buffer:
	keeps -- refreshed whenever it crosses again (wrap:) or C asks for them,
	so a change made on either side after that is not seen by the other, as
	before.  cffi reads both fields inline, and when a bytearray crossed typed
	bytes, its PyBytes_GET_SIZE read the OOP as the length."
	(((Python at: #bytearray otherwise: nil) ifNil: [false] ifNotNil: [:ba | aValue isKindOf: ba])
			and: [typeAddresses notNil
			and: [(typeAddresses at: #bytearray otherwise: 0) ~= 0]]) ifTrue: [
		block := self ___prefixBlock: 56 for: aValue.
		body := block at: 2.
		body int64At: 8 put: (typeAddresses at: #bytearray).
		self PyBytes_Buffer: aValue.
		self ___fillByteArrayBody: body from: (self ___wrapperBuffers at: aValue).
		^ body].
	^ nil

]

{ #category : 'Grail-Calling' }
CPythonShim >> ___pythonNameForSmalltalkErrorNamed: aName [
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___removeModule: modules named: aName [
	"sys.modules without aName, after an extension load C did itself failed
	(the shim's _grail_import_level), as CPython removes a failed load."

	^ [modules @env0:removeKey: aName asString ifAbsent: [nil]. true]
		on: Error do: [:e | e return: false]

]

{ #category : 'Grail-Calling' }
CPythonShim >> ___shimErrorTextFor: anException [
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

]

{ #category : 'Grail-Calling' }
CPythonShim >> ___shimUserAction: selector withArgs: argsArray [
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___sliceIndex: anObject [
	"CPython's _PyEval_SliceIndex: nil for None, else the object's __index__
	clamped to a Py_ssize_t.  A bound was handed to C as it stood, and C read
	it with GciOopToI64, so a numpy integer -- ``a[i:i + np.int64(3)]'', which
	np.load's chunk loop does -- died with an uncatchable ArgumentError 2163."

	| n |
	anObject == None ifTrue: [^ nil].
	(anObject isKindOf: SmallInteger) ifTrue: [^ anObject].
	n := (anObject isKindOf: Integer)
		ifTrue: [anObject]
		ifFalse: [
			(((builtins @env1:instance) @env1:hasattr: anObject _: '__index__') @env1:___isTruthy___) ifFalse: [
				(Python at: #TypeError) @env1:___signal___:
					'slice indices must be integers or None or have an __index__ method'].
			anObject @env1:__index__].
	^ (n max: -9223372036854775808) min: 9223372036854775807

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___staticExceptionNames [
	"The exception types the shim defines statically (cpython.cc), by name."

	^ #('BaseException' 'Exception' 'ValueError' 'TypeError' 'AttributeError'
		'KeyError' 'IndexError' 'LookupError' 'OverflowError' 'ZeroDivisionError'
		'ArithmeticError' 'RuntimeError' 'RecursionError' 'NotImplementedError'
		'MemoryError' 'StopIteration' 'StopAsyncIteration' 'SystemError' 'OSError'
		'ImportError' 'NameError' 'BufferError' 'EOFError' 'KeyboardInterrupt'
		'UnicodeError' 'UnicodeDecodeError' 'UnicodeEncodeError' 'AssertionError'
		'BaseExceptionGroup' 'DeprecationWarning' 'FutureWarning' 'RuntimeWarning'
		'UserWarning' 'GeneratorExit' 'UnboundLocalError')

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___staticTypeObjectFor: aClass [
	"A CByteArray over the shim's static C type for a builtin class, or nil.
	No ^ inside the blocks: this runs nested in user actions (typeAddrFor:)."

	| addr |
	#(#float #int #bool #str #bytes #list #dict #tuple #object #type #NoneType
		#set #frozenset #complex) do: [:n |
		(addr isNil and: [(Python at: n otherwise: nil) == aClass])
			ifTrue: [addr := typeAddresses at: n otherwise: nil]].
	addr isNil ifTrue: [
		(Python at: aClass name otherwise: nil) == aClass ifTrue: [
			addr := typeAddresses at: ('exc:' , aClass name) asSymbol otherwise: nil]].
	addr isNil ifTrue: [^ nil].
	^ CByteArray fromCPointer: (CPointer forAddress: addr) numBytes: (self ___mirrorLayout at: 1)

]

{ #category : 'Grail-Calling' }
CPythonShim >> ___takeCallbackError [
	"{ Python name of the nearest shim exception type. message. the C instance
	of a wheel's own exception it carries, or 0. the C type object of its own
	class, or 0 } for the exception
	___guardCallback: recorded -- the shim's take_callback_error installs it as
	C's pending error.  The exception itself is kept, should C hand the error
	back unhandled (___noteReraiseCallbackException)."

	| ex base cls text fo ptr typ |
	ex := SessionTemps current at: #'GrailShimCallbackException' otherwise: nil.
	SessionTemps current removeKey: #'GrailShimCallbackException' ifAbsent: [nil].
	ex isNil ifTrue: [^ { 'RuntimeError'. 'a Grail callback raised'. 0 }].
	SessionTemps current at: #'GrailShimCallbackExceptionTaken' put: ex.
	cls := ex class.
	[base isNil and: [cls notNil]] whileTrue: [
		((self ___staticExceptionNames includes: cls name asString)
				and: [(Python at: cls name otherwise: nil) == cls])
			ifTrue: [base := cls name asString]
			ifFalse: [cls := cls superclass]].
	text := [(ex @env1:__str__) asString] on: Error do: [:e | e return: ''].
	fo := [ex dynamicInstVarAt: #'___grailForeign___'] on: Error do: [:e | e return: nil].
	ptr := (fo isKindOf: ShimForeignObject) ifTrue: [fo cPtr] ifFalse: [0].
	"The exception's OWN class as C sees it -- a builtin's static type, any
	other class's type mirror -- so C can match it.  The nearest builtin alone
	made ``decimal.InvalidOperation'' an ArithmeticError: pydantic_core's
	decimal validator, which catches InvalidOperation to report
	decimal_parsing, let ``Decimal('five')'''s escape instead."
	typ := [(self typeObjectFor: ex class) memoryAddress] on: Error do: [:e | e return: 0].
	^ { base ifNil: ['Exception']. text. ptr. typ }

]

{ #category : 'Grail-Calling' }
CPythonShim >> ___translateShimError: ex [
	"Parse ``<ExcName>: <message>'' out of a raw shim Error's messageText
	and re-signal the matching Grail Python exception (looked up in the
	Python namespace and verified to be a BaseException subclass).  If the
	text has no recognizable exception-name prefix, re-raise unchanged."

	| text idx name cls baseExc msg pending reraise |
	"An exception that came FROM a Grail callback and that C handed back
	unhandled is raised again as itself (___guardCallback:)."
	reraise := SessionTemps current at: #'GrailShimPendingReraise' otherwise: nil.
	reraise notNil ifTrue: [
		SessionTemps current removeKey: #'GrailShimPendingReraise'.
		SessionTemps current removeKey: #'GrailShimPendingForeignException' ifAbsent: [nil].
		^ BaseException @env1:___pyRaise___: reraise].
	"A wheel's own exception object behind the error (noted by the shim just
	before it raised): raise the Grail exception built around it -- the class
	foreignExceptionTypeForPointer: gives its C type, carrying the C instance
	for __getattr__ to forward to."
	pending := SessionTemps current at: #'GrailShimPendingForeignException' otherwise: nil.
	pending notNil ifTrue: [
		| fcls e ftext fidx |
		SessionTemps current removeKey: #'GrailShimPendingForeignException'.
		ftext := ex messageText ifNil: [''].
		fidx := ftext indexOf: $:.
		msg := fidx = 0 ifTrue: [ftext] ifFalse: [ftext copyFrom: fidx + 1 to: ftext size].
		(msg size > 0 and: [msg first == $ ]) ifTrue: [msg := msg copyFrom: 2 to: msg size].
		fcls := self foreignExceptionTypeForPointer: (pending at: 2)
			typeName: (pending at: 3)
			baseName: (fidx = 0 ifTrue: ['Exception'] ifFalse: [ftext copyFrom: 1 to: fidx - 1])
			isShimType: false.
		e := fcls @env1:value: { msg } value: nil.
		e dynamicInstVarAt: #'___grailForeign___'
			put: (self foreignProxyForPointer: (pending at: 1) typeName: (pending at: 3)).
		^ BaseException @env1:___pyRaise___: e].
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

]

{ #category : 'Grail-C API - ContextVar' }
CPythonShim >> ___ug_PyContextVar_Get: aVar default: aDefault [

	| getter posArgs |
	getter := aVar @env1:___pyAttrLoad___: #'get'.
	posArgs := aDefault == nil ifTrue: [{}] ifFalse: [{ aDefault }].
	^ (self wrap: (getter perform: #'value:value:' env: 1
		withArguments: { posArgs . nil })) memoryAddress

]

{ #category : 'Grail-C API - ContextVar' }
CPythonShim >> ___ug_PyContextVar_New: aName default: aDefault [
	"ContextVar(name, *, default=...): the default is KEYWORD-only, as in
	CPython.  It was passed positionally, which matched an older Grail
	ContextVar and is a TypeError against this one."

	| cvModule cvClass kwargs |
	cvModule := ((Python at: #importlib) ___instance___) @env1:import_module: 'contextvars'.
	cvClass := cvModule @env1:___pyAttrLoad___: #'ContextVar'.
	kwargs := aDefault == nil
		ifTrue: [nil]
		ifFalse: [dict @env1:___new___ at: 'default' put: aDefault; yourself].
	"Instantiate via the class-call entry ``value:value:'' (positional
	array + kwargs); a Grail Python class is not callable through
	___pyCallValue___:kw:."
	^ (self wrap: (cvClass perform: #'value:value:' env: 1
		withArguments: { { aName } . kwargs })) memoryAddress

]

{ #category : 'Grail-C API - ContextVar' }
CPythonShim >> ___ug_PyContextVar_Set: aVar value: aValue [

	| setter |
	setter := aVar @env1:___pyAttrLoad___: #'set'.
	^ (self wrap: (setter perform: #'value:value:' env: 1
		withArguments: { { aValue } . nil })) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyDict_GetItem: aDictionary key: aKey [
	(aDictionary includesKey: aKey) ifFalse: [ ^ 0 ].
	^ (self wrap: (aDictionary at: aKey)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyIter_Next: anIterator [
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_Call: callable args: argsArray [
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_Call: callable args: argsArray kwargs: kwDict [
	"PyObject_Call:args: with keywords.  C used to drop them for a
	Grail-backed callable -- f(x, key=v) from C ran as f(x)."

	| args result |
	args := argsArray ifNil: [ Array new ].
	(args class == Array) ifFalse: [ args := Array withAll: args ].
	result := callable perform: #'___pyCallValue___:kw:' env: 1 withArguments: { args . kwDict }.
	^ (self wrap: result) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_GenericSetAttr: obj name: aName value: aValueOrNil [
	"object.__setattr__(obj, name, value) -- or object.__delattr__ when the
	value is nil -- run NON-virtually, so a class's own __setattr__ is bypassed
	exactly as a C caller of the generic slot expects (pydantic_core's
	force_setattr, past BaseModel.__setattr__)."

	| n |
	n := aName asString.
	aValueOrNil isNil ifTrue: [
		^ obj @env0:with: n
			performMethod: (object @env0:compiledMethodAt: #'__delattr__:' environmentId: 1)].
	^ obj @env0:with: n with: aValueOrNil
		performMethod: (object @env0:compiledMethodAt: #'__setattr__:_:' environmentId: 1)

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_GetAttrString: obj name: nameString [
	"Use Grail's Python attribute protocol (___pyAttrLoad___:), not a direct
	env-1 send.  A direct ``obj perform: #name'' DNUs for module-style
	attributes (e.g. math.floor) — and inside an extension's PyInit user
	action that DNU surfaces as ERR_EXC_RETURN_DISALLOWED (2758) rather than
	a recoverable AttributeError.  ___pyAttrLoad___: returns the bound
	method / value the way Python attribute access should."
	^ (self wrap: (obj perform: #'___pyAttrLoad___:' env: 1 withArguments: { nameString asSymbol }))
		memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_GetItem: obj key: aKey [
	"obj[key] via __getitem__. A missing key raises (KeyError/IndexError)
	in env 1, which surfaces as a GCI error the C side converts."

	^ (self wrap: (obj perform: #'__getitem__:' env: 1 withArguments: { aKey })) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_GetIter: obj [
	"iter(obj) via __iter__."

	^ (self wrap: (obj @env1:__iter__)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_IsInstance: obj cls: aClassOrTuple [
	"isinstance(obj, cls), for the shim's PyObject_IsInstance when the C type
	chain cannot answer it."

	^ ((builtins @env1:instance) @env1:isinstance: obj _: aClassOrTuple) @env1:___isTruthy___

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_IsSubclass: aClass cls: aClassOrTuple [
	"issubclass(aClass, cls), for the shim's PyObject_IsSubclass."

	^ ((builtins @env1:instance) @env1:issubclass: aClass _: aClassOrTuple) @env1:___isTruthy___

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_Length: obj [
	"Python's len(), not a bare __len__ send: an object with none -- a wheel's
	own iterator, which pydantic_core asks for a length hint while serialising
	an ``Iterable[Model]'' -- is CPython's TypeError, which the guard makes
	C's error.  The bare send was an uncatchable MessageNotUnderstood inside
	the callback."

	^ (builtins @env0:___instance___) @env1:len: obj

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_Repr: obj [
	^ (self wrap: (obj @env1:__repr__)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_RichCompare: v with: w op: opInt [
	"Like PyObject_RichCompareBool but returns the wrapped result object
	(normally a Boolean, but a dunder may return any object).  The operator
	helpers, for the same reason as there."

	| selectors selector |
	selectors := #(#'___cmpLt___:' #'___cmpLe___:' #'___cmpEq___:' #'___cmpNe___:' #'___cmpGt___:' #'___cmpGe___:').
	selector := selectors at: opInt + 1.
	^ (self wrap: (v perform: selector env: 1 withArguments: { w })) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_RichCompareBool: v with: w op: opInt [
	"Rich comparison with Python's OPERATOR semantics.  op: 0=LT, 1=LE, 2=EQ,
	3=NE, 4=GT, 5=GE.

	Through object's ___cmpXx___: helpers -- what ``a == b'' compiles to --
	not the bare dunder.  The dunder may answer NotImplemented, which C then
	read as TRUE: ``'z'.__eq__(None)'' is NotImplemented, so pydantic_core's
	exclude_defaults took a str field set to 'z' for its default None and
	dropped it.  The helpers try the reflected operand and fall back to
	identity, as CPython's PyObject_RichCompare does."

	| selectors selector |
	selectors := #(#'___cmpLt___:' #'___cmpLe___:' #'___cmpEq___:' #'___cmpNe___:' #'___cmpGt___:' #'___cmpGe___:').
	selector := selectors at: opInt + 1.
	^ v perform: selector env: 1 withArguments: { w }

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_SetAttrString: obj name: nameString value: aValue [
	"setattr(obj, name, value), through the builtin, so a __setattr__
	override intercepts and a NEW attribute is stored.  This used to send the
	env-1 setter ``name:'', which exists only for an attribute the class
	declares: on anything else it was taken for a call of a method ``name''
	and raised AttributeError.  numpy's finfo fills an empty instance this way
	(_populate_finfo_constants), and np.polyfit needs it."

	(builtins @env1:instance) @env1:setattr: obj _: nameString _: aValue.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_SetItem: obj key: aKey value: aValue [
	"obj[key] = value via __setitem__."

	obj perform: #'__setitem__:_:' env: 1 withArguments: { aKey . aValue }.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> ___ug_PyObject_Str: obj [
	^ (self wrap: (obj @env1:__str__)) memoryAddress

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> ___wrapperBuffers [
	"The C buffers that live as long as a WRAPPER does, keyed by the wrapped
	object as the wrapper map is: a str's UTF-8 form, a bytes object's data.
	sweep drops an entry when it drops the wrapper."

	^ SessionTemps current
		at: #'GrailShimWrapperBuffers'
		ifAbsentPut: [ IdentityKeyValueDictionary new ]

]

{ #category : 'Grail-Diagnostics' }
CPythonShim >> ___wrapProbe___: aValue [
	"Diagnostic backing for the shimWrapProbe user action: wrap aValue and
	return its memoryAddress, the same path the real PyXxx server methods
	use.  Lets us test which operations trip RT_ERR_CANT_RETURN (2079) /
	ERR_EXC_RETURN_DISALLOWED (2758) at a single level of user-action
	reentrancy, isolated from the dlopen/PyInit path."
	^ (self wrap: aValue) memoryAddress

]

{ #category : 'Grail-Calling' }
CPythonShim >> arrayDispatcherParts: cPtr [
	"{ dispatcher. implementation } of numpy's _ArrayFunctionDispatcher at
	cPtr -- the Python function that picks out the relevant arguments and the
	one that does the work -- or nil when cPtr is not one Grail can read.  See
	shimArrayDispatcherParts in cpython.cc."

	^ self ___shimUserAction: #shimArrayDispatcherParts withArgs: { cPtr }

]

{ #category : 'Grail-Calling' }
CPythonShim >> arrayFunctionKind: cPtr [
	"0 when the wheel object at cPtr has no __array_function__, 1 when it has
	ndarray's, 2 for any other.  See shimArrayFunctionKind in cpython.cc."

	^ self ___shimUserAction: #shimArrayFunctionKind withArgs: { cPtr }

]

{ #category : 'Grail-Calling' }
CPythonShim >> callForeign: cPtr args: posArray kwargs: kwDictOrNil [
	"Call a wheel's own C object -- a ShimForeignObject's pointer -- with
	positional args and a keyword dict (or nil), through the shimCallObject
	user action (C PyObject_Call, so a type is instantiated through its
	tp_new/tp_init and a builtin function through its METH_* convention).
	Arguments travel as wrap: addresses, as callModule:method:args:kwargs:'s
	do.  docs/Support_Pydantic.md, Phase 3."

	| posAddrs names vals |
	posAddrs := Array new: posArray size.
	1 to: posArray size do: [:i |
		posAddrs at: i put: (self wrap: (posArray at: i)) memoryAddress].
	names := OrderedCollection new.
	vals := OrderedCollection new.
	kwDictOrNil ifNotNil: [
		kwDictOrNil keysAndValuesDo: [:k :v |
			names addLast: k asString.
			vals addLast: (self wrap: v) memoryAddress]].
	^ self ___shimUserAction: #shimCallObject withArgs: {
		cPtr . posAddrs . names asArray . vals asArray }

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName [
	"Call a module method with no arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		0 . 0 . 0 .
		0 . 0 . 0
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName args: posArray kwargs: kwDictOrNil [
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

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName doubles: anArrayOfDoubles [
	"Call a METH_FASTCALL method that takes 3 doubles and returns a double."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: (anArrayOfDoubles at: 1)) memoryAddress .
		(self wrap: (anArrayOfDoubles at: 2)) memoryAddress .
		(self wrap: (anArrayOfDoubles at: 3)) memoryAddress .
		0 . 0 . 3
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName extendCrc: anInteger withBytes: aByteArray [
	"Call a method that takes (int, bytes) and returns an integer."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: anInteger) memoryAddress .
		(self wrap: aByteArray) memoryAddress . 0 .
		0 . 0 . 2
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName insortList: anArray value: aFloat [
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

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName with: arg1 [
	"Call a module method with 1 argument."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress . 0 . 0 .
		0 . 0 . 1
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName with: arg1 with: arg2 [
	"Call a module method with 2 arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress .
		(self wrap: arg2) memoryAddress . 0 .
		0 . 0 . 2
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName with: arg1 with: arg2 with: arg3 [
	"Call a module method with 3 arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress .
		(self wrap: arg2) memoryAddress .
		(self wrap: arg3) memoryAddress .
		0 . 0 . 3
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName with: arg1 with: arg2 with: arg3 with: arg4 [
	"Call a module method with 4 arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress .
		(self wrap: arg2) memoryAddress .
		(self wrap: arg3) memoryAddress .
		(self wrap: arg4) memoryAddress . 0 . 4
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName with: arg1 with: arg2 with: arg3 with: arg4 with: arg5 [
	"Call a module method with 5 arguments."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress .
		(self wrap: arg2) memoryAddress .
		(self wrap: arg3) memoryAddress .
		(self wrap: arg4) memoryAddress .
		(self wrap: arg5) memoryAddress . 5
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName withBytes: aByteArray [
	"Call a method that takes (bytes) and returns an integer."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: aByteArray) memoryAddress . 0 . 0 .
		0 . 0 . 1
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule: moduleName method: methodName withList: anArray andDouble: aFloat [
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

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule6: modDotMethod with: a1 with: a2 with: a3 with: a4 with: a5 with: a6 [
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

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModule6ReturnCPtr: modDotMethod with: a1 with: a2 with: a3 with: a4 with: a5 with: a6 [
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

]

{ #category : 'Grail-Dynamic Loading' }
CPythonShim >> callModuleDynamic: moduleName method: methodName args: anArray [
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

]

{ #category : 'Grail-Dynamic Loading' }
CPythonShim >> callModuleDynamic: moduleName method: methodName args: anArray kwargs: kwDictOrNil [
	"Keyword-aware entry point for dynamically loaded module methods.
	Falls back to the legacy positional-only path when there are no
	keyword arguments."

	(kwDictOrNil == nil or: [kwDictOrNil isEmpty]) ifTrue: [
		^ self callModuleDynamic: moduleName method: methodName args: anArray
	].
	^ self callModule: moduleName method: methodName args: anArray kwargs: kwDictOrNil

]

{ #category : 'Grail-Calling' }
CPythonShim >> callModuleReturnCPtr: moduleName method: methodName [
	"Call a no-arg module method that returns a raw C pointer
	(SmallInteger address) instead of a Smalltalk value."

	^ self ___shimUserAction: #shimCall withArgs: {
		moduleName . methodName .
		0 . 0 . 0 .
		0 . 0 . 8
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTyped: moduleName type: typeName method: methName selfPtr: ptr [
	"Call a no-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		0 . 0 . 0 . 0
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1 [
	"Call a 1-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress . 0 . 0 . 1
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2 [
	"Call a 2-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress . 0 . 2
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2 with: a3 [
	"Call a 3-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress .
		(self wrap: a3) memoryAddress . 3
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTyped: moduleName type: typeName setattr: attrName selfPtr: ptr value: aValue [
	"Invoke a tp_getset SETTER on a C-allocated typed object.
	Flags bit 4 selects the setter path in shimCallTyped."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . attrName . ptr .
		(self wrap: aValue) memoryAddress . 0 . 0 . (1 bitOr: 16)
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr [
	"Call a no-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		0 . 0 . 0 . 8
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1 [
	"Call a 1-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress . 0 . 0 . (1 bitOr: 8)
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2 [
	"Call a 2-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress . 0 . (2 bitOr: 8)
	}

]

{ #category : 'Grail-Calling' }
CPythonShim >> callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2 with: a3 [
	"Call a 3-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ self ___shimUserAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress .
		(self wrap: a3) memoryAddress . (3 bitOr: 8)
	}

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> classForStaticTypeNamed: aTpName [
	"The Grail class one of the shim's static builtin types stands for -- the
	inverse of ___staticTypeObjectFor:, called by the shim's foreign_proxy_oop
	so a builtin class that crossed into C comes back as itself.  The C names
	are the Python names (``int'', ``NoneType'', ...); ``object'' is Object."

	^ Python at: aTpName asSymbol otherwise: Object

]

{ #category : 'Grail-CPython API' }
CPythonShim >> finishDynLoad: moduleName path: pathString methodNames: methodNames [
	"The rest of an extension load C did itself (see
	PyImport_ImportModuleLevel:...): the Grail module, registered as
	importlib>>loadDynamicModuleNamed:fromPath: registers one.  A module
	whose exec is still running -- bit_generator, which _common imports
	while bit_generator imports _common -- is built and registered here
	too, as CPython has it in sys.modules during its exec; it is built again
	when its own load finishes, with every attribute its exec added."

	^ self ___guardCallback: [ | mod |
		mod := CPythonShim
			___buildDynamicModule: moduleName asString
			fromPath: pathString asString
			methodNames: methodNames.
		importlib registerModule: moduleName asString with: mod.
		(self wrap: mod) memoryAddress]

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignBuffer: cPtr mode: mode index: anIndex value: aByte [
	"A wheel's object's buffer, for memoryview (shimForeignBuffer): mode 0
	its metadata, ''format itemsize readonly ndim shape...''; mode 1 its
	bytes, C-contiguous; mode 2 sets byte anIndex to aByte.  Raises what
	PyObject_GetBuffer raised -- a TypeError for an object with no buffer."

	^ self ___shimUserAction: #shimForeignBuffer withArgs: { cPtr . mode . anIndex . aByte }

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignDataDescriptorNames: typePtr [
	"The names typePtr (a C type) and its C bases answer with a DATA
	descriptor, as a Set of Symbols, cached per type for the session: an
	attribute store on an instance of a Python subclass of the type goes to C
	for these and stays in Grail for the rest
	(ShimForeignSubclass>>___pyAttrStore___:put:)."

	| cache |
	cache := SessionTemps current
		at: #'GrailForeignDataDescriptors'
		ifAbsentPut: [ IdentityKeyValueDictionary new ].
	^ cache at: typePtr ifAbsent: [ | names |
		names := IdentitySet new.
		((self ___shimUserAction: #shimDataDescriptorNames withArgs: { typePtr })
			subStrings: ' ') do: [:n | n isEmpty ifFalse: [names add: n asSymbol]].
		cache at: typePtr put: names.
		names]

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignDirNames: cPtr [
	"The names dir() finds in C for a wheel's object (shimForeignDirNames): a
	type's own and its C bases', or an instance's dict keys and its type's.
	A list, or nil when the pointer is not a plausible object."

	^ self ___shimUserAction: #shimForeignDirNames withArgs: { cPtr }

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> foreignExceptionTypeForPointer: ptrInt typeName: nameStr baseName: baseName isShimType: isShim [
	"As ...classMethods:, for a caller with no class-method names to give:
	the translation of a pending C exception, whose type the shim has already
	shown Grail (and so built) by the time it is raised."

	^ self foreignExceptionTypeForPointer: ptrInt typeName: nameStr
		baseName: baseName isShimType: isShim classMethods: ''

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> foreignExceptionTypeForPointer: ptrInt typeName: nameStr baseName: baseName isShimType: isShim classMethods: cmNames [
	"The Grail class an exception TYPE of the C side is seen as, called from
	the shim's foreign_proxy_oop in place of foreignProxyForPointer:.

	One of the shim's own exception types (PyExc_ValueError, ...) IS the Grail
	class of that name.  A wheel's pyclass exception -- pydantic_core's
	ValidationError, which extends ValueError -- is a Grail SUBCLASS of its
	nearest such ancestor, built once per C type with type(name, (base,), ns),
	so ``except ValueError'' and ``except pydantic_core.ValidationError'' both
	catch what the wheel raises, and ``type(e).__name__'' is the wheel's name.
	Its instances carry the C exception object (___noteForeignException:...)
	and forward every attribute they lack to it through the namespace's
	__getattr__ -- which is how ``e.errors()'' reaches Rust.  cmNames, the
	type's METH_CLASS / METH_STATIC method names as the shim lists them, go on
	the class itself (___buildForeignExceptionClass:base:pointer:classMethods:).

	No ^ inside the blocks: this runs inside a user action (see typeAddrFor:)."

	| exc base cache cls |
	exc := Python at: #BaseException.
	base := Python at: baseName asSymbol otherwise: nil.
	(base notNil and: [base isBehavior and: [base == exc or: [base inheritsFrom: exc]]])
		ifFalse: [base := Python at: #Exception].
	isShim == true ifTrue: [^ base].
	cache := SessionTemps current
		at: #'GrailShimForeignExceptionClasses'
		ifAbsentPut: [ IntegerKeyValueDictionary new ].
	cls := cache at: ptrInt ifAbsent: [nil].
	cls isNil ifTrue: [
		cls := self ___buildForeignExceptionClass: nameStr base: base
			pointer: ptrInt classMethods: cmNames.
		cache at: ptrInt put: cls].
	^ cls

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignGetAttr: cPtr name: aString [
	"Read an attribute of a wheel's own C object in C: its type's dict,
	tp_getattro, method table (answering a bound builtin function) and
	getset table.  A miss raises AttributeError, translated like any shim
	error."

	^ self ___shimUserAction: #shimForeignGetAttr withArgs: { cPtr . aString }

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignOp: cPtr name: aDunder with: a with: b [
	"``self <op> a'' on a wheel's own object, by its C slot: aDunder names the
	operator (``__add__'', ``__radd__'', ``__getitem__'', ...), a and b are the
	operands (nil when absent; b is an item assignment's value or a pow
	modulus).  Answers the result, nil when C has no answer (an inherited
	identity __hash__), and raises what the slot raised.  See
	foreign_op_invoke in cpython.cc."

	^ self ___shimUserAction: #shimForeignOp withArgs: {
		cPtr . aDunder .
		(a == nil ifTrue: [0] ifFalse: [(self wrap: a) memoryAddress]) .
		(b == nil ifTrue: [0] ifFalse: [(self wrap: b) memoryAddress]) }

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> foreignProxyForPointer: ptrInt typeName: nameStr [
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

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> foreignProxyForPointer: ptrInt typeName: nameStr ops: anInteger [
	"foreignProxyForPointer:typeName:, recording what the object's C type does
	for == and hash (see ShimForeignObject>>___compareHashBits) -- the shim's
	foreign_proxy_oop computes it as the object first crosses."

	| p |
	"A module function's C object (___functionObjectFor:) comes back as the
	function Grail reads off the module, so ``mod.f is f'' holds across a
	round trip through C, as pickle's save_global checks."
	(SessionTemps current at: #'GrailFunctionObjects' otherwise: nil) ifNotNil: [:fns |
		(fns at: ptrInt otherwise: nil) ifNotNil: [:fn | ^ fn]].
	p := self foreignProxyForPointer: ptrInt typeName: nameStr.
	p ___compareHashBits: anInteger.
	^ p

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignSetAttr: cPtr name: aString value: aValue [
	"Store an attribute on a wheel's own C object in C, as C's own
	PyObject_SetAttrString would: a type's tp_dict, or an instance's data
	descriptor, tp_setattro or instance dict.  Answers true when stored, and
	false when C has nowhere to put it (no such descriptor, no instance dict);
	a refusal -- a read-only member -- raises, translated like any shim
	error."

	^ self ___shimUserAction: #shimForeignSetAttr
		withArgs: { cPtr . aString . (self wrap: aValue) memoryAddress }

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignStr: cPtr repr: aBoolean [
	"str() -- or repr() when aBoolean -- of a wheel's own C object, through its
	tp_str / tp_repr; nil when C has nothing to offer."

	^ self ___shimUserAction: #shimForeignStr withArgs: { cPtr . aBoolean == true }

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignStrValue: cPtr [
	"The text of a wheel's str subtype instance (numpy.str_), read from its
	CPython layout, as a str; nil for any other object."

	^ self ___shimUserAction: #shimForeignStrValue withArgs: { cPtr }

]

{ #category : 'Grail-CPython API' }
CPythonShim >> foreignSubclassGetAttr: anObject name: aString [
	"What the PYTHON classes of a Python subclass of a C type define for
	aString -- anObject is an instance's Grail half or the class itself --
	with the fall back to the C base turned off, so C reads the base's part
	itself (the shim's subtype_python_attr): the address of the value, or
	false for a miss.  Turned off for this one receiver and name only, so a
	property's own reads still reach the base."

	^ self ___guardCallback: [ | key previous missed v |
		key := anObject -> aString asSymbol.
		previous := SessionTemps current at: #'GrailForeignNoFallback' otherwise: nil.
		SessionTemps current at: #'GrailForeignNoFallback' put: key.
		missed := false.
		[v := [anObject @env1:___pyAttrLoad___: key value]
			on: AttributeError do: [:ex | missed := true. ex return: nil]]
			ensure: [SessionTemps current at: #'GrailForeignNoFallback' put: previous].
		missed
			ifTrue: [false]
			ifFalse: [(self wrap: v) memoryAddress]]

]

{ #category : 'Grail-Calling' }
CPythonShim >> foreignTypeCheck: objPtr type: typePtr subclass: aBoolean [
	"isinstance (aBoolean false) / issubclass (true) against a wheel's own TYPE
	typePtr, for the candidate objPtr -- 0 for a Grail object.  nil when
	typePtr is not a type.  See shimForeignTypeCheck in cpython.cc."

	^ self ___shimUserAction: #shimForeignTypeCheck
		withArgs: { objPtr . typePtr . aBoolean == true }

]

{ #category : 'Grail-CPython API' }
CPythonShim >> foreignTypeHasNew: typeAddr [
	"Whether the C type at typeAddr has a tp_new -- a type without one cannot
	be instantiated, nor can a Python subclass of it that defines no __new__
	(ShimForeignSubclass class>>___grailMetaclassCall___:kw:)."

	| lay type |
	lay := self ___mirrorLayout.
	type := CByteArray fromCPointer: (CPointer forAddress: typeAddr) numBytes: (lay at: 1).
	^ (type int64At: (lay at: 9)) ~= 0

]

{ #category : 'Grail-CPython API' }
CPythonShim >> importGetAttr: modName name: attrName [
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

]

{ #category : 'Grail-Initialization' }
CPythonShim >> initTypeAddresses [
	"Fetch C type addresses via shimTypeAddr and build the class-to-address map.
	Also patches the None/True/False singletons created before types were known.
	Registers all subclasses of key types (String, Integer, etc.) so that
	typeAddrFor: works for Unicode7, Unicode16, SmallInteger, LargeInteger, etc."

	| addr |
	typeAddresses := Dictionary new.
	#('float' 'int' 'bool' 'str' 'bytes' 'list' 'dict' 'tuple' 'object' 'type' 'NoneType'
		'set' 'frozenset' 'slice' 'complex' 'bytearray')
		do: [:name |
			typeAddresses at: name asSymbol put: (System userAction: #shimTypeAddr with: name).
		].
	"Map base classes"
	typeAddresses at: Object put: (typeAddresses at: #object).
	typeAddresses at: NoneType put: (typeAddresses at: #NoneType).
	typeAddresses at: UndefinedObject put: (typeAddresses at: #NoneType).
	typeAddresses at: Boolean put: (typeAddresses at: #bool).
	"set and frozenset, and their subclasses, to the shim's static types of
	those names: a wheel's PySet_Check is an inline compare against them (see
	the shim's init_types)."
	#(#set #frozenset #slice #bytearray) do: [:n | | cls |
		cls := Python at: n otherwise: nil.
		(cls notNil and: [(typeAddresses at: n otherwise: 0) ~= 0]) ifTrue: [
			addr := typeAddresses at: n.
			typeAddresses at: cls put: addr.
			cls allSubclasses do: [:each | typeAddresses at: each put: addr]]].
	"An exact complex only, which crosses in CPython's layout
	(___prefixedWrapperFor:); a Python subclass of complex keeps its own
	type."
	((Python at: #complex otherwise: nil) notNil and: [(typeAddresses at: #complex otherwise: 0) ~= 0])
		ifTrue: [typeAddresses at: (Python at: #complex) put: (typeAddresses at: #complex)].
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
	"Type mirrors (typeObjectFor:): the PyTypeObject geometry, and the shim's
	static exception types by name -- fetched HERE, at init, because a mirror
	is built inside wrap:, which runs nested in other user actions."
	typeAddresses at: #'___mirrorLayout___'
		put: (System userAction: #shimTypeMirrorLayout with: 0).
	"The shim's callback-error flag, written by ___guardCallback:."
	typeAddresses at: #'___cbErrorFlag___'
		put: (CByteArray
			fromCPointer: (CPointer forAddress: (System userAction: #shimTypeAddr with: '___cbErrorFlag'))
			numBytes: 4).
	self ___staticExceptionNames do: [:n | | a |
		a := System userAction: #shimTypeAddr with: n.
		a = 0 ifFalse: [typeAddresses at: ('exc:' , n) asSymbol put: a]].
	"Patch singletons (created before types were known)"
	noneWrapper int64At: 8 put: (typeAddresses at: UndefinedObject).
	(self valueToPyObject at: true) int64At: 8 put: (typeAddresses at: Boolean).
	(self valueToPyObject at: false) int64At: 8 put: (typeAddresses at: Boolean).
	"...and from here on None / True / False cross as the shim's OWN static
	singletons (_Py_NoneStruct, _Py_TrueStruct, _Py_FalseStruct), not as
	wrappers.  An extension tests ``x == Py_None'' by POINTER, and a wrapper
	is another address: abi3 PyO3 read the None that Grail passed for
	``strict=None'' as not-None and refused it as not a bool
	(docs/Support_Pydantic.md, Phase 5).  The wrappers above remain what
	shimInit read the OOPs from; the shim's pyobj_oop answers those OOPs for
	the statics.  The statics are 16 bytes, so nothing past offset 8 is
	written, and their refcount is pinned high so sweep never drops them."
	#( #(nil 'None') #(true 'True') #(false 'False') ) do: [:pair | | a v |
		a := System userAction: #shimTypeAddr with: (pair at: 2).
		a = 0 ifFalse: [
			v := CByteArray fromCPointer: (CPointer forAddress: a) numBytes: 16.
			v int64At: 0 put: 16r40000000.
			(pair at: 1) isNil
				ifTrue: [noneWrapper := v]
				ifFalse: [self valueToPyObject at: (pair at: 1) put: v]]].
	"NotImplemented the same way, as _Py_NotImplementedStruct: a wheel's
	binary slot tests ``r == Py_NotImplemented'' by pointer, and answers it to
	decline an operand (pyobj_oop maps it back -- see ___notImplemented)."
	"Ellipsis likewise: numpy's indexing tests ``index == Py_Ellipsis''."
	#( #NotImplemented #Ellipsis ) do: [:nm |
		(Python at: nm otherwise: nil) ifNotNil: [:single | | a |
			a := System userAction: #shimTypeAddr with: nm asString.
			a = 0 ifFalse: [ | v |
				v := CByteArray fromCPointer: (CPointer forAddress: a) numBytes: 16.
				v int64At: 0 put: 16r40000000.
				self valueToPyObject at: single put: v]]].

]

{ #category : 'Grail-Module Loading' }
CPythonShim >> loadModule: moduleName [
	"Load a C extension module via the shimLoadModule user action.
	The C side caches the module, so subsequent loads are fast.

	Returns true if the module loaded successfully, or signals an error."

	| r |
	callDepth := (callDepth ifNil: [0]) + 1.
	self ___noteShimEntry.
	r := System userAction: #shimLoadModule with: moduleName.
	callDepth := callDepth - 1.
	^ r

]

{ #category : 'Grail-Module Loading' }
CPythonShim >> moduleAttrs: moduleName [
	"Return a Dictionary of the module-level constants the C module
	registered via PyModule_AddIntConstant / AddStringConstant /
	AddObjectRef. C-only objects (heap types, capsules) are skipped
	by the export — they have no Smalltalk value to hand back."

	| flat dict |
	flat := System userAction: #shimModuleAttrs with: moduleName.
	dict := SymbolDictionary new.
	1 to: flat size by: 2 do: [:i | | name value |
		name := flat at: i.
		value := flat at: i + 1.
		name = '___grailShimModuleDict___'
			ifTrue: [
				"The module's __dict__ (PyModule_GetDict), which in CPython IS
				its namespace.  numpy fills it with PyDict_SetItemString rather
				than PyModule_AddObject.  Its entries win over the table above,
				as a later store into one namespace would."
				value keys do: [:k | dict at: k asString asSymbol put: (value at: k)]]
			ifFalse: [dict at: name asSymbol put: value]].
	^ dict

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyByteArray_Check: obj [
	^ obj isKindOf: bytearray

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyByteArray_FromStringAndSize: aByteArray [
	^ (self wrap: (bytearray withAll: aByteArray)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyBytes_Buffer: aByteObject [
	"{ address. size. writable } of aByteObject's bytes, NUL-terminated, in gcMalloc'd
	memory that lives as long as its WRAPPER does -- the shim's
	PyBytes_AsString and PyObject_GetBuffer answer it, as PyUnicode_UTF8Buffer:
	does for a str.

	CPython's bytes data is IN the object, so a pointer from PyBytes_AsString
	or a buffer view is valid while the caller holds a reference, and numpy's
	frombuffer keeps exactly that: the array's data is the view's buf and its
	base holds the bytes.  The shim answered a copy from the per-call cache,
	freed when the call returned, so np.frombuffer(b'abcd', 'u1') read freed
	memory -- [115, 244, 43, 130].

	A bytearray (and every ByteArray that is not a Python bytes) is mutable, so
	its copy is refreshed on every request: rewritten in place while the size
	is unchanged, so an earlier pointer sees the current bytes as it would in
	CPython; at a new size a new block, the old ones kept until the sweep,
	because a holder may still point into them.  A change made on either side
	AFTER C took the pointer is not seen by the other -- the bytes are a copy,
	as a list crossing to C is.  writable is that mutability: PyObject_GetBuffer
	refuses a WRITABLE view of a bytes, as CPython does."

	| map entry size mutable |
	map := self ___wrapperBuffers.
	entry := map at: aByteObject otherwise: nil.
	size := aByteObject size.
	mutable := (Python @env0:at: #bytearray otherwise: nil)
		ifNil: [false]
		ifNotNil: [:ba | aByteObject isKindOf: ba].
	entry isNil
		ifTrue: [
			entry := { self ___cBufferHolding: aByteObject. size. nil }.
			map at: aByteObject put: entry]
		ifFalse: [
			mutable ifTrue: [
				size = (entry at: 2)
					ifTrue: [
						self ___copyBytesOf: aByteObject into: (entry at: 1)]
					ifFalse: [
						(entry at: 3) ifNil: [entry at: 3 put: OrderedCollection new].
						(entry at: 3) add: (entry at: 1).
						entry at: 1 put: (self ___cBufferHolding: aByteObject).
						entry at: 2 put: size]]].
	"A bytearray's body points at these bytes (___fillByteArrayBody:from:)."
	mutable ifTrue: [
		(self valueToPyObject at: aByteObject otherwise: nil) ifNotNil: [:body |
			self ___fillByteArrayBody: body from: entry]].
	^ { (entry at: 1) memoryAddress. entry at: 2. mutable }

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyBytes_FromStringAndSize: aByteArray [
	^ (self wrap: aByteArray) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyCallable_Check: obj [
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

]

{ #category : 'Grail-C API - ContextVar' }
CPythonShim >> PyContextVar_Get: aVar default: aDefault [
	"Back PyContextVar_Get(var, default, &value): return var.get() — or
	var.get(default) when C supplied a default (aDefault not nil).  The C
	side writes the result through *value and returns 0.  Guarded: get()
	with neither a value nor a default raises LookupError, which C must see
	as its pending error -- see PyContextVar_New:default:."

	^ self ___guardCallback: [self ___ug_PyContextVar_Get: aVar default: aDefault]

]

{ #category : 'Grail-C API - ContextVar' }
CPythonShim >> PyContextVar_New: aName default: aDefault [
	"Back PyContextVar_New(name, default): create a Grail
	contextvars.ContextVar so the C-created var and any Python-created one
	(numpy._core.printoptions) are the same kind of object.  aDefault is nil
	when C passed no default (NULL).

	Guarded, as every server method C calls should be: numpy calls this
	while its module is executing, inside the import of numpy itself.  An
	exception that escaped here was handled by those outer imports on top of
	the live C frame, and each one unloaded its module -- numpy,
	numpy._core and numpy._core.multiarray left sys.modules mid-import, and
	numpy's next import from C ran them all a second time."

	^ self ___guardCallback: [self ___ug_PyContextVar_New: aName default: aDefault]

]

{ #category : 'Grail-C API - ContextVar' }
CPythonShim >> PyContextVar_Set: aVar value: aValue [
	"Back PyContextVar_Set(var, value): var.set(value) answers a Token
	(passed back to var.reset()).  Guarded -- see PyContextVar_New:default:."

	^ self ___guardCallback: [self ___ug_PyContextVar_Set: aVar value: aValue]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Clear: aDictionary [
	aDictionary removeAllKeys: aDictionary keys.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Contains: aDictionary key: aKey [
	"Guarded, as PyDict_GetItem:key: is: an unhashable key is C's TypeError."

	^ self ___guardCallback: [aDictionary includesKey: aKey]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Copy: aDictionary [
	"A COPY of an instance's __dict__ is a plain dict, as CPython's is.  The
	Smalltalk copy of the PyInstanceDict view was a second view of the SAME
	instance, so pydantic_core's validate_assignment -- copy __dict__, set the
	field in the copy, assign it back -- edited the model in place and then
	assigned the model its own view."

	(aDictionary isKindOf: PyInstanceDict)
		ifTrue: [^ (self wrap: aDictionary @env1:copy) memoryAddress].
	^ (self wrap: aDictionary copy) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_DelItem: aDictionary key: aKey [
	"An instance's __dict__ is a live VIEW (PyInstanceDict), which has no
	removeKey: -- pydantic_core's validate_assignment deletes from a model's
	__dict__ copy, and the MessageNotUnderstood took the assignment down."

	(aDictionary isKindOf: PyInstanceDict)
		ifTrue: [aDictionary @env1:__delitem__: aKey]
		ifFalse: [aDictionary removeKey: aKey].

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_GetItem: aDictionary key: aKey [
	"Guarded: an unhashable key raises TypeError, which must become C's
	pending error -- see ___guardCallback:.  Unguarded, the TypeError searched
	Grail's handlers from inside pydantic_core's Literal validator (which
	tolerates it as a miss): a script's own ``except'' caught it on top of the
	C frames and the unwind was refused."

	^ self ___guardCallback: [self ___ug_PyDict_GetItem: aDictionary key: aKey]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_GetItemString: aDictionary key: aString [
	^ self PyDict_GetItem: aDictionary key: aString

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Items: aDictionary [
	"Returns a Python list of (key, value) tuples."

	| items |
	items := OrderedCollection new.
	aDictionary keysAndValuesDo: [:k :v | items addLast: { k . v }].
	^ (self wrap: items) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_ItemsFlat: aDictionary [
	"{ key1Addr. value1Addr. key2Addr. value2Addr. ... } in insertion order --
	the whole of a dict in one crossing, for the shim's PyDict_Next snapshot.
	keysAndValuesDo: walks the storage, which is the insertion order (see
	PyDict_Next:pos:)."

	| out |
	out := OrderedCollection new.
	aDictionary keysAndValuesDo: [:k :v |
		out add: (self wrap: k) memoryAddress; add: (self wrap: v) memoryAddress].
	^ out asArray

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Keys: aDictionary [
	"Returns a Python list (OrderedCollection) of the keys."

	^ (self wrap: (OrderedCollection withAll: aDictionary keys asArray)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Merge: aDictionary with: otherDictionary override: aBoolean [
	otherDictionary keysAndValuesDo: [:k :v |
		(aBoolean or: [(aDictionary includesKey: k) not]) ifTrue: [
			aDictionary at: k put: v.
		].
	].

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_New [
	"A Python dict -- insertion-ordered, as C callers of PyDict_New get in
	CPython.  A plain KeyValueDictionary iterates in hash order, so every dict
	a wheel built came back shuffled (pydantic_core's e.errors() rows)."
	^ (self wrap: (Python at: #dict) new) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Next: aDictionary pos: posOop [
	"Iterator helper for the C-side ``PyDict_Next``.  Returns
	``{ keyAddr. valueAddr. nextPos }`` for the entry at the given
	1-based position, or ``nil`` when the position is past the end.
	The caller threads the returned ``nextPos`` back in.

	The C side packages the key/value via ``addr_to_pyobj`` so they
	travel as PyObject* on the wire.  We wrap each value through
	``self wrap:`` to materialise a PyObject sized to expose the
	underlying OOP at offset 16 — keeping the round-trip lossless."

	| keys n key value |
	"In INSERTION order, as a dict iterates: ``keys'' is a Smalltalk Set, so
	``keys asArray'' handed C a dict's entries in hash order -- every dict a
	wheel walked came out shuffled (pydantic_core's ``e.errors()'' rows
	listed msg before type and loc).  keysAndValuesDo: walks the storage,
	which is the insertion order (see dict)."
	keys := OrderedCollection new.
	aDictionary keysAndValuesDo: [:k :v | keys add: k].
	n := keys size.
	posOop >= n ifTrue: [^ nil].
	key := keys at: posOop + 1.
	value := aDictionary at: key.
	^ {
		(self wrap: key) memoryAddress.
		(self wrap: value) memoryAddress.
		posOop + 1.
	}

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_SetDefault: aDictionary key: aKey default: aDefault [
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_SetItem: aDictionary key: aKey value: aValue [
	aDictionary at: aKey put: aValue.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_SetItemString: aDictionary key: aString value: aValue [
	aDictionary at: aString put: aValue.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Size: aDictionary [
	^ aDictionary size

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDict_Values: aDictionary [
	| values |
	values := OrderedCollection new.
	aDictionary keysAndValuesDo: [:k :v | values addLast: v].
	^ (self wrap: values) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyDictProxy_New: aMapping [
	"types.MappingProxyType(aMapping): a read-only view of the live mapping."

	^ (self wrap: (mappingproxy @env1:___on: aMapping)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyFloat_AsDouble: anObject [
	"CPython's PyFloat_AsDouble for what the C side does not decode itself
	(SmallInteger, SmallDouble, Float, bool): nb_float, then nb_index.

	Answers a Float -- or, for a failure, a Symbol naming the CPython error
	(#overflow: an int too large for a double; #type: no __float__ / __index__,
	or one that raised), which the C side turns into the Python exception.  It
	must NOT signal: this runs inside a C user action, and an exception
	unwinding across that frame is an uncontinuable error.  pydantic_core asks
	for a float from every member of a union it tries, a dict included, and
	expects the TypeError."

	| f hook |
	^ [(anObject isKindOf: Integer)
		ifTrue: [
			f := anObject asFloat.
			f abs = PlusInfinity ifTrue: [#overflow] ifFalse: [f]]
		ifFalse: [
			(anObject isKindOf: Number)
				ifTrue: [anObject asFloat]
				ifFalse: [
					hook := [anObject @env1:___pyAttrLoad___: #'__float__']
						on: AbstractException do: [:ex | ex return: nil].
					hook isNil ifTrue: [
						hook := [anObject @env1:___pyAttrLoad___: #'__index__']
							on: AbstractException do: [:ex | ex return: nil]].
					hook isNil
						ifTrue: [#type]
						ifFalse: [(hook @env1:value: #() value: nil) asFloat]]]]
		on: AbstractException do: [:ex | ex return: #type]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyFloat_FromDouble: aFloat [
	^ (self wrap: aFloat) memoryAddress

]

{ #category : 'Grail-C API - Import' }
CPythonShim >> PyImport_ImportModule: aName [
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
	| nameStr sym path mod mods |
	nameStr := aName asString.
	sym := nameStr asSymbol.
	"An ALREADY-IMPORTED module first.  Without this a wheel importing a
	module Grail had loaded -- pydantic_core's Rust calls
	``py.import('pydantic_core')'' mid-validation to fetch its MISSING sentinel
	-- re-ran that module's source from the search path, and pydantic_core's
	__init__ recursed until the stack ran out.  Only a READ of sys.modules,
	and only when the table already exists, so the lazy-init concern below
	does not arise."
	mods := [(Python at: #importlib) @env1:modules] on: Error do: [:e | e return: nil].
	(mods isKindOf: AbstractDictionary) ifTrue: [
		mod := mods at: sym otherwise: (mods at: nameStr otherwise: nil).
		mod notNil ifTrue: [^ (self wrap: mod) memoryAddress]].
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyImport_ImportModuleLevel: name globals: globals locals: locals fromlist: fromlist level: level [
	"``__import__(name, globals, locals, fromlist, level)'' for C -- the shim's
	PyImport_ImportModuleLevelObject, which Cython's ``import'' and
	``cimport'' compile to.  Grail's whole import, so a package's .so
	submodule is found as it is from Python.

	EXCEPT THE .so LOAD.  C is already running inside a user action, and
	loading an extension is another one whose exec slot may import a third
	(numpy.random: _bounded_integers -> bit_generator -> _common), past
	GemStone's two in flight.  So the load is handed back
	(GrailDynLoadRequest): the request is kept for ___pendingDynLoad, -1 tells
	C to run shimDynLoad itself and call finishDynLoad:path:methodNames:,
	and C asks again, when the module is registered.  Guarded: the import
	runs Python code."

	^ self ___guardCallback: [ | fn r temps depth |
		fn := (builtins @env1:instance) @env1:___pyAttrLoad___: #'__import__'.
		temps := SessionTemps current.
		depth := temps at: #'GrailCImportDepth' otherwise: 0.
		temps at: #'GrailCImportDepth' put: depth + 1.
		r := [[fn @env1:value: { name. globals. locals. fromlist. level } value: nil]
				on: GrailDynLoadRequest
				do: [:req |
					temps at: #'GrailPendingDynLoad' put: { req path. req moduleName }.
					req return: -1]]
			ensure: [temps at: #'GrailCImportDepth' put: depth].
		r == -1
			ifTrue: [-1]
			ifFalse: [(self wrap: r) memoryAddress]]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyIter_Next: anIterator [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyIter_Next: anIterator]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_Append: aList item: anItem [
	aList addLast: anItem.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_AsTuple: aList [
	^ (self wrap: (Array withAll: aList)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_GetItem: aList at: zeroBasedIndex [
	^ (self wrap: (aList at: zeroBasedIndex + 1)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_GetSlice: aList from: lo to: hi [
	"Python slice semantics: 0-based, end exclusive, clamped to length.
	Returns a new list."

	| len oneLo oneHi |
	len := aList size.
	oneLo := (lo max: 0) + 1.
	oneHi := hi min: len.
	oneHi < oneLo ifTrue: [^ (self wrap: OrderedCollection new) memoryAddress].
	^ (self wrap: (OrderedCollection withAll: (aList copyFrom: oneLo to: oneHi))) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_Insert: aList at: zeroBasedIndex item: anItem [
	aList add: anItem beforeIndex: zeroBasedIndex + 1.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_New: size [
	^ (self wrap: OrderedCollection new) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_Reverse: aList [
	aList @env1:reverse.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_SetItem: aList at: zeroBasedIndex put: aValue [
	aList at: zeroBasedIndex + 1 put: aValue.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_SetSlice: aList from: lo to: hi with: replacement [
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_Size: aList [
	^ aList size

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyList_Sort: aList [
	"In-place sort using Python __lt__ — delegate to the Python-level
	list>>sort method."

	aList @env1:sort.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyLong_FromSsize_t: anInteger [
	^ (self wrap: anInteger) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyLong_FromU64Hi: hi lo: lo [
	"The int (hi << 32) | lo, for the shim's PyLong_FromUnsignedLongLong above
	the SmallInteger range."

	^ (self wrap: ((hi bitShift: 32) bitOr: lo)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyLong_U64Parts: anInt mask: aBoolean [
	"{ low 32 bits. high 32 bits } of an unsigned 64-bit value, for the shim's
	PyLong_AsUnsignedLongLong (aBoolean false: OverflowError outside
	0 .. 2^64-1, as CPython's) and its MASK forms (aBoolean true: the low 64
	bits of any int, two's complement for a negative one).  A non-int is asked
	for its __index__.  Guarded: that is Python code."

	^ self ___guardCallback: [ | n |
		n := (anInt isKindOf: Integer)
			ifTrue: [anInt]
			ifFalse: [anInt @env1:__index__].
		(aBoolean ~~ true and: [n < 0 or: [n >= (2 raisedTo: 64)]]) ifTrue: [
			(Python at: #OverflowError) @env1:___signal___:
				(n < 0
					ifTrue: ['can''t convert negative int to unsigned']
					ifFalse: ['int too big to convert'])].
		n := n bitAnd: 16rFFFFFFFFFFFFFFFF.
		{ n bitAnd: 16rFFFFFFFF. (n bitShift: -32) bitAnd: 16rFFFFFFFF }]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyNumber_Op: opName a: a b: b c: c n: n [
	"One number-protocol operation for the shim's PyNumber_* (see number_op
	in cpython.cc): the ``operator'' module's function named opName on the
	first n operands -- ``divmod'', ``pow'', ``int'' and ``float'' are
	builtins, three-argument pow included -- so the answer has Python's
	semantics, reflected operands and arbitrary-precision ints with them.
	``___check'' is PyNumber_Check.
	Guarded: the operator is Python code."

	^ self ___guardCallback: [ | args fn r |
		args := n = 1 ifTrue: [{ a }] ifFalse: [n = 2 ifTrue: [{ a. b }] ifFalse: [{ a. b. c }]].
		opName = '___check'
			ifTrue: [
				r := #(#'__index__' #'__float__' #'__int__') anySatisfy: [:sel |
					((builtins @env1:instance) @env1:hasattr: a _: sel asString) @env1:___isTruthy___].
				r]
			ifFalse: [
				fn := (#('divmod' 'pow' 'int' 'float') includes: opName asString)
					ifTrue: [(builtins @env1:instance) @env1:___pyAttrLoad___: opName asSymbol]
					ifFalse: [((importlib @env0:___instance___) @env1:import_module: 'operator')
						@env1:___pyAttrLoad___: opName asSymbol].
				(self wrap: (fn @env1:value: args value: nil)) memoryAddress]]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_Call: callable args: argsArray [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_Call: callable args: argsArray]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_Call: callable args: argsArray kwargs: kwDict [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_Call: callable args: argsArray kwargs: kwDict]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_GenericSetAttr: obj name: aName value: aValueOrNil [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_GenericSetAttr: obj name: aName value: aValueOrNil]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_GetAttrString: obj name: nameString [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_GetAttrString: obj name: nameString]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_GetItem: obj key: aKey [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_GetItem: obj key: aKey]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_GetIter: obj [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_GetIter: obj]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_HasAttrString: obj name: nameString [
	"Python's hasattr: the attribute READ, false on any error, as
	PyObject_HasAttrString is in CPython.  It used to SEND the name as a
	message -- which ran a no-argument method to see whether it existed, and
	answered false for an attribute that is not a method (a C descriptor's
	``__get__'', numpy's test for a class property).  AttributeError too:
	under GRAIL_DIRECT_CALLS a PythonInstance's DNU hook reports a miss
	through the loader's AttributeError."

	^ [obj @env1:___pyAttrLoad___: nameString asSymbol. true]
		on: MessageNotUnderstood, Error, (Python at: #AttributeError)
		do: [:e | false]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_Hash: obj [
	"Python's hash(obj) for C's PyObject_Hash.  Guarded: an unhashable object's
	TypeError becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [(builtins @env1:instance) @env1:hash: obj]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_IsInstance: obj cls: aClassOrTuple [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_IsInstance: obj cls: aClassOrTuple]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_IsSubclass: aClass cls: aClassOrTuple [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_IsSubclass: aClass cls: aClassOrTuple]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_Length: obj [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_Length: obj]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_Repr: obj [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_Repr: obj]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_RichCompare: v with: w op: opInt [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_RichCompare: v with: w op: opInt]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_RichCompareBool: v with: w op: opInt [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_RichCompareBool: v with: w op: opInt]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_SetAttrString: obj name: nameString value: aValue [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_SetAttrString: obj name: nameString value: aValue]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_SetItem: obj key: aKey value: aValue [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_SetItem: obj key: aKey value: aValue]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyObject_Str: obj [
	"Guarded: a Python exception raised by the Grail code this runs
	becomes C's pending error -- see ___guardCallback:."

	^ self ___guardCallback: [self ___ug_PyObject_Str: obj]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySequence_Check: obj [
	"CPython's rule for an object whose C type the shim has no slots for: a
	sequence when its type has __getitem__ (a class defining it gets sq_item)
	and is not a dict.  numpy's array coercion asks it of everything that is
	not a scalar, an array or a buffer, and answering 0 made a range a 0-d
	object array: np.array(range(4)) answered range(0, 4).

	Not hasattr: Grail's int and None carry a __getitem__ that only raises,
	so hasattr(int, '__getitem__') is true here and 5 would read as a
	sequence -- object>>___hasOwnGetitem___ tells a real one.  A predicate
	cannot fail in CPython, so an error answers false."

	^ [(obj @env1:___hasOwnGetitem___)
			and: [((obj isKindOf: KeyValueDictionary) or: [obj isKindOf: PyInstanceDict]) not]]
		on: AbstractException do: [:e | e return: false]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySequence_Contains: seq item: anItem [
	"item in seq via __contains__."

	^ seq perform: #'__contains__:' env: 1 withArguments: { anItem }

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySequence_GetItem: seq at: zeroBasedIndex [
	"Fallback for sequences that are neither list nor tuple on the C side.
	Python __getitem__ handles negative indices and raises IndexError."

	^ (self wrap: (seq perform: #'__getitem__:' env: 1 withArguments: { zeroBasedIndex })) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySet_Add: aSet item: anItem [
	aSet add: anItem.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySet_Check: obj [
	^ obj isKindOf: Set

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySet_Clear: aSet [
	aSet asArray do: [:each | aSet remove: each ifAbsent: []].

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySet_Contains: aSet item: anItem [
	^ aSet includes: anItem

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySet_Discard: aSet item: anItem [
	"Returns true if the item was present and removed."

	(aSet includes: anItem) ifFalse: [^ false].
	aSet remove: anItem ifAbsent: [].
	^ true

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySet_New: iterableOrNil [
	"PySet_New(NULL) -> empty set; with an iterable, add its elements.
	Smalltalk collections (list/tuple/set) enumerate via do:; Python
	iterator objects are not supported here. Runtime class lookup:
	set.gs compiles after CPythonShim.gs in install.gs."

	| s |
	s := (Python at: #set) new.
	iterableOrNil ifNotNil: [ iterableOrNil do: [:each | s add: each] ].
	^ (self wrap: s) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySlice_New: start stop: stop step: step [
	"slice() construction. The C side maps NULL args to None before
	delegating, so the three values are always present."

	^ (self wrap: (slice ___newStart: start stop: stop step: step)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PySlice_Unpack: aSlice [
	"Return { startOrNil. stopOrNil. stepOrNil } with nil where the
	slice holds None. CPython's defaults (and the step ~= 0 check)
	are applied on the C side so the PY_SSIZE_T sentinel values never
	round-trip through Smalltalk. Returns nil for a non-slice."

	(aSlice isKindOf: slice) ifFalse: [^ nil].
	^ self ___guardCallback: [
		{ aSlice @env1:start. aSlice @env1:stop. aSlice @env1:step }
			collect: [:each | self ___sliceIndex: each]]

]

{ #category : 'Grail-C API - Sys' }
CPythonShim >> PySys_GetObject: aName [
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyTuple_GetItem: anArray at: zeroBasedIndex [
	^ (self wrap: (anArray at: zeroBasedIndex + 1)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyTuple_GetSlice: anArray from: lo to: hi [
	"Returns a new tuple (Array) with Python slice clamping."

	| len oneLo oneHi |
	len := anArray size.
	oneLo := (lo max: 0) + 1.
	oneHi := hi min: len.
	oneHi < oneLo ifTrue: [^ (self wrap: (Array new: 0)) memoryAddress].
	^ (self wrap: (anArray copyFrom: oneLo to: oneHi)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyTuple_New: size [
	"A real Grail tuple, not a plain Array: since list/tuple __eq__
	became cross-kind-distinct, a C-API tuple surfacing as an Array
	compared equal to lists and unequal to tuples -- every
	assertEqual(m.span(), (x, y)) in CPython test_re failed on it.
	tuple is an Array subclass, so PyTuple_SetItem's at:put: still
	works during construction."
	^ (self wrap: (tuple new: size)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyTuple_SetItem: anArray at: zeroBasedIndex put: aValue [
	anArray at: zeroBasedIndex + 1 put: aValue.

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyType_AllocForeignSubclass: aClass type: typeAddr basicSize: basicSize [
	"tp_alloc of a subtype mirror (the shim's grail_subtype_alloc): a new
	instance of aClass with no __init__ run, as CPython runs none at
	allocation, and its C body -- basicSize zeroed bytes in the base's layout,
	refcount 1, ob_type the mirror, this half's OOP in the last word.  The
	half holds the body; the wrapper map holds the half while C counts the
	body, exactly as for a wrapper."

	^ self ___guardCallback: [ | half body |
		half := aClass new.
		body := CByteArray gcMalloc: basicSize.
		body memset: 0 from: 0 to: basicSize - 1.
		body int64At: 0 put: 1.
		body int64At: 8 put: typeAddr.
		self storeOop: half asOop in: body at: basicSize - 8.
		half ___grailForeignBody___: body.
		self valueToPyObject at: half put: body.
		body memoryAddress]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyType_GenericNew: aClass [
	"A new, uninitialised instance of aClass -- ``aClass.__new__(aClass)'' --
	for the tp_new of its type mirror.  Guarded: __new__ is Python code."

	^ self ___guardCallback: [(self wrap: (aClass @env1:__new__: aClass)) memoryAddress]

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyUnicode_Concat: left with: right [
	^ (self wrap: (left , right)) memoryAddress

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyUnicode_FromString: aString [
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

]

{ #category : 'CPython API' }
CPythonShim >> PyUnicode_Substring: aString from: start to: end [
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

]

{ #category : 'Grail-CPython API' }
CPythonShim >> PyUnicode_UTF8Buffer: aString [
	"{ address. size } of aString's UTF-8 bytes, NUL-terminated, in gcMalloc'd
	memory that lives as long as aString's WRAPPER does -- the shim's
	PyUnicode_AsUTF8 / AsUTF8AndSize answer it.

	CPython keeps a str's UTF-8 form IN the object, so a pointer from
	PyUnicode_AsUTF8AndSize is valid while the caller holds a reference --
	and PyO3's PyBackedStr is built on exactly that.  The shim's buffers lived
	in a per-call cache freed at the end of every shim call, so every str a
	wheel kept (pydantic_core's field-name map, built when a SchemaSerializer
	is constructed) pointed at freed memory by the next call, and model_dump()
	matched no field and answered {} (docs/Support_Pydantic.md, Phase 5).  The
	map is keyed by the string as the wrapper map is, and sweep drops a
	buffer exactly when it drops the wrapper -- which a holder's reference
	prevents."

	| map entry utf |
	map := self ___wrapperBuffers.
	entry := map at: aString otherwise: nil.
	entry isNil ifTrue: [
		utf := (aString respondsTo: #encodeAsUTF8)
			ifTrue: [aString encodeAsUTF8]
			ifFalse: [aString].
		entry := { self ___cBufferHolding: utf. utf size }.
		map at: aString put: entry].
	^ { (entry at: 1) memoryAddress. entry at: 2 }

]

{ #category : 'Grail-Private' }
CPythonShim >> storeOop: anOop in: aCByteArray at: offset [
	"Store a 64-bit OOP into a CByteArray at the given byte offset.
	OOPs are unsigned 64-bit values but int64At:put: requires signed,
	so convert values >= 2^63 to their signed two's complement."

	| signed |
	signed := anOop >= 16r8000000000000000
		ifTrue: [ anOop - 16r10000000000000000 ]
		ifFalse: [ anOop ].
	aCByteArray int64At: offset put: signed.

]

{ #category : 'Grail-Management' }
CPythonShim >> sweep [
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
	"A swept object's C buffer goes with its wrapper -- see
	PyUnicode_UTF8Buffer: and PyBytes_Buffer:."
	(SessionTemps current at: #'GrailShimWrapperBuffers' otherwise: nil) ifNotNil: [:bufs |
		toRemove do: [:key | bufs removeKey: key ifAbsent: [nil]]].
	"So does a prefixed wrapper's block, which its view does not hold."
	(SessionTemps current at: #'GrailShimWrapperBlocks' otherwise: nil) ifNotNil: [:blocks |
		toRemove do: [:key | blocks removeKey: key ifAbsent: [nil]]].

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> typeAddrFor: aValue [
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
		"A Python dict is a PyDict, a SUBCLASS of the KeyValueDictionary that
		initTypeAddresses maps, so it fell through to object -- and a prebuilt
		wheel's PyDict_Check is an inline read of that type's tp_flags, so
		PyO3 refused SchemaValidator({'type': 'int'}) with ''object'' object is
		not an instance of ''dict''.  The shim's own C modules never saw it:
		their PyDict_Check asks the server.  Same for a list subclass.  Tested
		here rather than precomputed, so a class defined at run time
		(class D(dict)) is covered too."
		ifFalse: [((aValue isKindOf: KeyValueDictionary) or: [aValue isKindOf: PyInstanceDict])
			ifTrue: [t := typeAddresses at: #dict ifAbsent: [0]]
		ifFalse: [(aValue isKindOf: OrderedCollection) ifTrue: [t := typeAddresses at: #list ifAbsent: [0]]
		"An instance of a Python-defined class is typed by its class's MIRROR, so
		C's Py_TYPE(obj) is the very object the class crossed as, and
		PyType_IsSubtype walks the real hierarchy (pydantic_core compares an
		instance's type against the classes it was handed)."
		ifFalse: [((aValue isKindOf: PythonInstance)
				and: [typeAddresses includesKey: #'___mirrorLayout___'])
			ifTrue: [t := (self typeObjectFor: aValue class) memoryAddress]
		ifFalse: [t := self ___nativeTypeAddrFor: aValue]]]]]]]].
		t]

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> typeObjectFor: aClass [
	"The C type object a Grail CLASS crosses as (docs/Support_Pydantic.md,
	Phase 5 / W1).  It used to cross as an ordinary 32-byte wrapper typed
	``object'', so C could not see it as a type at all: abi3 PyO3 takes
	datetime.datetime with py.import(...).getattr(...) and checks it with
	PyType_Check, which failed, and BaseModel's schema build stopped there.

	A BUILTIN class answers the shim's own static type (PyLong_Type for int,
	PyExc_ValueError for ValueError, ...), so ``builtins.int'' from Python is
	the very pointer C compares against.  Any other class answers its TYPE
	MIRROR (___buildTypeMirrorFor:), built once per class and session and
	never swept: PyO3 keeps type pointers in Rust statics for the life of the
	process (W8)."

	| map obj |
	map := SessionTemps current
		at: #'GrailTypeObjects'
		ifAbsentPut: [ IdentityKeyValueDictionary new ].
	obj := map at: aClass otherwise: nil.
	obj notNil ifTrue: [^ obj].
	obj := self ___staticTypeObjectFor: aClass.
	obj isNil ifTrue: [
		obj := ((aClass isBehavior and: [aClass isMeta not])
				and: [(aClass inheritsFrom: ShimForeignSubclass)
				and: [(ShimForeignSubclass ___foreignBaseOf: aClass) notNil]])
			ifTrue: [self ___buildSubtypeMirrorFor: aClass]
			ifFalse: [self ___buildTypeMirrorFor: aClass]].
	map at: aClass put: obj.
	^ obj

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> valueToPyObject [
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

]

{ #category : 'Grail-Wrapping' }
CPythonShim >> wrap: aValue [
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
	"An instance of a Python subclass of a C type goes as its body, re-entered
	in the wrapper map and revived as a wrapper is below."
	(aValue isKindOf: ShimForeignSubclass) ifTrue: [
		pyObj := aValue ___grailForeignBody___.
		pyObj notNil ifTrue: [
			(pyObj int64At: 0) <= 0 ifTrue: [pyObj int64At: 0 put: 1].
			self valueToPyObject at: aValue put: pyObj.
			^ pyObj]].
	"A function of a C module goes back as its builtin_function_or_method,
	not as a wrapper of the BoundMethod Grail reads it as."
	aValue class == BoundMethod ifTrue: [
		pyObj := self ___functionObjectFor: aValue.
		pyObj notNil ifTrue: [ ^ pyObj ]].
	"A tuple that C built in CPython's own layout goes back as that object,
	not as a wrapper -- see ___noteRealTuple:origin:.  Only an exact tuple
	can have such an origin, so every other value pays one class compare."
	aValue class == tuple ifTrue: [
		(SessionTemps current at: #'GrailRealTupleOrigins' otherwise: nil) ifNotNil: [:origins |
			(origins at: aValue otherwise: nil) ifNotNil: [:ptr |
				^ CByteArray fromCPointer: (CPointer forAddress: ptr) numBytes: 32]]].
	"A CLASS crosses as a type object, not a 32-byte wrapper -- a builtin as
	the shim's own static type, any other as its type mirror.  See
	typeObjectFor:."
	(aValue isBehavior and: [typeAddresses notNil
			and: [typeAddresses includesKey: #'___mirrorLayout___']])
		ifTrue: [ ^ self typeObjectFor: aValue ].
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
	"...but do not RELY on that guard: it is measured to answer true mid-call
	once callDepth drifts negative (see ___betweenShimCalls).  The refcount is
	the load-bearing part -- a wrapper C still holds must never read <= 0."
	((wrapsSinceSweep \\ 1000) = 0 and: [self ___betweenShimCalls])
		ifTrue: [ self sweep ].
	pyObj := self valueToPyObject at: aValue otherwise: nil.
	pyObj notNil ifTrue: [
		"Resurrect: C may have decref'd this cached wrapper to zero after
		a previous call.  Handing it out at refcnt <= 0 would make it
		sweep-bait while in flight; reset to 1 so it survives until the
		C side is done with it again."
		(pyObj int64At: 0) <= 0 ifTrue: [pyObj int64At: 0 put: 1].
		"A bytearray's body carries its bytes, which may have changed."
		(typeAddresses notNil
				and: [(pyObj int64At: 8) = (typeAddresses at: #bytearray otherwise: -1)])
			ifTrue: [self PyBytes_Buffer: aValue].
		^ pyObj].
	"An exact int or str crosses in CPython's own layout, its OOP in a hidden
	prefix (___prefixedWrapperFor:)."
	pyObj := self ___prefixedWrapperFor: aValue.
	pyObj notNil ifTrue: [
		self valueToPyObject at: aValue put: pyObj.
		^ pyObj].
	pyObj := CByteArray gcMalloc: 32.
	pyObj int64At: 0 put: 1.
	pyObj int64At: 8 put: (self typeAddrFor: aValue).
	"A FLOAT crosses as its value, in CPython's PyFloatObject layout (ob_fval
	at 16), marked GRAILFV1: a wheel reads it with the inline
	PyFloat_AS_DOUBLE, which read the OOP below as a double -- numpy answered
	np.subtract(2.0, 0.0) as -6e-323.  The shim's pyobj_oop rebuilds the float
	from the double.  Only an exact float: a Python float SUBCLASS instance
	keeps its OOP, so it comes back as itself."
	((aValue class == SmallDouble) or: [aValue class == Float])
		ifTrue: [
			pyObj doubleAt: 16 put: aValue.
			pyObj int64At: 24 put: 16r475241494C465631]
		ifFalse: [
			self storeOop: aValue asOop in: pyObj at: 16.
			pyObj int64At: 24 put: 16r475241494C575031].
	self valueToPyObject at: aValue put: pyObj.
	^ pyObj

]
