! ------------------- Superclass check
run
SymbolDictionary ifNil: [self error: 'SymbolDictionary is not defined. Check file ordering.'].
%

! ------- module class (Python 'module' type)
!
! See docs/Rewrite_Dispatch_Model.md for the full design.
!
! `module` is a SymbolDictionary subclass. Module loading
! (`importlib loadModuleFromPath:`) depends on the runtime `module`
! instance being dictionary-shaped, because module-level Python globals
! for non-class-backed modules are stored as entries in the instance's
! SymbolDictionary slot and looked up via symbol-list resolution at
! compile time.

expectvalue /Class
doit
SymbolDictionary subclass: 'module'
  instVarNames: #()
  classVars: #()
  classInstVars: #( instance )
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
module comment:
'Python module type — root class for all Python modules in Grail.

Concrete modules (sys, math, builtins, importlib, ...) are direct
subclasses of this class. Each module is a singleton; the class-side
`instance` method returns its sole instance.

Storage:
  * `module` inherits from `SymbolDictionary`. Module-level Python
    globals are stored as entries in the instance''s dictionary slot
    and resolved through Smalltalk symbol-list lookup at compile time.
    The compile pipeline in `importlib loadModuleFromPath:` depends on
    this for variable resolution.
  * In contrast, builtins (abs, len, type, ...) are dispatched via
    real env-1 methods on the `builtins` class — see
    docs/Rewrite_Dispatch_Model.md. The dictionary-style storage here
    is only used for module-level user globals, not for builtins.

Inheritance:
  * `builtins` is the leaf subclass for the Python builtins module,
    holding all builtin methods (`abs:`, `len:`, `_print:kw:`, etc.).
    Other Python modules also subclass `module` directly. The
    inheritance is a Smalltalk implementation detail, not a Python
    type-theoretic claim — `type(math)` and `type(builtins)` should
    both report as `<class ''module''>`.

User-defined Python modules are compiled to real Smalltalk classes
with explicit instance variables for the module''s globals; the
dictionary-style storage here is only used for the legacy built-in
module singletons.
'
%

expectvalue /Class
doit
module category: 'Grail-Modules'
%

! ------------------- Remove existing Python methods from module
expectvalue /Metaclass3
doit
module removeAllMethods: 1.
module class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Convenience Methods'
classmethod: module
___instance___
	"env-0 entry point for the singleton accessor (callable from C/GciPerform)."
	^ self @env1:instance
%

category: 'Grail-Singleton'
classmethod: module
___adoptInstance___: anInstance
	"Register an already-created instance as the singleton.  Called by
	importlib's ``loadModuleFromPath:'' BEFORE running the module body's
	``initialize'' — without this, any code in the body that resolves a
	module-scope name (e.g. ``self _Foo''  in
	``isinstance(item, _Foo)'' from a method body) goes through
	``self class ___instance___'' which then sees a nil classInstVar
	and mints a SECOND instance, runs initialize on it, and ends up
	with two parallel copies of every class the module defines.
	The xfail regression
	``FlaskScaffoldingTestCase >> testModuleSingletonReturnsSameClass''
	flips to green when this hook is wired."

	instance := anInstance
%

set compile_env: 1

category: 'Grail-Singleton'
classmethod: module
clearInstance
	"Clear the singleton instance (useful for testing)."
	instance := nil
%

category: 'Grail-Singleton'
classmethod: module
instance
	"Return the singleton instance of this module subclass, creating it on
	first access. Initialization runs in env 1 so subclasses can install
	Python-side state."

	instance == nil ifTrue: [
		instance := self @env0:new.
		instance @env1:initialize
	].
	^ instance
%

category: 'Grail-Singleton'
classmethod: module
new
	"Modules are singletons; use `instance` instead of `new`."
	TypeError ___signal___:
		('Use #''instance'' instead of #''new'' for '
			@env0:, (self @env0:name @env0:asString @env0:, ' module'))
%

category: 'Grail-Accessors'
method: module
__doc__
	"Return the module docstring, falling back to the base object docstring
	if unset."

	| doc |
	doc := self @env0:at: #__doc__.
	doc == nil ifTrue: [^ super __doc__].
	^ doc
%

category: 'Grail-Accessors'
method: module
__doc__: aValue
	self @env0:at: #__doc__ put: aValue
%

category: 'Grail-Accessors'
method: module
__loader__
	^ self @env0:at: #__loader__
%

category: 'Grail-Accessors'
method: module
__loader__: aValue
	self @env0:at: #__loader__ put: aValue
%

category: 'Grail-Accessors'
method: module
__name__
	^ self @env0:at: #__name__
%

category: 'Grail-Accessors'
method: module
__name__: aValue
	self @env0:at: #__name__ put: aValue
%

category: 'Grail-Accessors'
method: module
__package__
	^ self @env0:at: #__package__
%

category: 'Grail-Accessors'
method: module
__package__: aValue
	self @env0:at: #__package__ put: aValue
