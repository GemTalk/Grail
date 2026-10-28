Class {
	#name : 'UnicodeDecodeError',
	#superclass : 'UnicodeError',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Access' }
UnicodeDecodeError >> ___normalizedObject___: anObject [
	"The object as bytes, whatever buffer it was given as: UnicodeDecodeError_init
	copies a bytearray or memoryview into bytes (Objects/exceptions.c), so
	``.object'' is always bytes (test_exceptions testAttributes)."

	(anObject isKindOf: bytearray) ifTrue: [^ ByteArray withAll: anObject].
	(anObject isKindOf: memoryview) ifTrue: [^ anObject @env1:tobytes].
	^ anObject

]
