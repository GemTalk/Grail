! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- UnboundMethod class definition
expectvalue /Class
doit
Object subclass: 'UnboundMethod'
  instVarNames: #( definingClass selector attrDict dictView )
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
  * attrDict      — nil until ``Cls.m.__dict__ = d'' REPLACES the mapping, then
                    the dict itself.  A real instVar rather than a dynamic one
                    so it stays out of the PyInstanceDict view it is standing in
                    for.
  * dictView      — the live view, made once and kept, so that ``m.__dict__ is
                    m.__dict__'''' holds the way CPython''s does.

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
_resolutionRootFor: obj
	"``int.__repr__(x)'' where x is an int SUBCLASS instance.

	Class.gs's ___subclass___ cannot root a Python int subclass at Integer --
	GemStone seals it, and SmallInteger/LargeInteger are immediate/byte-format
	with no room for instance variables -- so it substitutes AbstractPyInt, a
	Number sibling carrying the integer in a ``value'' slot.  float does the
	same with AbstractPyFloat.  That substitution happens at class-creation
	time; this handle still names the sealed kernel class, so performing its
	method NON-virtually on a boxed receiver ran Integer's code against an
	object that is not an Integer.  It did not fail loudly -- it fell through
	to Smalltalk's printString, so test_enum's
	``int.__repr__(NamedInt('test', 5))'' answered ``aNamedInt''.

	Resolve from the boxed base instead, which publishes the same protocol
	(AbstractPyInt >> __repr__, __str__, __eq__, ...) against ``value''.
	Deliberately the BASE and not ``obj class'': starting at the receiver's own
	class would make the call VIRTUAL, and NamedInt defines a __repr__ whose
	body is exactly ``int.__repr__(self)'' -- that recurses until the stack
	dies.

	str is deliberately absent: Class.gs leaves a plain ``class X(str)'' a
	byte-format Unicode7 subclass (boxing it broke framework str types), so
	its content already IS the string and the kernel method applies as-is."

	| boxed |
	(obj @env0:isKindOf: definingClass) ifTrue: [^ definingClass].
	((definingClass == Integer)
		or: [definingClass == SmallInteger or: [definingClass == LargeInteger]])
		ifTrue: [
			boxed := System @env0:myUserProfile @env0:symbolList
				@env0:objectNamed: #'AbstractPyInt'.
			(boxed @env0:notNil and: [obj @env0:isKindOf: boxed]) ifTrue: [^ boxed]].
	((definingClass == Float)
		or: [definingClass == SmallDouble or: [definingClass == BinaryFloat]])
		ifTrue: [
			boxed := System @env0:myUserProfile @env0:symbolList
				@env0:objectNamed: #'AbstractPyFloat'.
			(boxed @env0:notNil and: [obj @env0:isKindOf: boxed]) ifTrue: [^ boxed]].
	^ definingClass
%

category: 'Grail-Private'
method: UnboundMethod
_resolveMethodNargs: nargs kwOk: kwOk from: rootClass
	"Walk rootClass's chain INCLUSIVE and return the method from the
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
	walker := rootClass.
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
		"``Cls.f()'' for a def that declares NO parameters.  Python 3 dropped
		unbound methods -- ``Cls.f'' is the plain function -- so this is an
		ordinary call and not the error below, which is the Python-2 rule.
		Grail refused it, which is what kept test_super's
		test_obscure_super_errors from reaching the ``super(): no arguments''
		such a def raises.

		Only the defs the DEFINING CLASS published as receiverless qualify; a
		zero-parameter def that closes over an enclosing method's ``self'' is
		deliberately not among them, because Grail compiles a captured receiver
		to the bare Smalltalk receiver and running it against a substitute would
		answer from the wrong object rather than raise.  See ClassDefAst >>
		emitReceiverlessMethodTableOn:className:."
		(self ___isReceiverlessFor___: definingClass) ifTrue: [
			| m |
			m := definingClass @env0:compiledMethodAt: selector environmentId: 1.
			m == nil ifFalse: [^ definingClass @env0:performMethod: m]].
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
	method := self
		@env0:_resolveMethodNargs: nargs
		kwOk: kwOk
		from: (self @env0:_resolutionRootFor: obj).
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
	rebuilt at call time by _resolveMethodNargs:kwOk:from:), so it is the name
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
	"``Cls.m'' -- CPython's qualified name for a method reached off its class.

	The prefix is the defining class's own __qualname__, not its Smalltalk name,
	so a method of a NESTED class carries the nesting CPython reports:
	``fn.<locals>.InFunc.m'', not ``InFunc.m''.  For a top-level class the two
	strings are identical.  Falls back to the Smalltalk name for a class that
	answers no Python qualname -- same shape as BoundMethod >>
	___receiverQualname___, and for the same reason: this runs on kernel classes
	too."

	| qn owner |
	definingClass == nil ifTrue: [^ selector @env0:asString].
	owner := self ___pyOwnerClass___.
	"Read through ___pyAttrLoad___ rather than sent directly.  A Smalltalk
	METACLASS answers its Python name only on that path -- the Behavior branch
	routes __name__/__qualname__ for a Metaclass3 to
	___grailPythonMetaclassName___, which is what makes ``Enum class'' answer
	'EnumType'.  A bare ``owner __qualname__'' misses the branch entirely and
	came back with the two-word Smalltalk name, so ``Cls.m.__qualname__'' read
	'Enum class.__contains__' where CPython has 'EnumType.__contains__'."
	qn := [(owner @env1:___pyAttrLoad___: #'__qualname__') @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: owner @env0:name @env0:asString].
	^ qn @env0:, '.' @env0:, selector @env0:asString
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___pyOwnerClass___
	"The class Python would name as this method's owner: the one that actually
	IMPLEMENTS the selector, not the one the method was reached through.

	definingClass is the RECEIVER of the attribute read.  ``Color.__contains__''
	on an enum records ``Color class'', although the method lives on
	``Enum class'' several steps up -- so ``Cls.m.__qualname__'' named the
	subclass rather than the definer.  That is not a cosmetic difference:
	pydoc's docroutine prints a `` from X'' provenance note whenever
	``imfunc.__qualname__'' disagrees with
	``homecls.__qualname__ + '.' + realname'', and inspect.classify_class_attrs
	independently gets the home class RIGHT (EnumType).  So the two disagreed
	and every inherited method was annotated `` from <module>.Color'', which
	CPython does not print because there the two agree.

	Both sides of the chain are searched, unary form first and then the seven
	arity variants, because a Python name maps to whichever spelling the
	definition took -- ``__contains__'' lives as ``__contains__:''.

	A Smalltalk METACLASS is kept when it can answer for itself and unwrapped to
	``thisClass'' when it cannot.  ``Enum class'' is a real Python object here:
	it answers __name__ and __qualname__ 'EnumType' and __module__ 'enum', which
	is exactly what CPython reports for the owner of these methods.  A generated
	``Color class'' answers none of that -- its name is the two-word ``Color
	class'' and its __module__ read falls through to a method-wrap fallback -- so
	for that one the class it belongs to is the better answer.  The test is
	whether it answers a STRING __module__, the same question __module__ below
	has to ask anyway, so the two cannot disagree about who the owner is."

	| found |
	found := self ___pyImplementingClass___.
	((found @env0:isKindOf: Metaclass3)
		and: [(self ___pyModuleStringOf___: found) @env0:isNil])
			ifTrue: [^ found @env0:thisClass].
	^ found
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___pyImplementingClass___
	"The class in definingClass's chain that defines the selector, or
	definingClass when none does.

	Searched on definingClass ITSELF and, when that is a class, on its metaclass
	too: a Python @classmethod / @staticmethod and the enum metaclass methods
	live on the class side, and a plain def on the instance side, while the
	UnboundMethod records only the name."

	| family found |
	definingClass @env0:isNil ifTrue: [^ nil].
	(definingClass @env0:isKindOf: Behavior) @env0:ifFalse: [^ definingClass].
	family := self ___selectorFamilyFor___: selector
		string: selector @env0:asString.
	found := self ___findImplementorOf___: selector family: family in: definingClass.
	found @env0:isNil ifTrue: [
		found := self ___findImplementorOf___: selector family: family
			in: definingClass @env0:class].
	^ found @env0:isNil ifTrue: [definingClass] ifFalse: [found]
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___findImplementorOf___: aSym family: family in: aClass
	"The class in aClass's chain defining aSym or any of its arity variants, in
	env 1; nil when none does."

	| found |
	found := aClass @env0:whichClassIncludesSelector: aSym environmentId: 1.
	found @env0:isNil ifFalse: [^ found].
	1 to: 7 do: [:i |
		found := aClass @env0:whichClassIncludesSelector: (family @env0:at: i)
			environmentId: 1.
		found @env0:isNil ifFalse: [^ found]].
	^ nil
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___pyModuleStringOf___: aClass
	"aClass's Python __module__ when it is a real STRING, else nil.

	Only a string counts.  A class that carries no __module__ does not
	necessarily raise for it -- the read can fall through to ___pyAttrLoad___'s
	method-wrap fallback and hand back a callable around an accessor -- and that
	is not a module name by any reading."

	| v |
	v := [aClass @env1:___pyAttrLoad___: #'__module__']
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil].
	^ (v @env0:isKindOf: CharacterCollection) ifTrue: [v] ifFalse: [nil]
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__objclass__
	"CPython's ``method_descriptor.__objclass__'' -- the class that defines the
	method ``Cls.m'' was reached through.  Code uses it to ask whether a slot is
	still the inherited default; test_enum's NamedInt picks its str strategy
	that way:

	    base_str = int.__str__
	    if base_str.__objclass__ is object:
	        return base.__repr__(self)
	    return base_str(self)

	so a missing __objclass__ raised AttributeError before either branch could
	run.  Answering definingClass gives the object-inherited case for free: a
	selector found on Grail's ``object'' answers object, and ``is object'' is
	then True exactly when CPython says it should be."

	^ definingClass
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__module__
	"The defining class's module, as a STRING -- always.

	Only a real string counts on the way in.  A class that does not carry
	``__module__'' does not necessarily raise for it -- the attribute lookup can
	fall through to its method-wrap fallback and hand back a callable around an
	accessor -- and copying THAT into a wrapper is worse than not copying at all
	(functools.wraps produced ``wrapper.__module__ == <UnboundMethod object>'').

	This used to answer Smalltalk NIL for every other case, to let
	update_wrapper skip the name.  It does not skip: nil is not an
	AttributeError, so ``getattr'' hands it straight back and nil -- an object
	with no Python meaning at all -- escapes into Python code.  What that cost:
	pydoc's parentname does ``object.__module__ + '.' + name'', which received
	nil and raised ``UnboundLocalError: local variable referenced before
	assignment'' from deep inside docroutine, naming neither the attribute nor
	the class.  Every class pydoc was asked to document died there.

	Two things had to change together.  The metaclass unwrap above is what makes
	an answer AVAILABLE for the common case: definingClass is typically
	``Cls class'', which answers no __module__, while ``Cls'' answers its
	module.  And the last resort is the owner's Smalltalk name rather than nil,
	which is exactly what the sibling BoundMethod >> ___moduleOfClass___: has
	always done -- a best-effort string a caller can print, instead of a value
	whose every use is an error."

	| owner v |
	definingClass == nil ifTrue: [^ selector @env0:asString].
	owner := self ___pyOwnerClass___.
	v := self ___pyModuleStringOf___: owner.
	v @env0:isNil ifFalse: [^ v].
	^ owner @env0:name @env0:asString
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__globals__
	"``Cls.m.__globals__'' -- the live namespace of the module that defined this
	method's class.

	The unbound twin of BoundMethod >> __globals__, and needed separately because
	the two are unrelated classes: ``Cls.m'' answers an UnboundMethod while
	``Cls().m'' answers a BoundMethod, and test_funcattrs reads __globals__
	through a def reached as neither.  Both resolve through ``__module__'' and
	PyModuleDict class >> ___forModuleNamed___:, so they cannot drift apart.

	THE VIEW, NOT A COPY: ``on:'' memoises one per module per session, which is
	what makes this the identical object ``globals()'' answers in that module.
	AttributeError rather than None when the module cannot be identified -- see
	the BoundMethod twin for why."

	| view |
	view := (Python @env0:at: #'PyModuleDict')
		@env0:___forModuleNamed___: ([self __module__]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil]).
	view isNil ifTrue: [
		^ AttributeError @env0:___signalMissing___: '__globals__' on: self].
	^ view
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
___tableEntryFor___: aClass table: aTableSelector
	"First entry named by this handle's selector in the class-side metadata table
	``aTableSelector'' along aClass's LOOKUP CHAIN (superclasses, then the C3
	MRO), or nil.

	One walk for what were five copies of it -- ___methodAnnotationsTable___,
	___methodReceiverTable___, ___methodDocTable___, ___methodCodeTable___,
	___methodSignatureTable___ -- which differed only in the table selector and
	shared a defect none of them could see alone.

	THE SUPERCLASS CHAIN IS NOT ENOUGH.  A Python class with several bases is one
	Smalltalk class whose superclass is only its PRIMARY base;
	___mergeSecondaryBases___ RECOMPILES the other bases' methods onto it, but
	every one of these tables is built by ClassDefAst from ONE class body, so the
	copied method's metadata stays behind in the base's table -- where a walk from
	the subclass cannot reach it.  For ``class Multi(unittest.TestCase, Mixin)'':

	    Multi.meth.__code__   -> AttributeError: 'method' object has no ...
	    Multi.meth.__doc__    -> None
	    Multi().meth.__code__ -> the right PyCode

	The last line is the tell.  BoundMethod consulted the MRO already (for
	test_gettext), so the INSTANCE-side read of the very same method was right
	while the CLASS-side read was wrong -- and __code__ raising is not a quiet
	wrong answer: ``hasattr(x, '__code__')'' is how inspect and functools.wraps
	decide whether something is a function at all.

	importlib is reached through the symbol list rather than named directly, as
	BoundMethod does: importlib.gs is filed AFTER this file, so a direct
	reference would be a forward one.  Falls back to the plain superclass chain
	when it is absent, which is the whole answer under single inheritance."

	| chain |
	aClass == nil ifTrue: [^ nil].
	chain := self ___lookupChainFrom___: aClass.
	chain @env0:do: [:each |
		"The tables are compiled in environment 1, so an env-0 ``canUnderstand:''
		 would never see them."
		((each @env0:class @env0:whichClassIncludesSelector: aTableSelector
			environmentId: 1) ~~ nil) ifTrue: [
				| tbl v |
				tbl := [each @env0:perform: aTableSelector env: 1]
					@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
				tbl == nil ifFalse: [
					v := [tbl @env0:at: selector @env0:asString otherwise: nil]
						@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
					v == nil ifFalse: [^ v]]]].
	^ nil
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___rawAnnotateForClass___: aClass
	"The annotate FUNCTION itself, where ___annotationsForClass___: answers the
	dict it computes."

	^ self ___tableEntryFor___: aClass table: #'___methodAnnotationsTable___'
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__signature_spec__
	"``Cls.method'' -- UNBOUND, so every parameter including ``self'' is still
	to be supplied and the spec is reported whole.  The bound counterpart
	(BoundMethod) drops the first one.

	The table walk mirrors ___annotationsForClass___:, including the env-1
	probe: ___methodSignatureTable___ is compiled in environment 1.

	___methodSignatureTable___ is BOUND-shaped -- ClassDefAst drops the receiver,
	because that is what a bound access reports -- so the receiver is put back
	here from the companion ___methodReceiverTable___.  Its kind is 1
	(POSITIONAL_OR_KEYWORD) and it never carries a default, which is a
	two-element entry.  A @staticmethod has no entry and is unchanged."

	| spec cls receiver |
	cls := self ___metadataClass___.
	spec := self ___signatureSpecForClass___: cls.
	spec == nil ifTrue: [^ ExecBlock @env0:___pyNone___].
	receiver := self ___receiverNameForClass___: cls.
	receiver == nil ifTrue: [^ spec].
	^ (Array @env0:with: (Array @env0:with: receiver with: 1)) @env0:, spec
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___isReceiverlessFor___: aClass
	"Did aClass publish this handle's selector as callable with no receiver?

	Read off the class-side ``___receiverlessMethods___'' the class emits, which
	lists only the zero-parameter defs that cannot be reading a captured
	receiver.  Absent table (a @staticmethod-only class, or one compiled before
	the table existed) answers false, so the behaviour degrades to the refusal
	that was there before rather than to a guess.

	Walks the same lookup chain the other class-side tables use, so a subclass
	that inherits the method inherits its callability with it.  The tables are
	compiled in environment 1 and are sent to the CLASS -- an env-0 send, or one
	aimed at the metaclass, does not find them."

	| chain |
	aClass == nil ifTrue: [^ false].
	chain := self ___lookupChainFrom___: aClass.
	chain @env0:do: [:each |
		((each @env0:class @env0:whichClassIncludesSelector: #'___receiverlessMethods___'
			environmentId: 1) ~~ nil) ifTrue: [
				| names |
				names := [each @env0:perform: #'___receiverlessMethods___' env: 1]
					@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
				(names @env0:notNil @env0:and: [names @env0:includes: selector @env0:asSymbol])
					ifTrue: [^ true]]].
	^ false
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___receiverNameForClass___: aClass
	"This handle's entry in ___methodReceiverTable___ -- the receiver parameter
	name ClassDefAst dropped from the signature spec, or nil for a @staticmethod
	(and for any class compiled before the table existed)."

	^ self ___tableEntryFor___: aClass table: #'___methodReceiverTable___'
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

category: 'Grail-Attribute Access'
method: UnboundMethod
__getattr__: name
	"A miss falls through to the REPLACEMENT __dict__ when one has been
	installed.  Once ``Cls.m.__dict__ = d'' makes ``d'' the function's
	namespace, ``Cls.m.known_attr'' has to read out of ``d'' -- the dynamic
	instVars the ordinary path consults are no longer where the attributes
	are."

	attrDict @env0:isNil ifFalse: [
		(attrDict @env1:__contains__: name @env0:asString) ifTrue: [
			^ attrDict @env1:__getitem__: name @env0:asString]].
	^ super @env1:__getattr__: name
%

category: 'Grail-Attribute Access'
method: UnboundMethod
__setattr__: name _: value
	"``Cls.method.attr = v''.  An unbound handle is what Python calls a
	FUNCTION, so it takes the FUNCTION write rules -- the same ones a
	module-level def and a closure take.  They live as a classmethod on
	BoundMethod rather than as three copies; see
	___checkFunctionAttrWritable___ for which names are AttributeError
	(read-only, no setter at all) and which are TypeError (a setter that
	refuses the value's shape).

	Without them the handle accepted anything.  ``F.a.__dict__ = UserDict(...)''
	stored a dynamic instVar literally NAMED __dict__ and left the real
	attribute storage untouched: the write looked like it worked, the mapping
	it was meant to install was never consulted again, and the damage surfaced
	somewhere else as a missing attribute.  ``F.a.__name__ = 7'' was accepted
	just as quietly."

	BoundMethod @env0:___checkFunctionAttrWritable___: name writing: value.
	name @env0:asSymbol == #'__dict__' ifTrue: [
		"INSTALL it, rather than storing a dynamic instVar that happens to be
		spelled __dict__ -- which is what happened before, leaving the real
		attribute storage untouched and the new mapping never consulted."
		attrDict := value.
		^ ExecBlock @env0:___pyNone___].
	attrDict @env0:isNil ifFalse: [
		attrDict @env1:__setitem__: name @env0:asString _: value.
		^ ExecBlock @env0:___pyNone___].
	^ super @env1:__setattr__: name _: value
%

category: 'Grail-Attribute Access'
method: UnboundMethod
__delattr__: name
	"The other half of the same rule: an attribute with no setter has no
	deleter either, and test_funcattrs checks both directions for every name
	it covers.

	``del Cls.m.__dict__'' is a TYPE error, not an attribute one: a function's
	__dict__ exists and is writable, so what CPython refuses is the DELETION.
	The inherited path reported the attribute missing instead -- a different
	exception, and one that reads as though functions have no __dict__ at all.
	Same rule and same message as the closure case in ExecBlockAttrs."

	name @env0:asSymbol == #'__dict__' ifTrue: [
		TypeError ___signal___: 'cannot delete __dict__'].
	((BoundMethod @env0:___readOnlyFunctionAttrNames___) @env0:includes: name @env0:asSymbol)
		ifTrue: [
			AttributeError ___signal___:
				('attribute ''' @env0:, name @env0:asString
					@env0:, ''' of ''function'' objects is not writable')].
	attrDict @env0:isNil ifFalse: [
		(attrDict @env1:__contains__: name @env0:asString) ifTrue: [
			attrDict @env1:__delitem__: name @env0:asString.
			^ ExecBlock @env0:___pyNone___]].
	^ super @env1:__delattr__: name
%

category: 'Grail-Attribute Access'
method: UnboundMethod
__dict__
	"``Cls.method.__dict__'' -- the LIVE user-attribute mapping of this
	handle, the same view PythonInstance answers over its own
	dynamic-instVar storage.

	SETTING an attribute on an unbound method already worked (``Cls.m.x = 1''
	lands in the interned handle's dynamic-instVar storage and reads back),
	but there was no __dict__ to see them THROUGH, and that is the spelling
	the decorators use: test_decorators' funcattrs is
	``func.__dict__.update(kwds)'', and MiscDecorators.author is
	``func.__dict__['author'] = name''.  Both raised AttributeError.

	IT HAD TO BE LIVE, not a snapshot, for the same reason ExecBlock's is:
	``update'' on a copy would absorb the merge and leave the method's real
	attributes untouched, so the decorator would appear to succeed and change
	nothing.  PyInstanceDict writes through to dynamic-instVar storage.

	Interning is what makes the storage stable enough to be worth exposing.
	``Cls.m is Cls.m'' holds (UnboundMethod class >> definingClass:selector:),
	so an attribute written through this view is still there on the next read
	of the same name -- which is exactly CPython, where the class dictionary
	holds one plain function object.

	A CLASS-BODY DECORATOR THAT RAISED WAS SILENTLY DROPPED, which is why this
	surfaced as a missing attribute rather than as the AttributeError itself:
	printMethodDecoratorsOn: applies decorators inside a handler that leaves
	the undecorated method in place if applying one fails.  So funcattrs died
	on ``func.__dict__'', the decorator was discarded, and the later
	``C.foo.abc'' was the first visible symptom.

	AFTER ``Cls.m.__dict__ = d'' it is ``d'' ITSELF, not a view: CPython's
	assignment installs the caller's mapping, and code checks it with ``is''.
	A live view could only ever have copied the entries across, which reads the
	same on the next line and diverges on the one after -- a write through the
	caller's own handle to ``d'' would no longer be visible on the function."

	attrDict @env0:isNil ifFalse: [^ attrDict].
	"Made ONCE and kept.  A fresh view per read is just as live, but it is a
	different object every time, and ``m.__dict__ is m.__dict__'' is false --
	which is not a nicety: identity is how CPython code checks that two handles
	share a namespace, and the handle is interned per (class, selector), so
	there is exactly one namespace to hold."
	dictView @env0:isNil ifTrue: [dictView := PyInstanceDict @env0:on: self].
	^ dictView
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___lookupChainFrom___: aClass
	"The classes to consult for this handle's class-side metadata, nearest
	first: the C3 MRO when importlib can supply it, else the plain superclass
	chain.

	The MRO matters because a Python class with several bases is ONE Smalltalk
	class whose superclass is only its primary base -- see ___tableEntryFor___:
	table:, which is where the reasoning lives and which was the only caller
	until __closure__ needed the same walk over a table that is a SET rather
	than a dict.

	importlib is reached through the symbol list rather than named directly:
	importlib.gs is filed AFTER this file, so a direct reference would be a
	forward one."

	| chain il c |
	il := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #importlib.
	il == nil ifFalse: [
		chain := [il @env0:___methodLookupChainFor___: aClass]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil]].
	chain == nil ifTrue: [
		chain := OrderedCollection @env0:new.
		c := aClass.
		[c == nil] whileFalse: [
			chain @env0:add: c.
			c := c @env0:superclass]].
	^ chain
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___classCellOwnerFor___: aClass
	"The class along aClass's lookup chain whose body gave THIS method a
	closure over the class cell, or nil.

	Per method, not per class: CPython closes a method over the cell only when
	that method asked for ``__class__'' (by name or through a zero-arg
	``super()''), so two methods of one class legitimately disagree.  The class
	that OWNS the answer is also the class that owns the cell -- an inherited
	method closes over the cell of the class whose body it appeared in, not the
	subclass it is reached through."

	| chain |
	aClass == nil ifTrue: [^ nil].
	chain := self ___lookupChainFrom___: aClass.
	chain @env0:do: [:each |
		((each @env0:class @env0:whichClassIncludesSelector: #'___methodClassCellNames___'
			environmentId: 1) ~~ nil) ifTrue: [
				| names |
				names := [each @env0:perform: #'___methodClassCellNames___' env: 1]
					@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
				(names ~~ nil and: [names @env0:includes: selector @env0:asSymbol])
					ifTrue: [^ each]]].
	^ nil
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__closure__
	"``Cls.method.__closure__'' -- the tuple of cells the method closes over.

	Grail reports the ONE cell CPython's compiler creates implicitly: the class
	cell that ``__class__'' and zero-arg ``super()'' read.  It is the very
	object the metaclass was handed as ``__classcell__'', because test_super
	asserts identity between the two (test___classcell___expected_behaviour),
	which is why the cell is kept on the class rather than rebuilt here.

	None -- not an empty tuple -- for a method that closes over nothing, which
	is CPython's answer and the half that needs the record to be per method:
	``WithClassRef.g.__closure__'' is None while its sibling ``f'' is a
	one-tuple.

	Grail does NOT yet report cells for ORDINARY free variables of a method
	(an enclosing function's locals, which Grail reaches through its own
	per-class cell store).  Those would extend the tuple; nothing in the corpus
	reads them, and answering None where CPython answers a longer tuple is the
	same shape of gap this method just closed rather than a new one."

	| owner cell |
	owner := self ___classCellOwnerFor___: self ___metadataClass___.
	owner == nil ifTrue: [^ ExecBlock @env0:___pyNone___].
	cell := [owner @env1:___dynamicClassAttr___: #'___grailClassCell___']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	cell == nil ifTrue: [^ ExecBlock @env0:___pyNone___].
	"@env0: -- tuple's constructors are env-0 classmethods; an env-1 send is a
	MessageNotUnderstood on Metaclass3."
	^ tuple @env0:with: cell
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___docForClass___: aClass
	"This handle's selector in ___methodDocTable___, or nil."

	^ self ___tableEntryFor___: aClass table: #'___methodDocTable___'
%

category: 'Grail-Python Metadata'
method: UnboundMethod
__code__
	"``Cls.method.__code__''.  Same story as the bound handle: the PyCode lives
	in the defining class's class-side ___methodCodeTable___, because a
	class-body def compiles to a Smalltalk method and cannot carry the def-time
	``___pyCode___:'' cascade a nested def's ExecBlock does.

	AttributeError when there is none, NOT None -- ``hasattr(x, '__code__')'' is
	the standard is-this-a-function probe (inspect, functools.wraps), so a
	value would make every handle claim to be one."

	^ (self ___codeForClass___: self ___metadataClass___)
		ifNil: [AttributeError ___signal___:
			'''method'' object has no attribute ''__code__''']
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___codeForClass___: aClass
	"This handle's selector in ___methodCodeTable___, or nil."

	^ self ___tableEntryFor___: aClass table: #'___methodCodeTable___'
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___signatureSpecForClass___: aClass
	"This handle's selector in ___methodSignatureTable___, or nil."

	^ self ___tableEntryFor___: aClass table: #'___methodSignatureTable___'
%

category: 'Grail-Python Metadata'
method: UnboundMethod
___annotationsForClass___: aClass
	"The dict computed by the first ___methodAnnotationsTable___ entry named by
	this handle's selector.  The entry is a PEP 649 annotate FUNCTION, called here
	with Format.VALUE.  Mirrors BoundMethod >> ___methodAnnotationsForClass___:name:.

	An EMPTY DICT when there is no entry, not nil: CPython's rule is that a
	function always has an __annotations__."

	| v |
	v := self ___tableEntryFor___: aClass table: #'___methodAnnotationsTable___'.
	v == nil ifTrue: [^ KeyValueDictionary @env0:new].
	^ v @env0:value: { 1 } value: nil
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
		add: #'__code__';
		add: #'__closure__';
		"``__globals__'' is a value like ``__closure__'' beside it: it answers the
		 defining module's namespace DICT.  Without this line ___pyAttrLoad___
		 wraps the accessor and ``Cls.m.__globals__ is globals()'' is False about
		 a correctly resolved namespace -- an attribute that was never evaluated,
		 presenting as an identity bug."
		add: #'__globals__';
		add: #'__dict__';
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
