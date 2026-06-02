fileformat utf8
set compile_env: 0
! ------------------- Class definition for CPythonLibrary
expectvalue /Class
doit
Object subclass: 'CPythonLibrary'
  instVarNames: #( library callouts)
  classVars: #()
  classInstVars: #( libraryPath pythonHomePath pythonPackagePath)
  poolDictionaries: #()
  inDictionary: EmbeddedPython
  options: #( instancesNonPersistent )

%
expectvalue /Class
doit
CPythonLibrary comment: 
'Singleton wrapper around CPython''s shared library (libpython3.14).

Manages the Python interpreter lifecycle and caches CCallout objects
for all C API functions. Each CCallout is created lazily on first use.

Usage:
	| pythonLibrary |
	pythonLibrary := CPythonLibrary current.
	pythonLibrary runStatements: ''x = 1 + 1''.
	pythonLibrary importModule: ''math''.
'
%
expectvalue /Class
doit
CPythonLibrary category: 'Grail-CPython'
%
! ------------------- Remove existing behavior from CPythonLibrary
removeallmethods CPythonLibrary
removeallclassmethods CPythonLibrary
! ------------------- Class methods for CPythonLibrary
category: 'Grail-Instance Creation'
classmethod: CPythonLibrary
current
	"Session-scoped singleton. Stored in SessionTemps so each OS process starts
	fresh, this avoids stale CLibrary handles that would result from committing the
	instance across sessions."

	^ SessionTemps current at: #CPythonLibrary ifAbsentPut: [ self basicNew initialize ]
%
category: 'Grail-Testing'
classmethod: CPythonLibrary
isActive

	^ (SessionTemps current at: #CPythonLibrary ifAbsent: [ nil ]) notNil
%
category: 'Grail-Testing'
classmethod: CPythonLibrary
isConfigured
	"True if libpython was located at install time (PYTHON_LIB_PATH set)."

	^ libraryPath notNil
%
category: 'Grail-Private'
classmethod: CPythonLibrary
isNullCPointer: aCPointer
	"CCallout returns CPointer with address 0 for NULL, not Smalltalk nil."

	^ aCPointer isNil or: [ aCPointer memoryAddress = 0 ]
%
category: 'Grail-Configuration'
classmethod: CPythonLibrary
libraryPath

	libraryPath ifNil: [
		self error: 'CPython library path not configured. Run install.sh first.'.
	].

	^ libraryPath
%
category: 'Grail-Configuration'
classmethod: CPythonLibrary
libraryPath: aPath

	libraryPath := aPath
%
category: 'Grail-Instance Creation'
classmethod: CPythonLibrary
migrateNew
	"#new is blocked (see CPythonLibrary class >> new); migration needs raw allocation."

	^ self _basicNew
%
category: 'Grail-Instance Creation'
classmethod: CPythonLibrary
new
	"Only one CPythonLibrary per OS process. A second init would try to re-run
	Py_InitializeFromInitConfig against a live interpreter."

	self error: 'Use CPythonLibrary current'
%
category: 'Grail-Constants'
classmethod: CPythonLibrary
pyEvalInput
	"Py_eval_input = 258. Start token for PyRun_String when evaluating a single expression."

	^ 258
%
category: 'Grail-Constants'
classmethod: CPythonLibrary
pyFileInput
	"Py_file_input = 257. Start token for PyRun_String when executing a module-level code block."

	^ 257
%
category: 'Grail-Configuration'
classmethod: CPythonLibrary
pythonHomePath

	pythonHomePath ifNil: [
		self error: 'CPython PYTHONHOME not configured. Run install.sh first.'.
	].

	^ pythonHomePath
%
category: 'Grail-Configuration'
classmethod: CPythonLibrary
pythonHomePath: aPath

	pythonHomePath := aPath
%
category: 'Grail-Configuration'
classmethod: CPythonLibrary
pythonPackagePath

	pythonPackagePath ifNil: [
		self error: 'CPython package path not configured. Run install.sh first.'.
	].

	^ pythonPackagePath
%
category: 'Grail-Configuration'
classmethod: CPythonLibrary
pythonPackagePath: aPath

	pythonPackagePath := aPath
%
category: 'Grail-Instance Creation'
classmethod: CPythonLibrary
reset

	SessionTemps current at: #CPythonLibrary ifPresent: [:pythonLibrary |
		pythonLibrary finalize.
		SessionTemps current removeKey: #CPythonLibrary.
	].
