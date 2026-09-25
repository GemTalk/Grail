! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- NativeModule: the superclass of every hand-written Smalltalk module
!
! A NATIVE module (builtins, sys, os, math, ...) is a Smalltalk class filed
! by install.sh; a PYTHON module is a class importlib generates from a .py
! file into PythonModules.  Both are singletons, but they persist
! differently, and this class is where the native half's rule lives.
!
! The problem it solves: a native module's instance used to be minted fresh
! in every session, while its class was install-stable.  A DEPLOYED Python
! module that did ``import builtins'' committed the deploy session's
! instance in its globals, so every later session had two ``builtins'': the
! one sys.modules answers and the one the deployed module holds.
! ``mock.patch('builtins.open')'' patched the first and the deployed codecs
! called the second (test_codecs, after run_tests.sh deploys).  sys and
! copyreg had each been patched for this seam individually
! (docs/Persistence_Design_History.md H.2); this is the general answer.
!
! The rule: ONE committed instance per native module, created by install.sh,
! and ALL of its state held per session.
!
!   * Identity.  ``instance'' answers the committed instance in every
!     session, so a committed reference and sys.modules agree.
!   * State.  A native instance holds nothing in the repository: its
!     dynamic instVars and its dictionary entries (the two homes a module
!     global can be stored in; the third is class methods, which are
!     install-stable) are redirected to SessionTemps, keyed by CLASS.  A
!     session's writes -- a setattr, mock.patch, __spec__, a submodule
!     binding, the BoundMethod a lazy read caches -- therefore never touch a
!     committed object, which keeps the doc par.9 invariant that importing a
!     native module modifies zero persistent objects, and keeps concurrent
!     sessions from conflicting on commit.  Keying by class means an
!     instance committed before this rule existed reads the same state too.
!   * Enforcement.  The committed instance is made invariant at install, so
!     a write path this class does not redirect raises at once instead of
!     silently dirtying the repository.
!
! Python modules are deliberately NOT under this class: their globals ARE
! their committed state (a deployed module's body does not re-run).
! EmbeddedExtensionModule is not either: a C extension module is loaded per
! session and holds its state in C.

expectvalue /Class
doit
module subclass: 'NativeModule'
  instVarNames: #()
  classVars: #()
  classInstVars: #( grailCommittedInstance )
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
NativeModule category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
NativeModule removeAllMethods: 0.
NativeModule class removeAllMethods: 0.
NativeModule removeAllMethods: 1.
NativeModule class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Singleton'
classmethod: NativeModule
___committedInstance___
	"The instance install.sh committed for this class, or nil (a class
	defined after install, or an install that has not run the step yet).
	The class test guards a slot inherited from a superclass."

	^ (grailCommittedInstance ~~ nil and: [grailCommittedInstance class == self])
		ifTrue: [grailCommittedInstance]
		ifFalse: [nil]
%

category: 'Grail-Singleton'
classmethod: NativeModule
___installCommittedInstance___
	"Install-time only: mint this class's committed instance, empty and
	invariant.  install.sh recreates the runtime classes on every run, so
	the instance is recreated with them rather than migrated."

	| inst |
	inst := self new.
	inst immediateInvariant.
	grailCommittedInstance := inst.
	^ inst
%

category: 'Grail-Singleton'
classmethod: NativeModule
___installCommittedInstances___
	"Install-time only: give every native module class its committed
	instance, then forget this session's native singletons and their
	state so the rest of the install binds the committed ones.  Answers
	the number of classes."

	| classes |
	classes := self allSubclasses reject: [:c | c isMeta].
	classes do: [:c | c ___installCommittedInstance___].
	classes do: [:c | module ___sessionInstances___ removeKey: c ifAbsent: []].
	classes do: [:c | c ___forgetSessionState___].
	"sys.modules re-seeds itself from ``instance'' on the next read."
	SessionTemps current removeKey: #GrailSysModules ifAbsent: [].
	SessionTemps current removeKey: #GrailNativeModuleSlots ifAbsent: [].
	SessionTemps current removeKey: #GrailNativeModuleEntries ifAbsent: [].
	^ classes size
