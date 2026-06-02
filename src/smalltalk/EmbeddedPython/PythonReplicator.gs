fileformat utf8
set compile_env: 0
! ------------------- Class definition for PythonReplicator
expectvalue /Class
doit
Object subclass: 'PythonReplicator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPython
  options: #()

%
expectvalue /Class
doit
PythonReplicator comment: 
'Bidirectional replicator between native GemStone object graphs and Python
object graphs (CPythonObject) for the supported types.'
%
expectvalue /Class
doit
PythonReplicator category: 'CPython'
%
! ------------------- Remove existing behavior from PythonReplicator
removeallmethods PythonReplicator
removeallclassmethods PythonReplicator
! ------------------- Class methods for PythonReplicator
category: 'Forwarder Cache'
classmethod: PythonReplicator
forwarderCache

	^ SessionTemps current
		at: #PythonReplicatorForwarderCache
		ifAbsentPut: [Dictionary new]
%
category: 'Forwarder Cache'
classmethod: PythonReplicator
forwarderFor: aCPythonObject
	"Per-session cache keyed on PyObject* memoryAddress."

	^ self forwarderCache
		at: aCPythonObject pointer memoryAddress
		ifAbsentPut: [
			CPythonObjectForwarder forCpythonObject:
				(CPythonObject fromBorrowedReference: aCPythonObject pointer)]
%
! ------------------- Instance methods for PythonReplicator
category: 'Private'
method: PythonReplicator
gemStoneScalarToPython: anObject ifNotScalar: aBlock

	(anObject isKindOf: Boolean) ifTrue: [ ^ CPythonObject fromBoolean: anObject ].
	(anObject isKindOf: Integer) ifTrue: [ ^ CPythonObject fromInteger: anObject ].
	(anObject isKindOf: Float) ifTrue: [ ^ CPythonObject fromFloat: anObject ].
	(anObject isKindOf: CharacterCollection) ifTrue: [ ^ CPythonObject fromString: anObject ].
	(anObject isKindOf: CPythonObjectForwarder) ifTrue: [
		"Re-wrap as a new reference so the caller's release walk
		doesn't DecRef the cache's canonical handle."
		^ CPythonObject fromBorrowedReference: anObject cpythonObject pointer
	].
	"PEP 357: unbox via env-1 __index__."
	((anObject class methodDictForEnv: 1) includesKey: #'__index__') ifTrue: [
		^ CPythonObject fromInteger: (anObject @env1:__index__)
	].
	^ aBlock value
%
category: 'GemStone to Python'
method: PythonReplicator
gemStoneToPython: anObject

	| localMap rootPyObj rootPointer |
	anObject ifNil: [ ^ CPythonObject none ].
	(anObject isKindOf: NoneType) ifTrue: [ ^ CPythonObject none ].

	localMap := IdentityDictionary new. " GemStone object -> CPythonObject "
	self gemStoneToPython: anObject map: localMap.

	rootPyObj := localMap at: anObject.
	rootPointer := rootPyObj pointer.

	"IncRef the root so it survives the bulk release below.
	Children survive because their parent containers hold references to them."
	CPythonLibrary current Py_IncRef: rootPointer.
	localMap values do: [ :obj | obj release ].

	^ CPythonObject fromNewReference: rootPointer
%
category: 'GemStone to Python'
method: PythonReplicator
gemStoneToPython: anObject map: pyObjectsByGsObject

	anObject ifNil: [ ^ CPythonObject none ].
	(anObject isKindOf: NoneType) ifTrue: [ ^ CPythonObject none ].
	pyObjectsByGsObject at: anObject ifPresent: [ :pyObj | ^ pyObj ].

	(anObject isKindOf: AbstractDictionary) ifTrue: [
		^ self gemStoneToPythonDict: anObject map: pyObjectsByGsObject
	].
	(anObject isKindOf: OrderedCollection) ifTrue: [
		^ self gemStoneToPythonList: anObject map: pyObjectsByGsObject
	].
	(anObject isKindOf: Array) ifTrue: [
		^ self gemStoneToPythonTuple: anObject map: pyObjectsByGsObject
	].

	^ pyObjectsByGsObject at: anObject put:
		(self gemStoneScalarToPython: anObject
			ifNotScalar: [ Error signal: 'Cannot replicate ' , anObject class name , ' to Python' ])
%
category: 'Private'
method: PythonReplicator
gemStoneToPythonDict: aDict map: aMap

	| pyDict |
	pyDict := CPythonObject newDict.
	aMap at: aDict put: pyDict.
	aDict keysAndValuesDo: [ :gsKey :gsValue |
		| pyKey pyValue |
		pyKey := self gemStoneToPython: gsKey map: aMap.
		pyValue := self gemStoneToPython: gsValue map: aMap.
		pyDict dictAtObject: pyKey put: pyValue.
	].
	^ pyDict
