"Wrapper for a C-allocated PatternObject* from _sre.compile().

cPointer holds the C PatternObject* as a CPointer.  A CPointer keeps its
address in non-persistent storage, so an SrePattern that is committed (the
re / jinja2 regex caches retain compiled patterns, and a DEPLOYED canonical
module closure -- werkzeug URL rules -- carries patterns compiled at
definition time) and later faulted into a fresh session comes back with a
NULL cPointer instead of a stale integer address.

compileArgs holds the six _sre.compile() arguments (pattern, flags, code,
groups, groupindex, indexgroup -- all plain committable values), letting
cPtrAddress RECOMPILE the pattern transparently in a session that faulted
the wrapper in with a NULL cPointer.  A wrapper without compileArgs (e.g.
minted by SreMatch>>re) still signals a clean Smalltalk error rather than
handing a NULL/stale address to C (the original SEGV fix)."
Class {
	#name : 'SrePattern',
	#superclass : 'Object',
	#instVars : [
		'cPointer',
		'compileArgs'
	]
}

{ #category : 'Grail-Python Attribute Hook' }
SrePattern class >> ___pythonValueAttrs___ [
	"Selectors whose Smalltalk methods are exposed to Python as
	*value* attributes rather than bound methods.  Without this
	hook, ``pattern.groups`` would yield a BoundMethod wrapping
	the getter — but the CPython API exposes ``groups`` as a
	struct member (Py_T_PYSSIZET), so ``pattern.groups`` must be
	the int.  Same story for ``groupindex``, ``flags``, and
	``pattern`` (the source string)."

	^ IdentitySet new
		add: #groups;
		add: #groupindex;
		add: #flags;
		add: #pattern;
		yourself

]

{ #category : 'Grail-Instance Creation' }
SrePattern class >> newFromCPtr: anAddress [
	"Create a pattern wrapper for the C PatternObject* at anAddress (a
	SmallInteger returned by the shim). Returns nil for a NULL address.

	The address is boxed in a CPointer rather than stored as a raw integer:
	a CPointer keeps its address in non-persistent storage, so a wrapper
	that is committed and later faulted into a fresh session comes back
	NULL instead of carrying a stale address.  Dereferencing such a stale
	address in C was the cause of the SEGV when the re / jinja2 regex caches
	were committed and reused in a later session."

	anAddress = 0 ifTrue: [^ nil].
	^ self basicNew initCPointer: (CPointer forAddress: anAddress)

]

{ #category : 'Grail-Instance Creation' }
SrePattern class >> newFromCPtr: anAddress compileArgs: anArray [
	"Like newFromCPtr:, additionally remembering the six _sre.compile()
	arguments so the pattern can be RECOMPILED transparently after being
	committed and faulted into a fresh session (see the class comment)."

	| inst |
	anAddress = 0 ifTrue: [^ nil].
	inst := self basicNew initCPointer: (CPointer forAddress: anAddress).
	inst initCompileArgs: anArray.
	^ inst

]

{ #category : 'Grail-Accessing' }
SrePattern >> cPointer [
	"The CPointer wrapping the C PatternObject* (NULL across a session boundary)."
	^ cPointer

]

{ #category : 'Grail-Private' }
SrePattern >> cPtrAddress [
	"The raw C address to hand to the shim.  A pattern that was committed
	and faulted into a new session has a NULL cPointer because the C
	PatternObject no longer exists.  When the wrapper remembers its
	_sre.compile() arguments, RECOMPILE transparently -- a deployed
	canonical-module closure (werkzeug URL rules, module-level
	re.compile()) must keep serving in later sessions.  Without the args
	(a wrapper minted by SreMatch>>re), signal rather than hand a
	NULL/stale address into C -- dereferencing it would crash the gem.

	The recompiled pointer is kept in SessionTemps, NOT stored back into
	cPointer.  The pattern is committed (that is how it came to be NULL), so
	storing into it is a persistent write -- and every session that touches a
	module-level re.compile() makes the same one, so two sessions using, say,
	decimal's _all_zeros collide on commit (Write-Write on the SrePattern).
	The pointer is per-process state and belongs with the rest of it
	(docs/Concurrency.md)."

	| live |
	(cPointer notNil and: [cPointer isNull not]) ifTrue: [^ cPointer memoryAddress].
	live := (SessionTemps current at: #'GrailSrePatternPointers' otherwise: nil)
		ifNotNil: [:map | map at: self otherwise: nil].
	live notNil ifTrue: [^ live memoryAddress].
	compileArgs isNil ifTrue: [
		^ self error: 'SrePattern is not valid in this session: a compiled regular expression does not persist across a commit/session boundary (recompile the pattern).'].
	[ | addr sreCls |
		"_sre's class definition follows SrePattern's in this file --
		resolve it at runtime rather than compile time."
		sreCls := System myUserProfile symbolList objectNamed: #'_sre'.
		addr := sreCls
			callCompile: (compileArgs at: 1) flags: (compileArgs at: 2)
			code: (compileArgs at: 3) groups: (compileArgs at: 4)
			groupindex: (compileArgs at: 5) indexgroup: (compileArgs at: 6).
		addr = 0 ifTrue: [
			^ self error: 'SrePattern recompile failed in this session (see compileArgs).'].
		live := CPointer forAddress: addr ] value.
	(SessionTemps current at: #'GrailSrePatternPointers'
		ifAbsentPut: [IdentityKeyValueDictionary new]) at: self put: live.
	^ live memoryAddress

]

{ #category : 'Grail-Private' }
SrePattern >> initCompileArgs: anArray [
	compileArgs := anArray

]

{ #category : 'Grail-Private' }
SrePattern >> initCPointer: aCPointer [
	cPointer := aCPointer

]
