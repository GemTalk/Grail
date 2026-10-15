Extension { #name : 'ShimForeignObject' }

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> ___arrayDispatchParts [
	"{ dispatcher. implementation } when the receiver is one of numpy's
	public functions, else nil.  Asked of C once per proxy (proxies are
	canonical per pointer); false records a no."

	arrayDispatch == nil ifTrue: [
		arrayDispatch := false.
		(typeName @env0:= 'numpy._ArrayFunctionDispatcher') ifTrue: [
			((CPythonShim @env0:current) @env0:arrayDispatcherParts: cPtr)
				@env0:ifNotNil: [:parts | arrayDispatch := parts]]].
	^ arrayDispatch == false ifTrue: [nil] ifFalse: [arrayDispatch]

]

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> ___callArrayDispatch: parts args: args kwargs: kwargs [
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

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> ___foreignOp: aDunder with: a with: b [
	"Python's operators on a wheel's own object are its C slots
	(CPythonShim>>foreignOp:name:with:with:).  These dunders are what Grail's
	operator protocol sends -- ``a + b'' is ``a ___binOpAdd___: b'', which tries
	__add__: and then the other operand's __radd__: -- so a slot answering
	NotImplemented (numpy's do, for an operand they do not know) lets the
	other operand try, as in CPython."

	^ (CPythonShim @env0:current) @env0:foreignOp: cPtr name: aDunder with: a with: b

]

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> ___grailForeignTypeCheck___: aCandidate subclass: aBoolean [
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

]

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> ___pyAttrLoad___: aSym [
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

]

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> ___pyAttrStore___: aName put: aValue [
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

]

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> ___pyMetaclass___ [
	"type(proxy) -- the object's C type (Py_TYPE), as a proxy, not the Smalltalk
	class ShimForeignObject.  Proxies are canonical per pointer, so
	``type(PydanticUndefined) is PydanticUndefinedType'' holds, as in CPython.
	Falls back to the Smalltalk answer if C cannot say."

	^ [self ___pyAttrLoad___: #'__class__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: super ___pyMetaclass___]

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignObject >> ___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames [
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

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __abs__ [
	^ self ___foreignOp: '__abs__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __add__: other [
	^ self ___foreignOp: '__add__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __and__: other [
	^ self ___foreignOp: '__and__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __bool__ [
	"nb_bool, else the length, else true -- CPython's truth test.  An ndarray of more than one element raises, as it does in CPython."

	^ self ___foreignOp: '__bool__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __contains__: value [
	^ self ___foreignOp: '__contains__' with: value with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __delitem__: key [
	^ self ___foreignOp: '__delitem__' with: key with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __divmod__: other [
	^ self ___foreignOp: '__divmod__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __eq__: other [
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__eq__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __float__ [
	^ self ___foreignOp: '__float__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __floordiv__: other [
	^ self ___foreignOp: '__floordiv__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __ge__: other [
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__ge__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __getitem__: key [
	^ self ___foreignOp: '__getitem__' with: key with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __gt__: other [
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__gt__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __hash__ [
	"tp_hash; a type that compares without hashing (ndarray) is unhashable, and one that defines neither keeps object's identity hash."

	| bits h |
	bits := compareHash.
	"No tp_hash and not unhashable: object's identity hash, without asking C."
	(bits @env0:notNil and: [(bits @env0:bitAnd: 6) @env0:= 0]) ifTrue: [^ super __hash__].
	h := self ___foreignOp: '__hash__' with: nil with: nil.
	^ h @env0:isNil ifTrue: [super __hash__] ifFalse: [h]

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __iadd__: other [
	^ self ___foreignOp: '__iadd__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __iand__: other [
	^ self ___foreignOp: '__iand__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __ifloordiv__: other [
	^ self ___foreignOp: '__ifloordiv__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __ilshift__: other [
	^ self ___foreignOp: '__ilshift__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __imatmul__: other [
	^ self ___foreignOp: '__imatmul__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __imod__: other [
	^ self ___foreignOp: '__imod__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __imul__: other [
	^ self ___foreignOp: '__imul__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __index__ [
	^ self ___foreignOp: '__index__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __int__ [
	^ self ___foreignOp: '__int__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __invert__ [
	^ self ___foreignOp: '__invert__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __ior__: other [
	^ self ___foreignOp: '__ior__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __ipow__: other [
	^ self ___foreignOp: '__ipow__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __irshift__: other [
	^ self ___foreignOp: '__irshift__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __isub__: other [
	^ self ___foreignOp: '__isub__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __iter__ [
	^ self ___foreignOp: '__iter__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __itruediv__: other [
	^ self ___foreignOp: '__itruediv__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __ixor__: other [
	^ self ___foreignOp: '__ixor__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __le__: other [
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__le__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __len__ [
	^ self ___foreignOp: '__len__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __lshift__: other [
	^ self ___foreignOp: '__lshift__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __lt__: other [
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__lt__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __matmul__: other [
	^ self ___foreignOp: '__matmul__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __mod__: other [
	^ self ___foreignOp: '__mod__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __mul__: other [
	^ self ___foreignOp: '__mul__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __ne__: other [
	"No tp_richcompare: NotImplemented without asking C, so Grail's protocol
	falls back as CPython's does (identity for == and !=)."
	(compareHash @env0:notNil and: [(compareHash @env0:bitAnd: 1) @env0:= 0])
		ifTrue: [^ Python @env0:at: #NotImplemented].
	^ self ___foreignOp: '__ne__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __neg__ [
	^ self ___foreignOp: '__neg__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __next__ [
	^ self ___foreignOp: '__next__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __or__: other [
	^ self ___foreignOp: '__or__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __pos__ [
	^ self ___foreignOp: '__pos__' with: nil with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __pow__: other [
	^ self ___foreignOp: '__pow__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __pow__: other _: modulus [
	^ self ___foreignOp: '__pow__' with: other with: modulus

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __radd__: other [
	^ self ___foreignOp: '__radd__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rand__: other [
	^ self ___foreignOp: '__rand__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rdivmod__: other [
	^ self ___foreignOp: '__rdivmod__' with: other with: nil

]

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> __repr__ [
	"repr() of a wheel's own object: its C tp_repr; see __str__."

	| r |
	r := [(CPythonShim @env0:current) @env0:foreignStr: cPtr repr: true]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	r == nil ifTrue: [^ self @env0:printString].
	^ r

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rfloordiv__: other [
	^ self ___foreignOp: '__rfloordiv__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rlshift__: other [
	^ self ___foreignOp: '__rlshift__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rmatmul__: other [
	^ self ___foreignOp: '__rmatmul__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rmod__: other [
	^ self ___foreignOp: '__rmod__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rmul__: other [
	^ self ___foreignOp: '__rmul__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __ror__: other [
	^ self ___foreignOp: '__ror__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rpow__: other [
	^ self ___foreignOp: '__rpow__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rrshift__: other [
	^ self ___foreignOp: '__rrshift__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rshift__: other [
	^ self ___foreignOp: '__rshift__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rsub__: other [
	^ self ___foreignOp: '__rsub__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rtruediv__: other [
	^ self ___foreignOp: '__rtruediv__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __rxor__: other [
	^ self ___foreignOp: '__rxor__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __setitem__: key _: value [
	^ self ___foreignOp: '__setitem__' with: key with: value

]

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> __str__ [
	"str() of a wheel's own object is its C tp_str (CPythonShim>>
	foreignStr:repr:), as C's own PyObject_Str already answered it.  The proxy
	renders itself only when C has nothing -- a synthetic pointer, a type with
	no slot."

	| r |
	r := [(CPythonShim @env0:current) @env0:foreignStr: cPtr repr: false]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	r == nil ifTrue: [^ self @env0:printString].
	^ r

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __sub__: other [
	^ self ___foreignOp: '__sub__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __truediv__: other [
	^ self ___foreignOp: '__truediv__' with: other with: nil

]

{ #category : 'Grail-Python Operators' }
ShimForeignObject >> __xor__: other [
	^ self ___foreignOp: '__xor__' with: other with: nil

]

{ #category : 'Grail-Python Protocol' }
ShimForeignObject >> value: positional value: kwargs [
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

]