%
! ------------------- Instance methods for CPythonLibrary
category: 'Grail-Module Import'
method: CPythonLibrary
attributeFromMain: attrName
	"Get an attribute from the __main__ module. Caller owns the returned CPythonObject."

	| mainModule |
	mainModule := self importModule: '__main__'.
	[ ^ mainModule getAttribute: attrName ] ensure: [ mainModule release ].
%
category: 'Grail-Private'
method: CPythonLibrary
calloutFor: functionName result: resultType args: argTypes

	^ callouts at: functionName ifAbsentPut: [
		CCallout
			library: library
			name: functionName
			result: resultType
			args: argTypes
	]
%
category: 'Grail-Error Checking'
method: CPythonLibrary
checkPythonError
	"If a Python error is set, fetch it and signal a CPythonException."

	| raisedException typeName message |
	raisedException := CPythonObject fromNewReference: self PyErr_GetRaisedException.
	raisedException ifNil: [ ^ self ].

	[
		| raisedExceptionPythonString |
		typeName := raisedException typeName.
		raisedExceptionPythonString := raisedException str.
		[ message := raisedExceptionPythonString asString ] ensure: [ raisedExceptionPythonString release ].
	] ensure: [ raisedException release ].

	(CPythonException pythonTypeName: typeName message: message) signal.
%
category: 'Grail-Error Checking'
method: CPythonLibrary
checkResult: anInteger
	"Raises a CPythonException if anInteger is -1 (the standard CPython error sentinel)."

	anInteger = -1 ifTrue: [ self checkPythonError ]
%
category: 'Grail-Execution'
method: CPythonLibrary
evalExpression: expression
	"Evaluate a single Python expression in __main__'s namespace and return the result
	as a CPythonObject (new reference owned by the caller). Signals Error on failure.
	Use runStatements: for statements; use this when you need the result back."

	^ self runString: expression start: self class pyEvalInput
%
category: 'Grail-Resource Management'
method: CPythonLibrary
finalize

	^ self Py_FinalizeEx
%
category: 'Grail-Module Import'
method: CPythonLibrary
importModule: moduleName

	^ CPythonObject fromNewReferenceOrError: (self PyImport_ImportModule: moduleName)
%
category: 'Grail-Initialization'
method: CPythonLibrary
initialize

	"The embedded interpreter and the shim cannot coexist in one gem:
	initializing CPython while the shim's C state is already live crashes
	the process. Fail with a catchable Smalltalk error instead.
	CPythonShim >> ensureLoaded is the guard in the other direction."
	CPythonShim isActive ifTrue: [
		self error: 'Cannot use CPythonLibrary: CPythonShim is already active in this session.'.
	].
	library := CLibrary named: self class libraryPath.
	callouts := KeyValueDictionary new.
	self initializePython.
%
category: 'Grail-Initialization'
method: CPythonLibrary
initializePython
	"Initialize CPython using the PyInitConfig API (PEP 741, Python 3.14+).
	Isolated configuration defaults already disable signal handlers
	(equivalent to Py_InitializeEx(0))."

	| config result |
	
	config := self PyInitConfig_Create.
	(self class isNullCPointer: config) ifTrue: [
		Error signal: 'PyInitConfig_Create failed (out of memory)'
	].

	[
		result := self PyInitConfig_SetStr: config name: 'home' value: self class pythonHomePath.
		result = -1 ifTrue: [
			Error signal: 'Failed to set Python home'
		].
		
		result := self Py_InitializeFromInitConfig: config.
		result = -1 ifTrue: [
			Error signal: 'Failed to initialize Python interpreter'
		].
	] ensure: [
		self PyInitConfig_Free: config.
	]
%
category: 'Grail-Testing'
method: CPythonLibrary
isInitialized

	^ self Py_IsInitialized ~= 0
%
category: 'Grail-Accessing'
method: CPythonLibrary
library

	^ library
%
category: 'Grail-Constants'
method: CPythonLibrary
none

	^ CPythonObject fromBorrowedReference: (self Py_GetConstantBorrowed: 0)
%
category: 'Grail-Constants'
method: CPythonLibrary
noneNewReference
	"Return a raw CPointer to Py_None with an incremented refcount.
	For use in CCallin callbacks that must return an owned PyObject*."

	| ptr |
	
	ptr := self Py_GetConstantBorrowed: 0.
	self Py_IncRef: ptr.
	
	^ ptr
