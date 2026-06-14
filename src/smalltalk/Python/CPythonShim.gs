! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- CPythonShim class definition
expectvalue /Class
doit
Object subclass: 'CPythonShim'
  instVarNames: #(valueToPyObject noneWrapper typeAddresses wrapsSinceSweep)
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

Wrapping state (valueToPyObject, noneWrapper, typeAddresses) lives on
the instance since this is a singleton.

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

	libraryPath := aString.
	SessionTemps current removeKey: #CPythonShim ifAbsent: [].
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
wrap: aValue
	"Look up or create a CByteArray wrapper for aValue.
	Returns the CByteArray instance.
	nil and the Python ``None`` singleton both map to the same Py_None
	wrapper, but the embedded OOP is the singleton — so a round-trip
	through C yields ``None``, not nil."

	| pyObj |
	(aValue == nil or: [aValue == None]) ifTrue: [
		noneWrapper ifNil: [
			noneWrapper := CByteArray gcMalloc: 24.
			noneWrapper int64At: 0 put: 1.
			noneWrapper int64At: 8 put: (self typeAddrFor: None).
			self storeOop: None asOop in: noneWrapper at: 16.
		].
		^ noneWrapper
	].
	valueToPyObject ifNil: [ valueToPyObject := IdentityKeyValueDictionary new ].
	wrapsSinceSweep := (wrapsSinceSweep ifNil: [0]) + 1.
	(wrapsSinceSweep \\ 1000) = 0 ifTrue: [ self sweep ].
	^ valueToPyObject at: aValue ifAbsent: [
		pyObj := CByteArray gcMalloc: 24.
		pyObj int64At: 0 put: 1.
		pyObj int64At: 8 put: (self typeAddrFor: aValue).
		self storeOop: aValue asOop in: pyObj at: 16.
		valueToPyObject at: aValue put: pyObj.
		pyObj
	]
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
		ifFalse: [(aValue isKindOf: Integer) ifTrue: [t := typeAddresses at: #int ifAbsent: [0]]
		ifFalse: [(aValue isKindOf: Float) ifTrue: [t := typeAddresses at: #float ifAbsent: [0]]
		ifFalse: [(aValue isKindOf: ByteArray) ifTrue: [t := typeAddresses at: #bytes ifAbsent: [0]]
		ifFalse: [t := typeAddresses at: Object ifAbsent: [0]]]]].
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
	(valueToPyObject at: true) int64At: 8 put: (typeAddresses at: Boolean).
	(valueToPyObject at: false) int64At: 8 put: (typeAddresses at: Boolean).
%

! ===============================================================================
! Instance methods - Reference counting sweep
! ===============================================================================

category: 'Grail-Management'
method: CPythonShim
sweep
	"Remove PyObject wrappers whose refcount has reached zero."

	| toRemove |
	valueToPyObject ifNil: [^ self].
	toRemove := OrderedCollection new.
	valueToPyObject keysAndValuesDo: [:key :pyObj |
		(pyObj int64At: 0) <= 0 ifTrue: [
			toRemove add: key.
		].
	].
	toRemove do: [:key | valueToPyObject removeKey: key].
%

! ===============================================================================
! Instance methods - General calling (0-5 args)
! ===============================================================================

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName
	"Call a module method with no arguments."

	^ System userAction: #shimCall withArgs: {
		moduleName . methodName .
		0 . 0 . 0 .
		0 . 0 . 0
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName with: arg1
	"Call a module method with 1 argument."

	^ System userAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress . 0 . 0 .
		0 . 0 . 1
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName with: arg1 with: arg2
	"Call a module method with 2 arguments."

	^ System userAction: #shimCall withArgs: {
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

	^ System userAction: #shimCall withArgs: {
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

	^ System userAction: #shimCall withArgs: {
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

	^ System userAction: #shimCall withArgs: {
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
	^ System userAction: #shimCallKw withArgs: {
		moduleName . methodName . posAddrs . names asArray . vals asArray }
%

category: 'Grail-Calling'
method: CPythonShim
callModuleReturnCPtr: moduleName method: methodName
	"Call a no-arg module method that returns a raw C pointer
	(SmallInteger address) instead of a Smalltalk value."

	^ System userAction: #shimCall withArgs: {
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

	^ System userAction: #shimCallTyped withArgs: {
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

	^ System userAction: #shimCall withArgs: {
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
	^ System userAction: #shimCall withArgs: {
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
	System userAction: #shimCall withArgs: {
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

	^ System userAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: aByteArray) memoryAddress . 0 . 0 .
		0 . 0 . 1
	}
%

category: 'Grail-Calling'
method: CPythonShim
callModule: moduleName method: methodName extendCrc: anInteger withBytes: aByteArray
	"Call a method that takes (int, bytes) and returns an integer."

	^ System userAction: #shimCall withArgs: {
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

	^ System userAction: #shimCall withArgs: {
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

	^ System userAction: #shimCall withArgs: {
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
callTyped: moduleName type: typeName method: methName selfPtr: ptr
	"Call a no-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		0 . 0 . 0 . 0
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1
	"Call a 1-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress . 0 . 0 . 1
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2
	"Call a 2-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress . 0 . 2
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2 with: a3
	"Call a 3-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ System userAction: #shimCallTyped withArgs: {
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

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		0 . 0 . 0 . 8
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1
	"Call a 1-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress . 0 . 0 . (1 bitOr: 8)
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2
	"Call a 2-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress . 0 . (2 bitOr: 8)
	}
%

category: 'Grail-Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2 with: a3
	"Call a 3-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ System userAction: #shimCallTyped withArgs: {
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

	^ System userAction: #shimLoadModule with: moduleName
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
	    (self wrap: (sysInst @env1:___pyAttrLoad___: aName @env0:asString @env0:asSymbol))
	        memoryAddress
	  ] @env0:on: AbstractException do: [:ex | 0]
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
	^ (self wrap: aString) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyUnicode_Substring: aString from: start to: end
	"Python slice semantics: 0-based, end exclusive, clamped to length."

	| len lo hi |
	len := aString size.
	lo := start max: 0.
	hi := end min: len.
	hi < lo ifTrue: [hi := lo].
	^ (self wrap: (aString copyFrom: lo + 1 to: hi)) memoryAddress
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
	keys := aDictionary @env0:keys @env0:asArray.
	n := keys @env0:size.
	posOop @env0:>= n ifTrue: [^ nil].
	key := keys @env0:at: posOop @env0:+ 1.
	value := aDictionary @env0:at: key.
	^ {
		(self @env0:wrap: key) memoryAddress.
		(self @env0:wrap: value) memoryAddress.
		posOop @env0:+ 1.
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
	^ (self wrap: (Array new: size)) memoryAddress
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

	(obj @env0:isKindOf: BoundMethod) ifTrue: [^ true].
	(obj @env0:isKindOf: ExecBlock) ifTrue: [^ true].
	(obj @env0:isKindOf: GsNMethod) ifTrue: [^ true].
	(obj @env0:isKindOf: Behavior) ifTrue: [^ true].
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
	^ System userAction: #shimCall withArgs: {
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
	methodNames := System userAction: #shimDynLoad withArgs: { pathString . moduleName }.
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
	moduleInstance := moduleClass @env0:new.
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
	value := mod perform: attrName asSymbol env: 1.
	^ (self wrap: value) memoryAddress
%
