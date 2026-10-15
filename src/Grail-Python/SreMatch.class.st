"Wrapper for a C-allocated MatchObject* from pattern.match()/search().

cPointer holds the C MatchObject* as a CPointer.  As with SrePattern, the
CPointer keeps its address in non-persistent storage, so a committed match
faults into a fresh session as NULL rather than a stale integer address;
cPtrAddress then signals instead of dereferencing it in C."
Class {
	#name : 'SreMatch',
	#superclass : 'Object',
	#instVars : [
		'cPointer'
	]
}

{ #category : 'Grail-Python Attribute Hook' }
SreMatch class >> ___pythonValueAttrs___ [
	"Selectors whose Smalltalk methods are exposed to Python as
	*value* attributes rather than bound methods.  Mirrors
	CPython's `Match` struct members: pos / endpos / lastindex /
	lastgroup / re / string / regs."

	^ IdentitySet new
		add: #pos;
		add: #endpos;
		add: #lastindex;
		add: #lastgroup;
		add: #re;
		add: #string;
		add: #regs;
		yourself

]

{ #category : 'Grail-Instance Creation' }
SreMatch class >> newFromCPtr: anAddress [
	"Create a match wrapper for the C MatchObject* at anAddress (a
	SmallInteger returned by the shim). Returns nil for a NULL address.

	As with SrePattern, the address is boxed in a CPointer so a committed
	match faults into a fresh session as NULL rather than a stale integer
	address that would SEGV when dereferenced in C."

	anAddress = 0 ifTrue: [^ nil].
	^ self basicNew initCPointer: (CPointer forAddress: anAddress)

]

{ #category : 'Grail-Accessing' }
SreMatch >> cPointer [
	"The CPointer wrapping the C MatchObject* (NULL across a session boundary)."
	^ cPointer

]

{ #category : 'Grail-Private' }
SreMatch >> cPtrAddress [
	"The raw C address to hand to the shim. Signal rather than pass a
	NULL/stale address into C: a match that was committed and faulted into a
	new session has a NULL cPointer because the C MatchObject no longer
	exists, and dereferencing it would crash the gem."

	(cPointer isNil or: [cPointer isNull]) ifTrue: [
		^ self error: 'SreMatch is not valid in this session: a match object does not persist across a commit/session boundary (recompute the match).'].
	^ cPointer memoryAddress

]

{ #category : 'Grail-Private' }
SreMatch >> initCPointer: aCPointer [
	cPointer := aCPointer

]
