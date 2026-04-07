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
  classInstVars: #( current libraryPath)
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
CPythonShim category: 'CPython'
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

category: 'Instance Creation'
classmethod: CPythonShim
current
	"Ensure the user action library is loaded and return the singleton."

	current ifNil: [
		current := self basicNew.
		self ensureLoaded.
	].
	^ current
%

category: 'Instance Creation'
classmethod: CPythonShim
reset
	"Release the singleton."

	current := nil.
%

category: 'Configuration'
classmethod: CPythonShim
libraryPath
	"Return the path to the shim user action library."

	libraryPath ifNil: [
		self error: 'CPythonShim library path not configured.'.
	].
	^ libraryPath
%

category: 'Configuration'
classmethod: CPythonShim
libraryPath: aString
	"Set the path to the shim user action library."

	libraryPath := aString.
	current := nil.
%

category: 'Testing'
classmethod: CPythonShim
isActive
	"Return true if the shim singleton has been initialized."

	^ current notNil
%

category: 'Loading'
classmethod: CPythonShim
ensureLoaded
	"Load the user action library if needed, then init the server and types."

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
		current .
		(current wrap: nil) memoryAddress .
		(current wrap: true) memoryAddress .
		(current wrap: false) memoryAddress
	}.
	current initTypeAddresses.
%

! ===============================================================================
! Instance methods - PyObject wrapping
! ===============================================================================

category: 'Private'
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

category: 'Wrapping'
method: CPythonShim
wrap: aValue
	"Look up or create a CByteArray wrapper for aValue.
	Returns the CByteArray instance.
	nil is handled separately since it cannot be a dictionary key."

	| pyObj |
	aValue ifNil: [
		noneWrapper ifNil: [
			noneWrapper := CByteArray gcMalloc: 24.
			noneWrapper int64At: 0 put: 1.
			noneWrapper int64At: 8 put: (self typeAddrFor: aValue).
			self storeOop: nil asOop in: noneWrapper at: 16.
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

category: 'Wrapping'
method: CPythonShim
typeAddrFor: aValue
	"Return the C type address for a Smalltalk value.
	Returns 0 if type addresses not yet initialized.
	Falls back to isKindOf: checks for unregistered subclasses."

	typeAddresses ifNil: [^ 0].
	^ typeAddresses at: aValue class ifAbsent: [
		(aValue isKindOf: String) ifTrue: [^ typeAddresses at: #str].
		(aValue isKindOf: Integer) ifTrue: [^ typeAddresses at: #int].
		(aValue isKindOf: Float) ifTrue: [^ typeAddresses at: #float].
		(aValue isKindOf: ByteArray) ifTrue: [^ typeAddresses at: #bytes].
		typeAddresses at: Object
	]
%

! ===============================================================================
! Instance methods - Type address initialization
! ===============================================================================

category: 'Initialization'
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
	typeAddresses at: Array put: (typeAddresses at: #tuple).
	typeAddresses at: InvariantArray put: (typeAddresses at: #tuple).
	"Patch singletons (created before types were known)"
	noneWrapper int64At: 8 put: (typeAddresses at: UndefinedObject).
	(valueToPyObject at: true) int64At: 8 put: (typeAddresses at: Boolean).
	(valueToPyObject at: false) int64At: 8 put: (typeAddresses at: Boolean).
%

! ===============================================================================
! Instance methods - Reference counting sweep
! ===============================================================================

category: 'Management'
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

category: 'Calling'
method: CPythonShim
callModule: moduleName method: methodName
	"Call a module method with no arguments."

	^ System userAction: #shimCall withArgs: {
		moduleName . methodName .
		0 . 0 . 0 .
		0 . 0 . 0
	}
%

category: 'Calling'
method: CPythonShim
callModule: moduleName method: methodName with: arg1
	"Call a module method with 1 argument."

	^ System userAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: arg1) memoryAddress . 0 . 0 .
		0 . 0 . 1
	}
%

category: 'Calling'
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

category: 'Calling'
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

category: 'Calling'
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

category: 'Calling'
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

! ===============================================================================
! Instance methods - Backwards-compatible specialized calling
! ===============================================================================

category: 'Calling'
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

category: 'Calling'
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

category: 'Calling'
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

category: 'Calling'
method: CPythonShim
callModule: moduleName method: methodName withBytes: aByteArray
	"Call a method that takes (bytes) and returns an integer."

	^ System userAction: #shimCall withArgs: {
		moduleName . methodName .
		(self wrap: aByteArray) memoryAddress . 0 . 0 .
		0 . 0 . 1
	}
%

category: 'Calling'
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
! Instance methods - 6-arg calling (via shimCall6)
! ===============================================================================

category: 'Calling'
method: CPythonShim
callModule6: modDotMethod with: a1 with: a2 with: a3 with: a4 with: a5 with: a6
	"Call a module method with 6 arguments. modDotMethod is 'module.method'.
	Returns a Smalltalk OOP (extracted from result PyObject offset 16)."

	^ System userAction: #shimCall6 withArgs: {
		modDotMethod .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress .
		(self wrap: a3) memoryAddress .
		(self wrap: a4) memoryAddress .
		(self wrap: a5) memoryAddress .
		(self wrap: a6) memoryAddress . 6
	}
%

category: 'Calling'
method: CPythonShim
callModule6ReturnCPtr: modDotMethod with: a1 with: a2 with: a3 with: a4 with: a5 with: a6
	"Call a module method with 6 arguments. Returns a raw C pointer (SmallInteger).
	modDotMethod is 'module.method'."

	^ System userAction: #shimCall6 withArgs: {
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

category: 'Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr
	"Call a no-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		0 . 0 . 0 . 0
	}
%

category: 'Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1
	"Call a 1-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress . 0 . 0 . 1
	}
%

category: 'Calling'
method: CPythonShim
callTyped: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2
	"Call a 2-arg method on a C-allocated typed object. Returns a Smalltalk OOP."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress . 0 . 2
	}
