fileformat utf8
set compile_env: 0
! ------------------- Class definition for CPythonObject
expectvalue /Class
doit
Object subclass: 'CPythonObject'
  instVarNames: #( pointer isOwned)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPython
  options: #( instancesNonPersistent )

%
expectvalue /Class
doit
CPythonObject comment: 
'Wraps a CPython PyObject* pointer with reference counting and type conversions.

Every CPythonObject either owns a reference (will DecRef on release) or does not.
New references from C API calls are wrapped with fromNewReference:.
Borrowed references are IncRef''d immediately via fromBorrowedReference:.

Senders must explicitly send #release when done, or use ensure: blocks:
	| obj |
	obj := CPythonObject fromString: ''hello''.
	[ obj asString ] ensure: [ obj release ].
'
%
expectvalue /Class
doit
CPythonObject category: 'Grail-CPython'
%
! ------------------- Remove existing behavior from CPythonObject
removeallmethods CPythonObject
removeallclassmethods CPythonObject
! ------------------- Class methods for CPythonObject
category: 'Grail-Instance Creation'
classmethod: CPythonObject
fromBoolean: aBoolean

	^ self fromNewReference: (CPythonLibrary current PyBool_FromLong:
		(aBoolean ifTrue: [ 1 ] ifFalse: [ 0 ]))
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
fromBorrowedReference: aCPointer

	| pythonLibrary |
	(CPythonLibrary isNullCPointer: aCPointer) ifTrue: [ ^ nil ].
	pythonLibrary := CPythonLibrary current.
	pythonLibrary Py_IncRef: aCPointer.
	^ self basicNew initPointer: aCPointer
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
fromBorrowedReferenceOrError: aCPointer
	"Wrap a borrowed reference, raising CPythonException on NULL.
	If NULL with no Python error set, falls back to a generic Error."

	(CPythonLibrary isNullCPointer: aCPointer) ifTrue: [
		CPythonLibrary current checkPythonError.
		Error signal: 'Python call returned NULL with no exception set' ].
	^ self fromBorrowedReference: aCPointer
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
fromFloat: aFloat

	^ self fromNewReference: (CPythonLibrary current PyFloat_FromDouble: aFloat)
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
fromInteger: anInteger

	^ self fromNewReference: (CPythonLibrary current PyLong_FromLong: anInteger)
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
fromNewReference: aCPointer

	(CPythonLibrary isNullCPointer: aCPointer) ifTrue: [ ^ nil ].
	^ self basicNew initPointer: aCPointer
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
fromNewReferenceOrError: aCPointer
	"Wrap a new reference, raising CPythonException on NULL.
	If NULL with no Python error set, falls back to a generic Error."

	(CPythonLibrary isNullCPointer: aCPointer) ifTrue: [
		CPythonLibrary current checkPythonError.
		Error signal: 'Python call returned NULL with no exception set' ].
	^ self fromNewReference: aCPointer
%
category: 'Grail-Converting'
classmethod: CPythonObject
fromSmalltalk: anObject
	"Replicate a native Smalltalk object as a CPythonObject."

	^ PythonReplicator new gemStoneToPython: anObject
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
fromString: aString

	"Refuse nil here: a CCallout #'const char*' arg maps nil to C NULL,
	and PyUnicode_FromString(NULL) is undefined behavior — it SEGVs the
	gem.  Fail as a clean Smalltalk error instead."
	aString ifNil: [
		^ ArgumentError signal: 'CPythonObject fromString: requires a String, got nil' ].
	^ self fromNewReference: (CPythonLibrary current PyUnicode_FromString: aString)
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
newDict

	^ self fromNewReference: CPythonLibrary current PyDict_New
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
newList: size

	^ self fromNewReference: (CPythonLibrary current PyList_New: size)
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
newTuple: size

	^ self fromNewReference: (CPythonLibrary current PyTuple_New: size)
%
category: 'Grail-Instance Creation'
classmethod: CPythonObject
none

	^ CPythonLibrary current none
%
! ------------------- Instance methods for CPythonObject
category: 'Grail-Converting'
method: CPythonObject
asBool

	| result |
	result := CPythonLibrary current PyObject_IsTrue: pointer.
	CPythonLibrary current checkResult: result.
	^ result = 1
%
category: 'Grail-Converting'
method: CPythonObject
asFloat

	^ CPythonLibrary current PyFloat_AsDouble: pointer
%
category: 'Grail-Converting'
method: CPythonObject
asInteger

	^ CPythonLibrary current PyLong_AsLong: pointer
%
category: 'Grail-Converting'
method: CPythonObject
asSmalltalk
	"Replicate this Python object as its native Smalltalk equivalent."

	^ PythonReplicator new pythonToGemStone: self
