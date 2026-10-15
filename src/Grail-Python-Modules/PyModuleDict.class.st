"Live view of a module's global namespace as a Python dict — returned by
``globals()``, module-scope ``locals()``/``vars()``, and ``mod.__dict__``.
Reads resolve through module>>___globalAt___:otherwise: (dynamic instVars,
lazily-wrapped top-level defs, legacy dict-slot entries); writes create
real module globals (dynamic instVars).  ``source' is the module
singleton.  See docs/LEGB.md."
Class {
	#name : 'PyModuleDict',
	#superclass : 'PyInstanceDict',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
PyModuleDict class >> ___forModuleNamed___: aName [
	"The live namespace view for the loaded module called ``aName'', or nil.

	The name-keyed counterpart to ``on:'', for the callables that know WHERE they
	were defined but hold no reference to the module itself: a function's
	``__globals__''.  FunctionDefAst stamps ``__module__'' on every def and
	lambda, so the name is always to hand -- which makes this one sys.modules
	probe, against the scan over every loaded module's __file__ that
	PyFrame >> f_globals must do (it starts from a code object's co_filename and
	has no name at all).

	Nil, never an error, for three separate misses -- no name, Grail's
	``<closure>'' placeholder where a real module name would be, and a name that
	no longer resolves -- because the callers turn all three into the same
	AttributeError and none of them is exceptional.  A module can genuinely leave
	sys.modules while a function defined in it is still reachable.

	Answers the SAME object ``on:'' would, since it delegates: identity across
	``globals()'', ``mod.__dict__'' and ``f.__globals__'' is the contract
	test_funcattrs checks with assertIs."

	| nm mod |
	aName isNil ifTrue: [^ nil].
	nm := [aName @env0:asString] @env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	nm isNil ifTrue: [^ nil].
	(nm @env0:isEmpty or: [nm = '<closure>']) ifTrue: [^ nil].
	mod := [(importlib @env1:modules) @env0:at: nm @env0:asSymbol otherwise: nil]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	mod isNil ifTrue: [^ nil].
	^ [self @env0:on: mod] @env0:on: AbstractException do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-Instance Creation' }
PyModuleDict class >> on: aModule [
	"ONE view per module per session -- CPython contract: ``locals() is
	globals()'' at module scope, and ``mod.__dict__'' is the same object
	on every read.  The memo lives in SessionTemps (session-local,
	identity-keyed), not in a dynamic-instVar cache on the module, which
	would write a committed module on a read.  A native module's committed
	instance has one committed view for every session instead, so a view
	committed in another module (its ``__builtins__'' stamp) is still this
	session's."

	| st cache key inst |
	st := SessionTemps current.
	cache := st at: #'GrailModuleDictViews' otherwise: nil.
	cache isNil ifTrue: [
		cache := IdentityKeyValueDictionary new.
		st at: #'GrailModuleDictViews' put: cache].
	"The eval/exec path compiles globals()/locals() with a nil receiver
	(Executed Code has no module instance -- its scope is the symbol-list
	SymbolDictionary).  nil can't key the identity cache; memoise under a
	sentinel so ``locals() is globals()'' still holds there, exactly as
	the old emit-self rewrite did (nil is nil)."
	key := aModule isNil ifTrue: [#'GrailNilModule'] ifFalse: [aModule].
	inst := cache at: key otherwise: nil.
	inst isNil ifTrue: [
		"A native module's committed instance has a committed view, the same
		object in every session (NativeModule class >>
		___installCommittedInstance___)."
		((aModule isKindOf: NativeModule)
			and: [aModule == aModule class ___committedInstance___])
				ifTrue: [inst := aModule class ___committedDictView___].
		inst isNil ifTrue: [inst := super on: aModule].
		cache at: key put: inst].
	^ inst

]

{ #category : 'Grail-Doit Scope' }
PyModuleDict >> ___doitNamesAndValuesDo___: aBlock [
	"Evaluate aBlock with the Python NAME (a Symbol) and value of every BOUND
	binding in a doit scope.

	Slot names are unmangled on the way out -- a Python name that collides with
	a Smalltalk pseudo-variable is stored under a decorated spelling, and
	NameAst >> doitScopeNameToPythonName: is the inverse the exec-reflection
	path already uses.

	Two kinds of slot never surface.  ``___pyGlobals___'' is the handle on the
	scope itself: machinery, not a binding the source made, and builtins >>
	___reflectDoitScope___: hides it for exactly that reason.  And a slot
	holding Smalltalk nil is DECLARED-BUT-UNBOUND -- ensureModuleScope:
	pre-creates one per body variable before a line runs -- so reporting it
	would have dir() and locals() list names nothing has bound yet.  Treating
	nil as absent is the convention PyInstanceDict >> ___rawAt___: documents."

	source @env0:keysAndValuesDo: [:k :v |
		((k @env0:== #'___pyGlobals___')
			@env0:or: [(k @env0:== #'___pyGlobalsView___') @env0:or: [v @env0:== nil]])
			@env0:ifFalse: [
				aBlock @env0:value: (NameAst @env0:doitScopeNameToPythonName: k) @env0:asSymbol
					value: v]]

]

{ #category : 'Grail-Doit Scope' }
PyModuleDict >> ___doitRemove___: key ifAbsent: aBlock [
	"Remove a doit binding and answer its value, or aBlock's value.  Shared by
	__delitem__: and the two pop: forms, whose module path reaches for
	dynamicInstVarAt: / removeDynamicInstVar:."

	| sym val |
	sym := (self ___isNamespaceStringKey___: key)
		@env0:ifTrue: [self ___doitSlotFor___: key]
		@env0:ifFalse: [
			(self ___stringKeyEqualTo___: key)
				@env0:ifNil: [nil]
				@env0:ifNotNil: [:s | self ___doitSlotFor___: s]].
	sym @env0:ifNil: [
		^ (self ___overflow___)
			@env0:ifNil: [aBlock @env0:value]
			@env0:ifNotNil: [:d |
				val := d @env0:at: key otherwise: nil.
				val @env0:isNil
					@env0:ifTrue: [aBlock @env0:value]
					@env0:ifFalse: [d @env0:removeKey: key ifAbsent: [nil]. val]]].
	val := source @env0:at: sym otherwise: nil.
	val @env0:isNil ifTrue: [^ aBlock @env0:value].
	"Left as an unbound slot rather than removed: the doit scope is the
	compiler's symbol list, and a name the compiled code still mentions must
	keep a slot or the SMALLTALK compiler rejects it.  nil reads as absent
	everywhere in this class, which is what ``del'' has to mean."
	source @env0:at: sym put: nil.
	^ val

]

{ #category : 'Grail-Doit Scope' }
PyModuleDict >> ___doitSlotFor___: aKey [
	"The SymbolDictionary slot name a Python name is stored under."

	^ NameAst @env0:doitScopeNameFor: aKey @env0:asSymbol

]

{ #category : 'Grail-Doit Scope' }
PyModuleDict >> ___isDoitScope___ [
	"True when this view wraps a DOIT''s symbol-list SymbolDictionary rather
	than a module singleton.

	``exec'' and ``eval'' compile into a doit, which has NO module instance:
	``self'' is nil there.  globals(), module-scope locals()/vars() and bare
	dir() therefore used to build a view over nil, and every read or
	enumeration of it died sending a module-only selector to nil.  CallAst now
	hands the scope handle that ModuleAst >> ensureModuleScope: parks under
	``___pyGlobals___'' -- see AbstractNode >> ___globalsViewReceiverExpr___.

	Each module-only send has to fork on this: a SymbolDictionary understands
	neither ___globalNames___ nor dynamicInstVarAt:.

	THE ``module'' EXCLUSION IS LOAD-BEARING, not defensive.  Grail's ``module''
	IS a SymbolDictionary subclass (module.gs: ``SymbolDictionary subclass:
	''module''''), so a bare ``isKindOf: SymbolDictionary'' answers true for
	every real module and sends the whole corpus down this branch -- module
	globals then resolve as doit slots, which finds nothing.  It presents as
	unrelated breakage far from here (an enum reporting ``has no members'', a
	typing ForwardRef failing to evaluate) rather than as a namespace error."

	^ (source @env0:isKindOf: SymbolDictionary)
		@env0:and: [(source @env0:isKindOf: module) @env0:not]

]

{ #category : 'Grail-Non-String Keys' }
PyModuleDict >> ___moduleKeys___ [
	"Every key in this module's namespace: the global NAMES, then the non-string
	keys.  The one funnel for enumeration, so the overflow cannot be visible
	through ``keys'' and invisible through ``__len__''.

	Names come back as they are stored -- Strings from ___globalNames___, the
	original objects from the overflow.  Callers that hand keys to Python convert.

	ORDER: string keys first, then non-string, as in PyInstanceDict >>
	___allPairs___ and for the same reason."

	| result |
	result := OrderedCollection @env0:new.
	self ___isDoitScope___
		@env0:ifTrue: [
			"Strings, as ___globalNames___ answers -- a Symbol key looks like a str
			to Python but breaks the hash/eq invariant once it reaches a dict."
			self ___doitNamesAndValuesDo___: [:k :v | result @env0:add: k @env0:asString]]
		@env0:ifFalse: [result @env0:addAll: (source @env1:___globalNames___)].
	(self ___overflow___) @env0:ifNotNil: [:d |
		d @env0:keysDo: [:k | result @env0:add: k]].
	^ result

]

{ #category : 'Grail-Non-String Keys' }
PyModuleDict >> ___moduleValueAt___: key ifAbsent: aBlock [
	"The value bound to key in this module's namespace, or aBlock's value.

	The ONE funnel for keyed reads, so a non-string key is reached the same way
	everywhere.  A module's globals live in three places -- dynamic instVars,
	lazily-wrapped class methods, and the legacy SymbolDictionary slots -- and
	___globalAt___ already knows all three; what it cannot take is a non-Symbol
	name, so those go to the overflow dict instead.  See PyInstanceDict >>
	___overflowSlot___ for why there is one."

	| doit |
	doit := self ___isDoitScope___.
	(self ___isNamespaceStringKey___: key) ifFalse: [
		"A string-EQUAL key resolves through the string side; see PyInstanceDict >>
		___stringKeyEqualTo___:."
		(self ___stringKeyEqualTo___: key) @env0:ifNotNil: [:sym |
			doit @env0:ifTrue: [
				^ (source @env0:at: (self ___doitSlotFor___: sym) otherwise: nil)
					@env0:ifNil: [aBlock @env0:value]].
			^ source @env1:___globalAt___: sym otherwise: aBlock].
		^ (self ___overflow___)
			@env0:ifNil: [aBlock @env0:value]
			@env0:ifNotNil: [:d |
				d @env0:at: key ifAbsent: [^ aBlock @env0:value]]].
	doit @env0:ifTrue: [
		"nil is absent, not a value -- see ___doitNamesAndValuesDo___."
		^ (source @env0:at: (self ___doitSlotFor___: key) otherwise: nil)
			@env0:ifNil: [aBlock @env0:value]].
	"A module with no defs of its own (a bare ModuleType, or a ModuleType
	subclass's instance) holds only what was stored in it: its class's methods
	are not namespace entries, so ``'hello' in vars(m)'' is False as in CPython
	-- the same rule ___globalNames___ lists keys by."
	(source @env1:___grailHasNoOwnDefs___) ifTrue: [
		^ (source @env0:dynamicInstVarAt: key @env0:asSymbol)
			@env0:ifNil: [source @env0:at: key @env0:asSymbol ifAbsent: [aBlock @env0:value]]].
	^ source @env1:___globalAt___: key @env0:asSymbol otherwise: aBlock

]

{ #category : 'Grail-Doit Scope' }
PyModuleDict >> ___rawAt___: key [
	"Inherited from PyInstanceDict, which reads a dynamic instVar off the
	module.  A doit scope is a SymbolDictionary and has none."

	self ___isDoitScope___ ifFalse: [^ super ___rawAt___: key].
	(self ___isNamespaceStringKey___: key) ifTrue: [
		^ source @env0:at: (self ___doitSlotFor___: key) otherwise: nil].
	(self ___stringKeyEqualTo___: key) @env0:ifNotNil: [:sym |
		^ source @env0:at: (self ___doitSlotFor___: sym) otherwise: nil].
	^ (self ___overflow___)
		@env0:ifNil: [nil]
		@env0:ifNotNil: [:d | d @env0:at: key otherwise: nil]

]

{ #category : 'Grail-Doit Scope' }
PyModuleDict >> ___rawAt___: key put: value [
	"The write twin of ___rawAt___:, so ``globals()['x'] = 1'' under exec binds
	a doit slot rather than failing to find a dynamic instVar to set."

	self ___isDoitScope___ ifFalse: [^ super ___rawAt___: key put: value].
	(self ___isNamespaceStringKey___: key) ifTrue: [
		^ source @env0:at: (self ___doitSlotFor___: key) put: value].
	(self ___stringKeyEqualTo___: key) @env0:ifNotNil: [:sym |
		^ source @env0:at: (self ___doitSlotFor___: sym) put: value].
	^ (self ___overflowCreate___) @env0:at: key put: value

]

{ #category : 'Grail-Non-String Keys' }
PyModuleDict >> ___stringKeysDo___: aBlock [
	"A module's string keys are NOT only its dynamic instVars -- a global also
	lives in the legacy SymbolDictionary slot or as a lazily-wrapped class method,
	and ___globalNames___ is what knows all three.  Overridden so
	___stringKeyEqualTo___: can see them.

	AND ``__dir__'', which is a strictly larger set here.  The case this exists for
	is ``builtins.__dict__[CustomStr('iter')]'', and ``iter'' is a builtin FUNCTION:
	``'iter' in builtins.__dict__'' is true because ___globalAt___ resolves it,
	but ___globalNames___ does not list it (96 names where CPython has 159), so a
	scan of the names alone could not find the key the membership test says is
	there.  builtins >> __dir__ exists precisely to rewrite those mangled
	``_name:kw:'' selectors back to their Python spellings, so it knows them.

	The union is not merely wider, it is CONSISTENT: whatever ___stringKeyEqualTo___:
	matches is then read through ___globalAt___, which resolves the same broader
	set.  Guarded, because __dir__ can be user-defined and raise."

	self ___isDoitScope___ ifTrue: [
		^ self ___doitNamesAndValuesDo___: [:k :v | aBlock value: k]].
	source @env1:___globalNames___ do: [:k | aBlock value: k asSymbol].
	[(source @env1:__dir__) do: [:k |
		(k isKindOf: CharacterCollection) ifTrue: [aBlock value: k asSymbol]]]
		on: AbstractException do: [:ex | ex return: nil]

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyModuleDict >> at: aKey [
	| absent val |
	absent := Object new.
	val := self ___moduleValueAt___: aKey ifAbsent: [absent].
	val == absent ifTrue: [
		"A doit scope has no module to raise through."
		self ___isDoitScope___ ifTrue: [^ KeyError ___signal___: aKey].
		^ source _errorKeyNotFound: aKey].
	^ val

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyModuleDict >> at: aKey ifAbsent: aBlock [
	| absent val |
	absent := Object new.
	val := self ___moduleValueAt___: aKey ifAbsent: [absent].
	val == absent ifTrue: [^ aBlock value].
	^ val

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyModuleDict >> includesKey: aKey [
	| absent |
	absent := Object new.
	^ (self ___moduleValueAt___: aKey ifAbsent: [absent]) ~~ absent

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyModuleDict >> isEmpty [
	^ self ___moduleKeys___ isEmpty

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyModuleDict >> keys [
	^ self ___moduleKeys___ asArray

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyModuleDict >> keysAndValuesDo: aBlock [
	"Iterate over a SNAPSHOT of the name list (a lazy def-wrap during the
	walk caches into a dynamic slot; snapshotting keeps the iteration
	safe from that mutation).  Keys are Strings."

	| absent |
	absent := Object new.
	self ___moduleKeys___ do: [:k |
		| v |
		v := self ___moduleValueAt___: k ifAbsent: [absent].
		v == absent ifFalse: [aBlock value: k value: v]]

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyModuleDict >> notEmpty [
	^ self ___moduleKeys___ notEmpty

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyModuleDict >> size [
	^ self ___moduleKeys___ size

]