%

category: 'Grail-Singleton'
classmethod: NativeModule
___forgetSessionState___
	"Drop this class's per-session state (clearInstance's other half: a
	cleared native module must come back with no leftover attributes, as a
	freshly minted instance used to)."

	#(#GrailNativeModuleSlots #GrailNativeModuleEntries) do: [:key |
		(SessionTemps current at: key otherwise: nil)
			ifNotNil: [:reg | reg removeKey: self ifAbsent: []]].
	"And the fast accessors, which would otherwise keep answering the
	dictionaries just forgotten: the persistent ones go back in, and the next
	access rebuilds the state -- and re-runs initialize -- as it always did.
	Unconditional: a session method dictionary cannot be READ outside
	protected mode (its hash function is protected), and putting the
	inherited method back is idempotent."
	self == NativeModule ifTrue: [^ self].
	self ___sessionMethodsAvailable___ ifFalse: [^ self].
	#(#'___sessionSlots___' #'___sessionEntries___') do: [:sel |
		self @env1:___installSessionMethod: (NativeModule compiledMethodAt: sel environmentId: 0)
			as: sel environmentId: 0]
%

category: 'Grail-Session State'
classmethod: NativeModule
___sessionMethodsAvailable___
	"Whether Behavior's session-method helpers (Class.gs) are filed yet.  They
	are not while install.sh is still filing native modules -- enum.gs clears
	its instance during file-in -- and without them the persistent accessors
	are simply the only ones, which is correct, only slower."

	^ (self class whichClassIncludesSelector: #'___installSessionMethod:as:environmentId:'
		environmentId: 1) notNil
%

category: 'Grail-Session State'
classmethod: NativeModule
___installFastAccessor___: aSelector answering: aDictionary
	"Install a session method answering aDictionary for aSelector, one of the
	two state accessors, so the session's later accesses are one send and a
	literal read instead of two hash lookups.

	MEASURED, and why it is here: holding native-module state in SessionTemps
	made every attribute load on a native module about 0.6 us slower
	(sys.maxsize, math.pi: 1.2-1.3 us before, 1.8-1.9 us after) -- an
	attribute load consults the state several times, and each consultation
	was a SessionTemps probe plus a class-keyed one.  A transient session
	method (Behavior >> ___compileSessionMethod:category:scope:environmentId:)
	is per session by construction, which is exactly the lifetime this state
	has, and a name bound in its compile scope is read as a literal
	association.  ___forgetSessionState___ takes it out again."

	| holder |
	self ___sessionMethodsAvailable___ ifFalse: [^ self].
	holder := SymbolDictionary new.
	holder at: #'___grailNativeState___' put: aDictionary.
	self @env1:___compileSessionMethod: aSelector asString , '
	^ ___grailNativeState___'
		category: 'Grail-Session State'
		scope: holder
		environmentId: 0
%

