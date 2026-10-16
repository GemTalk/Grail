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
  instVarNames: #(cPtr typeName view compareHash arrayDispatch)
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

! ------- ShimForeignSubclass -- the root of a Python class whose base is a C type
expectvalue /Class
doit
PythonInstance subclass: 'ShimForeignSubclass'
  instVarNames: #(grailForeignBody grailBodyProxy)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ShimForeignSubclass comment:
'The Smalltalk superclass of a Python class whose base is a C extension''s
own type -- ``class memmap(ndarray)'' -- built by ShimForeignObject>>
___subclass___:instVarNames:classInstVarNames:.

An instance is two halves (docs/Shim_Foreign_Subclassing.md, option A, and
its section 8): a C body in the base''s layout, allocated through the
class''s subtype mirror (CPythonShim>>___buildSubtypeMirrorFor:), and an
instance of the Python class -- this one''s subclass -- which holds the body
in grailForeignBody.  A name the Python classes do not define is the C
base''s, read through the body.  The Python-visible bases name the foreign
type, not this class.'
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
___compareHashBits: anInteger
	"What the object's C type does for == and hash: 1 = tp_richcompare,
	2 = tp_hash, 4 = unhashable.  Set by the shim as the object first
	crosses; nil (a proxy built by hand) means ask C every time."

	compareHash := anInteger
%

category: 'Grail-Private'
method: ShimForeignObject
___compareHashBits
	^ compareHash
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

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
___foreignBases
	"Each class built directly on a foreign type, to the type's proxy.
	Session state: the proxy's pointer dies with the gem."

	^ SessionTemps current
		at: #'GrailForeignSubclassBases'
		ifAbsentPut: [ IdentityKeyValueDictionary new ]
%

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
___foreignBaseOf: aClass
	"The proxy of the C type aClass descends from, or nil -- aClass itself is
	recorded when built directly on it, a subclass of that class is not."

	| c map |
	map := SessionTemps current at: #'GrailForeignSubclassBases' otherwise: nil.
	map isNil ifTrue: [^ nil].
	c := aClass.
	[c notNil and: [c ~~ ShimForeignSubclass]] whileTrue: [ | p |
		p := map at: c otherwise: nil.
		p notNil ifTrue: [^ p].
		c := c superclass].
	^ nil
%

