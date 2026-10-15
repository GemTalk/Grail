"Grail reverse proxy for a foreign C PyObject* owned by a prebuilt CPython
extension (e.g. a numpy DType).  Holds the raw pointer (cPtr) and the name
its Python __name__ reports (typeName).  Created by
CPythonShim>>foreignProxyForPointer:typeName:."
Class {
	#name : 'ShimForeignObject',
	#superclass : 'Object',
	#instVars : [
		'cPtr',
		'typeName',
		'view',
		'compareHash',
		'arrayDispatch'
	]
}

{ #category : 'Grail-Private' }
ShimForeignObject >> ___compareHashBits [
	^ compareHash

]

{ #category : 'Grail-Private' }
ShimForeignObject >> ___compareHashBits: anInteger [
	"What the object's C type does for == and hash: 1 = tp_richcompare,
	2 = tp_hash, 4 = unhashable.  Set by the shim as the object first
	crosses; nil (a proxy built by hand) means ask C every time."

	compareHash := anInteger

]

{ #category : 'Grail-Private' }
ShimForeignObject >> cPtr [
	"The raw foreign C PyObject* address (an Integer)."

	^ cPtr

]

{ #category : 'Grail-Private' }
ShimForeignObject >> lastDotIndex [
	"Index of the last '.' in typeName, or 0 if none/empty.  Plain env-0
	Smalltalk so it is safe to call from the env-1 attribute path."

	| pos |
	(typeName == nil or: [typeName isEmpty]) ifTrue: [^ 0].
	pos := 0.
	1 to: typeName size do: [:i | (typeName at: i) = $. ifTrue: [pos := i]].
	^ pos

]

{ #category : 'Grail-Private' }
ShimForeignObject >> moduleName [
	"The module prefix of typeName (before the last '.'), or '' if none."

	| pos |
	pos := self lastDotIndex.
	pos <= 1 ifTrue: [^ ''].
	^ typeName copyFrom: 1 to: pos - 1

]

{ #category : 'Grail-Printing' }
ShimForeignObject >> printOn: aStream [
	aStream nextPutAll: '<ShimForeignObject '; nextPutAll: (typeName ifNil: ['?']);
		nextPutAll: ' @0x'; nextPutAll: (cPtr ifNil: [0]) asString; nextPut: $>

]

{ #category : 'Grail-Private' }
ShimForeignObject >> pyObjectView [
	"A CByteArray whose memoryAddress IS the foreign PyObject* — so that
	CPythonShim>>wrap: round-trips this proxy straight back to the original
	C object (e.g. numpy must see its own DType pointer again, not a Grail
	wrapper).  Non-owning view: it must never free numpy's memory.  Cached
	so a hot crossing path does not re-allocate."

	view ifNil: [
		view := CByteArray fromCPointer: (CPointer forAddress: cPtr) numBytes: 32 ].
	^ view

]

{ #category : 'Grail-Private' }
ShimForeignObject >> setCPtr: anInteger typeName: aString [
	"Initialize the proxy with the foreign pointer and its reported name."

	cPtr := anInteger.
	typeName := aString.
	^ self

]

{ #category : 'Grail-Private' }
ShimForeignObject >> typeName [
	"The (possibly dotted) C tp_name captured when the proxy was created."

	^ typeName

]

{ #category : 'Grail-Private' }
ShimForeignObject >> unqualifiedName [
	"typeName with any module prefix stripped (CPython type.__name__)."

	| pos |
	(typeName == nil or: [typeName isEmpty]) ifTrue: [^ ''].
	pos := self lastDotIndex.
	pos = 0 ifTrue: [^ typeName].
	^ typeName copyFrom: pos + 1 to: typeName size

]
