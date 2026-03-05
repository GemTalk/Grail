! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
CPythonLibrary ifNil: [self error: 'CPythonLibrary is not defined. Check file ordering.'].
%

! ------- CPythonObject class definition
expectvalue /Class
doit
Object subclass: 'CPythonObject'
  instVarNames: #( pointer isOwned)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
CPythonObject comment:
'Wraps a CPython PyObject* pointer with reference counting and type conversions.

Every CPythonObject either owns a reference (will DecRef on release) or does not.
New references from C API calls are wrapped with fromNewReference:.
Borrowed references are IncRef''d immediately via fromBorrowedReference:.

Callers must explicitly call #release when done, or use ensure: blocks:
	| obj |
	obj := CPythonObject fromString: ''hello''.
	[ obj asString ] ensure: [ obj release ].
'
%

expectvalue /Class
doit
CPythonObject category: 'CPython'
%

! ===============================================================================
! CPythonObject - PyObject* wrapper with reference counting
! ===============================================================================

expectvalue /Metaclass3
doit
CPythonObject removeAllMethods.
CPythonObject class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! Class methods - Constructors
! ===============================================================================

category: 'Instance Creation'
classmethod: CPythonObject
fromNewReference: aCPointer
	"Wrap a PyObject* that we own (new reference). We will DecRef on release."

	(CPythonLibrary isNullCPointer: aCPointer) ifTrue: [ ^ nil ].
	^ self basicNew initPointer: aCPointer owned: true
%