%

category: 'Calling'
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

category: 'Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr
	"Call a no-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		0 . 0 . 0 . 8
	}
%

category: 'Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1
	"Call a 1-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress . 0 . 0 . (1 bitOr: 8)
	}
%

category: 'Calling'
method: CPythonShim
callTypedReturnCPtr: moduleName type: typeName method: methName selfPtr: ptr with: a1 with: a2
	"Call a 2-arg method on a C-allocated typed object. Returns a raw C pointer."

	^ System userAction: #shimCallTyped withArgs: {
		moduleName . typeName . methName . ptr .
		(self wrap: a1) memoryAddress .
		(self wrap: a2) memoryAddress . 0 . (2 bitOr: 8)
	}
%

category: 'Calling'
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

category: 'Module Loading'
method: CPythonShim
loadModule: moduleName
	"Load a C extension module via the shimLoadModule user action.
	The C side caches the module, so subsequent loads are fast.

	Returns true if the module loaded successfully, or signals an error."

	^ System userAction: #shimLoadModule with: moduleName
%

! ===============================================================================
! Instance methods - CPython API (called from C via GciPerform)
!
! These methods are the server-side implementation of the CPython C API.
! The C shim calls GciPerform(server, "PyXxx_Yyy:", ...) for every function.
! ===============================================================================

! --------------- Float API ---------------

category: 'CPython API'
method: CPythonShim
PyFloat_FromDouble: aFloat
	^ (self wrap: aFloat) memoryAddress
%

! --------------- Integer API ---------------

category: 'CPython API'
method: CPythonShim
PyLong_FromSsize_t: anInteger
	^ (self wrap: anInteger) memoryAddress
%

! --------------- String (Unicode) API ---------------

category: 'CPython API'
method: CPythonShim
PyUnicode_FromString: aString
	^ (self wrap: aString) memoryAddress
%

! --------------- Bytes API ---------------

category: 'CPython API'
method: CPythonShim
PyBytes_FromStringAndSize: aByteArray
	^ (self wrap: aByteArray) memoryAddress
%

! --------------- List API ---------------

category: 'CPython API'
method: CPythonShim
PyList_New: size
	^ (self wrap: OrderedCollection new) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyList_Append: aList item: anItem
	aList addLast: anItem.
%

category: 'CPython API'
method: CPythonShim
PyList_GetItem: aList at: zeroBasedIndex
	^ (self wrap: (aList at: zeroBasedIndex + 1)) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyList_SetItem: aList at: zeroBasedIndex put: aValue
	aList at: zeroBasedIndex + 1 put: aValue.
%

