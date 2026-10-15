"``os.environ' -- a LIVE read-through view of this gem's environment.

Every lookup calls ``System class >> gemEnvironmentVariable:' at the moment
it is asked, so a variable set after this object was built is still seen, and
``os.environ[k] = v' really does putenv (CPython semantics: the child
processes of GsHostProcess inherit it).

DEVIATION -- enumeration is partial.  GemStone exposes no way to READ BACK the
environment block: ``gemEnvironmentVariable:' answers one NAMED variable and
there is no ``environ'/``getenviron' primitive.  So ``keys()', ``items()',
``values()', ``__iter__' and ``__len__' can only report names this session
has already touched -- those probed at first access (a curated list of the
usual POSIX/toolchain names), plus any name later read or written through this
object.  A variable that is set in the process but has never been named here
is invisible to iteration while remaining perfectly visible to ``environ[k]',
``.get(k)' and ``k in environ'.

This is the one Grail surface where a missing kernel primitive is visible
directly in Python semantics rather than in performance or an error message;
a ``System class >> gemEnvironment' answering a Dictionary would close it and
let this class drop the probe list entirely."
Class {
	#name : 'os_Environ',
	#superclass : 'object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Env Overlay' }
os_Environ class >> ___envOverlay___ [
	"Names whose value is too long for the C environment, session-local
	because a gem's environment is session-local anyway."

	| t d |
	t := SessionTemps current.
	d := t at: #'___grailEnvOverlay___' otherwise: nil.
	d == nil ifTrue: [
		d := Dictionary new.
		t at: #'___grailEnvOverlay___' put: d].
	^ d

]

{ #category : 'Grail-Env Overlay' }
os_Environ class >> ___envRawGet___: aName [
	"The one read path: overlay first, then the C environment.  Answers nil
	when unset, exactly as gemEnvironmentVariable: does."

	| s |
	s := aName asString.
	^ self ___envOverlay___
		at: s
		ifAbsent: [System gemEnvironmentVariable: s]

]

{ #category : 'Grail-Env Overlay' }
os_Environ class >> ___envRawPut___: aName value: aValue [
	"The one write path.  TRY the real environment first: when it takes the
	value that is where it lives (and any stale overlay entry is dropped, so a
	short write always wins over an earlier long one).  Only when THIS platform
	refuses does the value go to the overlay, which is what keeps os.environ
	from raising where CPython would not.

	Trying rather than testing a length is deliberate.  The cap is
	platform-specific -- Darwin arm64 refuses 1024, Linux x86_64 accepts it --
	so any constant here is wrong somewhere, and wrong in the silent direction:
	too low and values needlessly leave the real environment (a child process
	stops seeing them), too high and the uncatchable error comes back.  Asking
	the platform cannot go stale.

	Only OutOfRange -- the refusal this exists for -- is absorbed.  Anything
	else is passed, so a genuinely bad write still fails loudly instead of
	being quietly parked in the overlay."

	| s v |
	s := aName asString.
	v := aValue asString.
	^ [System gemEnvironmentVariable: s put: v.
	   self ___envOverlay___ removeKey: s ifAbsent: [].
	   v]
		on: Error
		do: [:ex |
			"AlmostOutOfStackError is an Error subclass; never eat the VM's
			warning or the next overflow is a fatal Red Zone crash."
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			(ex isKindOf: OutOfRange) ifFalse: [ex pass].
			self ___envOverlay___ at: s put: v.
			ex return: v]

]

{ #category : 'Grail-Env Overlay' }
os_Environ class >> ___envRawRemove___: aName [
	"Unset in both homes.  GemStone has no true remove, so the C side is
	cleared to nil, falling back to an empty string where that is rejected."

	| s |
	s := aName asString.
	self ___envOverlay___ removeKey: s ifAbsent: [].
	[System gemEnvironmentVariable: s put: nil]
		on: AbstractException
		do: [:ex |
			"AlmostOutOfStackError is an Error subclass; never eat the VM's
			warning or the next overflow is a fatal Red Zone crash."
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			System gemEnvironmentVariable: s put: ''].

]

{ #category : 'Grail-Env0 Dictionary Protocol' }
os_Environ >> at: key [
	| v |
	v := os_Environ ___envRawGet___: (key asString).
	v == nil ifTrue: [^ self error: 'key not found: ' , key asString].
	self @env1:___note___: key.
	^ v

]

{ #category : 'Grail-Env0 Dictionary Protocol' }
os_Environ >> at: key ifAbsent: aBlock [
	| v |
	v := os_Environ ___envRawGet___: (key asString).
	v == nil ifTrue: [^ aBlock value].
	self @env1:___note___: key.
	^ v

]

{ #category : 'Grail-Env0 Dictionary Protocol' }
os_Environ >> at: key otherwise: default [
	| v |
	v := os_Environ ___envRawGet___: (key asString).
	v == nil ifTrue: [^ default].
	self @env1:___note___: key.
	^ v

]

{ #category : 'Grail-Env0 Dictionary Protocol' }
os_Environ >> at: key put: value [
	os_Environ ___envRawPut___: (key asString) value: (value asString).
	self @env1:___note___: key.
	^ value

]

{ #category : 'Grail-Env0 Dictionary Protocol' }
os_Environ >> includesKey: key [
	^ (os_Environ ___envRawGet___: (key asString)) ~~ nil

]
