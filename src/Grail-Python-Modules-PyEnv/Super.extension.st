Extension { #name : 'Super' }

{ #category : 'Grail-Errors' }
Super class >> ___argZeroDeleted___ [
	"Precondition 2: positional argument 0 was deleted.

	CPython tests ``localsplus[0] == NULL''.  Grail's equivalent is exact
	rather than analogous: a def copies each parameter into a Smalltalk temp
	(``x := _x'') and DeleteAst compiles ``del x'' to ``x := nil'', which is
	also what NameAst's load guard tests to raise UnboundLocalError.  So the
	emitted check is a plain ``<param> == nil''."

	^ RuntimeError ___signal___: 'super(): arg[0] deleted'

]

{ #category : 'Grail-Errors' }
Super class >> ___emptyClassCell___ [
	"Precondition 4: the cell is present but empty.

	Reachable only through ``nonlocal __class__; del __class__'', which empties
	the cell every method of the class shares -- so this fires for calls in
	OTHER methods, and on later calls to the same one, not just the one that
	did the deleting."

	^ RuntimeError ___signal___: 'super(): empty __class__ cell'

]

{ #category : 'Grail-Instance Creation' }
Super class >> ___isInstanceOrSubtype___: anObject of: aClass [
	"Python's ``isinstance(obj, cls) or (isinstance(obj, type) and
	issubclass(obj, cls))'', consulted through the MRO rather than the
	Smalltalk superclass chain.

	The distinction is load-bearing here.  A cooperative mixin is NOT a
	Smalltalk superclass of the classes that use it -- ``class D(Mixin,
	Base)'' reaches Base through D's C3 linearization, and a Mixin method
	copied onto D still carries ``cls = Mixin'' -- so a chain-based check
	would reject ``super(Mixin, self)'', which is the single most common
	legitimate two-argument call in the corpus.  _lookupMethodFirstOf: already
	resolves methods through the same MRO, so agreeing with it is what keeps
	the check from rejecting calls the proxy then services happily.

	Permissive when no MRO is registered: answering true leaves the previous
	behaviour (no check at all) in place rather than inventing a failure.

	EITHER answer accepts -- the MRO or the Smalltalk chain -- and that is the
	fix that made this check safe to apply on the compiled path at all.  It used
	to answer ``mro includes: aClass'' EXCLUSIVELY whenever an MRO was
	registered, falling back to the chain only when there was none.  So a class
	the receiver genuinely inherits from was REJECTED whenever ___mroOf___
	reported a linearization that omitted it -- the mixin case the paragraph
	above is about, and why cls:obj: had to skip the check entirely (four Django
	failures, measured).  Consulting both can only ever ACCEPT more than before,
	never less, so it cannot reintroduce those rejections; and it still refuses
	pairs related by neither -- super(int, <C instance>), super(C, list()),
	super(C, list)."

	| il mro probe |
	il := Python @env0:at: #importlib otherwise: nil.
	probe := (anObject @env0:isKindOf: Behavior)
		@env0:ifTrue: [anObject]
		@env0:ifFalse: [anObject @env0:class].
	probe == aClass ifTrue: [^ true].
	il == nil ifFalse: [
		"@env0: -- ___mroOf___: is an env-0 classmethod, and this method compiles
		under ``set compile_env: 1'', so the bare send was an env-1 send that
		could never reach it.  The on:do: below then swallowed the resulting
		doesNotUnderstand and answered nil, so THE MRO BRANCH HAS NEVER RUN: this
		check was silently chain-only, which is precisely why it rejected
		cooperative mixins and had to be kept off the compiled path.  The handler
		is still wanted (___mroOf___: raises for a class with no registered MRO)
		but it was hiding a wiring bug rather than a missing MRO."
		mro := [il @env0:___mroOf___: probe]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		(mro @env0:notNil @env0:and: [mro @env0:notEmpty]) ifTrue: [
			(mro @env0:includes: aClass) ifTrue: [^ true]]].
	"THE METACLASS CASE.  Grail RECORDS a class's metaclass rather than making
	the class an instance of it, so ``A'', whose metaclass is M, is not a
	Smalltalk instance of M and is on neither M's MRO nor its chain.  CPython
	disagrees -- ``isinstance(A, M)'' is true -- and a zero-argument super()
	inside one of M's own methods is invoked with exactly that pairing, so
	without this every such call would be rejected (seven
	InheritedMetaclassDispatchTestCase errors, which the CPython corpus did not
	reach).  The same modelling gap object >> ___classCell___ already works
	around by consulting ___grailMetaclass___."
	(anObject @env0:isKindOf: Behavior) ifTrue: [
		| meta seen |
		meta := [anObject ___grailMetaclass___]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		seen := 0.
		[meta @env0:notNil @env0:and: [seen @env0:< 32]] @env0:whileTrue: [
			meta == aClass ifTrue: [^ true].
			(meta @env0:isKindOf: Behavior)
				@env0:and: [meta @env0:inheritsFrom: aClass]
				@env0:ifTrue: [^ true].
			meta := [meta ___grailMetaclass___]
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
			seen := seen @env0:+ 1]].
	^ (anObject @env0:isKindOf: Behavior)
		@env0:ifTrue: [anObject @env0:inheritsFrom: aClass]
		@env0:ifFalse: [anObject @env0:isKindOf: aClass]

]

{ #category : 'Grail-Errors' }
Super class >> ___noArguments___ [
	"Precondition 1: the enclosing def declares no positional parameter.

	Emitted UNCONDITIONALLY by CallAst when FunctionDefAst >>
	___receiverParamName___ is nil, because that is a compile-time fact -- there
	is no run-time state that could make ``def f(): super()'' work.  Covers
	``def f(): super()'' at module scope and, once a zero-parameter method can
	be called through its class at all, ``class C: def f(): super()''."

	^ RuntimeError ___signal___: 'super(): no arguments'

]

{ #category : 'Grail-Errors' }
Super class >> ___noClassCell___ [
	"Precondition 3: the enclosing def has arguments but no ``__class__'' cell.

	A plain function is the whole of this case -- ``def h(x): super()'' -- and
	Grail used to answer ``no arguments'' for it, which names the wrong
	precondition: h HAS an argument, what it lacks is a class."

	^ RuntimeError ___signal___: 'super(): __class__ cell not found'

]

{ #category : 'Grail-Instance Creation' }
Super class >> ___pyNameOf___: aBehavior [
	"aBehavior's PYTHON type name.

	The Smalltalk name is the wrong one for a Python diagnostic whenever a
	reused GemStone kernel class backs a built-in type: this message named
	``Integer'' and ``OrderedCollection'' where CPython says ``int'' and
	``list'', so test_supercheck_fail matched the message's structure and failed
	on its nouns -- which are the half that actually tells you what you passed.

	___pythonBuiltinTypeName___ answers nil for everything it does not remap
	(Grail-defined built-ins already carry their Python name, and user classes
	must keep their own), so falling back to the Smalltalk name is correct rather
	than merely safe."

	^ (aBehavior @env1:___pythonBuiltinTypeName___)
		@env0:ifNil: [aBehavior @env0:name @env0:asString]

]

{ #category : 'Grail-Instance Creation' }
Super class >> ___superCheck___: anObject against: aClass [
	"CPython's supercheck: ``obj'' must be an instance of ``aClass'', or a
	SUBCLASS of it when obj is itself a type.  Answers obj so callers can use
	it inline.

	The message names which of the two readings failed, because that is what
	says whether you passed the wrong object or the wrong class:

	    super(type, obj): obj (instance of C) is not an instance or
	    subtype of type (int).

	Grail checked nothing here: a mismatched pair simply built a proxy whose
	lookups walked the wrong chain, so the failure surfaced later and
	elsewhere (test_supercheck_fail).

	A nil obj is the UNBOUND form (``super(C)''), which has nothing to check.

	A non-class ``aClass'' is left alone: ``cls:obj:'' raises the argument-1
	TypeError for it, and that diagnosis is the more useful one.  Checking obj
	against it first instead walked ``inheritsFrom: 1'' and died in the kernel
	with an uncatchable ArgumentTypeError -- ``super(1, int)'' is exactly that
	shape (test_super_argtype)."

	| ok describe |
	anObject == nil ifTrue: [^ anObject].
	(aClass @env0:isKindOf: Behavior) @env0:ifFalse: [^ anObject].
	ok := self ___isInstanceOrSubtype___: anObject of: aClass.
	ok @env0:ifTrue: [^ anObject].
	describe := (anObject @env0:isKindOf: Behavior)
		@env0:ifTrue: ['type ' @env0:, (self ___pyNameOf___: anObject)]
		@env0:ifFalse: ['instance of '
			@env0:, (self ___pyNameOf___: anObject @env0:class)].
	^ TypeError ___signal___: 'super(type, obj): obj (' @env0:, describe
		@env0:, ') is not an instance or subtype of type ('
		@env0:, (self ___pyNameOf___: aClass) @env0:, ').'

]

{ #category : 'Grail-Instance Creation' }
Super class >> __new__ [
	"``super()'' with no arguments reaching the RUNTIME path -- i.e. outside a
	method body, since inside one CallAst rewrites it to a bound proxy before
	this class is ever named.  CPython has no frame to infer the class from
	either, and says so."

	^ RuntimeError ___signal___: 'super(): no arguments'

]

{ #category : 'Grail-Instance Creation' }
Super class >> __new__: aClass [
	"``super(C)'' -- CPython's UNBOUND super object.  The type check is the
	same one the bound form applies; what differs is only that no second
	argument binds it to an instance."

	^ self cls: aClass obj: nil

]

{ #category : 'Grail-Instance Creation' }
Super class >> __new__: aClass _: anObject [
	"``super(C, obj)'' called as an ordinary constructor.  Applies both of
	CPython's checks -- argument 1 must be a type, and obj must be an instance
	or subtype of it -- then builds the same proxy the compiled rewrite does."

	^ self cls: aClass obj: (self ___superCheck___: anObject against: aClass)

]

{ #category : 'Grail-Instance Creation' }
Super class >> __new__: aClass _: anObject _: anExtra [
	"Three arguments.  CPython counts them and refuses; without this the
	generic class-call path reports its own ``takes wrong number of
	arguments'' wording instead, and test_super_argcount matches on
	``expected at most''."

	^ TypeError ___signal___: 'super() expected at most 2 arguments, got 3'

]

{ #category : 'Grail-Instance Creation' }
Super class >> checkedCls: aClass obj: anObject [
	"``super(C, obj)'' as WRITTEN IN SOURCE, compiled.  The same proxy cls:obj:
	builds, with CPython's supercheck applied first.

	Two constructors because the callers differ in what they can be trusted
	about, not for convenience:

	  * cls:obj: is what a ZERO-ARG ``super()'' compiles to.  Codegen builds the
	    pair from the lexical class and the method's own first argument, so it is
	    well-formed by construction -- a check could only cost a lookup on the
	    hottest super path there is.
	  * this is what an EXPLICIT two-argument ``super(a, b)'' compiles to, where
	    both halves are arbitrary expressions.  That is the form CPython's
	    diagnostic exists for, and the form test_supercheck_fail exercises
	    through a method parameter:

	        def method(self, type_, obj): return super(type_, obj).method()

	Without this, a mismatched pair built a proxy that walked the wrong chain, so
	the failure surfaced later and elsewhere -- as ``'super' object has no
	attribute 'method''' from the eventual lookup, displacing the TypeError the
	test matches on."

	^ self cls: aClass obj: (self ___superCheck___: anObject against: aClass)

]

{ #category : 'Grail-Instance Creation' }
Super class >> cls: aClass obj: anObject [
	"Construct a Super proxy bound to the lexical class and the
	current method's first argument.

	A nil class is REJECTED here, where it is still catchable.  Every
	consumer walks ``cls superClass'', and nil does not understand that --
	an env-0 MessageNotUnderstood, which Python cannot catch and which
	therefore takes down the whole module run rather than failing one
	call.  That is how a method-local class naming itself in the two-arg
	form (``super(TracingDict, self)'') presented: not as a super() bug
	but as an uncatchable Smalltalk error in the middle of an unrelated
	test.  CPython's own message for the same mistake."

	| inst |
	(aClass isKindOf: Behavior) ifFalse: [
		TypeError ___signal___: 'super() argument 1 must be a type, not '
			@env0:, (aClass == nil
				ifTrue: ['NoneType']
				ifFalse: [aClass @env0:class @env0:name @env0:asString])].
	"NO supercheck here, and now for a narrower reason than before.  This is what
	a ZERO-ARG ``super()'' compiles to: codegen builds the pair from the lexical
	class and the method's own first argument, so it is well-formed by
	construction and a check could only cost a lookup on the hottest super path
	there is.

	An EXPLICIT ``super(a, b)'' -- both halves arbitrary expressions the program
	chose -- compiles to ``checkedCls:obj:'' instead, which does apply it.  That
	split is what test_supercheck_fail needed.

	It was previously skipped on BOTH compiled paths, because the check itself
	was wrong: ___isInstanceOrSubtype___ answered ``mro includes: aClass''
	exclusively, and a cooperative mixin is not always on the linearization
	___mroOf___ reports -- so it rejected calls the proxy then serviced correctly
	(four Django failures, measured).  The check now accepts the MRO *or* the
	Smalltalk chain, so the explicit path can afford it."
	inst := self @env0:new.
	inst @env0:_setCls: aClass obj: anObject.
	^ inst

]

{ #category : 'Grail-Attribute' }
Super >> ___bindHolderValue___: v [
	"Bind a value found in a parent's class-attribute holder, as CPython's
	super does: a DESCRIPTOR is asked for its own binding,
	``v.__get__(None if obj is a class else obj, owner)''.

	Binding everything as a method of obj was right for the decorated
	functions the holder mostly carries, and wrong for the three descriptors
	that land there whenever a decorator is not one the class build knows to
	compile -- ``@classmethod @abstractmethod'', a classmethod or property
	SUBCLASS such as abc's abstractclassmethod / abstractproperty.
	``super().foo()'' from a classmethod then called the classmethod OBJECT
	(``'classmethod' object is not callable''), and ``super().foo'' from a
	property answered a bound method instead of the parent's value
	(test_abc's abstract* tests).

	A Python-level descriptor -- any object whose class defines __get__,
	functools.cached_property, Werkzeug's or Django's -- is asked the same way
	(object >> ___isValueDescriptor___:, the test the instance read uses).
	``super().p'' over a parent's cached_property answered a MethodBinding
	around the descriptor instead of the parent's value."

	| inst owner |
	((v @env0:isKindOf: PyClassMethod)
		or: [(v @env0:isKindOf: PyStaticMethod)
		or: [(v @env0:isKindOf: PropertyDescriptor)
		or: [obj ___isValueDescriptor___: v]]])
			ifFalse: [^ MethodBinding instance: obj callable: v].
	(obj @env0:isKindOf: Behavior)
		ifTrue: [inst := None. owner := obj]
		ifFalse: [inst := obj. owner := obj @env0:class].
	(v ___respondsTo___: #'___get__:kw:')
		ifTrue: [^ v ___get__: { inst. owner } kw: nil].
	^ v __get__: inst _: owner

]

{ #category : 'Grail-Attribute' }
Super >> ___pyAttrLoad___: aSym [
	"super().<aSym> — return a BoundMethod-equivalent that, when
	invoked, executes the parent class''s method with obj as the
	receiver.

	Strategy: find the GsNMethod by walking cls''s superClass chain,
	then return a closure that calls ``method _executeInContext: ...``
	bound to obj.  We piggy-back on BoundMethod for arity dispatch
	via a thin _Super-bound shim that exposes ``value:value:``."

	| s symVA pickMethod walker holder v |
	"``__class__'' is the proxy's OWN type, not a name to resolve against the
	parent chain -- CPython answers the ``super'' type itself, and
	``super().__class__ is super'' is how test_super___class__ checks that the
	name and the object agree.  Delegating it returned a parent-method proxy
	instead, so the comparison was quietly false.  Every other name still goes
	to the parent, which is the point of the proxy."
	(aSym @env0:asSymbol == #'__class__') @env0:ifTrue: [^ self @env0:class].
	"The proxy's OWN state, for the same reason: these describe the super object
	rather than naming something to resolve against the parent chain.  CPython
	exposes all three as read-only attributes of a super object, and they are how
	a copied or unpickled proxy is checked for having survived intact
	(test_super's test_pickling and test_deep_copying assert each of them).
	Without them the parent walk ran and answered ``'super' object has no
	attribute '__self__''' -- which, since #472 made a missing name fail at
	LOOKUP time, is at least a clean AttributeError rather than a proxy that
	explodes when called.

	``__self_class__'' is type(obj), EXCEPT when obj is itself a class, where
	CPython answers the class: ``super(C, E)'' has __self__ E and
	__self_class__ E, so the two coincide for the unbound-ish form."
	(aSym @env0:asSymbol == #'__thisclass__') @env0:ifTrue: [^ cls].
	(aSym @env0:asSymbol == #'__self__') @env0:ifTrue: [^ obj].
	(aSym @env0:asSymbol == #'__self_class__') @env0:ifTrue: [
		^ (obj @env0:isKindOf: Behavior)
			@env0:ifTrue: [obj]
			@env0:ifFalse: [obj @env0:class]].
	"A class-attribute store on a PARENT shadows that parent's compiled method,
	the same way it does for a direct instance read (object >>
	___classChainAttrLookup___: and its caller).  super() has to honour it too:
	a class-body method decorator makes the parent's decorated method exactly
	such a store, so without this ``super().m()'' silently ran the parent's
	UNDECORATED compiled method -- ``D(derived+base-impl)'' where CPython gives
	``D(derived+B(base-impl))''.

	Walk from cls's PARENT: super() skips cls itself.  A hit binds obj, like any
	other function found in a class dict.

	The Smalltalk superclass chain, not the C3 MRO the compiled-method lookup
	below uses -- a cooperative-mixin parent whose decorated method is reached
	only through the receiver's MRO is still a gap.  Checks the committed store
	only, not the session-local canonical overlay, so a runtime ``Parent.m = f''
	seen through super() is likewise still a gap.  Both were gaps before too;
	this closes the definitional case that method decorators need."
	"A proxy with NO class cannot resolve anything, and must say so CATCHABLY.
	Every walk below starts at ``cls superClass'', which nil does not understand
	-- an env-0 MessageNotUnderstood that Python cannot catch, so it escapes the
	one call and takes down the whole module run.  cls:obj: already refuses a nil
	class for exactly this reason, but it is not the only way to get one: an
	UNPICKLER builds the object empty and then asks it for ``__setstate__'',
	which arrives here before any class has been set (test_super's test_pickling).
	An AttributeError is both true -- the proxy has no attributes to offer -- and
	catchable, which is what lets that test fail as a test."
	cls @env0:isNil ifTrue: [
		^ AttributeError ___signal___:
			('''super'' object has no attribute ''' @env0:, aSym @env0:asString
				@env0:, '''')].
	"IN MRO ORDER, the receiver's C3 linearization after cls -- the order
	_lookupMethodAndSideFirstOf:metaSelectors: already searches -- and not the
	Smalltalk superclass chain, which under multiple inheritance runs through
	the PRIMARY base alone.  pytest's ``Module(nodes.File, PyCollector)''
	reaches Collector along that chain without ever passing PyCollector, whose
	own collect the MRO puts first."
	(self @env0:___classesAfterCls___) @env0:do: [:each |
		walker := each.
		"A CLASS over a C type, reached the C base: ShimForeignSubclass stands
		where that type is in the MRO, so what follows is the base's -- above
		all ``super().__new__(cls, ...)'', whose next __new__ is the C tp_new
		(ShimForeignSubclass class>>___pyAttrLoad___: answers ``cls.__new__''
		the same way).  object's, further up, makes a half with no C body."
		(walker == ShimForeignSubclass and: [(obj @env0:isKindOf: Behavior)
				and: [obj @env0:inheritsFrom: ShimForeignSubclass]]) ifTrue: [
			^ obj @env0:___grailForeignBaseProxy___ ___pyAttrLoad___: aSym].
		(walker @env0:_respondsTo: #___dynInstVars___ flags: 16r10001) ifTrue: [
			holder := walker @env0:perform: #___dynInstVars___ env: 1.
			holder == nil ifFalse: [
				v := holder @env0:dynamicInstVarAt: aSym.
				v == nil ifFalse: [^ self ___bindHolderValue___: v]
			]
		].
		"THE NEAREST CLASS DEFINING THE NAME ENDS THE WALK.  A class that
		compiles aSym as an ordinary method -- and stored no decorated value
		over it, which the probe just above would have answered -- is where
		CPython's MRO walk stops, so an ANCESTOR's stored value must not be
		reached past it.  It was: ``super().collect()'' from pytest's Class
		skipped PyCollector's own collect and answered Collector's
		@abc.abstractmethod -- a decorated def, so its value sits in the
		holder -- and every test file failed to collect with ``abstract''.
		The compiled-method lookup below answers the nearer method."
		(self @env0:___definesAnyFormOf___: aSym in: walker) ifTrue: [
			^ self ___pyAttrLoadCompiled___: aSym]].
	"PAST THE PYTHON CLASSES, A C BASE.  For an instance of a Python subclass
	of a C type the MRO ends in that type -- ``super().dtype'' in numpy.ma's
	MaskedArray is ndarray's -- so a miss of the compiled walk is read off the
	instance's body (ShimForeignSubclass>>___pyAttrForeignBaseLoad___:).  The
	AttributeError is raised after the handler, not from inside it."
	(obj @env0:isKindOf: ShimForeignSubclass) ifTrue: [ | missed r |
		missed := false.
		r := [self ___pyAttrLoadCompiled___: aSym]
			@env0:on: AttributeError do: [:ex | missed := true. ex @env0:return: nil].
		missed ifFalse: [^ r].
		(obj ___pyAttrForeignBaseLoad___: aSym) @env0:ifNotNil: [:assoc | ^ assoc @env0:value]].
	^ self ___pyAttrLoadCompiled___: aSym

]

{ #category : 'Grail-Attribute' }
Super >> ___pyAttrLoadCompiled___: aSym [
	"The compiled-method half of ___pyAttrLoad___:, reached once the holder
	walk has found no stored value nearer than the nearest defining class."

	| s symVA pickMethod v |
	s := aSym @env0:asString.
	symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
	pickMethod := [:nargs :kwOk |
		| fixedSel instSel |
		"Resolve the fixed-arity selector for the call-site arity.

		BUILT, not enumerated.  This used to stop at three positional arguments
		and leave fixedSel nil beyond that, so ``super().m(a, b, c, d)'' could
		only ever reach a VARARGS method and silently missed a fixed-arity one.

		The case that exposed it is the standard metaclass idiom:
		``super().__new__(cls, name, bases, namespace)'' is FOUR positional
		arguments, so it never tried __new__:_:_:_:, fell through to the generic
		allocation path, and answered an INSTANCE of the metaclass where CPython
		answers the class.  Nothing about that was specific to metaclasses --
		any four-argument super() call had it."
		fixedSel := self @env0:_fixedSelectorFor: s nargs: nargs.
		"``__new__'' IS THE ONE NAME WHOSE TWO SIDES DISAGREE ABOUT ARITY.
		CPython makes __new__ an implicit staticmethod, so the target class is
		an ordinary first POSITIONAL argument and ``super().__new__(cls, a, b)''
		is a three-argument call.  Grail's built-in __new__ methods are compiled
		CLASS-side and written to exactly that convention -- ``object class >>
		__new__: cls'', ``type class >> __new__: mcls _: name _: bases _: ns''.
		But a class-body ``def __new__(cls, a, b)'' compiles INSTANCE-side with
		``cls'' as the Smalltalk receiver, i.e. ``__new__:_:'': one argument
		FEWER than the call site wrote.

		So the same three-argument call must look for ``__new__:_:_:'' on the
		class side and ``__new__:_:'' on the instance side.  Searching both with
		the class-side arity is what made ``super().__new__(cls, a, b)'' reach a
		user-written parent __new__ as ``(cls, cls, a, b)'' -- the leading class
		bound twice, reported as ``A.__new__() takes 2 positional arguments but
		3 were given''.  Searching both with the INSTANCE arity would have
		broken the metaclass idiom instead, which resolves class-side onto
		type >> __new__:_:_:_: and needs all four.  Neither single family can be
		right for both, which is why the lookup takes two.

		The varargs form ``___new__:kw:'' sits at the same position in both
		families and needs no shift: the instance-side one is a generated
		forwarder that expects the arguments AFTER cls, and the class-side one
		(object class >> ___new__:kw:) expects cls included -- each already
		agrees with the side it is found on.

		SuperBoundMethod completes the story: an instance-side hit is invoked
		with the leading class stripped back off and used as the receiver."
		instSel := ((s @env0:= '__new__') @env0:and: [nargs @env0:> 0])
			@env0:ifTrue: [self @env0:_fixedSelectorFor: s nargs: nargs @env0:- 1]
			@env0:ifFalse: [fixedSel].
		"Per-class probe of both forms — the NEAREST parent class
		defining either form wins (Python MRO semantics; see
		_lookupMethodFirstOf:).  With no kwargs prefer the fixed
		form at each class; with kwargs present prefer varargs
		``_<name>:kw:`` (a fixed-arity method would silently drop
		them — typically Object>>__init__, the env-1 default no-op)."
		kwOk
			ifTrue: [self @env0:_lookupMethodAndSideFirstOf: { instSel. symVA }
				metaSelectors: { fixedSel. symVA }]
			ifFalse: [self @env0:_lookupMethodAndSideFirstOf: { symVA. instSel }
				metaSelectors: { symVA. fixedSel }]].
	"RESOLVE EAGERLY ENOUGH TO FAIL EAGERLY.  The proxy below defers the real
	arity-sensitive lookup to call time, which is right -- but it also meant a
	name the parent chain does NOT define at any arity still produced a
	perfectly truthy proxy, and the AttributeError only fired when it was
	called.

	That breaks the standard probe-with-a-default idiom.  copy.deepcopy does
	``getattr(x, '__deepcopy__', None)'', gets a proxy instead of None, calls
	it, and the AttributeError escapes OUTSIDE the guard that was supposed to
	catch it -- test_super test_deep_copying and test_pickling, where the
	object being copied is a super object itself.  ``hasattr'' was wrong for
	the same reason: True for every name.

	So probe the whole arity family once, here, and raise now if nothing in the
	chain defines the name in any form.  Nine arities plus the varargs form
	covers everything Grail compiles; a name that exists at some arity still
	gets the deferred proxy, so the call-time resolution is unchanged."
	(self @env0:_superDefinesAnyFormOf: s) ifFalse: [
		| bridged |
		bridged := self ___superTypeMethodFor___: aSym.
		bridged == nil ifFalse: [^ bridged].
		bridged := self ___superValueMethodFor___: aSym.
		bridged == nil ifFalse: [^ bridged].
		^ AttributeError ___signal___:
			('''super'' object has no attribute ''' @env0:, s @env0:, '''')].
	"A VALUE ATTRIBUTE reached through super() must answer its VALUE.
	``___pythonValueAttrs___'' is how a Smalltalk-backed class advertises the
	unary methods that are data attributes rather than callables -- and the
	direct read (object >> ___pyAttrLoad___:) has always honoured it.  super()
	did not, so ``super().family'' answered a SuperBoundMethod: the same class
	of silent wrong answer as the property case above.  CPython's socket.py
	does exactly this --

	    @property
	    def family(self):
	        return _intenum_converter(super().family, AddressFamily)

	-- so the facade's family/type came out as proxies.

	CALLED THROUGH THE PROXY, not ``obj perform: aSym''.  Performing on obj
	would find the MOST DERIVED implementation, which for the shape above is
	the very property doing the super() call: unbounded recursion rather than
	a wrong value.  The proxy resolves against cls's PARENT chain, which is
	what super() means, so building it and invoking it with no arguments runs
	the parent's method bound to obj.

	Asked of cls's parent, not of obj's class, for the same reason -- and
	``respondsTo:'' already walks the chain, so an inherited hook counts."
	((cls @env0:superClass @env0:respondsTo: #'___pythonValueAttrs___')
		@env0:and: [(cls @env0:superClass @env0:___pythonValueAttrs___)
			@env0:includes: aSym @env0:asSymbol])
		ifTrue: [
			^ (SuperBoundMethod obj: obj resolver: pickMethod selector: aSym)
				value: #() value: nil].
	"A @PROPERTY reached through super() must answer its value too, for the
	same reason: ``super().x'' inside a property getter answered the proxy,
	and ``super().x * 2'' then failed on it.  CPython's ssl.py reads every
	property it overrides this way (``TLSVersion(super().minimum_version)'').
	A property's accessor pair is indistinguishable from a method with a
	default argument, so the NEAREST parent that defines the name is asked
	whether it declared it a property (___grailOwnPropertyNames___, recorded
	at class build).  Only for an INSTANCE receiver: ``super(C, C).x'' is a
	read off the class, which in CPython answers the property object itself
	-- the proxy stands in for it, and answers __get__ / __set__."
	(obj @env0:isKindOf: Behavior) ifFalse: [
		| definer |
		definer := cls @env0:superClass.
		[definer @env0:notNil
			and: [(definer @env0:includesSelector: aSym @env0:asSymbol environmentId: 1) not]]
			whileTrue: [definer := definer @env0:superClass].
		(definer @env0:notNil
			and: [(definer @env0:class @env0:includesSelector: #'___grailOwnPropertyNames___'
					environmentId: 1)
			and: [(definer @env1:___grailOwnPropertyNames___) @env0:includes: aSym @env0:asSymbol]])
			ifTrue: [
				^ (SuperBoundMethod obj: obj resolver: pickMethod selector: aSym)
					value: #() value: nil]].
	"Wrap (obj, pickMethod) in a callable proxy that resolves the
	method at call time once arity is known."
	^ SuperBoundMethod obj: obj resolver: pickMethod selector: aSym

]

{ #category : 'Grail-Attribute' }
Super >> ___superTypeMethodFor___: aSym [
	"``type''s own method, for a ``super()'' inside a METACLASS -- or nil when
	this is not that case.

	``class Meta(type): def mro(self): ... return super().mro()'' is the standard
	way to write an mro hook, and the walk above cannot find that ``mro'':
	Grail's ``type'' is not a Python class with a method dictionary.  Its
	behaviour lives on Smalltalk's Behavior, which a CLASS OBJECT answers
	directly -- ``A.mro()'' has always worked, while ``super().mro()'' raised
	``'super' object has no attribute 'mro'''.

	THE ENVIRONMENT IS THE FILTER, and it is the right one rather than a
	convenient one.  Grail compiles type's Python-visible protocol onto Behavior
	in ENVIRONMENT 1; Smalltalk's own Behavior internals (``superclass'',
	``name'', ``selectors'') are env 0 and stay invisible here.  So asking for an
	env-1 method on the receiver's metaclass side asks precisely ``does type
	define this in Python?'' -- with no list to keep in step with Class.gs.

	Three conditions, all needed.  The proxy's class must be a metaclass (rooted
	at type), the bound object must be a CLASS (type's methods take a class as
	their receiver), and the ordinary walk must already have missed -- this is
	reached only from that failure, so a Python-level override on a metaclass
	between here and type still wins, as it must."

	| sym ty |
	cls @env0:isNil ifTrue: [^ nil].
	(cls @env0:isKindOf: Behavior) ifFalse: [^ nil].
	(obj @env0:isKindOf: Behavior) ifFalse: [^ nil].
	"``type'' by lookup rather than by name: Super.gs is filed before it exists,
	so a bare reference is an undefined symbol at compile time."
	ty := Python @env0:at: #'type' otherwise: nil.
	ty @env0:isNil ifTrue: [^ nil].
	(cls @env0:inheritsFrom: ty) ifFalse: [^ nil].
	sym := aSym @env0:asSymbol.
	(obj @env0:class @env0:whichClassIncludesSelector: sym environmentId: 1)
		@env0:isNil ifTrue: [^ nil].
	^ BoundMethod @env1:receiver: obj selector: sym

]

{ #category : 'Grail-Attribute' }
Super >> ___superValueMethodFor___: aSym [
	"int's or float's own method, bound to the WRAPPED VALUE, for a ``super()''
	inside a subclass of int or float -- or nil when this is not that case.

	``class MyFloat(float)'' is an AbstractPyFloat wrapper (the kernel Float is
	sealed), so the parent chain the walk above follows is AbstractPyFloat,
	Number, Object, and float's methods are not on it.  ``super().__truediv__(o)''
	-- the ordinary way to write an operator override that defers to float --
	raised AttributeError (test_statistics' MyFloat).  An attribute LOAD on the
	wrapper already forwards to the value (AbstractPyFloat / AbstractPyInt >>
	___pyAttrLoad___:); this is the same step for super(), and like the type
	bridge above it is reached only once the ordinary walk has missed, so an
	override between here and the built-in still wins."

	((obj @env0:isKindOf: AbstractPyFloat) or: [obj @env0:isKindOf: AbstractPyInt])
		ifFalse: [^ nil].
	(obj ___grailValueImplements___: aSym) ifFalse: [^ nil].
	^ BoundMethod @env1:receiver: obj @env0:value selector: aSym

]

{ #category : 'Grail-Initialization' }
Super >> __init__: aClass _: anObject [
	"``super.__init__(sp, C, obj)'' -- re-binding an existing proxy through the
	unbound method on the type.  CPython documents the shape as not endorsed
	but supports it, and test_super_init_leaks calls it in a loop."

	self @env0:_setCls: aClass
		obj: (Super ___superCheck___: anObject against: aClass).
	^ None

]
