! ===============================================================================
! ShimForeignObject — reverse proxy for a foreign C PyObject*
! ===============================================================================
! When a prebuilt CPython wheel (e.g. numpy) hands one of its OWN C objects to
! Grail — a numpy DType type object passed to numpy.dtypes._add_dtype_helper,
! say — the shim cannot treat it as a Grail-backed 24/32-byte wrapper (it has
! no OOP at offset 16, and no GRAILWP1 sentinel at offset 24).  is_foreign() in
! cpython.cc detects these; pyobj_oop() bridges each to a ShimForeignObject via
! CPythonShim>>foreignProxyForPointer:typeName:.
!
! The proxy holds the raw foreign pointer (cPtr) and the name a Python
! ``__name__`` should report (typeName, captured from the C tp_name at bridge
! time).  Today it forwards just ``__name__`` (enough for _add_dtype_helper's
! setattr(dtypes, DType.__name__, DType)); richer attribute/method forwarding
! back to C is future work.
! ===============================================================================

! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- ShimForeignObject class definition
expectvalue /Class
doit
Object subclass: 'ShimForeignObject'
  instVarNames: #(cPtr typeName view)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ShimForeignObject comment:
'Grail reverse proxy for a foreign C PyObject* owned by a prebuilt CPython
extension (e.g. a numpy DType).  Holds the raw pointer (cPtr) and the name
its Python __name__ reports (typeName).  Created by
CPythonShim>>foreignProxyForPointer:typeName:.'
%

! ------------------- env:0 accessors (set by the server) -----------------------
set compile_env: 0

category: 'Grail-Private'
method: ShimForeignObject
setCPtr: anInteger typeName: aString
	"Initialize the proxy with the foreign pointer and its reported name."

	cPtr := anInteger.
	typeName := aString.
	^ self
%

category: 'Grail-Private'
method: ShimForeignObject
cPtr
	"The raw foreign C PyObject* address (an Integer)."

	^ cPtr
%

category: 'Grail-Private'
method: ShimForeignObject
typeName
	"The (possibly dotted) C tp_name captured when the proxy was created."

	^ typeName
%

category: 'Grail-Private'
method: ShimForeignObject
pyObjectView
	"A CByteArray whose memoryAddress IS the foreign PyObject* — so that
	CPythonShim>>wrap: round-trips this proxy straight back to the original
	C object (e.g. numpy must see its own DType pointer again, not a Grail
	wrapper).  Non-owning view: it must never free numpy's memory.  Cached
	so a hot crossing path does not re-allocate."

	view ifNil: [
		view := CByteArray fromCPointer: (CPointer forAddress: cPtr) numBytes: 32 ].
	^ view
%

category: 'Grail-Printing'
method: ShimForeignObject
printOn: aStream
	aStream nextPutAll: '<ShimForeignObject '; nextPutAll: (typeName ifNil: ['?']);
		nextPutAll: ' @0x'; nextPutAll: (cPtr ifNil: [0]) asString; nextPut: $>
%

category: 'Grail-Private'
method: ShimForeignObject
lastDotIndex
	"Index of the last '.' in typeName, or 0 if none/empty.  Plain env-0
	Smalltalk so it is safe to call from the env-1 attribute path."

	| pos |
	(typeName == nil or: [typeName isEmpty]) ifTrue: [^ 0].
	pos := 0.
	1 to: typeName size do: [:i | (typeName at: i) = $. ifTrue: [pos := i]].
	^ pos
%

category: 'Grail-Private'
method: ShimForeignObject
unqualifiedName
	"typeName with any module prefix stripped (CPython type.__name__)."

	| pos |
	(typeName == nil or: [typeName isEmpty]) ifTrue: [^ ''].
	pos := self lastDotIndex.
	pos = 0 ifTrue: [^ typeName].
	^ typeName copyFrom: pos + 1 to: typeName size
%

category: 'Grail-Private'
method: ShimForeignObject
moduleName
	"The module prefix of typeName (before the last '.'), or '' if none."

	| pos |
	pos := self lastDotIndex.
	pos <= 1 ifTrue: [^ ''].
	^ typeName copyFrom: 1 to: pos - 1
%

! ------------------- env:1 Python attribute dispatch ---------------------------
set compile_env: 1

category: 'Grail-Python Protocol'
method: ShimForeignObject
___pyAttrLoad___: aSym
	"Python ``proxy.attr`` load.  Asked of C FIRST (CPythonShim>>
	foreignGetAttr:name:), which knows the object: its type's dict, its own
	tp_getattro, its method table and its getset table.  That is how a
	validator's ``validate_python'' is found at all -- this used to answer only
	the names below and raise for everything else.

	Only when C has nothing do the captured-name answers apply: ``__name__''
	as the unqualified tail of the C tp_name (CPython's type.__name__ drops
	the module prefix) and ``__module__'' as the rest, which is what numpy's
	init reads off its DType types."

	| found value |
	found := true.
	value := [(CPythonShim @env0:current) @env0:foreignGetAttr: cPtr name: aSym @env0:asString]
		@env0:on: AttributeError do: [:ex | found := false. ex @env0:return: nil].
	found ifTrue: [^ value].
	(aSym == #'__name__' or: [aSym == #'__qualname__'])
		ifTrue: [^ self @env0:unqualifiedName].
	aSym == #'__module__' ifTrue: [^ self @env0:moduleName].
	"@env0:, -- this method compiles in env 1, where a String has no #, and
	the miss raised MessageNotUnderstood instead of the AttributeError.
	Inside a C extension's init that turned an ordinary hasattr-style probe
	(PyO3 asking a module for __all__) into an unwind across the user action."
	^ AttributeError ___signal___:
		(('foreign object has no attribute ''' @env0:, aSym @env0:asString) @env0:, '''')
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
value: positional value: kwargs
	"Calling a wheel's own object -- a type (SchemaValidator(schema)), a
	builtin function, a bound method answered by ___pyAttrLoad___: -- goes
	back to C: CPythonShim>>callForeign:args:kwargs:.  This used to fall
	through to object's, which raised ``'ShimForeignObject' object is not
	callable''."

	^ (CPythonShim @env0:current) @env0:callForeign: cPtr
		args: (positional ifNil: [#()])
		kwargs: kwargs
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
__str__
	"str() of a wheel's own object is its C tp_str (CPythonShim>>
	foreignStr:repr:), as C's own PyObject_Str already answered it.  The proxy
	renders itself only when C has nothing -- a synthetic pointer, a type with
	no slot."

	| r |
	r := [(CPythonShim @env0:current) @env0:foreignStr: cPtr repr: false]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	r == nil ifTrue: [^ self @env0:printString].
	^ r
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
__repr__
	"repr() of a wheel's own object: its C tp_repr; see __str__."

	| r |
	r := [(CPythonShim @env0:current) @env0:foreignStr: cPtr repr: true]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	r == nil ifTrue: [^ self @env0:printString].
	^ r
%

set compile_env: 0