%

category: 'Grail-Accessors'
method: module
__path__
	"Return the module's __path__ if it has been set, else None. Modules
	that are packages have a __path__; plain modules do not. (CPython
	raises AttributeError instead, but None-as-absent is what existing
	Grail callers rely on.)"

	^ (self @env0:includesKey: #__path__)
		ifTrue: [self @env0:at: #__path__]
		ifFalse: [None]
%

category: 'Grail-Accessors'
method: module
__path__: aValue
	self @env0:at: #__path__ put: aValue
%

category: 'Grail-Accessors'
method: module
__spec__
	^ self @env0:at: #__spec__
%

category: 'Grail-Accessors'
method: module
__spec__: aValue
	self @env0:at: #__spec__ put: aValue
%

category: 'Python-Mutation Methods'
method: module
update: other
	"Merge ``other`` (a dict-like) into this module's namespace.  Used by
	Python sources that call `globals().update(...)`.  CallAst rewrites
	bare `globals()` to `self` for module-method context, so this lands
	on a module instance.

	Phase A: writes go to dynamic-instVar storage (the canonical home
	for module globals after the SymbolDictionary fast-path was
	removed).  NameAst codegen reads from the same store, so a name
	injected here via `globals().update({'X': 1})` is visible to any
	subsequent bare ``X'' reference in the module body."

	| isDict |
	isDict := other @env0:isKindOf: dict.
	isDict ifTrue: [
		other @env0:keysAndValuesDo: [:key :value |
			self @env0:dynamicInstVarAt: key @env0:asSymbol put: value
		]
	] ifFalse: [
		"Iterable of (key, value) pairs"
		other @env0:do: [:pair |
			self @env0:dynamicInstVarAt: (pair @env0:at: 1) @env0:asSymbol put: (pair @env0:at: 2)
		]
	]
%

category: 'Python-Mutation Methods'
method: module
___mergePublicAttrsFrom: aModule
	"Copy every public (non-underscore-prefixed) attribute from
	aModule's namespace into self.  Used by `from X import *`
	codegen to pick up dynamically-injected names that parse-time
	star-import expansion missed (e.g. names added by
	`globals().update(...)` via a helper like re._constants._makecodes).

	Phase A: the canonical store for module globals is
	dynamicInstVarPairs.  Walk that first.  Also walk the
	SymbolDictionary keys as a fallback for the legacy pre-Phase-A
	storage path (built-in modules that haven't migrated yet)."

	| pairs |
	"Phase A canonical store — every module global a user-level
	source assigned via `name = value` or `globals().update({...})`
	lives here as a dynamic instVar."
	pairs := aModule @env0:dynamicInstVarPairs.
	1 to: pairs @env0:size by: 2 do: [:i |
		| nm val s |
		nm := pairs @env0:at: i.
		val := pairs @env0:at: i + 1.
		s := nm @env0:asString.
		(s @env0:size @env0:> 0
			and: [(s @env0:at: 1) @env0:~= $_]) ifTrue: [
			val @env0:== nil ifFalse: [
				importlib @env0:___bind: val onParent: self as: nm @env0:asSymbol
			]
		]
	].
	"Legacy SymbolDictionary fallback for built-in modules whose
	attributes still land in the dict slot (e.g. dunders, or
	pre-Phase-A leftovers)."
	aModule @env0:keysAndValuesDo: [:key :value |
		| s |
		s := key @env0:asString.
		(s @env0:size @env0:> 0
			and: [(s @env0:at: 1) @env0:~= $_]) ifTrue: [
			importlib @env0:___bind: value onParent: self as: key @env0:asSymbol
		]
	]
%

set compile_env: 1

category: 'Grail-Attribute Access'
method: module
___moduleAttrLoad___: aSym
	"Bare-name module-attribute load with NameError on miss.  Probes
	dynamic-instVar storage first (canonical home for user globals
	and rebound names); if absent, lazy-wraps a class method as a
	BoundMethod (handles top-level defs without pre-storing a handle
	at def time, which would block rebinding detection in
	CallAst's bare-call dispatch).  Raises Python NameError if
	neither path resolves — matches ``KeyError → NameError'' in
	CPython's __globals__[name] lookup."

	| val s sym1 sym2 sym3 symVA cls owner |
	val := self @env0:dynamicInstVarAt: aSym.
	val == nil ifFalse: [^ val].
	"Lazy-wrap a top-level def as BoundMethod.  The def itself
	compiled as a real env-1 method on the module class; this is
	the first read that turns it into a first-class function value."
	cls := self @env0:class.
	s := aSym @env0:asString.
	symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
	((cls @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil) ifTrue: [
		^ BoundMethod @env1:receiver: self selector: aSym
	].
	"Try the fast-path fixed-arity selectors first (1..3 args), then
	walk to higher arities until we either find one or exhaust the
	candidate range.  Without the > 3 check, a top-level def with
	four or more simple-positional params (e.g. flask.cli's
	``def run_command(info, host, port, reload, debugger, ...)'' —
	9 args) wasn't picked up, leaving the module read to fall
	through to the NameError branch even though the method exists.
	Cap at 16 args — beyond that we'd hit the varargs form anyway."
	sym1 := (s @env0:, ':') @env0:asSymbol.
	sym2 := (s @env0:, ':_:') @env0:asSymbol.
	sym3 := (s @env0:, ':_:_:') @env0:asSymbol.
	(((cls @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil)
		or: [(cls @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
		or: [(cls @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil]]) ifTrue: [
		^ BoundMethod @env1:receiver: self selector: aSym
	].
	"Higher-arity fixed selectors (4..16 args).  Selector shape is
	``name:'' followed by ``_:'' repeated (arity - 1) times."
	4 to: 16 do: [:arity |
		| candidate |
		candidate := s @env0:asString @env0:, ':'.
		2 to: arity do: [:_ | candidate := candidate @env0:, '_:'].
		(cls @env0:whichClassIncludesSelector: candidate @env0:asSymbol environmentId: 1) notNil ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSym
		].
	].
	"Unary class method.  Two sub-cases:
	  * Defined on the ``module'' superclass — a dunder accessor like
	    ``__name__'' that reads from the SymbolDictionary slot.  Perform
	    directly to return the stored value.
	  * Defined on a subclass — a 0-arg top-level def (Python
	    ``def foo(): ...'' compiles to a unary Smalltalk selector).
	    Wrap as BoundMethod so the bare name is a first-class function
	    reference, NOT an auto-invocation.  Without this branch a
	    generator-function reference like ``func = _my_cm_impl''
	    would auto-call the generator and lose the function handle."
	owner := cls @env0:whichClassIncludesSelector: aSym environmentId: 1.
	owner notNil ifTrue: [
		owner @env0:== module
			ifTrue: [^ self @env0:perform: aSym env: 1]
			ifFalse: [^ BoundMethod @env1:receiver: self selector: aSym]
	].
	"Legacy SymbolDictionary fallback for built-in modules that
	store some attrs in the dict slot."
	(self @env0:includesKey: aSym) ifTrue: [^ self @env0:at: aSym].
	NameError @env1:___signal___: 'name ''' @env0:, s @env0:, ''' is not defined'
%

set compile_env: 0

category: 'Grail-Attribute Access'
method: module
doesNotUnderstand: aSelector args: anArray envId: envId
	"Fall back to attribute lookup for unrecognized messages.  Phase A:
	check dynamic-instVar storage first (canonical home for module
	globals), then lazy-wrap a top-level def as a BoundMethod (no
	pre-store at def time), then the SymbolDictionary slot (legacy /
	dunder metadata).  These paths enable ``mod.name'' /
	``mod @env1:name'' from Smalltalk to read a stored value via a
	bare unary send.  If no probe matches AND the message is unary
	with no args (an attribute-style read), return nil — matches the
	pre-Phase-A behavior where bare-annotation slots (``x: int''
	with no value) yielded nil rather than MNU."

	| val s sym1 sym2 sym3 symVA cls |
	val := self @env0:dynamicInstVarAt: aSelector.
	val == nil ifFalse: [^ val].
	"Lazy-wrap top-level def: probe the module class's env-1 method
	dict for a same-named fixed-arity or varargs selector.  When
	found, return a BoundMethod so first-class function reads
	(``f = mod.foo'') see a callable handle even though we no
	longer pre-store one at def time."
	(anArray isNil or: [anArray isEmpty]) ifTrue: [
		cls := self @env0:class.
		s := aSelector @env0:asString.
		symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
		((cls @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil) ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSelector
		].
		sym1 := (s @env0:, ':') @env0:asSymbol.
		sym2 := (s @env0:, ':_:') @env0:asSymbol.
		sym3 := (s @env0:, ':_:_:') @env0:asSymbol.
		(((cls @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil)
			or: [(cls @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
			or: [(cls @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil]]) ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSelector
		].
	].
	(self includesKey: aSelector) ifTrue: [^ self at: aSelector].
	(anArray isNil or: [anArray isEmpty])
		ifTrue: [^ nil].
	^ super doesNotUnderstand: aSelector args: anArray envId: envId
%

category: 'Grail-Attribute Access'
method: module
cantPerform: aSymbol withArguments: anArray env: envId
	"Fall back to attribute lookup for unrecognized messages.  Phase A
	parallels doesNotUnderstand:args:envId: — check dynamic-instVar
	storage first, then the SymbolDictionary slot."

	| val |
	val := self @env0:dynamicInstVarAt: aSymbol.
	val == nil ifFalse: [^ val].
	(self includesKey: aSymbol) ifTrue: [^ self at: aSymbol].
	^ super cantPerform: aSymbol withArguments: anArray env: envId
%

set compile_env: 0