! ------------------- env:1 Python attribute dispatch ---------------------------
set compile_env: 1

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
___grailMetaclassCall___: positional kw: kwargs
	"``cls(...)'' -- type_call for a class whose base is a C type: its __new__
	(a Python one, or the base's tp_new through ``base.__new__'', which
	allocates through the class's subtype mirror: CPythonShim>>
	PyType_AllocForeignSubclass:type:basicSize:), then a Python __init__ when
	a class below the base defines one and the result is an instance."

	| newFn obj base |
	"A C base with no tp_new cannot make instances, and no subtype of it can
	unless Python supplies a __new__: CPython's type_call refuses with the
	SUBTYPE's name, which it inherits a NULL tp_new along with."
	(self ___grailDefinesBelowForeignBase___: '__new__') ifFalse: [
		base := ShimForeignSubclass @env0:___foreignBaseOf: self.
		(base @env0:notNil and: [(CPythonShim @env0:current @env0:foreignTypeHasNew: base @env0:cPtr) not])
			ifTrue: [^ TypeError ___signal___:
				('cannot create ''' @env0:, (self ___pyAttrLoad___: #'__name__') @env0:asString @env0:, ''' instances')]].
	newFn := self ___pyAttrLoad___: #'__new__'.
	obj := newFn value: ((Array @env0:with: self) @env0:, positional) value: kwargs.
	((obj @env0:isKindOf: self) and: [self ___grailDefinesBelowForeignBase___: '__init__'])
		ifTrue: [(obj ___pyAttrLoad___: #'__init__') value: positional value: kwargs].
	^ obj
%

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
__bases__
	"The foreign type for a class built directly on it, as CPython has it."

	| base |
	base := ShimForeignSubclass @env0:___foreignBaseOf: self.
	((ShimForeignSubclass @env0:___foreignBases) @env0:includesKey: self) ifTrue: [
		^ self ___grailAsTuple___: (Array @env0:with: base)].
	^ super __bases__
%

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
__base__
	"See __bases__."

	((ShimForeignSubclass @env0:___foreignBases) @env0:includesKey: self) ifTrue: [
		^ ShimForeignSubclass @env0:___foreignBaseOf: self].
	^ super __base__
%

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
__mro__
	"The Smalltalk chain with this class in it replaced by the foreign type,
	so ``class Sub(Box)'' reads (Sub, Box, object) as in CPython (the foreign
	type's own C bases are not walked)."

	| base out |
	base := ShimForeignSubclass @env0:___foreignBaseOf: self.
	base @env0:isNil ifTrue: [^ super __mro__].
	out := Array @env0:new.
	(super __mro__) @env0:do: [:c |
		out @env0:add: (c == ShimForeignSubclass ifTrue: [base] ifFalse: [c])].
	^ self ___grailAsTuple___: out
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignObject
___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames
	"``class C(foreignType): ...'' -- C is built on ShimForeignSubclass and
	records its foreign base.  An object that is not a TYPE keeps object's
	answer, CPython's TypeError for a non-class base."

	| newCls |
	(self ___grailForeignTypeCheck___: self subclass: true) @env0:isNil ifTrue: [
		^ super ___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames].
	newCls := ShimForeignSubclass @env1:___subclass___: aSymbol
		instVarNames: ivarNames classInstVarNames: classIvarNames.
	(ShimForeignSubclass @env0:___foreignBases) @env0:at: newCls put: self.
	^ newCls
%

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
	"type's methods of a C TYPE, which C leaves to the proxy rather than
	answer object's bound to object."
	((aSym == #mro or: [aSym == #'__subclasses__'])
		and: [(self ___grailForeignTypeCheck___: self subclass: true) @env0:notNil])
			ifTrue: [^ super ___pyAttrLoad___: aSym].
	"``__hash__'' that C does not answer is object's: a PyO3 class inherits
	tp_hash, which no dict carries, and CPython's dataclasses reads
	``default.__class__.__hash__'' for every field (pydantic's defaults are
	pydantic_core objects).  Approximate in one direction: a foreign type that
	set tp_hash to PyObject_HashNotImplemented would read as hashable here."
	aSym == #'__hash__' ifTrue: [^ object ___pyAttrLoad___: #'__hash__'].
	"@env0:, -- this method compiles in env 1, where a String has no #, and
	the miss raised MessageNotUnderstood instead of the AttributeError.
	Inside a C extension's init that turned an ordinary hasattr-style probe
	(PyO3 asking a module for __all__) into an unwind across the user action."
	^ AttributeError ___signal___:
		(('foreign object has no attribute ''' @env0:, aSym @env0:asString) @env0:, '''')
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
___pyAttrStore___: aName put: aValue
	"Python ``proxy.attr = value'' (and setattr): stored in C, where
	___pyAttrLoad___: reads it back (CPythonShim>>foreignSetAttr:name:value:).
	numpy runs functools.wraps over each _ArrayFunctionDispatcher it makes,
	setting __name__, __doc__, __wrapped__ and the rest, and those live in the
	object's own instance dict.

	A store C refuses raises, as in CPython (a read-only member says
	``readonly attribute'').  One C has nowhere to put -- no descriptor of
	that name and no instance dict -- keeps object's behaviour, the proxy's
	own storage, which is where every store went before C was asked."

	((CPythonShim @env0:current) @env0:foreignSetAttr: cPtr
		name: aName @env0:asString value: aValue) == true ifTrue: [^ aValue].
	^ super ___pyAttrStore___: aName put: aValue
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
___pyMetaclass___
	"type(proxy) -- the object's C type (Py_TYPE), as a proxy, not the Smalltalk
	class ShimForeignObject.  Proxies are canonical per pointer, so
	``type(PydanticUndefined) is PydanticUndefinedType'' holds, as in CPython.
	Falls back to the Smalltalk answer if C cannot say."

	^ [self ___pyAttrLoad___: #'__class__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: super ___pyMetaclass___]
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
___grailForeignTypeCheck___: aCandidate subclass: aBoolean
	"isinstance(aCandidate, self) -- or issubclass(aCandidate, self) when
	aBoolean -- for a proxied C-extension TYPE, answered in C by
	PyObject_TypeCheck / PyType_IsSubtype.  A Grail object is never an instance
	(or subclass) of a PyO3 class, so only another proxy is passed through;
	everything else is asked as 0.  nil when the receiver is not a type."

	| ptr |
	ptr := (aCandidate @env0:isKindOf: ShimForeignObject)
		ifTrue: [aCandidate @env0:cPtr]
		ifFalse: [0].
	"An instance of a Python subclass of a C type is its body, typed by the
	class's subtype mirror, whose tp_base chain reaches the C type."
	((ptr @env0:= 0) and: [aCandidate @env0:isKindOf: ShimForeignSubclass]) ifTrue: [
		aCandidate @env0:___grailForeignBody___ @env0:ifNotNil: [:body |
			ptr := body @env0:memoryAddress]].
	"A Grail class built on a foreign type (ShimForeignSubclass) is a subclass
	of every type its foreign base is."
	(aBoolean == true and: [(ptr @env0:= 0) and: [aCandidate @env0:isBehavior]]) ifTrue: [
		(ShimForeignSubclass @env0:___foreignBaseOf: aCandidate) @env0:ifNotNil: [:b |
			ptr := b @env0:cPtr]].
	^ [(CPythonShim @env0:current) @env0:foreignTypeCheck: ptr type: cPtr subclass: aBoolean]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
value: positional value: kwargs
	"Calling a wheel's own object -- a type (SchemaValidator(schema)), a
	builtin function, a bound method answered by ___pyAttrLoad___: -- goes
	back to C: CPythonShim>>callForeign:args:kwargs:.  This used to fall
	through to object's, which raised ``'ShimForeignObject' object is not
	callable''.

	A numpy function (an _ArrayFunctionDispatcher) is the exception: Grail
	does its dispatching itself, ___callArrayDispatch:args:kwargs:."

	| args |
	args := positional ifNil: [#()].
	self ___arrayDispatchParts @env0:ifNotNil: [:parts |
		(self ___callArrayDispatch: parts args: args kwargs: kwargs)
			@env0:ifNotNil: [:boxed | ^ boxed @env0:at: 1]].
	^ (CPythonShim @env0:current) @env0:callForeign: cPtr args: args kwargs: kwargs
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
___arrayDispatchParts
	"{ dispatcher. implementation } when the receiver is one of numpy's
	public functions, else nil.  Asked of C once per proxy (proxies are
	canonical per pointer); false records a no."

	arrayDispatch == nil ifTrue: [
		arrayDispatch := false.
		(typeName @env0:= 'numpy._ArrayFunctionDispatcher') ifTrue: [
			((CPythonShim @env0:current) @env0:arrayDispatcherParts: cPtr)
				@env0:ifNotNil: [:parts | arrayDispatch := parts]]].
	^ arrayDispatch == false ifTrue: [nil] ifFalse: [arrayDispatch]
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
___callArrayDispatch: parts args: args kwargs: kwargs
	"A numpy public function, called the way its C type
	(arrayfunction_override.c, dispatcher_vectorcall) calls it, but from
	Grail: the dispatcher picks out the relevant arguments, and when none of
	them overrides __array_function__ -- none has one, or the one it has is
	ndarray's -- the implementation is called with the original arguments.
	Answers { result }, or nil to leave the call to C.

	Doing it in C cost two user-action re-entries (the dispatcher, then the
	implementation), so a numpy function written in Python that calls another
	-- np.linspace, which calls np.ndim -- needed three, and GemStone allows
	two (INT_MAX_USER_ACTION, error 2138).  Here neither costs one.  A
	dispatcher also may be a generator, which C cannot iterate in a callback.

	Any override goes to C, which hands the call to that __array_function__.
	So does an error from the dispatcher: it runs again there and raises with
	the public function's name, as numpy words it.  The dispatcher is only
	argument plumbing, so running it twice changes nothing."

	| relevant shim |
	relevant := [((parts @env0:at: 1) value: args value: kwargs) @env0:___pyStarToArray___]
		@env0:on: Error @env0:, BaseException do: [:ex | ex @env0:return: nil].
	relevant == nil ifTrue: [^ nil].
	shim := CPythonShim @env0:current.
	relevant @env0:do: [:a |
		(a @env0:isKindOf: ShimForeignObject)
			ifTrue: [(shim @env0:arrayFunctionKind: a @env0:cPtr) == 2 ifTrue: [^ nil]]
			ifFalse: [
				(((builtins @env1:instance) @env1:hasattr: ((builtins @env1:instance) @env1:type: a)
					_: '__array_function__') @env1:___isTruthy___) ifTrue: [^ nil]]].
	^ Array @env0:with: ((parts @env0:at: 2) value: args value: kwargs)
%

category: 'Grail-Python Operators'
method: ShimForeignObject
___foreignOp: aDunder with: a with: b
	"Python's operators on a wheel's own object are its C slots
	(CPythonShim>>foreignOp:name:with:with:).  These dunders are what Grail's
	operator protocol sends -- ``a + b'' is ``a ___binOpAdd___: b'', which tries
	__add__: and then the other operand's __radd__: -- so a slot answering
	NotImplemented (numpy's do, for an operand they do not know) lets the
	other operand try, as in CPython."

	^ (CPythonShim @env0:current) @env0:foreignOp: cPtr name: aDunder with: a with: b
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__add__: other
	^ self ___foreignOp: '__add__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__radd__: other
	^ self ___foreignOp: '__radd__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__sub__: other
	^ self ___foreignOp: '__sub__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rsub__: other
	^ self ___foreignOp: '__rsub__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__mul__: other
	^ self ___foreignOp: '__mul__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rmul__: other
	^ self ___foreignOp: '__rmul__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__matmul__: other
	^ self ___foreignOp: '__matmul__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rmatmul__: other
	^ self ___foreignOp: '__rmatmul__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__truediv__: other
	^ self ___foreignOp: '__truediv__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rtruediv__: other
	^ self ___foreignOp: '__rtruediv__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__floordiv__: other
	^ self ___foreignOp: '__floordiv__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rfloordiv__: other
	^ self ___foreignOp: '__rfloordiv__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__mod__: other
	^ self ___foreignOp: '__mod__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rmod__: other
	^ self ___foreignOp: '__rmod__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__divmod__: other
	^ self ___foreignOp: '__divmod__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rdivmod__: other
	^ self ___foreignOp: '__rdivmod__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__lshift__: other
	^ self ___foreignOp: '__lshift__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rlshift__: other
	^ self ___foreignOp: '__rlshift__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rshift__: other
	^ self ___foreignOp: '__rshift__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rrshift__: other
	^ self ___foreignOp: '__rrshift__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__and__: other
	^ self ___foreignOp: '__and__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rand__: other
	^ self ___foreignOp: '__rand__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__or__: other
	^ self ___foreignOp: '__or__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__ror__: other
	^ self ___foreignOp: '__ror__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__xor__: other
	^ self ___foreignOp: '__xor__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rxor__: other
	^ self ___foreignOp: '__rxor__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__pow__: other
	^ self ___foreignOp: '__pow__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__pow__: other _: modulus
	^ self ___foreignOp: '__pow__' with: other with: modulus
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__rpow__: other
	^ self ___foreignOp: '__rpow__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__iadd__: other
	^ self ___foreignOp: '__iadd__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__isub__: other
	^ self ___foreignOp: '__isub__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__imul__: other
	^ self ___foreignOp: '__imul__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__imatmul__: other
	^ self ___foreignOp: '__imatmul__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__itruediv__: other
	^ self ___foreignOp: '__itruediv__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__ifloordiv__: other
	^ self ___foreignOp: '__ifloordiv__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__imod__: other
	^ self ___foreignOp: '__imod__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__ipow__: other
	^ self ___foreignOp: '__ipow__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__ilshift__: other
	^ self ___foreignOp: '__ilshift__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__irshift__: other
	^ self ___foreignOp: '__irshift__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__iand__: other
	^ self ___foreignOp: '__iand__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__ior__: other
	^ self ___foreignOp: '__ior__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__ixor__: other
	^ self ___foreignOp: '__ixor__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__lt__: other
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__lt__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__le__: other
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__le__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__eq__: other
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__eq__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__ne__: other
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__ne__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__gt__: other
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__gt__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__ge__: other
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__ge__' with: other with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__neg__
	^ self ___foreignOp: '__neg__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__pos__
	^ self ___foreignOp: '__pos__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__abs__
	^ self ___foreignOp: '__abs__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__invert__
	^ self ___foreignOp: '__invert__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__len__
	^ self ___foreignOp: '__len__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__iter__
	^ self ___foreignOp: '__iter__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__next__
	^ self ___foreignOp: '__next__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__float__
	^ self ___foreignOp: '__float__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__int__
	^ self ___foreignOp: '__int__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__index__
	^ self ___foreignOp: '__index__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__bool__
	"nb_bool, else the length, else true -- CPython's truth test.  An ndarray of more than one element raises, as it does in CPython."

	^ self ___foreignOp: '__bool__' with: nil with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__hash__
	"tp_hash; a type that compares without hashing (ndarray) is unhashable, and one that defines neither keeps object's identity hash."

	| bits h |
	bits := compareHash.
	"No tp_hash and not unhashable: object's identity hash, without asking C."
	(bits @env0:notNil and: [(bits @env0:bitAnd: 6) @env0:= 0]) ifTrue: [^ super __hash__].
	h := self ___foreignOp: '__hash__' with: nil with: nil.
	^ h @env0:isNil ifTrue: [super __hash__] ifFalse: [h]
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__getitem__: key
	^ self ___foreignOp: '__getitem__' with: key with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__setitem__: key _: value
	^ self ___foreignOp: '__setitem__' with: key with: value
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__delitem__: key
	^ self ___foreignOp: '__delitem__' with: key with: nil
%

category: 'Grail-Python Operators'
method: ShimForeignObject
__contains__: value
	^ self ___foreignOp: '__contains__' with: value with: nil
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


category: 'Grail-Python Protocol'
method: ShimForeignObject
__dir__
	"dir() of a wheel's object, as CPython's type.__dir__ and object.__dir__
	build it: the names C finds -- a type's own and its C bases', or an
	instance's dict keys and its type's (CPythonShim>>foreignDirNames:) --
	then object's.  Grail's object.__dir__ listed the proxy's own Smalltalk
	methods instead, so dir() and inspect.getmembers missed every C method."

	| names cNames |
	names := Set @env0:new.
	cNames := [(CPythonShim @env0:current) @env0:foreignDirNames: cPtr]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	cNames @env0:notNil ifTrue: [
		cNames @env0:do: [:n | names @env0:add: n @env0:asString]].
	object __dir__ @env0:do: [:n | names @env0:add: n @env0:asString].
	^ names @env0:asArray
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
mro
	"``T.mro()'' of a C type: its __mro__ as a list, as Behavior>>mro answers
	a class's.  Reached from ___pyAttrLoad___:, for a type only."

	^ list @env0:withAll: (self ___pyAttrLoad___: #'__mro__')
%

category: 'Grail-Python Protocol'
method: ShimForeignObject
__subclasses__
	"``T.__subclasses__()'' of a C type: the Python classes built directly on
	it (ShimForeignSubclass class>>___foreignBases), by name.  A C type
	deriving from it is not listed: nothing records one.  It answered
	object's subclasses, bound to object."

	| out |
	out := OrderedCollection @env0:new.
	(ShimForeignSubclass @env0:___foreignBases) @env0:keysAndValuesDo: [:cls :base |
		base == self ifTrue: [out @env0:add: cls]].
	^ list @env0:withAll: (out @env0:asSortedCollection: [:a :b | a @env0:name @env0:<= b @env0:name])
%

! ------- ShimForeignSubclass instances: a Grail half and its C body ----------
set compile_env: 0

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
___grailForeignBody___
	"The C body of this instance: a gcMalloc'd block in the foreign base's
	layout whose ob_type is the class's subtype mirror and whose last word is
	this object's OOP (CPythonShim>>PyType_AllocForeignSubclass:type:basicSize:).
	nil for an instance no allocator made."

	^ grailForeignBody
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
___grailForeignBody___: aCByteArray
	grailForeignBody := aCByteArray
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
___grailBodyProxy___
	"A ShimForeignObject over the body: what the base type does -- its
	attributes, operators and C protocol -- is asked of it.  Its pointer is the
	body's, so whatever it hands C is the body again, and whatever C answers
	that is a body of a subclass instance comes back as its Grail half."

	grailBodyProxy isNil ifTrue: [
		grailBodyProxy := ShimForeignObject new
			setCPtr: grailForeignBody memoryAddress
			typeName: self class name asString].
	^ grailBodyProxy
%

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
___grailNoFallbackFor: anObject name: aSym
	"Is the fall back to the C base turned off for this read, because C is
	asking and reads the base's part itself (CPythonShim>>
	foreignSubclassGetAttr:name:)?"

	| key |
	key := SessionTemps current at: #'GrailForeignNoFallback' otherwise: nil.
	^ key notNil and: [key key == anObject and: [key value == aSym]]
%

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
___grailForeignBaseProxy___
	"The proxy of the C type this class descends from (see ___foreignBaseOf:)."

	^ ShimForeignSubclass ___foreignBaseOf: self
%

set compile_env: 1

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
___pyAttrForeignBaseLoad___: aSym
	"What the Python classes and the instance do not define is the base type's,
	read off the body -- ndarray's ``shape'', ``sum'', ``T'' on a memmap --
	before __getattr__ and the AttributeError (object>>___pyAttrLoad___:).
	CPython's order differs only for a base DATA descriptor shadowed by an
	instance attribute of the same name."

	| found v |
	grailForeignBody @env0:isNil ifTrue: [^ nil].
	(ShimForeignSubclass @env0:___grailNoFallbackFor: self name: aSym) ifTrue: [^ nil].
	found := true.
	v := [self @env0:___grailBodyProxy___ ___pyAttrLoad___: aSym]
		@env0:on: AttributeError do: [:ex | found := false. ex @env0:return: nil].
	found ifFalse: [^ nil].
	^ aSym @env0:-> v
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__add__: other
	^ self @env0:___grailBodyProxy___ __add__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__radd__: other
	^ self @env0:___grailBodyProxy___ __radd__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__sub__: other
	^ self @env0:___grailBodyProxy___ __sub__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rsub__: other
	^ self @env0:___grailBodyProxy___ __rsub__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__mul__: other
	^ self @env0:___grailBodyProxy___ __mul__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rmul__: other
	^ self @env0:___grailBodyProxy___ __rmul__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__matmul__: other
	^ self @env0:___grailBodyProxy___ __matmul__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rmatmul__: other
	^ self @env0:___grailBodyProxy___ __rmatmul__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__truediv__: other
	^ self @env0:___grailBodyProxy___ __truediv__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rtruediv__: other
	^ self @env0:___grailBodyProxy___ __rtruediv__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__floordiv__: other
	^ self @env0:___grailBodyProxy___ __floordiv__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rfloordiv__: other
	^ self @env0:___grailBodyProxy___ __rfloordiv__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__mod__: other
	^ self @env0:___grailBodyProxy___ __mod__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rmod__: other
	^ self @env0:___grailBodyProxy___ __rmod__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__divmod__: other
	^ self @env0:___grailBodyProxy___ __divmod__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rdivmod__: other
	^ self @env0:___grailBodyProxy___ __rdivmod__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__lshift__: other
	^ self @env0:___grailBodyProxy___ __lshift__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rlshift__: other
	^ self @env0:___grailBodyProxy___ __rlshift__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rshift__: other
	^ self @env0:___grailBodyProxy___ __rshift__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rrshift__: other
	^ self @env0:___grailBodyProxy___ __rrshift__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__and__: other
	^ self @env0:___grailBodyProxy___ __and__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rand__: other
	^ self @env0:___grailBodyProxy___ __rand__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__or__: other
	^ self @env0:___grailBodyProxy___ __or__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__ror__: other
	^ self @env0:___grailBodyProxy___ __ror__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__xor__: other
	^ self @env0:___grailBodyProxy___ __xor__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rxor__: other
	^ self @env0:___grailBodyProxy___ __rxor__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__pow__: other
	^ self @env0:___grailBodyProxy___ __pow__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__pow__: other _: modulus
	^ self @env0:___grailBodyProxy___ __pow__: other _: modulus
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__rpow__: other
	^ self @env0:___grailBodyProxy___ __rpow__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__iadd__: other
	^ self @env0:___grailBodyProxy___ __iadd__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__isub__: other
	^ self @env0:___grailBodyProxy___ __isub__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__imul__: other
	^ self @env0:___grailBodyProxy___ __imul__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__imatmul__: other
	^ self @env0:___grailBodyProxy___ __imatmul__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__itruediv__: other
	^ self @env0:___grailBodyProxy___ __itruediv__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__ifloordiv__: other
	^ self @env0:___grailBodyProxy___ __ifloordiv__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__imod__: other
	^ self @env0:___grailBodyProxy___ __imod__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__ipow__: other
	^ self @env0:___grailBodyProxy___ __ipow__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__ilshift__: other
	^ self @env0:___grailBodyProxy___ __ilshift__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__irshift__: other
	^ self @env0:___grailBodyProxy___ __irshift__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__iand__: other
	^ self @env0:___grailBodyProxy___ __iand__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__ior__: other
	^ self @env0:___grailBodyProxy___ __ior__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__ixor__: other
	^ self @env0:___grailBodyProxy___ __ixor__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__lt__: other
	^ self @env0:___grailBodyProxy___ __lt__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__le__: other
	^ self @env0:___grailBodyProxy___ __le__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__eq__: other
	^ self @env0:___grailBodyProxy___ __eq__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__ne__: other
	^ self @env0:___grailBodyProxy___ __ne__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__gt__: other
	^ self @env0:___grailBodyProxy___ __gt__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__ge__: other
	^ self @env0:___grailBodyProxy___ __ge__: other
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__neg__
	^ self @env0:___grailBodyProxy___ __neg__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__pos__
	^ self @env0:___grailBodyProxy___ __pos__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__abs__
	^ self @env0:___grailBodyProxy___ __abs__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__invert__
	^ self @env0:___grailBodyProxy___ __invert__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__len__
	^ self @env0:___grailBodyProxy___ __len__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__iter__
	^ self @env0:___grailBodyProxy___ __iter__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__next__
	^ self @env0:___grailBodyProxy___ __next__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__float__
	^ self @env0:___grailBodyProxy___ __float__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__int__
	^ self @env0:___grailBodyProxy___ __int__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__index__
	^ self @env0:___grailBodyProxy___ __index__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__bool__
	^ self @env0:___grailBodyProxy___ __bool__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__hash__
	^ self @env0:___grailBodyProxy___ __hash__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__getitem__: key
	^ self @env0:___grailBodyProxy___ __getitem__: key
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__setitem__: key _: value
	^ self @env0:___grailBodyProxy___ __setitem__: key _: value
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__delitem__: key
	^ self @env0:___grailBodyProxy___ __delitem__: key
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__contains__: value
	^ self @env0:___grailBodyProxy___ __contains__: value
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__str__
	^ self @env0:___grailBodyProxy___ __str__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
__repr__
	^ self @env0:___grailBodyProxy___ __repr__
%

category: 'Grail-Foreign Subclassing'
method: ShimForeignSubclass
___pyAttrStore___: aName put: aValue
	"A DATA descriptor of the C base -- ndarray's ``shape'' (numpy's matrix
	sets ``self.shape'' in __array_finalize__), ``dtype'' -- is the base's to
	set, through the body; every other name is this half's own attribute, as
	it would be the instance dict's in CPython.  The base's descriptor names
	are fetched once per type (CPythonShim>>foreignDataDescriptorNames:), so an
	ordinary store needs no call into C."

	| shim body |
	body := grailForeignBody.
	body @env0:notNil ifTrue: [
		shim := CPythonShim @env0:current.
		((shim @env0:foreignDataDescriptorNames: (body @env0:int64At: 8))
				@env0:includes: aName @env0:asSymbol)
			ifTrue: [
				(shim @env0:foreignSetAttr: body @env0:memoryAddress
					name: aName @env0:asString value: aValue) == true ifTrue: [^ aValue]]].
	^ super ___pyAttrStore___: aName put: aValue
%

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
___pyAttrLoad___: aSym
	"A class attribute the Python classes do not define is the foreign base's:
	``memmap.sum'', and the ``__array_finalize__'' numpy reads off the TYPE and
	compares with ndarray's own.  ``__new__'' too, unless a Python class below
	the base defines it: object's would make an instance with no body."

	| found v noFallback |
	noFallback := ShimForeignSubclass @env0:___grailNoFallbackFor: self name: aSym.
	(aSym == #'__new__' and: [noFallback not]) ifTrue: [
		(self ___grailDefinesBelowForeignBase___: '__new__') ifFalse: [
			^ self @env0:___grailForeignBaseProxy___ ___pyAttrLoad___: aSym]].
	found := true.
	v := [super ___pyAttrLoad___: aSym]
		@env0:on: AttributeError do: [:ex | found := false. ex @env0:return: nil].
	found ifTrue: [^ v].
	noFallback ifTrue: [^ super ___pyAttrLoad___: aSym].
	^ self @env0:___grailForeignBaseProxy___ ___pyAttrLoad___: aSym
%

category: 'Grail-Foreign Subclassing'
classmethod: ShimForeignSubclass
___grailDefinesBelowForeignBase___: aName
	"Does a Python class between this one and the foreign base define aName
	in its own __dict__?"

	| c |
	c := self.
	[c @env0:notNil and: [c ~~ ShimForeignSubclass]] whileTrue: [
		((c ___pyAttrLoad___: #'__dict__') __contains__: aName) == true ifTrue: [^ true].
		c := c @env0:superclass].
	^ false
%

set compile_env: 0
