fileformat utf8
set compile_env: 0
! ------------------- Class definition for PythonStore
expectvalue /Class
doit
Object subclass: 'PythonStore'
  instVarNames: #( store)
  classVars: #()
  classInstVars: #( default)
  poolDictionaries: #()
  inDictionary: EmbeddedPython
  options: #()

%
expectvalue /Class
doit
PythonStore comment: 
'Persistent key-value store for Python data with identity preservation.

Stores native GemStone object graphs that mirror the Python object structure.
Variable names map to root GemStone objects directly.

Session-scoped roots (in SessionTemps via IdentityDictionary) keep one IncRef''d
CPythonObject per stored variable, preventing Python from GC''ing the root
while it is stored. Children are transitively protected by Python''s own
refcounting. On session restart, roots are rebuilt during loadAll.

Usage via the #default message:
	| obj |
	obj := CPythonObject fromString: ''hello''.
	[ PythonStore default at: ''greeting'' put: obj ] ensure: [ obj release ].
	System commitTransaction.

	''Later, possibly in another session:''
	| pyObj |
	pyObj := PythonStore default at: ''greeting''.
	[ pyObj asString ] ensure: [ pyObj release ].  ''=> ''''hello'''''''
%
expectvalue /Class
doit
PythonStore category: 'CPython'
%
! ------------------- Remove existing behavior from PythonStore
removeallmethods PythonStore
removeallclassmethods PythonStore
! ------------------- Class methods for PythonStore
category: 'Instance Creation'
classmethod: PythonStore
default

	default ifNil: [ default := self new ].
	^ default
%
category: 'Instance Creation'
classmethod: PythonStore
reset

	default ifNotNil: [ default reset ].
	default := nil.
%
! ------------------- Instance methods for PythonStore
category: 'Accessing'
method: PythonStore
at: aString
	"Retrieve stored data and reconstruct a CPythonObject.
	Sender must release the returned object."

	^ self at: aString ifAbsent: [ self store errorKeyNotFound: aString ]
%
category: 'Accessing'
method: PythonStore
at: aString ifAbsent: aBlock

	| gsRoot pyRoot |
	gsRoot := self store at: aString ifAbsent: [ ^ aBlock value ].
	pyRoot := PythonReplicator new gemStoneToPython: gsRoot.
	self registerRoot: aString python: pyRoot.
	^ pyRoot
%
category: 'Accessing'
method: PythonStore
at: aString put: aCPythonObject

	self store at: aString put: (PythonReplicator new pythonToGemStone: aCPythonObject).
	self registerRoot: aString python: aCPythonObject.
%
category: 'Testing'
method: PythonStore
isEmpty

	^ self store isEmpty
%
category: 'Accessing'
method: PythonStore
keys

	^ self store keys
%
category: 'Persistence'
method: PythonStore
loadAll
	"Load all stored values with shared GemStone-to-Python identity.
	Returns a Dictionary of (String -> CPythonObject). Sender must release each object."

	| replicator sharedMap rootPointers results pythonLibrary |
	replicator := PythonReplicator new.
	sharedMap := IdentityDictionary new.
	rootPointers := Dictionary new.
	pythonLibrary := CPythonLibrary current.
	[
		self store keysAndValuesDo: [ :key :gsValue |
			gsValue isNil
				ifTrue: [ rootPointers at: key put: nil ]
				ifFalse: [
					replicator gemStoneToPython: gsValue map: sharedMap.
					rootPointers at: key put: (sharedMap at: gsValue) pointer.
				].
		].
		rootPointers keysAndValuesDo: [ :key :ptr |
			ptr ifNotNil: [ pythonLibrary Py_IncRef: ptr ] ].
	] ensure: [
		sharedMap values do: [ :obj | obj release ].
	].
	results := Dictionary new.
	rootPointers keysAndValuesDo: [ :key :ptr |
		| owned |
		owned := ptr
			ifNil: [ CPythonObject none ]
			ifNotNil: [ CPythonObject fromNewReference: ptr ].
		self registerRoot: key python: owned.
		results at: key put: owned.
	].
	^ results
%
category: 'Testing'
method: PythonStore
notEmpty

	^ self store notEmpty
%
category: 'Accessing'
method: PythonStore
rawAt: aString
	"Return the stored GemStone object directly (no Python conversion)."

	^ self store at: aString
%
category: 'Private'
method: PythonStore
registerRoot: varName python: aCPythonObject
	"Keep the root Python object alive across GemStone sessions."

	| roots |
	roots := self roots.
	roots at: varName ifPresent: [ :old | old release ].
	roots at: varName put: (CPythonObject fromBorrowedReference: aCPythonObject pointer).
%
category: 'Removing'
method: PythonStore
removeAll

	self keys copy do: [ :k | self removeKey: k ].
%
category: 'Removing'
method: PythonStore
removeKey: aString

	self store removeKey: aString ifAbsent: [ ^ self ].
	(self roots removeKey: aString ifAbsent: [ nil ]) ifNotNil: [ :w | w release ].
%
category: 'Resource Management'
method: PythonStore
reset

	| map |
	self roots values do: [ :w | w release ].
	map := SessionTemps current at: #PythonStoreRootsMap ifAbsent: [ nil ].
	map ifNotNil: [ map removeKey: self ifAbsent: [] ].
	store := nil.
%
category: 'Private'
method: PythonStore
roots
	"Session-scoped dictionary of varName -> CPythonObject (IncRef'd root wrappers).
	Automatically fresh on new Gem session."

	| sessionMaps map |
	sessionMaps := SessionTemps current at: #PythonStoreRootsMap ifAbsentPut: [ IdentityDictionary new  ].
	map := sessionMaps at: self ifAbsentPut: [ Dictionary new ].
	^ map
%
category: 'Private'
method: PythonStore
store

	store ifNil: [ store := Dictionary new ].
	^ store
%
category: 'Persistence'
method: PythonStore
storeAll: associations
	"Store all associations (String -> CPythonObject) with shared identity.
	Shared Python sub-objects across keys become identical GemStone objects."

	| replicator sharedMap |
	replicator := PythonReplicator new.
	sharedMap := Dictionary new.
	associations do: [ :assoc |
		self store at: assoc key put: (replicator pythonToGemStone: assoc value map: sharedMap).
		self registerRoot: assoc key python: assoc value.
	].
%
