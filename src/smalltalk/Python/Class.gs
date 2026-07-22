! ------------------- Grail extensions to the system Class

! ------------------- Sanity check
run
Class ifNil: [self error: 'Class is not defined.  Check file ordering.'].
%

! ------------------- Scrub previously-installed Grail env-1 methods on
! Class so a removed source line doesn't linger as a stale method.  The
! Step 0 hygiene loop in install.gs handles env-0 across all classes;
! env-1 methods need per-class scrubbing because Class isn't owned by
! Grail and we can't do ``Class removeAllMethods: 1'' (it'd nuke any
! non-Grail env-1 methods on Class too).
run
| md toRemove |
md := Class methodDictForEnv: 1.
toRemove := OrderedCollection new.
md keysDo: [:sel |
	| cat |
	cat := Class categoryOfSelector: sel environmentId: 1.
	(cat notNil and: [cat beginsWith: 'Grail-']) ifTrue: [toRemove add: sel]
].
"Guarded: under GsPackagePolicy these env-1 methods are per-user SESSION
 methods that removeSelector: can't remove (protected) and that the package
 recreation at install start has already dropped -- redundant, must not fail."
toRemove do: [:sel | [Class removeSelector: sel environmentId: 1] on: Error do: [:e | ]].
%

set compile_env: 1