category: 'Grail-Session State'
method: NativeModule
___sessionSlots___
	"This module's dynamic instVars for this session: an
	IdentityKeyValueDictionary, keyed by the module CLASS."

	| reg slots |
	reg := SessionTemps current at: #GrailNativeModuleSlots otherwise: nil.
	reg == nil ifTrue: [
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #GrailNativeModuleSlots put: reg].
	slots := reg at: self class otherwise: nil.
	slots == nil ifTrue: [
		slots := IdentityKeyValueDictionary new.
		reg at: self class put: slots.
		self class ___installFastAccessor___: #'___sessionSlots___' answering: slots.
		self ___ensureSessionInitialized___].
	^ slots
%

category: 'Grail-Session State'
method: NativeModule
___sessionEntries___
	"This module's dictionary entries for this session: a SymbolDictionary,
	keyed by the module CLASS."

	| reg entries |
	reg := SessionTemps current at: #GrailNativeModuleEntries otherwise: nil.
	reg == nil ifTrue: [
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #GrailNativeModuleEntries put: reg].
	entries := reg at: self class otherwise: nil.
	entries == nil ifTrue: [
		entries := SymbolDictionary new.
		reg at: self class put: entries.
		self class ___installFastAccessor___: #'___sessionEntries___' answering: entries.
		self ___ensureSessionInitialized___].
	^ entries
%

category: 'Grail-Session State'
method: NativeModule
___ensureSessionInitialized___
	"This session's state for the module is being created: make sure the
	session has its singleton, so ``initialize'' has filled that state.

	A session need not ask for the singleton at all.  A deployed Python
	module reaches a native one through its committed globals -- the
	deployed socket.py's ``_socket'' -- and the first thing such a session
	does is read an attribute.  When native instances were minted per
	session, the deploy session's instance carried its entries in the
	repository, so the read worked; now the entries are per session and
	nothing else would create them.  ``instance'' registers the singleton
	before it runs initialize, so initialize's own writes find it
	registered and do not come back here."

	(module ___sessionInstances___ includesKey: self class)
		ifFalse: [self class @env1:instance]
%

! ---- dynamic instVars: the kernel's four primitives, redirected
! (removeDynamicInstVar: and dynamicInstVarAt:ifAbsent: are built on these)

category: 'Grail-Session State'
method: NativeModule
dynamicInstVarAt: aSymbol
	^ self ___sessionSlots___ at: aSymbol otherwise: nil
%

category: 'Grail-Session State'
method: NativeModule
dynamicInstVarAt: aSymbol put: aValue
	"_remoteNil removes, as the primitive's contract says."

	aValue == _remoteNil
		ifTrue: [self ___sessionSlots___ removeKey: aSymbol ifAbsent: []]
		ifFalse: [self ___sessionSlots___ at: aSymbol put: aValue].
	"Keep a patched name's fast-path holder current (object class >>
	___grailFastOverrideHolderFor___:): the dispatcher reads the override
	from it, so this store IS the re-patch, and a delete the unpatch."
	(SessionTemps current at: #'GrailFastOverrideHolders' otherwise: nil) ifNotNil: [:reg |
		((reg at: self class otherwise: nil) ifNotNil: [:byName |
			byName at: aSymbol otherwise: nil]) ifNotNil: [:holder |
				holder at: #'___grailFastOverride___'
					put: (aValue == _remoteNil ifTrue: [nil] ifFalse: [aValue])]].
	^ aValue
%

category: 'Grail-Session State'
method: NativeModule
dynamicInstanceVariables
	^ self ___sessionSlots___ keys asArray
%

category: 'Grail-Session State'
method: NativeModule
dynamicInstVarPairs
	"A FLAT alternating name/value Array, as the primitive answers."

	| out |
	out := OrderedCollection new.
	self ___sessionSlots___ keysAndValuesDo: [:k :v | out add: k; add: v].
	^ out asArray
%

! ---- dictionary entries: the SymbolDictionary protocol module code uses

category: 'Grail-Session State'
method: NativeModule
at: aKey
	^ self ___sessionEntries___ at: aKey
%

category: 'Grail-Session State'
method: NativeModule
at: aKey put: aValue
	^ self ___sessionEntries___ at: aKey put: aValue
%

category: 'Grail-Session State'
method: NativeModule
at: aKey ifAbsent: aBlock
	^ self ___sessionEntries___ at: aKey ifAbsent: aBlock
%

category: 'Grail-Session State'
method: NativeModule
at: aKey otherwise: aValue
	^ self ___sessionEntries___ at: aKey otherwise: aValue
%

category: 'Grail-Session State'
method: NativeModule
at: aKey ifAbsentPut: aBlock
	^ self ___sessionEntries___ at: aKey ifAbsentPut: aBlock
%

category: 'Grail-Session State'
method: NativeModule
includesKey: aKey
	^ self ___sessionEntries___ includesKey: aKey
%

category: 'Grail-Session State'
method: NativeModule
removeKey: aKey
	^ self ___sessionEntries___ removeKey: aKey
%

category: 'Grail-Session State'
method: NativeModule
removeKey: aKey ifAbsent: aBlock
	^ self ___sessionEntries___ removeKey: aKey ifAbsent: aBlock
%

category: 'Grail-Session State'
method: NativeModule
removeKey: aKey otherwise: aValue
	^ self ___sessionEntries___ removeKey: aKey otherwise: aValue
%

category: 'Grail-Session State'
method: NativeModule
associationAt: aKey
	^ self ___sessionEntries___ associationAt: aKey
%

category: 'Grail-Session State'
method: NativeModule
associationAt: aKey ifAbsent: aBlock
	^ self ___sessionEntries___ associationAt: aKey ifAbsent: aBlock
%

category: 'Grail-Session State'
method: NativeModule
associationAt: aKey otherwise: aValue
	^ self ___sessionEntries___ associationAt: aKey otherwise: aValue
%

category: 'Grail-Session State'
method: NativeModule
keys
	^ self ___sessionEntries___ keys
%

category: 'Grail-Session State'
method: NativeModule
values
	^ self ___sessionEntries___ values
%

category: 'Grail-Session State'
method: NativeModule
keysDo: aBlock
	^ self ___sessionEntries___ keysDo: aBlock
%

category: 'Grail-Session State'
method: NativeModule
valuesDo: aBlock
	^ self ___sessionEntries___ valuesDo: aBlock
%

category: 'Grail-Session State'
method: NativeModule
do: aBlock
	^ self ___sessionEntries___ do: aBlock
%

category: 'Grail-Session State'
method: NativeModule
keysAndValuesDo: aBlock
	^ self ___sessionEntries___ keysAndValuesDo: aBlock
%

category: 'Grail-Session State'
method: NativeModule
associationsDo: aBlock
	^ self ___sessionEntries___ associationsDo: aBlock
%

category: 'Grail-Session State'
method: NativeModule
size
	^ self ___sessionEntries___ size
%

category: 'Grail-Session State'
method: NativeModule
isEmpty
	^ self ___sessionEntries___ isEmpty
%

category: 'Grail-Session State'
method: NativeModule
notEmpty
	^ self ___sessionEntries___ notEmpty
%

category: 'Grail-Session State'
method: NativeModule
includes: aValue
	^ self ___sessionEntries___ includes: aValue
%

category: 'Grail-Session State'
method: NativeModule
keyAtValue: aValue
	^ self ___sessionEntries___ keyAtValue: aValue
%

category: 'Grail-Session State'
method: NativeModule
keyAtValue: aValue ifAbsent: aBlock
	^ self ___sessionEntries___ keyAtValue: aValue ifAbsent: aBlock
%

set compile_env: 1

category: 'Grail-Singleton'
classmethod: NativeModule
instance
	"The session singleton: install.sh's committed instance when there is
	one, else a fresh one (the old behaviour, for a class install has not
	seen).  ``initialize'' still runs once per session -- it now writes
	only session state -- so a module's per-session setup is unchanged.
	Native modules are never canonical, so module's registry probe is
	skipped."

	| reg inst |
	reg := self @env0:___sessionInstances___.
	inst := reg @env0:at: self otherwise: nil.
	inst == nil ifFalse: [^ inst].
	inst := self @env0:___committedInstance___.
	inst == nil ifTrue: [inst := self @env0:new].
	reg @env0:at: self put: inst.
	"A session's first native singleton is also a point every Python
	execution passes: install the dispatchers committed overrides need."
	object @env0:___grailInstallRecordedSelfSendOverrides___.
	((inst @env0:class @env0:whichClassIncludesSelector: #initialize environmentId: 1) @env0:notNil)
		ifTrue: [inst initialize].
	^ inst
%

category: 'Grail-Singleton'
classmethod: NativeModule
clearInstance
	"Forget this session's singleton AND its state, so the next access
	re-runs initialize on a clean slate -- what minting a new instance
	used to give."

	self @env0:___sessionInstances___ @env0:removeKey: self ifAbsent: [].
	self @env0:___forgetSessionState___
%

set compile_env: 1

category: 'Grail-Session State'
method: NativeModule
___mayCacheFunctionHandles___
	"Always: a native module's dynamic instVars are redirected to SessionTemps
	(dynamicInstVarAt:put: above), so caching a function handle there writes
	nothing committed -- see module >> ___mayCacheFunctionHandles___."

	^ true
%

set compile_env: 0