%
category: 'Grail-Converting'
method: CPythonObject
asString
	"Copies the result: PyUnicode_AsUTF8 returns a pointer into Python's
	internal buffer, which becomes invalid if the object is released."

	^ (CPythonLibrary current PyUnicode_AsUTF8: pointer) copy
%
category: 'Grail-Calling'
method: CPythonObject
call

	^ self callWith: nil
%
category: 'Grail-Calling'
method: CPythonObject
callWith: argTupleOrNil
	"PyObject_CallObject accepts NULL for the args parameter (= no arguments).
	GemStone CCallout passes Smalltalk nil as C NULL."

	| argPtr |
	argPtr := argTupleOrNil ifNotNil: [ argTupleOrNil pointer ].
	^ CPythonObject fromNewReferenceOrError:
		(CPythonLibrary current PyObject_CallObject: pointer args: argPtr)
%
category: 'Grail-Calling'
method: CPythonObject
callWithArguments: anArray
	"Builds a tuple internally; the caller's objects are not affected."

	| argTuple result |
	anArray isEmpty ifTrue: [ ^ self callWith: nil ].
	argTuple := CPythonObject newTuple: anArray size.
	[
		1 to: anArray size do: [ :i |
			argTuple tupleAt: i - 1 putBorrowed: (anArray at: i).
		].
		result := self callWith: argTuple.
	] ensure: [ argTuple release ].
	^ result
%
category: 'Grail-Dict'
method: CPythonObject
dictAt: keyString
	"Returns nil if the key is absent (no error is set)."

	| ptr |
	ptr := CPythonLibrary current PyDict_GetItemString_from: pointer key: keyString.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ ^ nil ].
	^ CPythonObject fromBorrowedReference: ptr
%
category: 'Grail-Dict'
method: CPythonObject
dictAt: keyString put: aCPythonObject

	CPythonLibrary current checkResult:
		(CPythonLibrary current PyDict_SetItemString_in: pointer key: keyString value: aCPythonObject pointer)
%
category: 'Grail-Dict'
method: CPythonObject
dictAtObject: aCPythonObject
	"Returns nil if absent."

	| ptr |
	ptr := CPythonLibrary current PyDict_GetItem_from: pointer key: aCPythonObject pointer.
	(CPythonLibrary isNullCPointer: ptr) ifTrue: [ ^ nil ].
	^ CPythonObject fromBorrowedReference: ptr
%
category: 'Grail-Dict'
method: CPythonObject
dictAtObject: keyObj put: aCPythonObject

	CPythonLibrary current checkResult:
		(CPythonLibrary current PyDict_SetItem_in: pointer key: keyObj pointer value: aCPythonObject pointer)
%
category: 'Grail-Dict'
method: CPythonObject
dictKeys

	^ CPythonObject fromNewReferenceOrError: (CPythonLibrary current PyDict_Keys: pointer)
%
category: 'Grail-Dict'
method: CPythonObject
dictKeysDo: aBlock
	"Iterate dict keys, yielding each as a CPythonObject. Handles release."

	| keys |
	keys := self dictKeys.
	[
		0 to: keys listSize - 1 do: [ :i |
			| pyKey |
			pyKey := keys listAt: i.
			[ aBlock value: pyKey ] ensure: [ pyKey release ].
		].
	] ensure: [ keys release ].
%
category: 'Grail-Dict'
method: CPythonObject
dictSize

	^ CPythonLibrary current PyDict_Size: pointer
%
category: 'Grail-Attribute Access'
method: CPythonObject
getAttribute: aString

	^ CPythonObject fromNewReferenceOrError:
		(CPythonLibrary current PyObject_GetAttrString_from: pointer attr: aString)
%
category: 'Grail-Initialization'
method: CPythonObject
initPointer: aCPointer

	pointer := aCPointer.
	isOwned := true.
%
category: 'Grail-Testing'
method: CPythonObject
isCallable

	^ (CPythonLibrary current PyCallable_Check: pointer) = 1
%
category: 'Grail-Testing'
method: CPythonObject
isInstance: typeObj

	| result |
	result := CPythonLibrary current PyObject_IsInstance: pointer of: typeObj pointer.
	CPythonLibrary current checkResult: result.
	^ result = 1
%
category: 'Grail-Accessing'
method: CPythonObject
isOwned

	^ isOwned
%
category: 'Grail-List'
method: CPythonObject
listAppend: aCPythonObject
	"Does NOT steal the reference."

	CPythonLibrary current checkResult:
		(CPythonLibrary current PyList_Append_to: pointer item: aCPythonObject pointer)