category: 'Instance Creation'
classmethod: CPythonObject
fromBorrowedReference: aCPointer
	"Wrap a PyObject* that we do not own. IncRef it so we can safely hold it."

	| lib |
	(CPythonLibrary isNullCPointer: aCPointer) ifTrue: [ ^ nil ].
	lib := CPythonLibrary current.
	(lib calloutFor: 'Py_IncRef' result: #void args: #(#'ptr'))
		callWith: { aCPointer }.
	^ self basicNew initPointer: aCPointer owned: true
%

! ------------------- Type constructors

category: 'Instance Creation'
classmethod: CPythonObject
fromInteger: anInteger
	"Create a Python int from a Smalltalk Integer."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyLong_FromLong' result: #'ptr' args: #(#'int64'))
		callWith: { anInteger }.
	^ self fromNewReference: ptr
%

category: 'Instance Creation'
classmethod: CPythonObject
fromFloat: aFloat
	"Create a Python float from a Smalltalk Float."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyFloat_FromDouble' result: #'ptr' args: #(#'double'))
		callWith: { aFloat }.
	^ self fromNewReference: ptr
%

category: 'Instance Creation'
classmethod: CPythonObject
fromString: aString
	"Create a Python str from a Smalltalk String."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyUnicode_FromString' result: #'ptr' args: #(#'const char*'))
		callWith: { aString }.
	^ self fromNewReference: ptr
%

category: 'Instance Creation'
classmethod: CPythonObject
fromBoolean: aBoolean
	"Create a Python bool from a Smalltalk Boolean."

	| ptr val |
	val := aBoolean ifTrue: [ 1 ] ifFalse: [ 0 ].
	ptr := (CPythonLibrary current calloutFor: 'PyBool_FromLong' result: #'ptr' args: #(#'int64'))
		callWith: { val }.
	^ self fromNewReference: ptr
%

category: 'Instance Creation'
classmethod: CPythonObject
none
	"Return a CPythonObject wrapping Py_None."

	^ CPythonLibrary current none
%

! ------------------- Collection constructors

category: 'Instance Creation'
classmethod: CPythonObject
newTuple: size
	"Create an empty Python tuple of the given size."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyTuple_New' result: #'ptr' args: #(#'int64'))
		callWith: { size }.
	^ self fromNewReference: ptr
%

category: 'Instance Creation'
classmethod: CPythonObject
newList: size
	"Create a Python list of the given initial size."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyList_New' result: #'ptr' args: #(#'int64'))
		callWith: { size }.
	^ self fromNewReference: ptr
%

category: 'Instance Creation'
classmethod: CPythonObject
newDict
	"Create an empty Python dict."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyDict_New' result: #'ptr' args: #())
		callWith: #().
	^ self fromNewReference: ptr
%

! ===============================================================================
! Instance methods - Initialization and Cleanup
! ===============================================================================

category: 'Initialization'
method: CPythonObject
initPointer: aCPointer owned: aBoolean

	pointer := aCPointer.
	isOwned := aBoolean.
%

category: 'Resource Management'
method: CPythonObject
release
	"Decrement the reference count if we own this reference."

	((isOwned == true) and: [ (CPythonLibrary isNullCPointer: pointer) not ]) ifTrue: [
		(CPythonLibrary current calloutFor: 'Py_DecRef' result: #void args: #(#'ptr'))
			callWith: { pointer }.
		pointer := nil.
		isOwned := false.
	].
%

category: 'Resource Management'
method: CPythonObject
markStolen
	"Mark that this reference has been stolen (e.g. by PyTuple_SetItem).
	We no longer own it and must not DecRef."

	isOwned := false.
%

! ===============================================================================
! Instance methods - Accessing
! ===============================================================================

category: 'Accessing'
method: CPythonObject
pointer
	"Return the raw CPointer (PyObject*)."

	^ pointer
%

category: 'Accessing'
method: CPythonObject
isOwned
	"Return whether we own the reference."

	^ isOwned
%

! ===============================================================================
! Instance methods - Attribute Access
! ===============================================================================

category: 'Attribute Access'
method: CPythonObject
getAttribute: aString
	"Return the named attribute as a new CPythonObject."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyObject_GetAttrString' result: #'ptr' args: #(#'ptr' #'const char*'))
		callWith: { pointer . aString }.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ CPythonLibrary current checkPythonError ].
	^ CPythonObject fromNewReference: ptr
%

category: 'Attribute Access'
method: CPythonObject
setAttribute: aString to: aCPythonObject
	"Set the named attribute to the given value."

	| result |
	result := (CPythonLibrary current calloutFor: 'PyObject_SetAttrString' result: #'int32' args: #(#'ptr' #'const char*' #'ptr'))
		callWith: { pointer . aString . aCPythonObject pointer }.
	result = -1 ifTrue: [ CPythonLibrary current checkPythonError ].
%

! ===============================================================================
! Instance methods - Calling
! ===============================================================================

category: 'Calling'
method: CPythonObject
call
	"Call this object with no arguments."

	^ self callWith: nil
%

category: 'Calling'
method: CPythonObject
callWith: argTupleOrNil
	"Call this object with a tuple of arguments (or nil for no args).
	argTupleOrNil must be a CPythonObject wrapping a Python tuple, or nil."

	| argPtr ptr |
	argPtr := argTupleOrNil ifNotNil: [ argTupleOrNil pointer ].
	ptr := (CPythonLibrary current calloutFor: 'PyObject_CallObject' result: #'ptr' args: #(#'ptr' #'ptr'))
		callWith: { pointer . argPtr }.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ CPythonLibrary current checkPythonError ].
	^ CPythonObject fromNewReference: ptr
%

! ===============================================================================
! Instance methods - Type Conversion (Python to Smalltalk)
! ===============================================================================

category: 'Converting'
method: CPythonObject
asInteger
	"Return the Python int value as a Smalltalk Integer."

	^ (CPythonLibrary current calloutFor: 'PyLong_AsLong' result: #'int64' args: #(#'ptr'))
		callWith: { pointer }
%

category: 'Converting'
method: CPythonObject
asFloat
	"Return the Python float value as a Smalltalk Float."

	^ (CPythonLibrary current calloutFor: 'PyFloat_AsDouble' result: #'double' args: #(#'ptr'))
		callWith: { pointer }
%

category: 'Converting'
method: CPythonObject
asString
	"Return the Python str value as a Smalltalk String."

	^ (CPythonLibrary current calloutFor: 'PyUnicode_AsUTF8' result: #'char*' args: #(#'ptr'))
		callWith: { pointer }
%

category: 'Converting'
method: CPythonObject
asBool
	"Return the Python truthiness as a Smalltalk Boolean."

	| result |
	result := (CPythonLibrary current calloutFor: 'PyObject_IsTrue' result: #'int32' args: #(#'ptr'))
		callWith: { pointer }.
	result = -1 ifTrue: [ CPythonLibrary current checkPythonError ].
	^ result = 1
%

! ===============================================================================
! Instance methods - Inspection
! ===============================================================================

category: 'Inspection'
method: CPythonObject
str
	"Return str(self) as a new CPythonObject (Python string)."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyObject_Str' result: #'ptr' args: #(#'ptr'))
		callWith: { pointer }.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ CPythonLibrary current checkPythonError ].
	^ CPythonObject fromNewReference: ptr
%

category: 'Inspection'
method: CPythonObject
repr
	"Return repr(self) as a new CPythonObject (Python string)."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyObject_Repr' result: #'ptr' args: #(#'ptr'))
		callWith: { pointer }.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ CPythonLibrary current checkPythonError ].
	^ CPythonObject fromNewReference: ptr
%

category: 'Inspection'
method: CPythonObject
type
	"Return the type of this object as a new CPythonObject."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyObject_Type' result: #'ptr' args: #(#'ptr'))
		callWith: { pointer }.
	^ CPythonObject fromNewReference: ptr
%

category: 'Inspection'
method: CPythonObject
isCallable
	"Return true if this object is callable."

	| result |
	result := (CPythonLibrary current calloutFor: 'PyCallable_Check' result: #'int32' args: #(#'ptr'))
		callWith: { pointer }.
	^ result = 1
%

category: 'Inspection'
method: CPythonObject
isInstance: typeObj
	"Return true if this object is an instance of typeObj."

	| result |
	result := (CPythonLibrary current calloutFor: 'PyObject_IsInstance' result: #'int32' args: #(#'ptr' #'ptr'))
		callWith: { pointer . typeObj pointer }.
	result = -1 ifTrue: [ CPythonLibrary current checkPythonError ].
	^ result = 1
%

category: 'Printing'
method: CPythonObject
printOn: aStream
	"Print a human-readable representation."

	| strObj |
	(CPythonLibrary isNullCPointer: pointer) ifTrue: [
		aStream nextPutAll: 'CPythonObject(released)'.
		^ self.
	].
	[
		strObj := self str.
		aStream nextPutAll: 'CPythonObject(' , strObj asString , ')'.
	] ensure: [
		strObj ifNotNil: [ strObj release ].
	].
%

! ===============================================================================
! Instance methods - Tuple Operations
! ===============================================================================

category: 'Tuple'
method: CPythonObject
tupleAt: index put: aCPythonObject
	"Set tuple item at index (0-based). STEALS the reference from aCPythonObject."

	| result |
	aCPythonObject markStolen.
	result := (CPythonLibrary current calloutFor: 'PyTuple_SetItem' result: #'int32' args: #(#'ptr' #'int64' #'ptr'))
		callWith: { pointer . index . aCPythonObject pointer }.
	result = -1 ifTrue: [ CPythonLibrary current checkPythonError ].
%

category: 'Tuple'
method: CPythonObject
tupleAt: index
	"Get tuple item at index (0-based). Returns a borrowed reference."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyTuple_GetItem' result: #'ptr' args: #(#'ptr' #'int64'))
		callWith: { pointer . index }.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ CPythonLibrary current checkPythonError ].
	^ CPythonObject fromBorrowedReference: ptr
%

category: 'Tuple'
method: CPythonObject
tupleSize
	"Return the size of this tuple."

	^ (CPythonLibrary current calloutFor: 'PyTuple_Size' result: #'int64' args: #(#'ptr'))
		callWith: { pointer }
%

! ===============================================================================
! Instance methods - List Operations
! ===============================================================================

category: 'List'
method: CPythonObject
listAt: index put: aCPythonObject
	"Set list item at index (0-based). STEALS the reference from aCPythonObject."

	| result |
	aCPythonObject markStolen.
	result := (CPythonLibrary current calloutFor: 'PyList_SetItem' result: #'int32' args: #(#'ptr' #'int64' #'ptr'))
		callWith: { pointer . index . aCPythonObject pointer }.
	result = -1 ifTrue: [ CPythonLibrary current checkPythonError ].
%

category: 'List'
method: CPythonObject
listAt: index
	"Get list item at index (0-based). Returns a borrowed reference."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyList_GetItem' result: #'ptr' args: #(#'ptr' #'int64'))
		callWith: { pointer . index }.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ CPythonLibrary current checkPythonError ].
	^ CPythonObject fromBorrowedReference: ptr
%

category: 'List'
method: CPythonObject
listAppend: aCPythonObject
	"Append an item to this list. Does NOT steal the reference."

	| result |
	result := (CPythonLibrary current calloutFor: 'PyList_Append' result: #'int32' args: #(#'ptr' #'ptr'))
		callWith: { pointer . aCPythonObject pointer }.
	result = -1 ifTrue: [ CPythonLibrary current checkPythonError ].
%

category: 'List'
method: CPythonObject
listSize
	"Return the size of this list."

	^ (CPythonLibrary current calloutFor: 'PyList_Size' result: #'int64' args: #(#'ptr'))
		callWith: { pointer }
%

! ===============================================================================
! Instance methods - Dict Operations
! ===============================================================================

category: 'Dict'
method: CPythonObject
dictAt: keyString put: aCPythonObject
	"Set a dict item by string key. Does NOT steal the reference."

	| result |
	result := (CPythonLibrary current calloutFor: 'PyDict_SetItemString' result: #'int32' args: #(#'ptr' #'const char*' #'ptr'))
		callWith: { pointer . keyString . aCPythonObject pointer }.
	result = -1 ifTrue: [ CPythonLibrary current checkPythonError ].
%

category: 'Dict'
method: CPythonObject
dictAt: keyString
	"Get a dict item by string key. Returns nil if key is missing (no error).
	Returns a borrowed reference."

	| ptr |
	ptr := (CPythonLibrary current calloutFor: 'PyDict_GetItemString' result: #'ptr' args: #(#'ptr' #'const char*'))
		callWith: { pointer . keyString }.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ ^ nil ].
	^ CPythonObject fromBorrowedReference: ptr
%

category: 'Dict'
method: CPythonObject
dictSize
	"Return the number of items in this dict."

	^ (CPythonLibrary current calloutFor: 'PyDict_Size' result: #'int64' args: #(#'ptr'))
		callWith: { pointer }
%