category: 'Grail-Class Compilation'
method: Class
___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames
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

	| filteredIvars filteredClassIvars |
	"``class MyInt(int)``: Integer is sealed AND its instances are
	immediate/byte-format, so no subclass can share its storage.
	Substitute AbstractPyInt -- the Number-sibling whose _generality
	coercion strips the wrapper in mixed arithmetic (exactly CPython's
	int-subclass operator semantics) and whose value slot carries the
	real Integer.  isinstance/issubclass against int recognize the
	substitute (Int.gs __instancecheck__, builtins issubclass)."
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
	filteredIvars := ivarNames @env0:reject: [:n |
		self @env0:allInstVarNames @env0:includes: n].
	filteredClassIvars := classIvarNames @env0:reject: [:n |
		self @env0:class @env0:allInstVarNames @env0:includes: n].
	"A sealed kernel class (Integer, Boolean, ...) refuses subclassing
	with an UNCATCHABLE ImproperOperation that killed whole CPython
	test-module runs (class myint(int) in test_fractions/test_math).
	Re-signal as a catchable Python TypeError -- a DELIBERATE Grail
	deviation until int subclassing lands."
	^ [self
		@env0:subclass: aSymbol
		instVarNames: filteredIvars
		classVars: #()
		classInstVars: filteredClassIvars
		poolDictionaries: #()
		inDictionary: nil
		options: #()]
			@env0:on: ImproperOperation
			do: [:ex |
				"TypeError resolved at runtime: this method compiles on the
				kernel Class class, whose symbol list lacks the Python dict."
				(System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #TypeError)
					___signal___:
						('Grail cannot subclass sealed kernel class '''
							@env0:, self @env0:name @env0:asString @env0:, '''')]
%

category: 'Grail-Reflection'
method: Behavior
__mro__
	"Python ``cls.__mro__'': the method resolution order, as a tuple
	beginning with the receiver class and walking up the superclass
	chain.  Single inheritance is the simple chain — correct for the
	exception hierarchy, which is where flask consults
	``exc_class.__mro__'' during error-handler lookup
	(``for cls in exc_class.__mro__: handler_map.get(cls)'').

	The chain runs up through the GemStone-internal ancestors to
	Object; that's harmless for identity-keyed handler maps because
	those internal classes are never registered as handler keys.  It is
	NOT a full C3 linearization — multiple inheritance would need the
	merge — but no exception class uses MI, and the only consumers
	today walk the chain looking for an identity match.

	Read as a *value* (not wrapped as a BoundMethod) because
	``___pyAttrLoad___:'' lists ``__mro__'' among the class-level
	dunders that always resolve to their value."

	| il result c |
	"Single source of truth: importlib ___mroOf___: derives the C3 MRO,
	splicing an MI-registered ancestor's SECONDARY bases when a
	single-inheritance subclass would otherwise re-walk the raw Smalltalk
	superclass chain and drop them (``class E(int, Flag)'' is
	Integer-chained; a subclass of E must keep Flag/Enum -- Enum
	___grailIsFlagClass: reads __mro__, so auto() numbering and
	issubclass(sub, Flag) both hinge on it).  Fall back to the bare chain
	only before importlib exists (Class.gs loads early)."
	il := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #importlib.
	il == nil ifFalse: [^ il @env0:___mroOf___: self].
	result := OrderedCollection @env0:new.
	c := self.
	[c == nil] whileFalse: [
		result @env0:add: c.
		c := c @env0:superclass.
	].
	^ Array @env0:withAll: result
%

category: 'Grail-Reflection'
method: Behavior
__base__
	"Python ``cls.__base__'': the primary (first) base class.  Grail
	classes are single-inheritance Smalltalk classes, so this is the
	Smalltalk superclass; a class with no superclass (Object) reports
	Python None.  Read as a value — listed among the class-level dunders
	in Object>>___pyAttrLoad___:.  numpy._core._exceptions does
	``cls.__name__ = cls.__base__.__name__'' in a class decorator.

	Class.gs loads before the ``None'' global is declared, so the
	no-superclass case resolves None from the symbol list at run time
	(when it exists) rather than referencing the bare ``None'' symbol
	(which would be an undefined-symbol compile error here)."

	| s |
	s := self @env0:superclass.
	^ s == nil
		ifTrue: [System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'None']
		ifFalse: [s]
%

category: 'Grail-Reflection'
method: Behavior
__bases__
	"Python ``cls.__bases__'': the direct base classes as a tuple.
	Single-inheritance approximation — the Smalltalk superclass as a
	1-element Array (empty when there is no superclass), mirroring how
	__mro__ answers a plain Array."

	| il s |
	"Multiple-inheritance classes report their TRUE declared bases."
	il := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #importlib.
	il == nil ifFalse: [
		| entry |
		entry := il @env0:___miRegistry___ @env0:at: self otherwise: nil.
		entry == nil ifFalse: [^ entry @env0:at: 1]].
	s := self @env0:superclass.
	^ s == nil ifTrue: [Array @env0:new] ifFalse: [Array @env0:with: s]
%

category: 'Grail-Class Compilation'
method: Behavior
___compileMethod: aSource category: aCategory
	"Compile aSource as a method on the receiver, env-1, using the
	Grail compilation symbol list, wrapped in a CompileWarning
	handler that resumes (matches the module-body compile path —
	without this an upstream-shaped class body that shadows a
	method argument aborts the whole module load).  Returns the
	receiver.

	Installed on Behavior, not Class, so the class-side form
	``Foo class ___compileMethod: ...'' works too — ``Foo class''
	is a Metaclass3 instance, and Metaclass3's class chain
	(Metaclass3 < Module < Behavior) does NOT include Class.  Both
	Class and Metaclass3 inherit from Behavior, so a Behavior
	method covers ``Foo ___compileMethod:'' (instance side) and
	``Foo class ___compileMethod:'' (class side) uniformly.

	Hides the per-method boilerplate ClassDefAst codegen used to
	inline at every emit site:

	  [Foo @env0:compileMethod: '...'
	      dictionaries: (Python @env0:at: #importlib)
	          @env0:___compilationSymbolList___
	      category: '...' environmentId: 1
	  ] @env0:on: CompileWarning do: [:___ex___ | ___ex___ @env0:resume]

	becomes

	  Foo ___compileMethod: '...' category: '...'

	~250 chars per method → ~50.  Class-side compiles use ``Foo class
	___compileMethod: ...''."

	"Resolve the symbol list locally rather than calling
	``importlib ___compilationSymbolList___'' — Class.gs files in
	early during install (as SystemUser, before the Python /
	importlib globals exist), so the bare ``Python at: #importlib''
	would fail to compile here.  The user-profile symbol list is the
	same value importlib's helper would return."
	[[self @env0:compileMethod: aSource
		dictionaries: System @env0:myUserProfile @env0:symbolList @env0:copy
		category: aCategory
		environmentId: 1.
	] @env0:on: CompileWarning do: [:ex | ex @env0:resume]]
		@env0:on: CompileError
		do: [:ex |
			"A RUNTIME classdef whose method can't compile (a Grail
			codegen gap, e.g. yield-in-lambda) must not abort the whole
			classdef -- that turned ONE bad method into a module-wide
			IMPORTERROR (test_collections' test_Generator).  Install a
			same-selector STUB that raises a catchable NameError when
			the method is actually CALLED; if even the stub won't
			compile, fall back to raising the NameError here (still
			catchable -- the pre-stub behavior)."
			| lfIdx endIdx pattern stubSrc |
			lfIdx := aSource @env0:indexOf: Character @env0:lf.
			endIdx := lfIdx @env0:= 0
				ifTrue: [aSource @env0:size]
				ifFalse: [lfIdx @env0:- 1].
			pattern := aSource @env0:copyFrom: 1 to: endIdx.
			stubSrc := pattern @env0:, (Character @env0:lf @env0:asString) @env0:,
				'	(System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #NameError)
		@env1:___signal___: ''Grail could not compile this method (codegen gap); see install/import log'''.
			[[self @env0:compileMethod: stubSrc
				dictionaries: System @env0:myUserProfile @env0:symbolList @env0:copy
				category: aCategory
				environmentId: 1.
			] @env0:on: CompileWarning do: [:wx | wx @env0:resume]]
				@env0:on: CompileError
				do: [:ex2 |
					(System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #NameError)
						___signal___: ('method compile failed ['
							@env0:, (pattern @env0:copyFrom: 1 to: (pattern @env0:size @env0:min: 80)) @env0:asString
							@env0:, ']: '
							@env0:, (ex @env0:messageText @env0:ifNil: ['(no details)']))]].
	^ self
%

set compile_env: 0
