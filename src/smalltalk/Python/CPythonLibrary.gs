! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- CPythonLibrary class definition
expectvalue /Class
doit
Object subclass: 'CPythonLibrary'
  instVarNames: #( library callouts pythonHome)
  classVars: #()
  classInstVars: #( current libraryPath pythonHomePath)
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
CPythonLibrary comment:
'Singleton wrapper around CPython''s shared library (libpython3.14).

Manages the Python interpreter lifecycle and caches CCallout objects
for all C API functions. Each CCallout is created lazily on first use.

Usage:
	| lib |
	lib := CPythonLibrary current.
	lib runSimpleString: ''x = 1 + 1''.
	lib importModule: ''math''.
'
%

expectvalue /Class
doit
CPythonLibrary category: 'CPython'
%

! ===============================================================================
! CPythonLibrary - FFI bridge to CPython's C API
! ===============================================================================

expectvalue /Metaclass3
doit
CPythonLibrary removeAllMethods.
CPythonLibrary class removeAllMethods.
%

set compile_env: 0

! ------------------- Class methods

category: 'Instance Creation'
classmethod: CPythonLibrary
current
	"Return the singleton instance. Creates and initializes on first access."

	current ifNil: [
		current := self basicNew initialize.
	].
	^ current
%

category: 'Instance Creation'
classmethod: CPythonLibrary
reset
	"Finalize the Python interpreter and release the singleton."

	current ifNotNil: [
		current finalize.
		current := nil.
	].
%

category: 'Configuration'
classmethod: CPythonLibrary
libraryPath
	"Return the path to the CPython shared library."

	libraryPath ifNil: [
		self error: 'CPython library path not configured. Run install.sh first.'.
	].
	^ libraryPath
%

category: 'Configuration'
classmethod: CPythonLibrary
libraryPath: aString
	"Set the path to the CPython shared library."

	libraryPath := aString
%

category: 'Configuration'
classmethod: CPythonLibrary
pythonHomePath
	"Return the PYTHONHOME prefix for the embedded interpreter."

	pythonHomePath ifNil: [
		self error: 'CPython PYTHONHOME not configured. Run install.sh first.'.
	].
	^ pythonHomePath
%

category: 'Configuration'
classmethod: CPythonLibrary
pythonHomePath: aString
	"Set the PYTHONHOME prefix for the embedded interpreter."

	pythonHomePath := aString
%

! ------------------- Instance methods - Initialization