category: 'CPython API'
method: CPythonShim
PyList_Insert: aList at: zeroBasedIndex item: anItem
	aList add: anItem beforeIndex: zeroBasedIndex + 1.
%

category: 'CPython API'
method: CPythonShim
PyList_Size: aList
	^ aList size
%

category: 'CPython API'
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

category: 'CPython API'
method: CPythonShim
PyDict_New
	^ (self wrap: KeyValueDictionary new) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyDict_SetItem: aDictionary key: aKey value: aValue
	aDictionary at: aKey put: aValue.
%

category: 'CPython API'
method: CPythonShim
PyDict_SetItemString: aDictionary key: aString value: aValue
	aDictionary at: aString put: aValue.
%

category: 'CPython API'
method: CPythonShim
PyDict_GetItem: aDictionary key: aKey
	(aDictionary includesKey: aKey) ifFalse: [ ^ 0 ].
	^ (self wrap: (aDictionary at: aKey)) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyDict_GetItemString: aDictionary key: aString
	^ self PyDict_GetItem: aDictionary key: aString
%

category: 'CPython API'
method: CPythonShim
PyDict_Contains: aDictionary key: aKey
	^ aDictionary includesKey: aKey
%

category: 'CPython API'
method: CPythonShim
PyDict_DelItem: aDictionary key: aKey
	aDictionary removeKey: aKey.
%

category: 'CPython API'
method: CPythonShim
PyDict_Size: aDictionary
	^ aDictionary size
%

! --------------- Tuple API ---------------

category: 'CPython API'
method: CPythonShim
PyTuple_New: size
	^ (self wrap: (Array new: size)) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyTuple_SetItem: anArray at: zeroBasedIndex put: aValue
	anArray at: zeroBasedIndex + 1 put: aValue.
%

category: 'CPython API'
method: CPythonShim
PyTuple_GetItem: anArray at: zeroBasedIndex
	^ (self wrap: (anArray at: zeroBasedIndex + 1)) memoryAddress
%

! --------------- Object protocol ---------------

category: 'CPython API'
method: CPythonShim
PyObject_GetAttrString: obj name: nameString
	^ (self wrap: (obj perform: nameString asSymbol env: 1)) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyObject_HasAttrString: obj name: nameString
	^ [obj perform: nameString asSymbol env: 1. true]
		on: MessageNotUnderstood, Error
		do: [:e | false]
%

category: 'CPython API'
method: CPythonShim
PyObject_Repr: obj
	^ (self wrap: (obj @env1:__repr__)) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyObject_Str: obj
	^ (self wrap: (obj @env1:__str__)) memoryAddress
%

category: 'CPython API'
method: CPythonShim
PyObject_Length: obj
	^ obj @env1:__len__
%

! --------------- Dynamic module loading ---------------

category: 'Dynamic Loading'
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

category: 'Dynamic Loading'
classmethod: CPythonShim
loadDynamicModule: moduleName fromPath: pathString
	"Dynamically load a .so extension module.
	Creates a module subclass with compiled env:2 methods for each C function.
	Returns an instance of the new class."

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
	"Compile an env:2 method for each C function.
	Each method returns a callable block matching Python's call convention."
	symbolList := System myUserProfile symbolList.
	methodNames do: [:methName |
		| source |
		source := methName , '
	^ [:positional :keywords |
		(CPythonShim perform: #current env: 0) perform: #callModuleDynamic:method:args: env: 0 withArguments: { ''' , moduleName , ''' . ''' , methName , ''' . positional }
	]'.
		moduleClass
			compileMethod: source
			dictionaries: symbolList
			category: 'C Extension'
			environmentId: 1.
	].
	"Create and initialize the instance"
	moduleInstance := moduleClass @env0:new.
	moduleInstance @env1:__name__: moduleName;
		 @env1:__package__: nil.
	^ moduleInstance
%

! --------------- Rich comparison ---------------

category: 'CPython API'
method: CPythonShim
PyObject_RichCompareBool: v with: w op: opInt
	"Dispatch rich comparison to the appropriate Python dunder method.
	op: 0=LT, 1=LE, 2=EQ, 3=NE, 4=GT, 5=GE."

	| selectors selector |
	selectors := #(#'__lt__:' #'__le__:' #'__eq__:' #'__ne__:' #'__gt__:' #'__ge__:').
	selector := selectors at: opInt + 1.
	^ v perform: selector env: 1 withArguments: { w }
%