%
category: 'Grail-C API - Bool'
method: CPythonLibrary
PyBool_FromLong: anInt
	"New reference to the Py_True or Py_False singleton. 0=False, nonzero=True."

	^ (self calloutFor: 'PyBool_FromLong' result: #'ptr' args: #(#'int64'))
		callWith: { anInt }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyCallable_Check: aPtr
	"1 if callable, 0 otherwise. Always succeeds."

	^ (self calloutFor: 'PyCallable_Check' result: #'int32' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Dict'
method: CPythonLibrary
PyDict_GetItemString_from: aPtr key: keyString
	"Borrowed reference, or NULL if absent."

	^ (self calloutFor: 'PyDict_GetItemString' result: #'ptr' args: #(#'ptr' #'const char*'))
		callWith: { aPtr . keyString }
%
category: 'Grail-C API - Dict'
method: CPythonLibrary
PyDict_GetItem_from: aPtr key: keyPtr
	"Borrowed reference, or NULL if absent. Does NOT set an exception on missing key.
	Silently suppresses exceptions from __hash__/__eq__ (cannot distinguish 'not found' from 'error').
	Consider PyDict_GetItemWithError for safer error handling."

	^ (self calloutFor: 'PyDict_GetItem' result: #'ptr' args: #(#'ptr' #'ptr'))
		callWith: { aPtr . keyPtr }
%
category: 'Grail-C API - Dict'
method: CPythonLibrary
PyDict_Keys: aPtr
	"New reference to an actual PyList (not a view). Caller must DecRef."

	^ (self calloutFor: 'PyDict_Keys' result: #'ptr' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Dict'
method: CPythonLibrary
PyDict_New
	"New reference."

	^ (self calloutFor: 'PyDict_New' result: #'ptr' args: #())
		callWith: #()
%
category: 'Grail-C API - Dict'
method: CPythonLibrary
PyDict_SetItemString_in: aPtr key: keyString value: valuePtr
	"Does NOT steal the reference. Returns 0 on success, -1 on error."

	^ (self calloutFor: 'PyDict_SetItemString' result: #'int32' args: #(#'ptr' #'const char*' #'ptr'))
		callWith: { aPtr . keyString . valuePtr }
%
category: 'Grail-C API - Dict'
method: CPythonLibrary
PyDict_SetItem_in: aPtr key: keyPtr value: valuePtr
	"Does NOT steal references to key or value. Returns 0 on success, -1 on error."

	^ (self calloutFor: 'PyDict_SetItem' result: #'int32' args: #(#'ptr' #'ptr' #'ptr'))
		callWith: { aPtr . keyPtr . valuePtr }
%
category: 'Grail-C API - Dict'
method: CPythonLibrary
PyDict_Size: aPtr
	"Returns -1 on error (not 0)."

	^ (self calloutFor: 'PyDict_Size' result: #'int64' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Errors'
method: CPythonLibrary
PyErr_GetRaisedException
	"New reference to the exception instance, or NULL if none. Clears the error indicator."

	^ (self calloutFor: 'PyErr_GetRaisedException' result: #'ptr' args: #())
		callWith: #()
%
category: 'Grail-C API - Errors'
method: CPythonLibrary
PyErr_Occurred
	"Borrowed reference to the exception type (not the instance), or NULL if none.
	Do not compare directly to types, use PyErr_ExceptionMatches for subclass handling."

	^ (self calloutFor: 'PyErr_Occurred' result: #'ptr' args: #())
		callWith: #()
%
category: 'Grail-C API - Errors'
method: CPythonLibrary
PyErr_SetString: exceptionType message: messageString
	"Sets the error indicator. exceptionType is a CPointer to a Python exception class
	(e.g. RuntimeError). messageString is a Smalltalk String (auto-converted to char*).
	Does not return a value. The caller should return NULL to propagate the error."

	(self calloutFor: 'PyErr_SetString' result: #void args: #(#'ptr' #'const char*'))
		callWith: { exceptionType . messageString }
%
category: 'Grail-Constants'
method: CPythonLibrary
pyFalse

	^ CPythonObject fromBorrowedReference: (self Py_GetConstantBorrowed: 1)
%
category: 'Grail-C API - Float'
method: CPythonLibrary
PyFloat_AsDouble: aPtr
	"Returns -1.0 on error, which is also a valid value. Must call PyErr_Occurred to disambiguate."

	^ (self calloutFor: 'PyFloat_AsDouble' result: #'double' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Float'
method: CPythonLibrary
PyFloat_FromDouble: aFloat
	"New reference."

	^ (self calloutFor: 'PyFloat_FromDouble' result: #'ptr' args: #(#'double'))
		callWith: { aFloat }
%
category: 'Grail-C API - Module'
method: CPythonLibrary
PyImport_ImportModule: moduleName
	"New reference, or NULL on error. Always uses absolute imports.
	For 'package.sub', returns the top-level package (not the submodule)."

	^ (self calloutFor: 'PyImport_ImportModule' result: #'ptr' args: #(#'const char*'))
		callWith: { moduleName }
%
category: 'Grail-C API - Lifecycle'
method: CPythonLibrary
PyInitConfig_Create
	"Returns NULL on allocation failure. Uses Isolated Configuration defaults
	(signal handlers disabled, UTF-8 mode). Must be freed with PyInitConfig_Free:
	in all code paths, including errors."

	^ (self calloutFor: 'PyInitConfig_Create' result: #'ptr' args: #())
		callWith: #()
%
category: 'Grail-C API - Lifecycle'
method: CPythonLibrary
PyInitConfig_Free: configPtr
	"Safe to call with NULL (no-op)."

	(self calloutFor: 'PyInitConfig_Free' result: #void args: #(#'ptr'))
		callWith: { configPtr }
%
category: 'Grail-C API - Lifecycle'
method: CPythonLibrary
PyInitConfig_SetStr: configPtr name: nameString value: valueString
	"Input string is copied, caller retains ownership. Returns 0 on success, -1 on error.
	Errors are stored in the config object, not as Python exceptions."

	^ (self calloutFor: 'PyInitConfig_SetStr' result: #'int32' args: #(#'ptr' #'const char*' #'const char*'))
		callWith: { configPtr . nameString . valueString }
%
category: 'Grail-C API - List'
method: CPythonLibrary
PyList_Append_to: listPtr item: itemPtr
	"Does NOT steal the reference (IncRefs internally). Returns 0 on success, -1 on error."

	^ (self calloutFor: 'PyList_Append' result: #'int32' args: #(#'ptr' #'ptr'))
		callWith: { listPtr . itemPtr }
%
category: 'Grail-C API - List'
method: CPythonLibrary
PyList_GetItem_from: aPtr at: index
	"Borrowed reference. Not safe in free-threaded builds (another thread may modify the list)."

	^ (self calloutFor: 'PyList_GetItem' result: #'ptr' args: #(#'ptr' #'int64'))
		callWith: { aPtr . index }
%
category: 'Grail-C API - List'
method: CPythonLibrary
PyList_New: size
	"New reference. Items initialized to NULL, must set all items before exposing to Python code."

	^ (self calloutFor: 'PyList_New' result: #'ptr' args: #(#'int64'))
		callWith: { size }
%
category: 'Grail-C API - List'
method: CPythonLibrary
PyList_SetItem_in: aPtr at: index put: itemPtr
	"STEALS the reference to itemPtr. Also DecRefs the old item at that position.
	Returns 0 on success, -1 on error."

	^ (self calloutFor: 'PyList_SetItem' result: #'int32' args: #(#'ptr' #'int64' #'ptr'))
		callWith: { aPtr . index . itemPtr }
%
category: 'Grail-C API - List'
method: CPythonLibrary
PyList_Size: aPtr
	"Returns -1 on error (not 0)."

	^ (self calloutFor: 'PyList_Size' result: #'int64' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Integer'
method: CPythonLibrary
PyLong_AsLong: aPtr
	"Returns -1 on error, which is also a valid value (must call PyErr_Occurred to disambiguate).
	Raises OverflowError if the Python int exceeds C long range.
	C 'long' is 64-bit on Linux x86_64; on Windows (32-bit long), use #int32."

	^ (self calloutFor: 'PyLong_AsLong' result: #'int64' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Integer'
method: CPythonLibrary
PyLong_FromLong: anInt
	"New reference. CPython caches integers in [-5, 256], returns the cached singleton.
	C 'long' is 64-bit on Linux x86_64; on Windows (32-bit long), use #int32."

	^ (self calloutFor: 'PyLong_FromLong' result: #'ptr' args: #(#'int64'))
		callWith: { anInt }
%
category: 'Grail-C API - Module'
method: CPythonLibrary
PyModule_GetDict_from: aPtr
	"Borrowed reference to the actual namespace dict (not a copy), mutations affect the module.
	NULL input is undefined behavior."

	^ (self calloutFor: 'PyModule_GetDict' result: #'ptr' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyObject_CallObject: callable args: argsPtr
	"New reference, or NULL on error. argsPtr can be NULL (no arguments); unlike PyObject_Call
	which requires non-NULL. Does not support keyword arguments."

	^ (self calloutFor: 'PyObject_CallObject' result: #'ptr' args: #(#'ptr' #'ptr'))
		callWith: { callable . argsPtr }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyObject_GetAttrString_from: aPtr attr: attributeName
	"New reference, or NULL with AttributeError set if not found."

	^ (self calloutFor: 'PyObject_GetAttrString' result: #'ptr' args: #(#'ptr' #'const char*'))
		callWith: { aPtr . attributeName }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyObject_IsInstance: aPtr of: typePtr
	"1 if instance, 0 if not, -1 on error. typePtr can be a tuple (matches any entry)."

	^ (self calloutFor: 'PyObject_IsInstance' result: #'int32' args: #(#'ptr' #'ptr'))
		callWith: { aPtr . typePtr }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyObject_IsTrue: aPtr
	"1 if true, 0 if false, -1 on error. Calls __bool__() then __len__()."

	^ (self calloutFor: 'PyObject_IsTrue' result: #'int32' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyObject_Repr: aPtr
	"New reference. Same NULL-returns-'<NULL>' behavior as PyObject_Str."

	^ (self calloutFor: 'PyObject_Repr' result: #'ptr' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyObject_SetAttrString_on: aPtr attr: attributeName value: valuePtr
	"Returns 0 on success, -1 on error. Passing NULL as valuePtr deletes the attribute."

	^ (self calloutFor: 'PyObject_SetAttrString' result: #'int32' args: #(#'ptr' #'const char*' #'ptr'))
		callWith: { aPtr . attributeName . valuePtr }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyObject_Str: aPtr
	"New reference. NULL input returns the string '<NULL>' (not NULL)."

	^ (self calloutFor: 'PyObject_Str' result: #'ptr' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Object'
method: CPythonLibrary
PyObject_Type: aPtr
	"New reference. Raises SystemError on NULL input. More overhead than the Py_TYPE macro
	(which returns borrowed), but Py_TYPE is not available via FFI."

	^ (self calloutFor: 'PyObject_Type' result: #'ptr' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Execution'
method: CPythonLibrary
PyRun_String: sourceCode start: startInt globals: globalsPtr locals: localsPtr
	"New reference to the result, or NULL on error (accessible via PyErr_*).
	globals must be a dict; locals can be any mapping. With Py_file_input (257),
	the return value for statements is Py_None (not the last expression's value)."

	^ (self calloutFor: 'PyRun_String' result: #'ptr'
		args: #(#'const char*' #'int32' #'ptr' #'ptr'))
		callWith: { sourceCode . startInt . globalsPtr . localsPtr }
%
category: 'Grail-Constants'
method: CPythonLibrary
pyTrue

	^ CPythonObject fromBorrowedReference: (self Py_GetConstantBorrowed: 2)
%
category: 'Grail-C API - Tuple'
method: CPythonLibrary
PyTuple_GetItem_from: aPtr at: index
	"Borrowed reference. Negative indices are NOT supported (returns NULL + IndexError)."

	^ (self calloutFor: 'PyTuple_GetItem' result: #'ptr' args: #(#'ptr' #'int64'))
		callWith: { aPtr . index }
%
category: 'Grail-C API - Tuple'
method: CPythonLibrary
PyTuple_New: size
	"New reference. Slots are uninitialized, caller MUST set every slot before the tuple is visible to Python."

	^ (self calloutFor: 'PyTuple_New' result: #'ptr' args: #(#'int64'))
		callWith: { size }
%
category: 'Grail-C API - Tuple'
method: CPythonLibrary
PyTuple_SetItem_in: aPtr at: index put: itemPtr
	"STEALS the reference to itemPtr. Also DecRefs the old item at that position.
	Returns 0 on success, -1 on error."

	^ (self calloutFor: 'PyTuple_SetItem' result: #'int32' args: #(#'ptr' #'int64' #'ptr'))
		callWith: { aPtr . index . itemPtr }
%
category: 'Grail-C API - Tuple'
method: CPythonLibrary
PyTuple_Size: aPtr
	"Returns -1 on error (not 0)."

	^ (self calloutFor: 'PyTuple_Size' result: #'int64' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Unicode'
method: CPythonLibrary
PyUnicode_AsUTF8: aPtr
	"Returns a char* into the object's internal cached buffer (valid only while the object lives).
	Copy to Smalltalk before releasing. Truncates at embedded NUL characters."

	^ (self calloutFor: 'PyUnicode_AsUTF8' result: #'char*' args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Unicode'
method: CPythonLibrary
PyUnicode_FromString: utf8String
	"New reference. Input must be valid UTF-8 and null-terminated; NULL input is undefined behavior."

	^ (self calloutFor: 'PyUnicode_FromString' result: #'ptr' args: #(#'const char*'))
		callWith: { utf8String }
%
category: 'Grail-C API - References'
method: CPythonLibrary
Py_DecRef: aPtr
	"NULL-safe. Can trigger arbitrary Python code via __del__ during deallocation."

	(self calloutFor: 'Py_DecRef' result: #void args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Lifecycle'
method: CPythonLibrary
Py_FinalizeEx
	"Returns -1 if errors occurred (e.g. flushing buffered data). Must be called from the
	main thread. C extensions are NOT unloaded; reinitializing after finalize can break them."

	^ (self calloutFor: 'Py_FinalizeEx' result: #'int32' args: #())
		callWith: #()
%
category: 'Grail-C API - Constants'
method: CPythonLibrary
Py_GetConstantBorrowed: index
	"Borrowed reference. All returned objects are immortal (refcounting is a no-op).
	Indices: 0=None, 1=False, 2=True, 3=Ellipsis, 4=NotImplemented, 5=zero, 6=one,
	7=empty string, 8=empty bytes, 9=empty tuple."

	^ (self calloutFor: 'Py_GetConstantBorrowed' result: #'ptr' args: #(#'uint32'))
		callWith: { index }
%
category: 'Grail-C API - Lifecycle'
method: CPythonLibrary
Py_GetVersion
	"Returns a pointer to static storage; do not free or modify.
	Safe to call before Py_Initialize. The string includes build info after the first space."

	^ (self calloutFor: 'Py_GetVersion' result: #'char*' args: #())
		callWith: #()
%
category: 'Grail-C API - References'
method: CPythonLibrary
Py_IncRef: aPtr
	"NULL-safe (unlike the Py_INCREF macro). No-op on immortal objects (None, True, False, small ints)."

	(self calloutFor: 'Py_IncRef' result: #void args: #(#'ptr'))
		callWith: { aPtr }
%
category: 'Grail-C API - Lifecycle'
method: CPythonLibrary
Py_InitializeFromInitConfig: configPtr
	"Returns 0 on success, -1 on error or exit request (e.g. --help).
	Config must be freed regardless of return value."

	^ (self calloutFor: 'Py_InitializeFromInitConfig' result: #'int32' args: #(#'ptr'))
		callWith: { configPtr }
%
category: 'Grail-C API - Lifecycle'
method: CPythonLibrary
Py_IsInitialized
	"Safe to call at any time (before init, after finalize). Returns nonzero (not necessarily 1) when initialized."

	^ (self calloutFor: 'Py_IsInitialized' result: #'int32' args: #())
		callWith: #()
%
category: 'Grail-Execution'
method: CPythonLibrary
runStatements: sourceCode
	"Execute Python source in __main__'s namespace. Signals CPythonException on failure."

	| result |

	result := self runString: sourceCode start: self class pyFileInput.
	result release.
%
category: 'Grail-Private'
method: CPythonLibrary
runString: sourceCode start: startToken
	"Run sourceCode in __main__'s namespace with the given start token
	(pyFileInput for statements, pyEvalInput for expressions).
	Returns a CPythonObject (new reference owned by the caller)."

	| mainModule mainDict |
	mainModule := self importModule: '__main__'.
	[
		mainDict := self PyModule_GetDict_from: mainModule pointer.
		^ CPythonObject fromNewReferenceOrError:
			(self PyRun_String: sourceCode start: startToken globals: mainDict locals: mainDict).
	] ensure: [ mainModule release ].
%
category: 'Grail-CCallin'
method: CPythonLibrary
trampolineAddressFor: aCallin block: aBlock
	"Extract the CCallin trampoline address as a SmallInteger.
	Uses PyLong_FromVoidPtr from libpython as the address extractor."

	| callout pyLong address |

	callout := CCallout library: library name: 'PyLong_FromVoidPtr'
		result: #ptr args: { aCallin }.

	pyLong := CPythonObject fromNewReference: (callout callWith: { aBlock }).
	address := pyLong asInteger.
	pyLong release.

	^ address
%
category: 'Grail-Accessing'
method: CPythonLibrary
version

	^ self Py_GetVersion
%
