Extension { #name : 'Class' }

{ #category : 'Grail-Class Compilation' }
Class >> ___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames [
	"Receiver is the parent class.  Create a fresh subclass named
	aSymbol, with the supplied instance- and class-side instVar name
	arrays filtered against the parent's hierarchy so we don't trip
	rtErrAddDupInstvar by redeclaring a name the parent already owns.
	Returns the new class.

	Why filter at all?  Python and Smalltalk model instance state
	differently:

	  - Python has no per-class instVar declaration.  Attributes live
	    in the per-instance __dict__ (or __slots__), created on the fly
	    by ``self.x = ...``.  Exactly one ``x'' exists per instance
	    regardless of which class's method wrote it; an inherited
	    method reading ``self.x'' and a subclass method writing it
	    reference the same attribute.

	  - GemStone Smalltalk allocates instVar slots per class at
	    subclass time and rejects re-declaration with
	    rtErrAddDupInstvar (e.g. ``self.templates'' declared by both
	    Jinja2's TemplateNotFound and TemplatesNotFound).

	By dropping names the parent already declares, the subclass reuses
	the parent's slot — ``self.x = 2'' in B writes to the same place an
	A method later reads.  Allocating a fresh slot in B (if Smalltalk
	allowed it) would silently break Python: A and B methods on the
	same instance would see different ``x''s.

	The classInstVars filter is on the metaclass side and exists for a
	different reason: in the bases-empty fallback the parent is
	PythonInstance, whose metaclass still inherits Smalltalk Behavior
	slots like ``name'' that a Python class body might re-declare as a
	class attribute (Jinja2's ``threading._Thread.name = 'MainThread'''
	shape).  Class attributes in Python *do* shadow per-class (``A.x !=
	B.x'' is allowed and expected) — ClassDefAst codegen fires the
	inherited setter at init time so each class gets its own per-class
	value even when the slot itself is inherited.

	Factored out of ClassDefAst codegen — every Python class definition
	used to inline a block with three temps and two reject: expressions
	to compute the filtered arrays, plus the seven hard-coded keyword
	arguments to ``subclass:...''.  This helper hides the boilerplate
	so the generated code reduces to a single send."

	| filteredIvars filteredClassIvars newCls |
	"``class MyInt(int)``: Integer is sealed AND its instances are
	immediate/byte-format, so no subclass can share its storage.
	Substitute AbstractPyInt -- the Number-sibling whose _generality
	coercion strips the wrapper in mixed arithmetic (exactly CPython's
	int-subclass operator semantics) and whose value slot carries the
	real Integer.  isinstance/issubclass against int recognize the
	substitute (Int.gs __instancecheck__, builtins issubclass)."
	"``class MyTimezone(timezone): pass'': real CPython's timezone type
	does not set Py_TPFLAGS_BASETYPE (unlike date/datetime/time/timedelta,
	which DO allow subclassing) -- it is documented as final.  test_datetime's
	TestTimeZone.test_cannot_subclass expects a catchable TypeError."
	(self == (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #PyTimezone)) ifTrue: [
		^ TypeError ___signal___: 'type ''timezone'' is not an acceptable base type'].
	"``class C(bool)'': CPython's bool is documented as final -- it has
	exactly two instances, so it does not set Py_TPFLAGS_BASETYPE.  Grail
	maps bool onto the kernel Boolean, whose metaclass ALSO refuses
	instantiation, but via ``Boolean class>>new''`s shouldNotImplement --
	an uncatchable Smalltalk Error rather than the TypeError Python code
	expects (test_bool.py test_subclass)."
	(self == Boolean) ifTrue: [
		^ TypeError ___signal___: 'type ''bool'' is not an acceptable base type'].
	"``class CaptureIO(io.TextIOWrapper)'': CPython's TextIOWrapper wraps a
	BUFFER, and wrapping one is the ordinary reason to subclass it -- pytest's
	CaptureIO / TeeCaptureIO / EncodedFile all ``super().__init__(io.BytesIO(),
	encoding=...)''.  Grail's TextIOWrapper is a FileIO over a GsFile, so a
	subclass of it was never initialised over the buffer: ``write'' raised
	``not writable'' and ``.buffer'' was missing (#1459).  A plain
	``io.TextIOWrapper(buffer)'' already answers _pyio's buffer-wrapping class
	(TextIOWrapper class >> ___constructText___:kw:), so a Python subclass is
	rooted there too, the way int's is rooted at AbstractPyInt.  Only a class
	STATEMENT comes through here; Grail's own Smalltalk subclasses of
	TextIOWrapper keep the GsFile one."
	(self == (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #TextIOWrapper)) ifTrue: [ | pyio |
		pyio := [((System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #io) instance)
				@env1:___pyioClass___: #'TextIOWrapper']
			@env0:on: Error do: [:ex | ex @env0:return: nil].
		(pyio @env0:isKindOf: Behavior) ifTrue: [
			^ pyio ___subclass___: aSymbol
				instVarNames: ivarNames
				classInstVarNames: classIvarNames]].
	((self == Integer)
		or: [self == SmallInteger or: [self == LargeInteger]]) ifTrue: [
		^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #AbstractPyInt)
			___subclass___: aSymbol
			instVarNames: ivarNames
			classInstVarNames: classIvarNames].
	"``class MyFloat(float)``: same story for the sealed float kernel --
	substitute the AbstractPyFloat Number-sibling (generality 80 strips
	the wrapper in mixed arithmetic; see AbstractPyFloat.gs)."
	((self == Float)
		or: [self == SmallDouble or: [self == BinaryFloat]]) ifTrue: [
		^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #AbstractPyFloat)
			___subclass___: aSymbol
			instVarNames: ivarNames
			classInstVarNames: classIvarNames].
	"NOTE: we deliberately do NOT substitute AbstractPyStr for a plain
	``class X(str)``.  A boxed str is NOT a CharacterCollection, so
	framework str subclasses (jinja2 Markup, werkzeug/django text types)
	passed to env-0 Smalltalk string APIs would break -- three Flask
	tests regressed when this was tried.  Plain str subclasses stay
	byte-format Unicode7 subclasses (their content IS the string, working
	for str behavior; they just can't carry per-instance attributes).
	StrEnum does NOT need the substitution: it is defined directly as an
	AbstractPyStr subclass (PyEnumTypes.gs), so ``class C(StrEnum)`` and
	the functional StrEnum('X', {...}) already root at the boxed base."
	"Compared AS STRINGS, deliberately.  ``allInstVarNames'' answers SYMBOLS
	and callers pass STRINGS, so a plain ``includes:'' never matched and the
	filter silently did nothing -- the whole point of this step.  It went
	unnoticed because no caller had yet passed a name the parent already owned;
	the first one that did (``type(name, bases, ns)'' asking for the
	``___dynInstVars___'' holder slot) hit rtErrAddDupInstvar, which surfaces here as
	the ImproperOperation handler below and reported the far more alarming
	``Grail cannot subclass sealed kernel class 'Base'''."
	filteredIvars := ivarNames @env0:reject: [:n |
		(self @env0:allInstVarNames
			@env0:detect: [:m | m @env0:asString @env0:= n @env0:asString]
			ifNone: [nil]) @env0:notNil].
	"A PythonInstance-rooted class declares NO named instVar for its __slots__:
	a declared slot is a POSITION in the instance's indexed part, laid out by
	the installer once the class exists (docs/Instance_Attribute_Indexed_Slots.md),
	so the class has no shape an edit could fail to grow.  ClassDefAst still
	passes the mangled names, because a KERNEL-rooted class (Exception, dict,
	...) uses its indexed part for content and keeps the named instVar; this is
	the one place that knows which root the class has.  PythonInstance is
	resolved at run time, like importlib below: this method compiles on the
	kernel Class, whose symbol list lacks the Python dictionary."
	(System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #PythonInstance)
		@env0:ifNotNil: [:pyRoot |
			((self @env0:inheritsFrom: pyRoot) @env0:or: [self == pyRoot]) ifTrue: [
				filteredIvars := filteredIvars @env0:reject: [:n | | s |
					s := n @env0:asString.
					(s @env0:size @env0:> 11) @env0:and: [(s @env0:copyFrom: 1 to: 8) @env0:= '___slot_']]]].
	filteredClassIvars := classIvarNames @env0:reject: [:n |
		(self @env0:class @env0:allInstVarNames
			@env0:detect: [:m | m @env0:asString @env0:= n @env0:asString]
			ifNone: [nil]) @env0:notNil].
	"A sealed kernel class (Integer, Boolean, ...) refuses subclassing
	with an UNCATCHABLE ImproperOperation that killed whole CPython
	test-module runs (class myint(int) in test_fractions/test_math).
	Re-signal as a catchable Python TypeError -- a DELIBERATE Grail
	deviation until int subclassing lands."
	newCls := [self
		@env0:subclass: aSymbol
		instVarNames: filteredIvars
		classVars: #()
		classInstVars: filteredClassIvars
		poolDictionaries: #()
		inDictionary: nil
		options: #()]
			@env0:on: ImproperOperation
			do: [:ex |
				"A byte-format kernel base (bytes / bytearray / str) cannot carry
				NAMED instance variables, so a subclass that declares __slots__
				(test_bytes' ByteArraySubclassWithSlots) lands here.  Retry with NO
				named instVars: the slots then live as DYNAMIC instVars, which
				byte-format Python subclasses already support (plain attribute
				assignment works on them) -- so the subclass stays usable, minus
				strict __slots__ enforcement (a documented deviation).  A class
				that is genuinely unsubclassable (an immediate/special kernel not
				substituted above) fails the retry too and re-signals the catchable
				TypeError (resolved at runtime: this method compiles on the kernel
				Class class, whose symbol list lacks the Python dict)."
				[self
					@env0:subclass: aSymbol
					instVarNames: #()
					classVars: #()
					classInstVars: filteredClassIvars
					poolDictionaries: #()
					inDictionary: nil
					options: #()]
					@env0:on: ImproperOperation
					do: [:ex2 |
						(System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #TypeError)
							___signal___:
								('Grail cannot subclass sealed kernel class '''
									@env0:, self @env0:name @env0:asString @env0:, '''')]].
	"``inDictionary: nil'' above is what makes this necessary: the new class is
	in no symbol dictionary, so GemStone's own ``subclasses'' (a ClassOrganizer
	scan of the symbol dictionaries) cannot see it and cls.__subclasses__() would
	answer [] for every Python class in the system.  Recorded HERE because this
	is the one point every Python class creation passes through.  Failures --
	a sealed base -- raise above and never reach it.

	importlib is resolved at run time rather than named directly: this method
	compiles on the kernel ``Class'', whose symbol list does not carry the Python
	dictionary, which is why the TypeError above is fetched the same way.  Before
	importlib exists the registration is simply skipped; nothing defines a Python
	class that early."
	(Python @env0:at: #importlib otherwise: nil)
		@env0:ifNotNil: [:il | il @env0:___registerSubclass___: newCls of: self].
	^ newCls

]
