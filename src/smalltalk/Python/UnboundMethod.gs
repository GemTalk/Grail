! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- UnboundMethod class definition
expectvalue /Class
doit
Object subclass: 'UnboundMethod'
  instVarNames: #( definingClass selector )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnboundMethod comment:
'Callable shim for ``SomeClass.instance_method'' accessed via the class —
an *unbound* method (a plain function in Python 3).  Returned by
``object >> ___pyAttrLoad___'' when a Behavior (class) receiver loads a name
that resolves to an *instance* method.

Holds:
  * definingClass — the class whose method to run (looked up INCLUSIVE of
                    itself and its superclass chain — unlike ``Super'',
                    which starts at the parent).
  * selector      — the requested attribute symbol (Python name).

``value:value:'' substitutes the FIRST positional argument as the receiver
(the explicit ``self'') and runs definingClass''s own method on it via the
env-0 ``performMethod:'' primitives — i.e. ``ParentClass.__init__(self,
*args, **kwargs)'' invokes ParentClass''s ``__init__'' on ``self''
NON-virtually (no re-dispatch through ``self''''s class, which would
re-fire an override).  This is the explicit-super-init / unbound-method
pattern (flask''s ``Environment.__init__'' calls
``BaseEnvironment.__init__(self, **options)'').'
%

expectvalue /Class
doit
UnboundMethod category: 'Grail-Modules'
%

removeallmethods UnboundMethod
removeallclassmethods UnboundMethod

set compile_env: 0

category: 'Grail-Private'
method: UnboundMethod
_setClass: aClass selector: aSym

	definingClass := aClass.
	selector := aSym.
%

category: 'Grail-Private'
method: UnboundMethod
_resolveMethodNargs: nargs kwOk: kwOk
	"Walk definingClass's chain INCLUSIVE and return the method from the
	CLOSEST class that publishes a usable form.  Checking per-class (rather
	than scanning the whole chain for the fixed form, then the whole chain
	for varargs) keeps a class's own varargs ``_name:kw:'' from being
	shadowed by an inherited fixed-arity default — notably the env-1 no-op
	``object >> __init__'', which would otherwise swallow a subclass's real
	``___init__:kw:''.  Within a class: when kwargs are present only varargs
	can accept them, so try it first; otherwise prefer the exact fixed
	arity, then fall back to varargs."

	| fixedSel vaSel walker |
	fixedSel := nargs = 0 ifTrue: [selector]
		ifFalse: [nargs = 1 ifTrue: [(selector asString , ':') asSymbol]
		ifFalse: [nargs = 2 ifTrue: [(selector asString , ':_:') asSymbol]
		ifFalse: [nargs = 3 ifTrue: [(selector asString , ':_:_:') asSymbol]
		ifFalse: [nil]]]].
	vaSel := ('_' , selector asString , ':kw:') asSymbol.
	walker := definingClass.
	[walker notNil] whileTrue: [
		| md |
		md := walker methodDictForEnv: 1.
		kwOk
			ifTrue: [
				(fixedSel notNil and: [md includesKey: fixedSel]) ifTrue: [^ md at: fixedSel].
				(md includesKey: vaSel) ifTrue: [^ md at: vaSel].
			]
			ifFalse: [
				(md includesKey: vaSel) ifTrue: [^ md at: vaSel].
				(fixedSel notNil and: [md includesKey: fixedSel]) ifTrue: [^ md at: fixedSel].
			].
		walker := walker superClass].
	^ nil
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: UnboundMethod
definingClass: aClass selector: aSym
	"``Cls.method'' -- INTERNED per (class, selector), so repeated reads answer
	the same object.

	CPython stores a plain function in the class dictionary and hands back that
	very object, so ``Cls.meth is Cls.meth'' holds and code may compare methods
	with ``is'': functools.total_ordering's test pickles ``Cls.__lt__'' and
	asserts the round-trip is identical, and pickle can only save a callable by
	reference if the name resolves back to the same object.  Minting a fresh
	handle per read broke both.

	Bounded by construction: the key is a CLASS, and there are finitely many,
	all long-lived.  Contrast BoundMethod, which only interns module and class
	receivers -- an instance-bound method must NOT be cached, both because
	CPython's ``obj.meth is obj.meth'' is False and because keying on instances
	would retain every receiver ever asked for a method.

	Session-local (SessionTemps), like every other Grail handle cache: these
	are transient objects and the store must not be committed."

	| tbl per inst |
	tbl := SessionTemps @env0:current
		@env0:at: #'GrailUnboundMethodCache'
		ifAbsentPut: [IdentityKeyValueDictionary @env0:new].
	per := tbl @env0:at: aClass ifAbsentPut: [KeyValueDictionary @env0:new].
	inst := per @env0:at: aSym otherwise: nil.
	inst == nil ifFalse: [^ inst].
	inst := self @env0:new.
	inst @env0:_setClass: aClass selector: aSym.
	per @env0:at: aSym put: inst.
	^ inst
%

category: 'Grail-Descriptor Protocol'
method: UnboundMethod
__get__: instance _: owner
	"Function-descriptor binding.  In Python a plain function is a descriptor,
	so lifting one off a class and storing it in ANOTHER class body produces an
	ordinary method there:

	    test_repr_deep = mapping_tests.TestHashMappingProtocol.test_repr_deep

	is verbatim upstream in test_userdict, and CPython binds it on instance
	access.  Grail read back the stored UnboundMethod itself, so unittest called
	it with no arguments and got ``unbound method 'test_repr_deep' must be
	called with an instance as the first argument''.

	Binding is skipped for CLASS access, matching CPython's
	``function.__get__(None, owner) is function'': that is what keeps the
	right-hand side of the assignment above unbound in the first place, and a
	BoundMethod on the class would send the selector to the class object.

	The resulting BoundMethod dispatches ``selector'' to the instance, so the
	method must be reachable from the instance's own class -- true for the
	inheritance case above.  A function grafted onto an UNRELATED class is not
	covered; that needs the whole function object to travel, not a
	(class, selector) handle."

	(instance == nil or: [instance == None]) ifTrue: [^ self].
	(instance @env0:isKindOf: Behavior) ifTrue: [^ self].
	"``receiver:selector:'' is an env-1 classmethod, so NO @env0: prefix -- with
	one it MNUs, and inside an attribute read that escapes as an uncatchable
	Smalltalk error (the module scored STERROR, 0 tests, not a failure)."
	^ BoundMethod receiver: instance selector: selector
%

category: 'Grail-Calling'
method: UnboundMethod
value: positional value: kwargs
	"``Cls.method(instance, *args, **kwargs)'' — first positional is the
	receiver (Python ``self''); the rest are the actual args.  Resolve the
	closest-class form for the arity and run it NON-virtually via
	``performMethod:''.  A varargs (``_name:kw:'') parent takes ``self'' as
	the Smalltalk receiver and ``positional'' as the args after self, so it
	gets ``rest'' — same as a fixed-arity parent."

	| obj rest nargs kwOk method resolvedSel |
	(positional == nil or: [positional @env0:isEmpty]) ifTrue: [
		^ TypeError ___signal___:
			('unbound method ''' @env0:, selector @env0:asString
				@env0:, ''' must be called with an instance as the first argument')
	].
	obj := positional @env0:at: 1.
	rest := (positional @env0:size @env0:> 1)
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	nargs := rest @env0:size.
	kwOk := kwargs == nil or: [kwargs @env0:isEmpty].
	method := self @env0:_resolveMethodNargs: nargs kwOk: kwOk.
	method ifNil: [
		^ AttributeError ___signal___:
			('type object ''' @env0:, definingClass @env0:name @env0:asString
				@env0:, ''' has no method ''' @env0:, selector @env0:asString @env0:, '''')
	].
	resolvedSel := method @env0:selector.
	"``Cls.method(x, ...)'' with a SPECIAL x (SmallInteger, Character,
	Boolean, nil, SmallDouble) that does not itself understand the resolved
	selector: performMethod: on a special receiver dies with the UNCATCHABLE
	GemStone error 2156 (``Self is not a ram oop''), so raise CPython's
	``descriptor ... doesn't apply to'' TypeError instead -- test_bytes calls
	bytes.hex(1).  The test is deliberately narrow: a non-special receiver
	keeps the old behavior, because an UnboundMethod is also how Grail invokes
	class-body helpers whose first positional is a plain function rather than
	an instance (fractions.py's ``_operator_fallbacks(monomorphic, fallback)'')."
	(obj @env0:isSpecial
		@env0:and: [(obj @env0:class
			@env0:whichClassIncludesSelector: resolvedSel environmentId: 1) isNil])
		ifTrue: [
			^ TypeError ___signal___:
				('descriptor ''' @env0:, selector @env0:asString
					@env0:, ''' for ''' @env0:, definingClass @env1:__name__ @env0:asString
					@env0:, ''' objects doesn''t apply to a '''
					@env0:, obj @env0:class @env1:__name__ @env0:asString @env0:, ''' object')
	].
	(resolvedSel @env0:asString @env0:endsWith: ':kw:') ifTrue: [
		^ obj @env0:with: rest with: kwargs performMethod: method
	].
	nargs @env0:= 0 ifTrue: [^ obj @env0:performMethod: method].
	nargs @env0:= 1 ifTrue: [
		^ obj @env0:with: (rest @env0:at: 1) performMethod: method].
	nargs @env0:= 2 ifTrue: [
		^ obj @env0:with: (rest @env0:at: 1) with: (rest @env0:at: 2) performMethod: method].
	nargs @env0:= 3 ifTrue: [
		^ obj
			@env0:with: (rest @env0:at: 1)
			with: (rest @env0:at: 2)
			with: (rest @env0:at: 3)
			performMethod: method].
	nargs @env0:= 4 ifTrue: [
		^ obj
			@env0:with: (rest @env0:at: 1)
			with: (rest @env0:at: 2)
			with: (rest @env0:at: 3)
			with: (rest @env0:at: 4)
			performMethod: method].
	"5+ args: no performMethod primitive variant — fall through to plain
	perform (works unless the parent method itself calls super())."
	^ obj @env0:perform: resolvedSel env: 1 withArguments: rest
%

category: 'Grail-Comparison'
method: UnboundMethod
__eq__: other
	"CPython class-accessed functions compare equal when they name the same
	method: keyed on (definingClass, selector).  Makes ``C.m == C.m'' True
	and lets unbound handles compare by value (only Python-level
	__eq__/__hash__, not Smalltalk =/hash)."

	(other isKindOf: UnboundMethod) ifFalse: [^ false].
	^ (definingClass == (other @env0:definingClass))
		and: [selector == (other @env0:selector)]
%

category: 'Grail-Comparison'
method: UnboundMethod
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Comparison'
method: UnboundMethod
__hash__
	"Consistent with __eq__ (definingClass identity + selector)."

	^ (definingClass @env0:identityHash) @env0:bitXor: (selector @env0:hash)
%

category: 'Grail-Callable'
method: UnboundMethod
___pyCallValue___: positional kw: kwargs
	"Forward the Python ``f(args, **kw)'' call to this handle's own
	``value:value:'', which takes the receiver as the first positional.
	Overrides Object >> ___pyCallValue___:kw:, whose default is to raise
	``'UnboundMethod' object is not callable'' -- which is what an unbound
	handle reached through any ___pyCallValue___ call site used to do,
	despite implementing value:value: perfectly well.  Mirrors BoundMethod.

	Reached whenever ``Cls.m'' is called other than as a direct attribute
	call: ``f = Cls.m; f(inst, x)'', and -- the case that surfaced it -- a
	MethodBinding forwarding an instance read of a class attribute that a
	decorator had set to one of these."

	^ self value: positional value: kwargs
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__name__
	"Python's ``func.__name__''.  ``selector'' holds the plain PYTHON
	attribute name here (the Smalltalk selector with its arity colons is
	rebuilt at call time by _resolveMethodNargs:kwOk:), so it is the name
	CPython would report for ``Cls.m''.

	Load-bearing for method decorators: functools.wraps copies __name__ /
	__qualname__ / __doc__ / __module__ off the function it is given, which
	for a class-body decorator IS one of these unbound handles.  Every one
	of those reads used to raise AttributeError, and update_wrapper silently
	skips a name it cannot read -- so the wrapper kept ITS own name and
	``@functools.wraps(fn)'' looked like it had done nothing."

	^ selector @env0:asString
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__qualname__
	"``Cls.m'' -- CPython's qualified name for a method reached off its class."

	definingClass == nil ifTrue: [^ selector @env0:asString].
	^ definingClass @env0:name @env0:asString @env0:, '.' @env0:, selector @env0:asString
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__module__
	"The defining class's module, when it knows one.

	Only a real STRING counts.  A class that does not carry ``__module__''
	does not necessarily raise for it -- the attribute lookup can fall through
	to its method-wrap fallback and hand back a callable around an accessor --
	and copying THAT into a wrapper is worse than not copying at all
	(functools.wraps produced ``wrapper.__module__ == <UnboundMethod object>'').
	Answer nil for anything else and let update_wrapper skip the name."

	| v |
	definingClass == nil ifTrue: [^ nil].
	v := [definingClass @env1:___pyAttrLoad___: #'__module__']
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil].
	(v @env0:isKindOf: CharacterCollection) ifTrue: [^ v].
	^ nil
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__annotations__
	"``Cls.m.__annotations__'' -- the parameter/return annotation dict (PEP 563
	source strings), read from the class-side table ClassDefAst compiles for a
	class with annotated methods.  Walks the superclass chain, so an inherited
	method reports the annotations from where it was defined.  Empty dict when
	there are none, matching CPython's ``a function always has one''.

	Needed by singledispatch's annotation form: ``@t.register'' with no
	argument infers the dispatch type from the first parameter's annotation,
	and for a class-body method the implementation reaches it as exactly one
	of these unbound handles.  Without this the read raised AttributeError,
	the inference reported ``no type annotation found'', and the registration
	was lost."

	^ self ___annotationsForClass___: self ___metadataClass___
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___metadataClass___
	"The class whose class-side metadata tables describe this handle.

	For a @classmethod / @staticmethod, definingClass is the METACLASS -- that is
	where Grail compiles a class-side method -- but ClassDefAst compiles
	___methodDocTable___ / ___methodAnnotationsTable___ / ___methodSignatureTable___
	onto the CLASS.  Walking up from the metaclass therefore finds nothing, which
	is why a class-side handle reported __doc__ None and __annotations__ {} while
	the identical instance-side handle reported both.

	Surfaced through ``@classmethod_friendly_decorator'' in test_functools'
	test_double_wrapped_methods: it does ``functools.wraps(func.__func__)'', and
	__func__ of a class-side handle is exactly one of these."

	^ (definingClass @env0:notNil and: [definingClass @env0:isMeta])
		ifTrue: [definingClass @env0:thisClass]
		ifFalse: [definingClass]
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__annotate__
	"PEP 649: the deferred annotations computation, which
	functools.update_wrapper COPIES (``__annotate__'' is in
	WRAPPER_ASSIGNMENTS; ``__annotations__'' is not).  Mirrors BoundMethod's,
	including the memoization -- check_wrapper asserts the wrapper and the
	wrapped share the very same object -- and raises rather than answering None
	when nothing is annotated, so update_wrapper skips the name instead of
	copying a None the reader would try to call."

	| store perClass cls fn |
	cls := self ___metadataClass___.
	cls == nil ifTrue: [
		AttributeError ___signal___: 'method has no attribute ''__annotate__'''].
	store := SessionTemps @env0:current
		@env0:at: #'GrailMethodAnnotateCache'
		ifAbsentPut: [IdentityKeyValueDictionary @env0:new].
	perClass := store @env0:at: cls ifAbsentPut: [KeyValueDictionary @env0:new].
	fn := perClass @env0:at: selector @env0:asString otherwise: nil.
	fn == nil ifFalse: [^ fn].
	fn := self ___rawAnnotateForClass___: cls.
	fn == nil ifTrue: [
		AttributeError ___signal___: 'method has no attribute ''__annotate__'''].
	perClass @env0:at: selector @env0:asString put: fn.
	^ fn
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___rawAnnotateForClass___: aClass
	"Superclass walk for the annotate FUNCTION itself, where
	___annotationsForClass___: walks for the dict it computes."

	| tbl v |
	aClass == nil ifTrue: [^ nil].
	((aClass @env0:class @env0:whichClassIncludesSelector:
		#'___methodAnnotationsTable___' environmentId: 1) ~~ nil) ifTrue: [
			tbl := aClass ___methodAnnotationsTable___.
			v := tbl @env0:at: selector @env0:asString otherwise: nil.
			v == nil ifFalse: [^ v]].
	^ self ___rawAnnotateForClass___: (aClass @env0:superclass)
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__signature_spec__
	"``Cls.method'' -- UNBOUND, so every parameter including ``self'' is still
	to be supplied and the spec is reported whole.  The bound counterpart
	(BoundMethod) drops the first one.

	The table walk mirrors ___annotationsForClass___:, including the env-1
	probe: ___methodSignatureTable___ is compiled in environment 1."

	^ (self ___signatureSpecForClass___: self ___metadataClass___)
		ifNil: [ExecBlock @env0:___pyNone___]
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__doc__
	"``Cls.method.__doc__''.  Same story as the bound handle: the docstring
	lives in the defining class's class-side ___methodDocTable___, because a
	class-body def compiles to a Smalltalk method and cannot carry the
	def-time stamp a nested def does.  None when there is none, rather than
	Object's own __doc__."

	^ (self ___docForClass___: self ___metadataClass___)
		ifNil: [ExecBlock @env0:___pyNone___]
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___docForClass___: aClass
	"Superclass walk for this handle's selector in ___methodDocTable___.
	Mirrors ___signatureSpecForClass___:, including the env-1 probe."

	| tbl v |
	aClass == nil ifTrue: [^ nil].
	((aClass @env0:class @env0:whichClassIncludesSelector:
		#'___methodDocTable___' environmentId: 1) ~~ nil) ifTrue: [
			tbl := aClass ___methodDocTable___.
			v := tbl @env0:at: selector @env0:asString otherwise: nil.
			v == nil ifFalse: [^ v]].
	^ self ___docForClass___: (aClass @env0:superclass)
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___signatureSpecForClass___: aClass
	"Superclass walk for this handle's selector in ___methodSignatureTable___."

	| tbl v |
	aClass == nil ifTrue: [^ nil].
	((aClass @env0:class @env0:whichClassIncludesSelector:
		#'___methodSignatureTable___' environmentId: 1) ~~ nil) ifTrue: [
			tbl := aClass ___methodSignatureTable___.
			v := tbl @env0:at: selector @env0:asString otherwise: nil.
			v == nil ifFalse: [^ v]].
	^ self ___signatureSpecForClass___: (aClass @env0:superclass)
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___annotationsForClass___: aClass
	"Superclass walk for the first ___methodAnnotationsTable___ entry named by
	this handle's selector.  The entry is a PEP 649 annotate FUNCTION, called
	here with Format.VALUE.  The table is compiled in ENVIRONMENT 1, so probe
	the metaclass with environmentId: 1 -- an env-0 ``canUnderstand:'' would
	never see it.  Mirrors BoundMethod >> ___methodAnnotationsForClass___:name:."

	| tbl v |
	aClass == nil ifTrue: [^ KeyValueDictionary @env0:new].
	((aClass @env0:class @env0:whichClassIncludesSelector:
		#'___methodAnnotationsTable___' environmentId: 1) ~~ nil) ifTrue: [
			tbl := aClass ___methodAnnotationsTable___.
			v := tbl @env0:at: selector @env0:asString otherwise: nil.
			v == nil ifFalse: [^ v @env0:value: { 1 } value: nil]].
	^ self ___annotationsForClass___: (aClass @env0:superclass)
%

set compile_env: 0

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >>
! ___pyAttrLoad___ consults it through an env-0 ``respondsTo:'', so an env-1
! definition is invisible to the probe and the hook silently does nothing.

category: 'Grail-Python Attribute Hook'
classmethod: UnboundMethod
___pythonValueAttrs___
	"``__name__'' / ``__qualname__'' / ``__module__'' are identifying-metadata
	VALUE attributes -- name strings, not callables.  Without this hook
	___pyAttrLoad___ reaches its BoundMethod wrap and answers a callable
	around the accessor, so functools.wraps would copy a BoundMethod as the
	wrapper's __name__ instead of the string.  Mirrors BoundMethod's hook."

	^ IdentitySet new
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__annotations__';
		add: #'__annotate__';
		add: #'__signature_spec__';
		add: #'__doc__';
		yourself
%

category: 'Grail-Accessing'
method: UnboundMethod
definingClass
	^ definingClass
%

category: 'Grail-Accessing'
method: UnboundMethod
selector
	^ selector
%

category: 'Grail-Comparison'
method: UnboundMethod
= other
	"Smalltalk equality mirrors the Python __eq__ (definingClass + selector)
	so an unbound handle works as a Python set/dict key (Grail collections
	key on Smalltalk =/hash).  Transient wrappers -- no rehash hazard."

	^ (other isKindOf: UnboundMethod)
		and: [definingClass == (other definingClass) and: [selector == (other selector)]]
%

category: 'Grail-Comparison'
method: UnboundMethod
hash
	^ definingClass identityHash bitXor: selector hash
%