%
category: 'Private'
method: PythonReplicator
gemStoneToPythonList: anOrderedCollection map: aMap

	| pyList |
	pyList := CPythonObject newList: 0.
	aMap at: anOrderedCollection put: pyList.
	anOrderedCollection do: [ :gsItem |
		| pyItem |
		pyItem := self gemStoneToPython: gsItem map: aMap.
		pyList listAppend: pyItem.
	].
	^ pyList
%
category: 'Private'
method: PythonReplicator
gemStoneToPythonTuple: anArray map: aMap

	| pyTuple |
	pyTuple := CPythonObject newTuple: anArray size.
	aMap at: anArray put: pyTuple.
	1 to: anArray size do: [ :i |
		| pyItem |
		pyItem := self gemStoneToPython: (anArray at: i) map: aMap.
		pyTuple tupleAt: i - 1 putBorrowed: pyItem.
	].
	^ pyTuple
%
category: 'Private'
method: PythonReplicator
pythonScalarToGemStone: aCPythonObject typeName: typeName ifNotScalar: aBlock

	typeName = 'NoneType' ifTrue: [ ^ NoneType ___instance___ ].
	typeName = 'bool' ifTrue: [ ^ aCPythonObject asBool ].
	typeName = 'int' ifTrue: [ ^ aCPythonObject asInteger ].
	typeName = 'float' ifTrue: [ ^ aCPythonObject asFloat ].
	typeName = 'str' ifTrue: [ ^ aCPythonObject asString ].
	^ aBlock value
%
category: 'Python to GemStone'
method: PythonReplicator
pythonToGemStone: aCPythonObject

	^ self pythonToGemStone: aCPythonObject map: Dictionary new " Python address -> GemStone object "
%
category: 'Python to GemStone'
method: PythonReplicator
pythonToGemStone: aCPythonObject map: gsObjectsByPyAddress

	| address typeName |
	address := aCPythonObject pointer memoryAddress.
	gsObjectsByPyAddress at: address ifPresent: [ :gsObj | ^ gsObj ].
	typeName := aCPythonObject typeName.

	typeName = 'dict' ifTrue: [
		^ self pythonToGemStoneDict: aCPythonObject map: gsObjectsByPyAddress
	].
	typeName = 'list' ifTrue: [
		^ self pythonToGemStoneList: aCPythonObject map: gsObjectsByPyAddress
	].
	typeName = 'tuple' ifTrue: [
		^ self pythonToGemStoneTuple: aCPythonObject map: gsObjectsByPyAddress
	].

	^ gsObjectsByPyAddress at: address put:
		(self pythonScalarToGemStone: aCPythonObject typeName: typeName
			ifNotScalar: [ PythonReplicator forwarderFor: aCPythonObject ])
%
category: 'Private'
method: PythonReplicator
pythonToGemStoneDict: aCPythonObject map: aMap

	| address gsDict pyKeys |
	address := aCPythonObject pointer memoryAddress.
	gsDict := KeyValueDictionary new.
	aMap at: address put: gsDict.
	pyKeys := aCPythonObject dictKeys.
	[
		0 to: pyKeys listSize - 1 do: [ :i |
			| pyKey pyValue gsKey gsValue |
			pyKey := pyKeys listAt: i.
			[
				gsKey := self pythonToGemStone: pyKey map: aMap.
				pyValue := aCPythonObject dictAtObject: pyKey.
				[ gsValue := self pythonToGemStone: pyValue map: aMap.
				  gsDict at: gsKey put: gsValue.
				] ensure: [ pyValue release ].
			] ensure: [ pyKey release ].
		].
	] ensure: [ pyKeys release ].
	^ gsDict
%
category: 'Private'
method: PythonReplicator
pythonToGemStoneList: aCPythonObject map: aMap

	| address gsList size |
	address := aCPythonObject pointer memoryAddress.
	gsList := OrderedCollection new.
	aMap at: address put: gsList.
	size := aCPythonObject listSize.
	0 to: size - 1 do: [ :i |
		| pyItem |
		pyItem := aCPythonObject listAt: i.
		[ gsList add: (self pythonToGemStone: pyItem map: aMap) ] ensure: [ pyItem release ].
	].
	^ gsList
%
category: 'Private'
method: PythonReplicator
pythonToGemStoneTuple: aCPythonObject map: aMap

	| address size gsArray |
	address := aCPythonObject pointer memoryAddress.
	size := aCPythonObject tupleSize.
	gsArray := Array new: size.
	aMap at: address put: gsArray.
	0 to: size - 1 do: [ :i |
		| pyItem |
		pyItem := aCPythonObject tupleAt: i.
		[ gsArray at: i + 1 put: (self pythonToGemStone: pyItem map: aMap) ] ensure: [ pyItem release ].
	].
	^ gsArray
%
