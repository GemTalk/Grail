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
toRemove do: [:sel | Class removeSelector: sel environmentId: 1].
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
	filteredIvars := ivarNames @env0:reject: [:n |
		self @env0:allInstVarNames @env0:includes: n].
	filteredClassIvars := classIvarNames @env0:reject: [:n |
		self @env0:class @env0:allInstVarNames @env0:includes: n].
	^ self
		@env0:subclass: aSymbol
		instVarNames: filteredIvars
		classVars: #()
		classInstVars: filteredClassIvars
		poolDictionaries: #()
		inDictionary: nil
		options: #()
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

	| result c |
	result := OrderedCollection @env0:new.
	c := self.
	[c @env0:== nil] whileFalse: [
		result @env0:add: c.
		c := c @env0:superclass.
	].
	^ Array @env0:withAll: result
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
	[self @env0:compileMethod: aSource
		dictionaries: System @env0:myUserProfile @env0:symbolList @env0:copy
		category: aCategory
		environmentId: 1.
	] @env0:on: CompileWarning do: [:ex | ex @env0:resume].
	^ self
%