category: 'Initialization'
method: CPythonLibrary
initialize
	"Open the shared library and initialize the Python interpreter."

	CPythonShim isActive ifTrue: [
		self error: 'Cannot use CPythonLibrary: CPythonShim is already active in this session.'.
	].
	library := CLibrary named: self class libraryPath.
	callouts := KeyValueDictionary new.
	self isInitialized ifFalse: [
		self setPythonHome.
		"Use Py_InitializeEx(0) to skip signal handler registration.
		CPython's signal handlers conflict with GemStone's."
		(self calloutFor: 'Py_InitializeEx' result: #void args: #(#'int32'))
			callWith: { 0 }.
	].
%

category: 'Initialization'
method: CPythonLibrary
setPythonHome
	"Set PYTHONHOME via Py_SetPythonHome before initialization.
	Builds a wchar_t* (UTF-32 on macOS ARM64) string in a CByteArray.
	The CByteArray is kept in pythonHome to prevent GC (Py_SetPythonHome
	requires the memory to persist for the interpreter lifetime)."

	| home |
	home := self class pythonHomePath.
	pythonHome := CByteArray gcMalloc: (home size + 1) * 4.
	1 to: home size do: [ :i |
		pythonHome int32At: (i - 1) * 4 put: (home at: i) asInteger.
	].
	pythonHome int32At: home size * 4 put: 0.
	(self calloutFor: 'Py_SetPythonHome' result: #void args: #(#'ptr'))
		callWith: { pythonHome }.
%

! ------------------- Instance methods - Lifecycle

category: 'Lifecycle'
method: CPythonLibrary
isInitialized
	"Return true if the Python interpreter is initialized."

	| result |
	result := (self calloutFor: 'Py_IsInitialized' result: #'int32' args: #())
		callWith: #().
	^ result ~= 0
%

category: 'Lifecycle'
method: CPythonLibrary
finalize
	"Finalize the Python interpreter. Returns 0 on success, -1 on error."

	^ (self calloutFor: 'Py_FinalizeEx' result: #'int32' args: #())
		callWith: #()
%

category: 'Lifecycle'
method: CPythonLibrary
getVersion
	"Return the CPython version string. Safe to call without initialization.
	Useful for verifying that CCallout works at all."

	^ (self calloutFor: 'Py_GetVersion' result: #'char*' args: #())
		callWith: #()
%

! ------------------- Instance methods - Execution

category: 'Execution'
method: CPythonLibrary
runSimpleString: aString
	"Execute a Python source string. Signals Error on failure.
	Note: PyRun_SimpleString prints tracebacks and clears the error internally,
	so specific error details may not be available. Use runString: if you need
	to inspect the Python exception type and message."

	| result |
	result := (self calloutFor: 'PyRun_SimpleString' result: #'int32' args: #(#'const char*'))
		callWith: { aString }.
	result = -1 ifTrue: [
		"Try to get the Python error (may already be cleared by PyRun_SimpleString)."
		self checkPythonError.
		"If checkPythonError returned without signaling, the error was already cleared."
		Error new signal: 'PythonError: Python code execution failed'.
	].
	^ result
%

category: 'Execution'
method: CPythonLibrary
runString: aString
	"Execute Python source in __main__'s namespace. Signals Error on failure.
	Unlike runSimpleString:, this preserves the Python error for inspection."

	| mainModule mainDict ptr result |
	mainModule := self importModule: '__main__'.
	[
		mainDict := (self calloutFor: 'PyModule_GetDict' result: #'ptr' args: #(#'ptr'))
			callWith: { mainModule pointer }.
		ptr := (self calloutFor: 'PyRun_String' result: #'ptr'
			args: #(#'const char*' #'int32' #'ptr' #'ptr'))
			callWith: { aString . 257 "Py_file_input" . mainDict . mainDict }.
		(self class isNullCPointer: ptr) ifTrue: [ self checkPythonError ].
		result := CPythonObject fromNewReference: ptr.
		result ifNotNil: [ result release ].
	] ensure: [ mainModule release ].
%

! ------------------- Instance methods - Module Import

category: 'Module Import'
method: CPythonLibrary
importModule: aString
	"Import a Python module by name. Returns a CPythonObject (new reference)."

	| ptr |
	ptr := (self calloutFor: 'PyImport_ImportModule' result: #'ptr' args: #(#'const char*'))
		callWith: { aString }.
	(self class isNullCPointer: ptr) ifTrue: [ self checkPythonError ].
	^ CPythonObject fromNewReference: ptr
%

! ------------------- Instance methods - Constants

category: 'Constants'
method: CPythonLibrary
none
	"Return a CPythonObject wrapping Py_None (borrowed, so we IncRef)."

	| ptr |
	ptr := (self calloutFor: 'Py_GetConstantBorrowed' result: #'ptr' args: #(#'uint32'))
		callWith: { 0 }.
	^ CPythonObject fromBorrowedReference: ptr
%

category: 'Constants'
method: CPythonLibrary
pyTrue
	"Return a CPythonObject wrapping Py_True (borrowed, so we IncRef)."

	| ptr |
	ptr := (self calloutFor: 'Py_GetConstantBorrowed' result: #'ptr' args: #(#'uint32'))
		callWith: { 2 }.
	^ CPythonObject fromBorrowedReference: ptr
%

category: 'Constants'
method: CPythonLibrary
pyFalse
	"Return a CPythonObject wrapping Py_False (borrowed, so we IncRef)."

	| ptr |
	ptr := (self calloutFor: 'Py_GetConstantBorrowed' result: #'ptr' args: #(#'uint32'))
		callWith: { 1 }.
	^ CPythonObject fromBorrowedReference: ptr
%

! ------------------- Instance methods - Error Checking

category: 'Error Checking'
method: CPythonLibrary
checkPythonError
	"If a Python error is set, fetch it and signal a Smalltalk Error.
	Uses PyErr_GetRaisedException (Python 3.12+) for clean single-pointer API."

	| errOccurred excObj typeObj typeNameObj typeName excStr message |
	errOccurred := (self calloutFor: 'PyErr_Occurred' result: #'ptr' args: #())
		callWith: #().
	(self class isNullCPointer: errOccurred) ifTrue: [ ^ self ].

	excObj := (self calloutFor: 'PyErr_GetRaisedException' result: #'ptr' args: #())
		callWith: #().
	(self class isNullCPointer: excObj) ifTrue: [ ^ self ].

	"Extract type name and message, then release all Python references."
	typeObj := (self calloutFor: 'PyObject_Type' result: #'ptr' args: #(#'ptr'))
		callWith: { excObj }.
	typeNameObj := (self calloutFor: 'PyObject_GetAttrString' result: #'ptr' args: #(#'ptr' #'const char*'))
		callWith: { typeObj . '__name__' }.
	typeName := (self calloutFor: 'PyUnicode_AsUTF8' result: #'char*' args: #(#'ptr'))
		callWith: { typeNameObj }.

	excStr := (self calloutFor: 'PyObject_Str' result: #'ptr' args: #(#'ptr'))
		callWith: { excObj }.
	message := (self calloutFor: 'PyUnicode_AsUTF8' result: #'char*' args: #(#'ptr'))
		callWith: { excStr }.

	"Copy to Smalltalk strings before releasing Python objects."
	typeName := typeName copy.
	message := message copy.

	"Release all Python references."
	(self calloutFor: 'Py_DecRef' result: #void args: #(#'ptr')) callWith: { excStr }.
	(self calloutFor: 'Py_DecRef' result: #void args: #(#'ptr')) callWith: { typeNameObj }.
	(self calloutFor: 'Py_DecRef' result: #void args: #(#'ptr')) callWith: { typeObj }.
	(self calloutFor: 'Py_DecRef' result: #void args: #(#'ptr')) callWith: { excObj }.

	Error new signal: typeName , ': ' , message.
%

! ------------------- Class methods - Null pointer detection

category: 'Testing'
classmethod: CPythonLibrary
isActive
	"Return true if the embedded CPython singleton has been initialized."

	^ current notNil
%

category: 'Private'
classmethod: CPythonLibrary
isNullCPointer: aCPointer
	"Return true if aCPointer is nil or a C NULL pointer (address 0).
	CCallout returns CPointer with address 0 for NULL, not Smalltalk nil."

	^ aCPointer isNil or: [ aCPointer memoryAddress = 0 ]
%

! ------------------- Instance methods - Callout Factory

category: 'Private'
method: CPythonLibrary
calloutFor: functionName result: resultType args: argTypes
	"Return a cached CCallout for the named function, creating it if needed."

	^ callouts at: functionName ifAbsentPut: [
		CCallout
			library: library
			name: functionName
			result: resultType
			args: argTypes
	]
%

category: 'Accessing'
method: CPythonLibrary
library
	"Return the underlying CLibrary."

	^ library
%