%
category: 'Grail-List'
method: CPythonObject
listAt: index

	^ CPythonObject fromBorrowedReferenceOrError:
		(CPythonLibrary current PyList_GetItem_from: pointer at: index)
%
category: 'Grail-List'
method: CPythonObject
listAt: index put: aCPythonObject
	"STEALS the reference from aCPythonObject."

	aCPythonObject markStolen.
	CPythonLibrary current checkResult:
		(CPythonLibrary current PyList_SetItem_in: pointer at: index put: aCPythonObject pointer)
%
category: 'Grail-List'
method: CPythonObject
listSize

	^ CPythonLibrary current PyList_Size: pointer
%
category: 'Grail-Resource Management'
method: CPythonObject
markStolen
	"Mark that this reference has been stolen (e.g. by PyTuple_SetItem).
	We no longer own it and must not DecRef."

	isOwned := false.
%
category: 'Grail-Accessing'
method: CPythonObject
pointer

	^ pointer
%
category: 'Grail-Printing'
method: CPythonObject
printOn: aStream

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
category: 'Grail-Resource Management'
method: CPythonObject
release

	(isOwned and: [ (CPythonLibrary isNullCPointer: pointer) not ]) ifTrue: [
		CPythonLibrary current Py_DecRef: pointer.
	].
	pointer := nil.
	isOwned := false.
%
category: 'Grail-Inspection'
method: CPythonObject
repr

	^ CPythonObject fromNewReferenceOrError: (CPythonLibrary current PyObject_Repr: pointer)
%
category: 'Grail-Calling'
method: CPythonObject
send: methodName

	| method |
	method := self getAttribute: methodName.
	[ ^ method call ] ensure: [ method release ].
%
category: 'Grail-Calling'
method: CPythonObject
send: methodName withArguments: anArray
	"Does not support keyword arguments."

	| method |
	method := self getAttribute: methodName.
	[ ^ method callWithArguments: anArray ] ensure: [ method release ].
%
category: 'Grail-Attribute Access'
method: CPythonObject
setAttribute: aString to: aCPythonObject

	CPythonLibrary current checkResult:
		(CPythonLibrary current PyObject_SetAttrString_on: pointer attr: aString value: aCPythonObject pointer)
%
category: 'Grail-Inspection'
method: CPythonObject
str

	^ CPythonObject fromNewReferenceOrError: (CPythonLibrary current PyObject_Str: pointer)
%
category: 'Grail-Tuple'
method: CPythonObject
tupleAt: index

	^ CPythonObject fromBorrowedReferenceOrError:
		(CPythonLibrary current PyTuple_GetItem_from: pointer at: index)
%
category: 'Grail-Tuple'
method: CPythonObject
tupleAt: index put: aCPythonObject
	"STEALS the reference from aCPythonObject."

	aCPythonObject markStolen.
	CPythonLibrary current checkResult:
		(CPythonLibrary current PyTuple_SetItem_in: pointer at: index put: aCPythonObject pointer)
%
category: 'Grail-Tuple'
method: CPythonObject
tupleAt: index putBorrowed: aCPythonObject
	"Set tuple slot to aCPythonObject's pointer, IncRef'ing instead of stealing.
	The sender retains ownership."

	| pythonLibrary itemPtr |
	pythonLibrary := CPythonLibrary current.
	itemPtr := aCPythonObject pointer.
	pythonLibrary Py_IncRef: itemPtr.
	pythonLibrary checkResult:
		(pythonLibrary PyTuple_SetItem_in: pointer at: index put: itemPtr)
%
category: 'Grail-Tuple'
method: CPythonObject
tupleSize

	^ CPythonLibrary current PyTuple_Size: pointer
%
category: 'Grail-Inspection'
method: CPythonObject
type

	^ CPythonObject fromNewReference: (CPythonLibrary current PyObject_Type: pointer)
%
category: 'Grail-Inspection'
method: CPythonObject
typeName
	"Returns the Python type name as a Smalltalk String.
	Uses raw pointers to avoid allocating intermediate CPythonObject wrappers."

	| pythonLibrary typePtr namePtr |
	pythonLibrary := CPythonLibrary current.
	typePtr := pythonLibrary PyObject_Type: pointer.
	[
		namePtr := pythonLibrary PyObject_GetAttrString_from: typePtr attr: '__name__'.
		[ ^ (pythonLibrary PyUnicode_AsUTF8: namePtr) copy ]
			ensure: [ pythonLibrary Py_DecRef: namePtr ]
	] ensure: [ pythonLibrary Py_DecRef: typePtr ]
%
