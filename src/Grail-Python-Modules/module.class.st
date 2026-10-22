"Python module type — root class for all Python modules in Grail.

Concrete modules (sys, math, builtins, importlib, ...) are direct
subclasses of this class. Each module is a singleton; the class-side
`instance` method returns its sole instance.

Storage:
  * `module` inherits from `SymbolDictionary`. Module-level Python
    globals are stored as entries in the instance's dictionary slot
    and resolved through Smalltalk symbol-list lookup at compile time.
    The compile pipeline in `importlib loadModuleFromPath:` depends on
    this for variable resolution.
  * Module-level Python globals are GemStone dynamic instVars, which cap
    at 255 per object.  The 256th and later go to an unbounded holder in
    one of them, and that module's class gets readers that look there
    (see ___storeNewGlobal___:put:).
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
    both report as `<class 'module'>`.

User-defined Python modules are compiled to real Smalltalk classes
with explicit instance variables for the module's globals; the
dictionary-style storage here is only used for the legacy built-in
module singletons.

"
Class {
	#name : 'module',
	#superclass : 'SymbolDictionary',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Singleton' }
module class >> ___adoptInstance___: anInstance [
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

	self ___sessionInstances___ at: self put: anInstance

]

{ #category : 'Grail-Module Defaults' }
module class >> ___classDefaultFor: anOwner at: aSymbol compute: aBlock [
	"Evaluate a CLASS-BODY method's default argument ONCE, in the class body, and
	keep it on the defining class so every call that omits the argument gets the
	SAME object -- which is what CPython does, because a default lives on the
	function rather than being part of the call.

	WHAT THIS REPLACES.  A class-body def compiles to a Smalltalk METHOD, so it has
	no def-time wrapper block to hold a default the way a nested def does, and
	codegen emitted the default EXPRESSION INLINE in the binding.  Measured for
	``class C: def acc(self, item, bucket=[])'': CPython answers [1, 2] over two
	calls and Grail answered [2], the two lists were not identical objects, and a
	side-effecting default fired once per call instead of once per def -- three
	calls, three evaluations, where CPython evaluates at def time and never again.

	OWNED BY THE DEFINING CLASS, not by the receiver's class.  The lookup below
	walks outward from whatever object the method is running on, and the key is
	qualified with the DEFINING class's name, so only one class in the chain can
	answer it.  Without that qualification a parent's method invoked through
	super() on a child that also defines the same parameter would find the CHILD's
	default object and mutate the wrong list -- reachable, and silent.

	OFF the class, in the same session-local side table the module defaults use, so
	it never appears in vars(), dir() or the class's own attribute overlay.  Keyed
	by the class OBJECT, so re-importing a module builds a fresh class and
	therefore fresh defaults -- CPython re-executes the def and gets new objects
	too."

	| tbl inner v |
	anOwner isNil ifTrue: [^ aBlock value].
	tbl := module ___moduleDefaultsTable___.
	inner := tbl at: anOwner otherwise: nil.
	inner isNil ifTrue: [
		inner := IdentityKeyValueDictionary new.
		tbl at: anOwner put: inner].
	"OVERWRITE, never memoise.  This send IS the def-time evaluation -- it is emitted
	in the class body, so it runs exactly when CPython evaluates the default, and
	CPython re-executing a def REPLACES __defaults__ rather than keeping the first
	value.  ``at:ifAbsent:'' here was a real defect, not a micro-optimisation: the
	comment above assumed re-importing a module builds a fresh class and therefore
	fresh defaults, and for a CANONICAL (deployed, committed) module that is false --
	the class object survives while the module's globals are re-created.  So
	dataclasses.py's ``def __init__(self, default=MISSING, ...)'' kept MISSING from
	the FIRST execution while the module global became a NEW MISSING, so
	``f.default is MISSING'' -- an identity test dataclasses relies on -- went false.
	The visible symptom was three steps away: a REQUIRED dataclass field stopped
	being required, because _process_class read the stale sentinel as a real default
	and synthesised __init__ with it (``Config()'' bound name=MISSING instead of
	raising TypeError).  DataclassesTestCase>>testDefaults, in shard 0 only, because
	it needs the module executed twice in one session."
	v := aBlock value.
	inner at: aSymbol put: v.
	^ v

]

{ #category : 'Grail-Module Defaults' }
module class >> ___classDefaultOwnedBy: aReceiver at: aSymbol [
	"The stored class-body default for aSymbol, found by walking outward from the
	object the method is running on.  Answers nil when there is none, which is the
	signal for the caller to fall back to evaluating the expression -- so a shape
	this does not reach degrades to the old behaviour rather than to an error.

	Starts at aReceiver's class for an instance and at aReceiver itself when the
	receiver IS a class (a classmethod's), then follows superclasses.  aSymbol
	carries the defining class's name, so at most one class in the chain answers."

	| tbl start cls |
	aReceiver isNil ifTrue: [^ nil].
	tbl := module ___moduleDefaultsTable___.
	start := (aReceiver isKindOf: Behavior)
		ifTrue: [aReceiver]
		ifFalse: [aReceiver class].
	cls := start.
	[cls notNil] whileTrue: [
		| inner |
		inner := tbl at: cls otherwise: nil.
		inner isNil ifFalse: [
			| found |
			"``otherwise: nil'' rather than a marker: a stored default is never
			 Smalltalk nil.  Python's None is a distinct object here, so a
			 parameter whose default IS None still answers a real value."
			found := inner at: aSymbol otherwise: nil.
			found isNil ifFalse: [^ found]].
		cls := [cls superclass] on: Error do: [:e | e return: nil]].
	^ nil

]

{ #category : 'Grail-Session Globals' }
module class >> ___forgetSessionGlobalsOf___: aName [
	"Drop this session's own values for the module named aName.  Called when
	that module's body starts to run again (a rebuild in place, a reload), so
	the new definitions are not hidden behind the old session's changes."

	| reg doomed |
	reg := SessionTemps current at: #'GrailSessionModuleGlobals' otherwise: nil.
	reg == nil ifTrue: [^ self].
	doomed := OrderedCollection new.
	reg keysDo: [:m |
		((m at: #'__name__' otherwise: nil) ifNotNil: [:n | n asString = aName asString])
			== true ifTrue: [doomed add: m]].
	doomed do: [:m | reg removeKey: m ifAbsent: []]

]

{ #category : 'Grail-Annotations' }
module class >> ___functionAnnotationsTable___ [
	"Session-local map  module-instance -> (function-name-string ->
	annotations dict).  Held in SessionTemps so it is never committed
	(module instances are already session-local) and keyed by identity,
	so it holds no persistent references and -- unlike a dynamic instVar
	on the module -- contributes nothing to the module's globals() /
	__dict__ enumeration."

	| st tbl |
	st := SessionTemps current.
	tbl := st at: #GrailModuleFunctionAnnotations otherwise: nil.
	tbl isNil ifTrue: [
		tbl := IdentityKeyValueDictionary new.
		st at: #GrailModuleFunctionAnnotations put: tbl].
	^ tbl

]

{ #category : 'Grail-Signatures' }
module class >> ___functionDefaultKeysTable___ [
	"Session-local module-instance -> (function-name -> key entry); see
	___setFunctionDefaults___:keys:block:."

	| st tbl |
	st := SessionTemps current.
	tbl := st at: #GrailModuleFunctionDefaultKeys otherwise: nil.
	tbl isNil ifTrue: [
		tbl := IdentityKeyValueDictionary new.
		st at: #GrailModuleFunctionDefaultKeys put: tbl].
	^ tbl

]

{ #category : 'Grail-Signatures' }
module class >> ___functionDefaultsTable___ [
	"Session-local module-instance -> (function-name -> defaults block); see
	___functionSignatureTable___.

	Its OWN SessionTemps key.  It shared #GrailModuleFunctionDefaults with
	___moduleDefaultsTable___, so the two kept one inner dictionary per module,
	and whichever table touched a module first chose its kind.  When the memo
	came first, that was an IDENTITY dictionary, and a later ``at: aName
	asString'' (a fresh String every time) could never find the block it had
	stored."

	| st tbl |
	st := SessionTemps current.
	tbl := st at: #GrailModuleFunctionDefaultBlocks otherwise: nil.
	tbl isNil ifTrue: [
		tbl := IdentityKeyValueDictionary new.
		st at: #GrailModuleFunctionDefaultBlocks put: tbl].
	^ tbl

]

{ #category : 'Grail-Signatures' }
module class >> ___functionSignatureTable___ [
	"Session-local  module-instance -> (function-name -> spec).  Held in
	SessionTemps and keyed by identity, for the same reasons as
	___functionAnnotationsTable___: module instances are session-local, so this
	must never be committed."

	| st tbl |
	st := SessionTemps current.
	tbl := st at: #GrailModuleFunctionSignatures otherwise: nil.
	tbl isNil ifTrue: [
		tbl := IdentityKeyValueDictionary new.
		st at: #GrailModuleFunctionSignatures put: tbl].
	^ tbl

]

{ #category : 'Grail-Session Globals' }
module class >> ___installSessionGlobalReaders___ [
	"Make this module class's global reads and listings consult the session's
	own values (module >> ___sessionGlobals___), in THIS session only.

	Installed on the first session-local store to one of its modules, as
	transient session methods (Behavior >> ___compileSessionMethod:...):
	never committed, invisible to other sessions, and absent from every
	module this session has not changed, whose reads stay the primitive.
	That is the point.  A persistent override on ``module'' made every global
	read in every module a Smalltalk send, and the RecursionError conversion
	runs in a reserve of about 343 frames: BaseExceptionTestCase
	test_recursion_raises_recursion_error failed with any version of it, and
	passed or failed with the size of the override's frame.  A module this
	session patched pays one send per global read.

	Not over a class's own persistent override of these selectors (a
	module-level ``__transient__'', D12): a session method would shadow it.
	The store funnel checks for that first (___globalStoreIsSessionLocal___)."

	| temps done |
	temps := SessionTemps current.
	done := temps at: #'GrailSessionGlobalReaders' otherwise: nil.
	done == nil ifTrue: [
		done := IdentitySet new.
		temps at: #'GrailSessionGlobalReaders' put: done].
	(done includes: self) ifTrue: [^ self].
	self @env1:___compileSessionMethod: 'dynamicInstVarAt: aSymbol
	"A module global as this session sees it: its own value or deletion first
	(module >> ___sessionGlobals___), then the module''s.  Installed by
	module class >> ___installSessionGlobalReaders___."
	| reg rec v |
	reg := SessionTemps current at: #''GrailSessionModuleGlobals'' otherwise: nil.
	reg == nil ifFalse: [
		rec := reg at: self otherwise: nil.
		rec == nil ifFalse: [
			v := (rec at: 1) at: aSymbol otherwise: nil.
			v == nil ifFalse: [^ v].
			((rec at: 2) includes: aSymbol) ifTrue: [^ nil]]].
	v := super dynamicInstVarAt: aSymbol.
	v == nil ifFalse: [^ v].
	^ self ___spilledGlobalAt___: aSymbol'
		category: 'Grail-Session Globals' scope: nil environmentId: 0.
	self @env1:___compileSessionMethod: 'dynamicInstanceVariables
	"The module''s global names as this session sees them: the stored ones
	less those this session deleted, then the ones only this session set."
	| names rec |
	names := self ___storedGlobalNames___.
	rec := self ___sessionGlobals___.
	rec == nil ifTrue: [^ names].
	names := names reject: [:n | (rec at: 2) includes: n].
	(rec at: 1) keysDo: [:k | (names includes: k) ifFalse: [names := names copyWith: k]].
	^ names'
		category: 'Grail-Session Globals' scope: nil environmentId: 0.
	done add: self

]

{ #category : 'Grail-Spilled Globals' }
module class >> ___installSpilledGlobalReaders___ [
	"Make reads and listings of this module class's globals see the spill
	(module >> ___storeNewGlobal___:put:), by overriding the three readers ON
	THIS CLASS ONLY.  Reads stay the bare primitive in every module that never
	spills: a persistent override on ``module'' would make every global read in
	every module a Smalltalk send, and the RecursionError conversion runs in a
	reserve of about 343 frames (module class >> ___installSessionGlobalReaders___).

	Persistent, not session methods: the spill commits with the module, and so
	must the readers that find it.  Never over a class's own readers: the
	``__transient__'' ones (importlib class >> ___installTransientGlobals___:on:)
	and this session's (___installSessionGlobalReaders___) already look in the
	spill."

	| d |
	self == module ifTrue: [^ self].
	d := self persistentMethodDictForEnv: 0.
	{ #'dynamicInstVarAt:' -> 'dynamicInstVarAt: aSymbol
	"A module global, from the spill when the module''s own instVars lack it.
	Installed by module class >> ___installSpilledGlobalReaders___."
	| v |
	v := super dynamicInstVarAt: aSymbol.
	v == nil ifFalse: [^ v].
	^ self ___spilledGlobalAt___: aSymbol'.
	  #'dynamicInstanceVariables' -> 'dynamicInstanceVariables
	^ self ___storedGlobalNames___'.
	  #'dynamicInstVarPairs' -> 'dynamicInstVarPairs
	^ self ___storedGlobalPairs___' } do: [:each |
		(d ~~ nil and: [d includesKey: each key]) ifFalse: [
			self
				compileMethod: each value
				dictionaries: System myUserProfile symbolList
				category: 'Grail-Spilled Globals'
				environmentId: 0]]

]

{ #category : 'Grail-Convenience Methods' }
module class >> ___instance___ [
	"env-0 entry point for the singleton accessor (callable from C/GciPerform)."
	^ self @env1:instance

]

{ #category : 'Grail-Module Defaults' }
module class >> ___moduleDefaultsTable___ [
	"Session-local map  module-instance -> (default-id-symbol -> cached value).
	Same rationale as ___functionAnnotationsTable___: held in SessionTemps so it
	is never committed (module instances are already session-local) and keyed by
	identity, so -- unlike a dynamic instVar on the module -- it contributes
	NOTHING to the module's globals() / vars() / dir() enumeration."

	| st tbl |
	st := SessionTemps current.
	tbl := st at: #GrailModuleFunctionDefaults otherwise: nil.
	tbl isNil ifTrue: [
		tbl := IdentityKeyValueDictionary new.
		st at: #GrailModuleFunctionDefaults put: tbl].
	^ tbl

]

{ #category : 'Grail-Singleton' }
module class >> ___sessionInstances___ [
	"The per-SESSION module-singleton registry (module class -> module
	instance), stored in SessionTemps.  Module classes are committed
	(PythonModules), so the old ``instance'' classInstVar made every
	module singleton -- and with it every module-level Python global --
	part of the committed graph: multi-user commit conflicts, stale
	state across sessions, and (before the dbTransient weakref split)
	attempts to commit ephemerons held in module globals.  Module state
	is session state; a value that should genuinely be shared belongs
	in an RC* collection committed explicitly by the application.
	The old ``instance'' classInstVar has been removed entirely (the
	extent is rebuilt, so no migration is needed)."

	| reg |
	reg := SessionTemps current at: #GrailModuleInstances otherwise: nil.
	reg isNil ifTrue: [
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #GrailModuleInstances put: reg].
	^ reg

]

{ #category : 'Grail-Signatures' }
module class >> ___storeClassDefaultOwnedBy: aReceiver at: aSymbol put: aValue [
	"Replace the stored class-body default for aSymbol, found by the walk
	___classDefaultOwnedBy:at: reads it with.  False when no class in the
	chain stores it."

	| tbl cls |
	aReceiver isNil ifTrue: [^ false].
	tbl := module ___moduleDefaultsTable___.
	cls := (aReceiver isKindOf: Behavior)
		ifTrue: [aReceiver]
		ifFalse: [aReceiver class].
	[cls notNil] whileTrue: [
		| inner |
		inner := tbl at: cls otherwise: nil.
		(inner notNil and: [inner includesKey: aSymbol]) ifTrue: [
			inner at: aSymbol put: aValue.
			^ true].
		cls := [cls superclass] on: Error do: [:e | e return: nil]].
	^ false

]

{ #category : 'Grail-Session Globals' }
module class >> ___withPersistentGlobalStores___: aBlock [
	"Evaluate aBlock with stores to module globals going to the modules
	themselves, wherever they would otherwise go to this session's overlay.
	For the import machinery's own stores, which are part of building a
	module: binding a submodule on its parent package
	(importlib class >> ___bind:onParent:as:) has to commit with the
	deployment, or a later session binding the package finds no
	``xml.etree''."

	| temps prior |
	temps := SessionTemps current.
	prior := temps at: #'GrailPersistentGlobalStores' otherwise: nil.
	temps at: #'GrailPersistentGlobalStores' put: true.
	^ aBlock ensure: [
		prior == nil
			ifTrue: [temps removeKey: #'GrailPersistentGlobalStores' ifAbsent: []]
			ifFalse: [temps at: #'GrailPersistentGlobalStores' put: prior]]

]

{ #category : 'Grail-Signatures' }
module class >> ___writeDefaults: aValue entry: anEntry kw: isKw into: aStoreBlock [
	"Write an assigned __defaults__ tuple (isKw false) or __kwdefaults__ dict
	(isKw true) into the default stores anEntry names, through aStoreBlock
	(``[:key :value | ... true]'', false when the key has no store).  Answers
	true when every value was written.

	ONLY THE DEF'S OWN SHAPE.  Every default is a store a call reads by key,
	and whether a parameter HAS a default is compiled into the call path.  So
	a tuple of the declared length and a dict with exactly the declared
	keyword-only names can be written; None, another length, or a dict that
	adds or drops a name cannot.  For those the caller rebinds the function's
	calls instead (Behavior >> ___grailRebind___:code:receiverOffset:value:kw:
	initial:, #1714); a nested def keeps the limit FunctionDefaultsTestCase
	documents.  Validated against that shape BEFORE anything is written, so a
	refused write changes nothing."

	| keys n |
	(aValue isNil or: [aValue == ExecBlock ___pyNone___]) ifTrue: [^ false].
	isKw ifFalse: [
		keys := anEntry at: 1.
		keys isEmpty ifTrue: [^ false].
		(aValue isKindOf: SequenceableCollection) ifFalse: [^ false].
		aValue size = keys size ifFalse: [^ false].
		1 to: keys size do: [:i |
			(aStoreBlock value: (keys at: i) value: (aValue at: i)) ifFalse: [^ false]].
		^ true].
	keys := anEntry at: 2.
	n := keys size // 2.
	n = 0 ifTrue: [^ false].
	(aValue @env1:__len__) = n ifFalse: [^ false].
	1 to: keys size by: 2 do: [:i |
		(aValue @env1:__contains__: (keys at: i) asString) ifFalse: [^ false]].
	1 to: keys size by: 2 do: [:i |
		(aStoreBlock value: (keys at: i + 1)
			value: (aValue @env1:__getitem__: (keys at: i) asString)) ifFalse: [^ false]].
	^ true

]

{ #category : 'Grail-Session Globals' }
module >> ___bodyIsRunning___ [
	| stack name |
	stack := SessionTemps current at: #'GrailInitializingModules' otherwise: nil.
	(stack == nil or: [stack isEmpty]) ifTrue: [^ false].
	name := self at: #'__name__' otherwise: nil.
	name == nil ifTrue: [^ false].
	name := name asString.
	^ stack anySatisfy: [:each | each asString = name]

]

{ #category : 'Grail-Signatures' }
module >> ___defaultsSnapshotOf___: aValue kw: isKw [
	"aValue, assigned to a function's __defaults__ (isKw false) or
	__kwdefaults__ (isKw true), as plain data a commit can carry -- None, a
	tuple itself, a dict as its flat name/value pairs -- or nil when it is not
	the attribute's type or not plain data (importlib
	___isReplayableClassAttrValue___:depth:)."

	| pairs |
	aValue == ExecBlock ___pyNone___ ifTrue: [^ aValue].
	isKw ifFalse: [
		^ ((aValue isKindOf: tuple)
			and: [importlib ___isReplayableClassAttrValue___: aValue depth: 0])
				ifTrue: [aValue]
				ifFalse: [nil]].
	(aValue isKindOf: (Python at: #PyDict)) ifFalse: [^ nil].
	pairs := OrderedCollection new.
	aValue keysAndValuesDo: [:name :value |
		((name isKindOf: CharacterCollection)
			and: [importlib ___isReplayableClassAttrValue___: value depth: 0])
				ifFalse: [^ nil].
		pairs add: name asString; add: value].
	^ pairs asArray

]

{ #category : 'Grail-Phase A Dynamic InstVars' }
module >> ___finalIsBound___: aSymbol [
	"Does a module-level ``name: Final = ...'' find its name already bound in
	PERSISTENT globals, so that it keeps that value and skips its initializer
	(AnnAssignAst >> printSmalltalkOn:, docs/App_Namespaces_Design.md §5.4)?
	Only when this module instance is committed -- an app's top file, a
	deployed module rebuilt in place -- since only then do the globals outlive
	the run.  A session-local __main__ starts empty every run, as CPython's
	does, and evaluates every Final as written."

	^ self isCommitted and: [(self dynamicInstVarAt: aSymbol) notNil]

]

{ #category : 'Grail-Signatures' }
module >> ___forgetDefaultsAssignmentsTo___: aName [
	"A def statement starts aName's defaults afresh, so an assignment the body
	made to an EARLIER function of that name is not replayed onto this one
	(___replayDefaultsAssignments___).  Only while the body runs, as every
	write to the record."

	self ___bodyIsRunning___ ifFalse: [^ self].
	#(#assignedDefaults #assignedKwdefaults) do: [:aKind |
		(self ___recordedFunctionMetaOfKind___: aKind) removeKey: aName asString ifAbsent: []]

]

{ #category : 'Grail-Annotations' }
module >> ___functionAnnotateFor___: aName [
	"The stored ``__annotate__'' block for a module-level function, or nil
	when the function carried no annotations."

	| tbl inner |
	tbl := module ___functionAnnotationsTable___.
	inner := tbl at: self otherwise: nil.
	inner isNil ifTrue: [^ self ___recordedFunctionMeta___: #annotations name: aName].
	^ (inner at: aName asString otherwise: nil)
		ifNil: [self ___recordedFunctionMeta___: #annotations name: aName]

]

{ #category : 'Grail-Annotations' }
module >> ___functionAnnotationsFor___: aName [
	"The __annotations__ dict for a module-level function -- its
	``__annotate__'' called with Format.VALUE -- or an empty dict when the
	function carried no annotations."

	| annotate |
	annotate := self ___functionAnnotateFor___: aName.
	annotate isNil ifTrue: [^ KeyValueDictionary new].
	^ annotate value: { 1 } value: nil

]

{ #category : 'Grail-Signatures' }
module >> ___functionDefaultKeysFor___: aName [
	"The memo keys a module-level function's defaults are held under (see
	___setFunctionDefaults___:keys:block:), or nil: this session's table, then
	the committed record, as ___functionSignatureFor___: reads.  A session that
	BINDS the deployed module never ran the def statements that fill the
	table (#1717)."

	| inner |
	inner := module ___functionDefaultKeysTable___ at: self otherwise: nil.
	^ (inner ifNotNil: [:keys | keys at: aName asString otherwise: nil])
		ifNil: [self ___recordedFunctionMeta___: #defaultKeys name: aName]

]

{ #category : 'Grail-Signatures' }
module >> ___functionDefaultsBlockFor___: aName [
	"The block answering a module-level function's defaults (see
	___setFunctionDefaults___:block:), or nil: this session's table, then the
	committed record, as ___functionDefaultKeysFor___: (#1717)."

	| inner |
	inner := module ___functionDefaultsTable___ at: self otherwise: nil.
	^ (inner ifNotNil: [:blocks | blocks at: aName asString otherwise: nil])
		ifNil: [self ___recordedFunctionMeta___: #defaults name: aName]

]

{ #category : 'Grail-Signatures' }
module >> ___functionDefaultsFor___: aName [
	"``{ posValues . kwPairs }'' for a module-level function, or nil."

	^ (self ___functionDefaultsBlockFor___: aName) ifNotNil: [:block | block value]

]

{ #category : 'Grail-Signatures' }
module >> ___functionSignatureFor___: aName [
	"The stored parameter spec for a module-level function, or nil."

	| tbl inner |
	tbl := module ___functionSignatureTable___.
	inner := tbl at: self otherwise: nil.
	inner isNil ifTrue: [^ self ___recordedFunctionMeta___: #signatures name: aName].
	^ (inner at: aName asString otherwise: nil)
		ifNil: [self ___recordedFunctionMeta___: #signatures name: aName]

]

{ #category : 'Grail-Session Globals' }
module >> ___globalsAreSessionLocal___ [
	"Do this module's globals become session state once its body has run?
	True for Grail's own sources -- everything under grailDir/src/python/:
	the stdlib, gemdb, durable and the vendored frameworks -- so that a
	program patching ``durable._registry'' or calling ``csv.field_size_limit''
	changes them for itself, as in CPython, and not for every later session
	of the user.  A user's own modules keep persistent globals.

	Asked afresh on each store, never remembered per module: a session
	registry keyed by the module would hold every module the session ever
	stored into, and a fresh import (test.support's import_fresh_module) must
	be collectable once dropped.  Only the src/python/ prefix is remembered."

	| file gd memo |
	"The module's own __file__, never this session's: a program cannot move a
	module into or out of the stdlib by assigning one."
	file := super dynamicInstVarAt: #'__file__'.
	(file isKindOf: CharacterCollection) ifFalse: [^ false].
	gd := importlib grailDir.
	gd == nil ifTrue: [^ false].
	"{grailDir. its src/python/ prefix}, rebuilt if grailDir changes."
	memo := SessionTemps current at: #'GrailSharedSourcePrefix' otherwise: nil.
	(memo == nil or: [(memo at: 1) ~~ gd]) ifTrue: [
		memo := Array with: gd with: gd asString , '/src/python/'.
		SessionTemps current at: #'GrailSharedSourcePrefix' put: memo].
	^ file asString beginsWith: (memo at: 2)

]

{ #category : 'Grail-Session Globals' }
module >> ___globalStoreIsSessionLocal___ [
	"Does a store to one of this module's globals belong to this session
	only?  docs/Persistent_Modules_and_Classes.md §4: what a module's body
	produces is the module and commits with it; everything later is the
	session's own.  So a store is session-local when the module's body is not
	running and its globals are session state once it has
	(___globalsAreSessionLocal___).  A function the body calls is part of the
	body; the same function called afterwards is not.  The body test comes
	first because it is cheaper and settles every store a module body makes."

	self ___bodyIsRunning___ ifTrue: [^ false].
	(SessionTemps current at: #'GrailPersistentGlobalStores' otherwise: nil) == true
		ifTrue: [^ false].
	self ___globalsAreSessionLocal___ ifFalse: [^ false].
	"A class with its own persistent readers (D12's __transient__ overrides)
	cannot take the session readers, so its stores stay where they were.  Its
	store override is the mark: the spill's readers
	(___installSpilledGlobalReaders___) override no store."
	^ ((self class persistentMethodDictForEnv: 0) ifNil: [true] ifNotNil: [:d |
		(d includesKey: #'dynamicInstVarAt:put:') not])

]

{ #category : 'Grail-Phase A Dynamic InstVars' }
module >> ___isSameImmutable___: a as: b [
	"Are a and b equal values of an IMMUTABLE Python type -- str, an int, or
	a tuple of such -- so that keeping a in place of b is invisible to Python?
	``pair = (1, 2)'' builds a new tuple on every run where CPython folds it
	into one code constant; a re-run keeping the committed one is what CPython
	would show.  Only the exact same class, so 1 and 1.0 (equal, not the same
	value) are never confused, and only types Python cannot mutate: a list or a
	dict is a different object however equal."

	a == nil ifTrue: [^ false].
	a class == b class ifFalse: [^ false].
	"By CODEPOINT, as Python compares strings -- never the kernel's ``='',
	which under Unicode comparison mode is an ICU collation: 'e' followed by a
	combining acute equals the precomposed letter, and an Arabic-Indic digit
	equals its ASCII twin.  Skipping on that made ``x = '1\u0662'; x =
	'\u06612''' leave x holding the FIRST string, and every module-level
	``for s in [...]'' over such strings yield its first element again."
	(a isKindOf: CharacterCollection) ifTrue: [
		^ a size = b size and: [(a @env1:___codePointCompare___: b) = 0]].
	"Integers only: 0.0 = -0.0 holds, and Python tells them apart.  A float
	small enough to be a SmallDouble is immediate, so identity covers it."
	(a isKindOf: Integer) ifTrue: [^ a = b].
	a class == tuple ifTrue: [
		a size = b size ifFalse: [^ false].
		1 to: a size do: [:i | | x y |
			x := a at: i.
			y := b at: i.
			(x == y or: [self ___isSameImmutable___: x as: y]) ifFalse: [^ false]].
		^ true].
	^ false

]

{ #category : 'Grail-Module Defaults' }
module >> ___moduleDefaultAt: aSymbol compute: aBlock [
	"Evaluate a module-level function's default argument ONCE and cache it in a
	session-local side table (keyed by this module instance + aSymbol), so a
	MUTABLE default (``def f(x=[])``) is SHARED across calls -- CPython evaluates
	defaults at def-time, but a Grail module function compiles to a method whose
	body would otherwise re-run the default expression on every call (test_iter's
	``def spam(state=[0])`` counter idiom).  aSymbol is a compile-time-unique
	``___default_<fn>__<param>___'' name, so distinct functions/params never
	collide.  Stored OFF the module (see ___moduleDefaultsTable___) so it never
	leaks into globals()/vars()/dir().  Filed at env-0 (like the other
	dynamic-instVar helpers) and reached from the generated env-1 method body via
	``@env0:___moduleDefaultAt:compute:''."

	| tbl inner |
	tbl := module ___moduleDefaultsTable___.
	inner := tbl at: self otherwise: nil.
	inner isNil ifTrue: [
		inner := IdentityKeyValueDictionary new.
		tbl at: self put: inner].
	^ inner at: aSymbol ifAbsent: [
		| v |
		v := aBlock value.
		inner at: aSymbol put: v.
		v]

]

{ #category : 'Grail-Signatures' }
module >> ___recordDefaultsAssignment___: aName value: aValue kw: isKw [
	"Record, COMMITTED, a ``__defaults__'' (isKw false) or ``__kwdefaults__''
	(isKw true) assignment this module's body made to its function aName.  A
	session that BINDS the module does not run the body, so the assignment
	never happened there: a same-shape one left the call binding the def-time
	value, and a shape-changing one left it without the session entry point
	#1714 installs (#1717).  ___replayDefaultsAssignments___ redoes it.

	Plain data only (___defaultsSnapshotOf___:kw:), as importlib's record of a
	body's class-attribute stores, since the record commits with the
	deployment.  Anything else stays as before: in effect for the session
	that ran the body, gone on bind."

	| snapshot |
	snapshot := self ___defaultsSnapshotOf___: aValue kw: isKw.
	snapshot isNil ifTrue: [^ self].
	self
		___recordFunctionMeta___: (isKw ifTrue: [#assignedKwdefaults] ifFalse: [#assignedDefaults])
		name: aName
		value: snapshot

]

{ #category : 'Grail-Signatures' }
module >> ___recordedFunctionMeta___: aKind name: aName [
	"The committed record of ___recordFunctionMeta___:name:value:, or nil."

	^ (self ___recordedFunctionMetaOfKind___: aKind) at: aName asString otherwise: nil

]

{ #category : 'Grail-Signatures' }
module >> ___recordedFunctionMetaOfKind___: aKind [
	"The committed record of ___recordFunctionMeta___:name:value: for aKind, as
	function name -> value: the dictionary itself, or an empty one when there
	is none."

	| nm reg rec |
	reg := importlib ___grailNamespace___ at: #'GrailCanonicalFunctionMeta' otherwise: nil.
	reg isNil ifTrue: [^ KeyValueDictionary new].
	nm := self at: #'__name__' otherwise: nil.
	nm isNil ifTrue: [^ KeyValueDictionary new].
	rec := reg at: nm asString otherwise: nil.
	rec isNil ifTrue: [^ KeyValueDictionary new].
	^ (rec at: aKind otherwise: nil) ifNil: [KeyValueDictionary new]

]

{ #category : 'Grail-Signatures' }
module >> ___recordFunctionMeta___: aKind name: aName value: aValue [
	"Record, COMMITTED, what this module's body declared for its top-level
	function aName: its signature spec (aKind #signatures), its
	``__annotate__'' block (#annotations), or its defaults block and the memo
	keys behind it (#defaults, #defaultKeys).

	The session tables above hold them for the session that ran the body.  A
	session that BINDS the deployed module does not run it, so it had neither:
	``inspect.signature(m.f)'' answered ``()'' and ``m.f.__annotations__'' {}
	(test_traceback's test_signatures failed locally once run_tests.sh had
	deployed traceback).  This is docs/Persistent_Modules_and_Classes.md §4.3's
	rule: what the build writes and is not on the class needs a committed
	record.  Same shape as importlib >> ___recordBodyClassAttr___:name:value:
	-- an RcKeyValueDictionary keyed by the module's name, in the module's
	namespace, dropped when the body runs again
	(importlib >> ___forgetFunctionMetaOf___:).

	Only from the module's own body, and never for a session-local module
	(``__main__''), which nothing binds.  A spec is strings and integers --
	defaults are kept as source text -- memo keys are symbols, and an annotate
	or defaults block is code over the module, so all commit with the
	deployment."

	| nm reg rec kind |
	self ___bodyIsRunning___ ifFalse: [^ self].
	nm := self at: #'__name__' otherwise: nil.
	nm isNil ifTrue: [^ self].
	nm := nm asString.
	(importlib ___isSessionLocalModule___: nm) ifTrue: [^ self].
	reg := importlib ___grailNamespace___ at: #'GrailCanonicalFunctionMeta' otherwise: nil.
	reg isNil ifTrue: [
		reg := RcKeyValueDictionary new.
		importlib ___grailNamespace___ at: #'GrailCanonicalFunctionMeta' put: reg].
	rec := reg at: nm otherwise: nil.
	rec isNil ifTrue: [
		rec := KeyValueDictionary new.
		reg at: nm put: rec].
	kind := rec at: aKind otherwise: nil.
	kind isNil ifTrue: [
		kind := KeyValueDictionary new.
		rec at: aKind put: kind].
	kind at: aName asString put: aValue

]

{ #category : 'Grail-Signatures' }
module >> ___replayDefaultsAssignment___: aName snapshot: aSnapshot kw: isKw [
	"Redo one recorded assignment through the write a Python assignment takes
	(BoundMethod >> ___writeDefaultsThrough___:value:): a same-shape value
	reaches the memo a call binds from, any other shape rebinds the
	function's calls in this session."

	| value |
	value := (isKw and: [aSnapshot isKindOf: Array])
		ifTrue: [ExecBlock ___pyKwDefaultsDict___: aSnapshot]
		ifFalse: [aSnapshot].
	(self @env1:___functionHandleFor___: aName asSymbol)
		@env1:___writeDefaultsThrough___: (isKw ifTrue: ['__kwdefaults__'] ifFalse: ['__defaults__'])
		value: value

]

{ #category : 'Grail-Signatures' }
module >> ___replayDefaultsAssignments___ [
	"Redo, in a session that BOUND this module, the __defaults__ and
	__kwdefaults__ assignments its body made
	(___recordDefaultsAssignment___:value:kw:, #1717)."

	#( #( #assignedDefaults false ) #( #assignedKwdefaults true ) ) do: [:kindAndKw |
		(self ___recordedFunctionMetaOfKind___: (kindAndKw at: 1)) keysAndValuesDo: [:aName :snapshot |
			self ___replayDefaultsAssignment___: aName snapshot: snapshot kw: (kindAndKw at: 2)]]

]

{ #category : 'Grail-Session Globals' }
module >> ___sessionGlobalAt___: aSymbol put: aValue [
	"Store aValue as this session's own value of the global aSymbol.  nil and
	_remoteNil delete, as they do for the primitive: the name is hidden from
	this session even when the committed module still holds it."

	| rec |
	rec := self ___sessionGlobalsCreate___.
	(aValue == nil or: [aValue == _remoteNil])
		ifTrue: [
			(rec at: 1) removeKey: aSymbol ifAbsent: [].
			(rec at: 2) add: aSymbol]
		ifFalse: [
			(rec at: 1) at: aSymbol put: aValue.
			(rec at: 2) remove: aSymbol ifAbsent: []].
	^ aValue

]

{ #category : 'Grail-Session Globals' }
module >> ___sessionGlobals___ [
	"This session's own values for this module's globals, or nil when it has
	none: an Array of the values (name -> value) and the names this session
	deleted.  See ___globalStoreIsSessionLocal___ for which stores land here,
	and docs/Persistent_Modules_and_Classes.md D14.

	Held in SessionTemps and keyed by the module instance, like the class
	overlay (D3): it is never committed, an abort leaves it alone, and a new
	session starts without it."

	| reg |
	reg := SessionTemps current at: #'GrailSessionModuleGlobals' otherwise: nil.
	reg == nil ifTrue: [^ nil].
	^ reg at: self otherwise: nil

]

{ #category : 'Grail-Session Globals' }
module >> ___sessionGlobalsCreate___ [
	| reg rec |
	reg := SessionTemps current at: #'GrailSessionModuleGlobals' otherwise: nil.
	reg == nil ifTrue: [
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #'GrailSessionModuleGlobals' put: reg].
	rec := reg at: self otherwise: nil.
	rec == nil ifTrue: [
		rec := Array with: IdentityKeyValueDictionary new with: IdentitySet new.
		reg at: self put: rec.
		self class ___installSessionGlobalReaders___].
	^ rec

]

{ #category : 'Grail-Annotations' }
module >> ___setFunctionAnnotations___: aName annotate: aBlock [
	"Record a module-level function's PEP 649 ``__annotate__''.
	FunctionDefAst emits a call to this at module-body eval time for every
	annotated top-level def.  Keyed by the plain Python name -- exactly
	the selector a lazily-wrapped module-function BoundMethod carries --
	so BoundMethod >> __annotations__ can find it.

	The BLOCK is stored, not the dict it computes: at module-body eval
	time the annotation expressions may well name things not yet bound."

	| tbl inner |
	tbl := module ___functionAnnotationsTable___.
	inner := tbl at: self otherwise: nil.
	inner isNil ifTrue: [
		inner := KeyValueDictionary new.
		tbl at: self put: inner].
	inner at: aName asString put: aBlock.
	self ___recordFunctionMeta___: #annotations name: aName value: aBlock.
	^ self

]

{ #category : 'Grail-Signatures' }
module >> ___setFunctionDefaults___: aName block: aBlock [
	"Record how to answer a module-level function's ``__defaults__'' and
	``__kwdefaults__'': aBlock answers ``{ { posValue ... } . { name . value ...
	} }''.  FunctionDefAst emits it at the def statement, beside the signature
	spec, and builds each value through the SAME module-keyed memo the
	function's method binds from (___moduleDefaultAt:compute:) -- so
	``f.__defaults__'' and inspect.signature report the very objects a call
	receives, whichever of the two evaluates the default first.

	A block, not the values: evaluating the defaults here would move a default
	with side effects (or one naming something defined later in the module)
	from first call to import, which is a separate change from exposing them.
	Session-local, as the signature table is: module instances are."

	| tbl inner |
	tbl := module ___functionDefaultsTable___.
	inner := tbl at: self otherwise: nil.
	inner isNil ifTrue: [
		inner := KeyValueDictionary new.
		tbl at: self put: inner].
	inner at: aName asString put: aBlock.
	self ___recordFunctionMeta___: #defaults name: aName value: aBlock.
	^ self

]

{ #category : 'Grail-Signatures' }
module >> ___setFunctionDefaults___: aName keys: anEntry block: aBlock [
	"___setFunctionDefaults___:block:, plus the memo KEYS each default is held
	under: ``#( #( posKey ... ) #( 'kwName' kwKey ... ) )'', the shape a
	method's ___methodDefaultKeysTable___ entry has.  They are what lets
	``f.__defaults__ = t'' write through to what a call binds
	(___writeFunctionDefaults___:value:kw:)."

	| tbl inner |
	tbl := module ___functionDefaultKeysTable___.
	inner := tbl at: self otherwise: nil.
	inner isNil ifTrue: [
		inner := KeyValueDictionary new.
		tbl at: self put: inner].
	inner at: aName asString put: anEntry.
	self ___recordFunctionMeta___: #defaultKeys name: aName value: anEntry.
	^ self ___setFunctionDefaults___: aName block: aBlock

]

{ #category : 'Grail-Signatures' }
module >> ___setFunctionSignature___: aName spec: aSpec [
	"Record a module-level function's inspect.signature parameter spec.
	Keyed by the plain Python name -- the selector a lazily-wrapped
	module-function BoundMethod carries -- so BoundMethod >>
	__signature_spec__ can find it.  Same table shape as the annotations
	one; a module-level def compiles to a METHOD on the module class, so it
	cannot carry the def-time cascade a nested def does."

	| tbl inner |
	tbl := module ___functionSignatureTable___.
	inner := tbl at: self otherwise: nil.
	inner isNil ifTrue: [
		inner := KeyValueDictionary new.
		tbl at: self put: inner].
	inner at: aName asString put: aSpec.
	self ___recordFunctionMeta___: #signatures name: aName value: aSpec.
	self ___forgetDefaultsAssignmentsTo___: aName.
	^ self

]

{ #category : 'Grail-Spilled Globals' }
module >> ___spilledGlobalAt___: aSymbol [
	"The value of a global past the dynamic-instVar ceiling, or nil."

	| h |
	h := super dynamicInstVarAt: #'___grailSpilledGlobals___'.
	h == nil ifTrue: [^ nil].
	^ h dynamicInstVarAt: aSymbol

]

{ #category : 'Grail-Spilled Globals' }
module >> ___spilledGlobalRemove___: aSymbol [
	| h |
	h := super dynamicInstVarAt: #'___grailSpilledGlobals___'.
	h == nil ifFalse: [h removeDynamicInstVar: aSymbol]

]

{ #category : 'Grail-Spilled Globals' }
module >> ___spillGlobal___: aSymbol put: aValue [
	"Start this module's spill: the store of aSymbol has just been refused for
	want of a 256th dynamic instVar.  The holder needs a slot of its own, so the
	most recently stored global moves into it with aSymbol.  The kernel keeps
	dynamic instVars in first-store order, so the names still read back in the
	order they were stored.

	The readers go in first: from then on every read of this module's globals
	looks in the holder when the instVar is absent."

	| last lastVal h |
	self class ___installSpilledGlobalReaders___.
	last := super dynamicInstanceVariables last.
	lastVal := super dynamicInstVarAt: last.
	h := GrailClassAttrHolder new.
	h dynamicInstVarAt: last put: lastVal.
	h dynamicInstVarAt: aSymbol put: aValue.
	super dynamicInstVarAt: last put: _remoteNil.
	super dynamicInstVarAt: #'___grailSpilledGlobals___' put: h.
	^ aValue

]

{ #category : 'Grail-Phase A Dynamic InstVars' }
module >> ___storeAnnotate___: aBlock [
	"Store the module's PEP 649 ``__annotate__'' (ModuleAst >>
	___emitModuleAnnotationsOn___:) -- unless it already holds a closure of
	the SAME compiled block over the same module.  The emitted block captures
	nothing but the module and takes its arguments, so two such closures
	compute the same annotations; but each run makes a new one, which on an
	app's re-run over committed globals is a write that changes nothing
	(docs/App_Namespaces_Design.md §5.2).  After an edit the module body is
	recompiled, the block's method differs, and the store goes through."

	| current |
	current := super dynamicInstVarAt: #'__annotate__'.
	((current isKindOf: ExecBlock)
		and: [current method == aBlock method
		and: [current selfValue == aBlock selfValue]]) ifTrue: [^ current].
	^ self dynamicInstVarAt: #'__annotate__' put: aBlock

]

{ #category : 'Grail-Spilled Globals' }
module >> ___storedGlobalNames___ [
	"The names of the globals the module itself holds: its dynamic instVars,
	then the spill's, without the spill holder's own slot."

	| names h |
	names := super dynamicInstanceVariables.
	h := super dynamicInstVarAt: #'___grailSpilledGlobals___'.
	h == nil ifTrue: [^ names].
	^ (names reject: [:n | n == #'___grailSpilledGlobals___']) , h dynamicInstanceVariables

]

{ #category : 'Grail-Spilled Globals' }
module >> ___storedGlobalPairs___ [
	"dynamicInstVarPairs over the module's own globals and its spill: a flat
	Array alternating name and value."

	| pairs h out |
	pairs := super dynamicInstVarPairs.
	h := super dynamicInstVarAt: #'___grailSpilledGlobals___'.
	h == nil ifTrue: [^ pairs].
	out := OrderedCollection new.
	1 to: pairs size by: 2 do: [:i |
		(pairs at: i) == #'___grailSpilledGlobals___' ifFalse: [
			out add: (pairs at: i); add: (pairs at: i + 1)]].
	out addAll: h dynamicInstVarPairs.
	^ out asArray

]

{ #category : 'Grail-Spilled Globals' }
module >> ___storeNewGlobal___: aSymbol put: aValue [
	"Store a global the module's own dynamic instVars do not hold: a new name,
	or one already in the spill.

	GemStone caps dynamic instVars at 255 per object (ImproperOperation 2484),
	and CPython has no limit on a module's globals.  3.14.8's test_typing goes
	past it at runtime, and pydantic.v1 did at import.  So the 256th name and
	every one after it goes to an unbounded, insertion-ordered holder instead
	(___spillGlobal___:put:), as class attributes already do
	(GrailClassAttrHolder).  Once a holder exists every new name goes there, so
	the module's names stay in first-store order: the dynamic instVars first,
	then the holder's."

	| h cur |
	h := super dynamicInstVarAt: #'___grailSpilledGlobals___'.
	h == nil ifFalse: [
		cur := h dynamicInstVarAt: aSymbol.
		(cur ~~ nil and: [cur == aValue or: [self ___isSameImmutable___: cur as: aValue]])
			ifTrue: [^ aValue].
		"A rebuild can have removed the readers (importlib class >>
		___installTransientGlobals___:on:); the holder is no use without them."
		self class ___installSpilledGlobalReaders___.
		^ h dynamicInstVarAt: aSymbol put: aValue].
	^ [super dynamicInstVarAt: aSymbol put: aValue]
		on: ImproperOperation
		do: [:ex |
			(ex number == 2484 and: [self class ~~ module])
				ifFalse: [ex pass].
			ex return: (self ___spillGlobal___: aSymbol put: aValue)]

]

{ #category : 'Grail-Transient Globals' }
module >> ___transientGlobals___ [
	"This module's ``__transient__'' globals, name -> value, for THIS SESSION
	(SessionTemps, keyed by the module's class): what the overrides
	importlib class >> ___installTransientGlobals___:on: compiles read and
	write instead of the module's own storage.  An abort leaves SessionTemps
	alone, so a transient global survives one; a new session starts without
	them."

	| reg d |
	reg := SessionTemps current at: #'GrailTransientGlobals' otherwise: nil.
	reg isNil ifTrue: [
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #'GrailTransientGlobals' put: reg].
	d := reg at: self class otherwise: nil.
	d isNil ifTrue: [
		d := IdentityKeyValueDictionary new.
		reg at: self class put: d].
	^ d

]

{ #category : 'Grail-Signatures' }
module >> ___writeFunctionDefaults___: aName value: aValue kw: isKw [
	"``f.__defaults__ = aValue'' (isKw false) or ``f.__kwdefaults__ = aValue''
	(isKw true) for a module-level function, written into the memo a call
	binds from.  Answers true when it took effect, false when the shape cannot
	be carried -- see module class >> ___writeDefaults:entry:kw:into:."

	| entry memo |
	entry := self ___functionDefaultKeysFor___: aName.
	entry isNil ifTrue: [^ false].
	memo := module ___moduleDefaultsTable___ at: self otherwise: nil.
	memo isNil ifTrue: [
		memo := IdentityKeyValueDictionary new.
		module ___moduleDefaultsTable___ at: self put: memo].
	^ module ___writeDefaults: aValue entry: entry kw: isKw
		into: [:key :v | memo at: key put: v. true]

]

{ #category : 'Grail-Attribute Access' }
module >> cantPerform: aSymbol withArguments: anArray env: envId [
	"Fall back to attribute lookup for unrecognized messages.  Phase A
	parallels doesNotUnderstand:args:envId: — check dynamic-instVar
	storage first, then the SymbolDictionary slot."

	| val |
	val := self dynamicInstVarAt: aSymbol.
	val == nil ifFalse: [^ val].
	(self includesKey: aSymbol) ifTrue: [^ self at: aSymbol].
	^ super cantPerform: aSymbol withArguments: anArray env: envId

]

{ #category : 'Grail-Attribute Access' }
module >> doesNotUnderstand: aSelector args: anArray envId: envId [
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

	| val s sym1 sym2 sym3 symVA cls acc |
	"GRAIL_ATTR_ACCESSORS (stage 3).  A ``___pyattr_x___'' send is a Python READ
	of x reaching this module through a receiver codegen could not resolve
	(``self.module.x''): answer it through the loader -- the tail of this hook
	would otherwise answer NIL for an unknown unary selector.  And with
	GRAIL_DIRECT_CALLS on as well, a bare unary selector is a CALL (reads have
	their own spelling now): load the attribute and call it, instead of this
	hook's old read protocol answering the value (the class instead of the
	instance for ``wmod.catch_warnings()'').  Slot 27 is the flag (16 ns)."
	[:rec | rec == #'___noRecover___' ifFalse: [^ rec]] value: (self ___pyattrRecover___: aSelector args: anArray).
	acc := System __sessionStateAt: 27.
	acc == nil ifTrue: [acc := importlib ___attrAccessorsEnabled___].
	acc == true ifTrue: [
		s := aSelector asString.
		((anArray isNil or: [anArray isEmpty])
			and: [(s size >= 3 and: [(s copyFrom: 1 to: 3) = '___']) not
			and: [((System __sessionStateAt: 25) ifNil: [importlib ___directCallsEnabled___]) == true]]) ifTrue: [
			^ (self @env1:___pyAttrLoad___: aSelector) @env1:___pyCallValue___: #() kw: nil]].
	val := self dynamicInstVarAt: aSelector.
	val == nil ifFalse: [^ val].
	"Lazy-wrap top-level def: probe the module class's env-1 method
	dict for a same-named fixed-arity or varargs selector.  When
	found, return a BoundMethod so first-class function reads
	(``f = mod.foo'') see a callable handle even though we no
	longer pre-store one at def time."
	(anArray isNil or: [anArray isEmpty]) ifTrue: [
		cls := self class.
		s := aSelector asString.
		symVA := ('_' , s , ':kw:') asSymbol.
		((cls whichClassIncludesSelector: symVA environmentId: 1) notNil) ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSelector
		].
		sym1 := (s , ':') asSymbol.
		sym2 := (s , ':_:') asSymbol.
		sym3 := (s , ':_:_:') asSymbol.
		(((cls whichClassIncludesSelector: sym1 environmentId: 1) notNil)
			or: [(cls whichClassIncludesSelector: sym2 environmentId: 1) notNil
			or: [(cls whichClassIncludesSelector: sym3 environmentId: 1) notNil]]) ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSelector
		].
	].
	(self includesKey: aSelector) ifTrue: [^ self at: aSelector].
	"``_name:kw:'' is the varargs CALL form codegen emits for
	``module.name(...)''.  It is a compile-time fast path aimed at a module
	that IMPLEMENTS the selector, and the name it was compiled against is not
	always the module the name resolves to at run time -- test.test_warnings
	swaps sys.modules to drive two warnings implementations through the same
	code, so unittest's ``warnings.catch_warnings(record=True)'' can land on
	the vendored _py_warnings, where catch_warnings is a CLASS attribute and no
	such selector exists.
	Fall back to what Python does: read the attribute and call it.  Only for
	the two-argument shape the fast path emits, and only when the attribute is
	actually there, so a genuine typo still reaches the DNU below."
	(anArray notNil and: [anArray size = 2]) ifTrue: [
		| sel base attr |
		sel := aSelector asString.
		((sel at: 1) == $_ and: [sel endsWith: ':kw:']) ifTrue: [
			base := sel copyFrom: 2 to: sel size - 4.
			attr := [self @env1:___pyAttrLoad___: base asSymbol]
				on: AbstractException do: [:ex | ex return: nil].
			attr notNil ifTrue: [
				^ attr @env1:value: (anArray at: 1) value: (anArray at: 2)]]].
	"The SAME fallback for the plain ``name:'' shape, which the block above does
	not reach: it matches only the two-argument ``_name:kw:'' varargs form, and a
	hand-written Smalltalk send such as ``typing TypeVar: 'T''' is a
	single-keyword send with one argument.

	The case this exists for is a module attribute that is a CLASS rather than a
	def.  Codegen compiles a module-level ``def name'' into a real selector, so
	``mod name: x'' finds a method; a module-level ``class Name'' compiles to no
	selector at all, so the identical spelling is a MessageNotUnderstood.  That
	asymmetry is invisible until something turns a module function into a class,
	which is exactly what making ``typing.TypeVar'' a class did -- and the caller
	that broke, ExecBlock >> ___pyTypeVarNamed___:, guards the send and falls back
	to a plain STRING, so the failure was silent: every PEP 695 type parameter
	quietly became its own name instead of a TypeVar.

	Fall back to what Python does: read the attribute and call it.  Positional
	arguments only, since a single-keyword selector carries no kwargs, and only
	when the attribute actually resolves -- so a genuine typo still reaches the
	DNU below rather than being turned into a call on nil.  Reached only after
	every other probe has missed, which is what keeps it off the path of the
	compiled sends that make up the ordinary case."
	(anArray notNil and: [anArray notEmpty]) ifTrue: [
		| sel |
		sel := aSelector asString.
		((sel occurrencesOf: $:) = anArray size
			and: [(sel at: 1) ~~ $_]) ifTrue: [
			| attr |
			attr := [self @env1:___pyAttrLoad___:
					(sel copyFrom: 1 to: (sel indexOf: $:) - 1) asSymbol]
				on: AbstractException do: [:ex | ex return: nil].
			attr notNil ifTrue: [
				^ attr @env1:___pyCallValue___: anArray asArray kw: nil]]].
	"...but not a protocol DUNDER the module lacks.  ``-mod'' sends __neg__ and
	``abs(mod)'' __abs__, both unary, so this tail answered a raw Smalltalk nil
	that reached Python as ``<UndefinedObject object>'' where CPython raises
	TypeError.  Object's handler raises the operation's own TypeError."
	((anArray isNil or: [anArray isEmpty])
		and: [(object @env1:___grailIsProtocolDunderName___: aSelector) not])
			ifTrue: [^ nil].
	^ super doesNotUnderstand: aSelector args: anArray envId: envId

]

{ #category : 'Grail-Phase A Dynamic InstVars' }
module >> dynamicInstVarAt: aSymbol put: aValue [
	"A module global, stored -- in this session's overlay when the store is
	the session's own (___globalStoreIsSessionLocal___), otherwise in the
	module itself.

	In the module, the store is skipped when the global ALREADY holds aValue,
	or an equal value Python cannot tell from it.
	Storing the identical object back into a COMMITTED module still writes it
	(measured on gs40: needsCommit goes true), so a module whose body re-runs
	over its committed instance -- an app's ``__main__'', re-run with its
	globals intact (docs/App_Namespaces_Design.md §5.2), or a deployed module
	rebuilt in place -- would otherwise dirty the session with ``import
	gemdb'', every class statement and every constant, changing nothing.
	Every module-scope store the codegen emits, and a ``global'' store from a
	function, comes through here.  nil and _remoteNil are never skipped: they
	are the primitive's absent and remove markers, not values."

	| current |
	self ___globalStoreIsSessionLocal___
		ifTrue: [^ self ___sessionGlobalAt___: aSymbol put: aValue].
	(aValue == nil or: [aValue == _remoteNil]) ifTrue: [
		self ___spilledGlobalRemove___: aSymbol.
		^ super dynamicInstVarAt: aSymbol put: aValue].
	current := super dynamicInstVarAt: aSymbol.
	current == nil ifTrue: [^ self ___storeNewGlobal___: aSymbol put: aValue].
	(current == aValue or: [self ___isSameImmutable___: current as: aValue]) ifTrue: [^ aValue].
	^ super dynamicInstVarAt: aSymbol put: aValue

]
