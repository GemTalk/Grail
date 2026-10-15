Extension { #name : 'NativeModule' }

{ #category : 'Grail-Singleton' }
NativeModule class >> ___freshInstance___ [
	"A second, UNREGISTERED module object over this module's session state.

	``initialize'' is NOT run on it: that state already exists -- the
	singleton is made first, which is what fills it -- and initializing again
	would reset it under the canonical module (a fresh warnings would empty
	the session's filters).  Neither the session registry nor sys.modules
	learns of the copy."

	self instance.
	^ self @env0:new

]

{ #category : 'Grail-Singleton' }
NativeModule class >> ___hasFreshInstances___ [
	"Can a SECOND object of this native module stand for a fresh import of
	it -- what test.support.import_helper.import_fresh_module answers when it
	is given ``fresh=''?

	A native module keeps its state per session and per CLASS (see
	___sessionEntries___ and ___sessionSlots___), so a second instance is a
	new module object over the SAME state -- the arrangement CPython has for a
	C-accelerated module, whose state lives in the interpreter.  What can
	still tell the two objects apart is identity: a method comparing ``self''
	with the singleton, or keying something by instance.

	False by default, because nobody has checked that for most modules.  A
	module that answers true has been checked."

	^ false

]

{ #category : 'Grail-Singleton' }
NativeModule class >> clearInstance [
	"Forget this session's singleton AND its state, so the next access
	re-runs initialize on a clean slate -- what minting a new instance
	used to give."

	self @env0:___sessionInstances___ @env0:removeKey: self ifAbsent: [].
	self @env0:___forgetSessionState___

]

{ #category : 'Grail-Singleton' }
NativeModule class >> instance [
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

]

{ #category : 'Grail-Session State' }
NativeModule >> ___mayCacheFunctionHandles___ [
	"Always: a native module's dynamic instVars are redirected to SessionTemps
	(dynamicInstVarAt:put: above), so caching a function handle there writes
	nothing committed -- see module >> ___mayCacheFunctionHandles___."

	^ true

]
