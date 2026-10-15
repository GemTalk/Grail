Class {
	#name : 'PyDictCollisionBucket',
	#superclass : 'CollisionBucket'
}

{ #category : 'Grail-Hashing' }
PyDictCollisionBucket >> compareKey: key1 with: key2 [
	"Compare colliding keys via the owning PyDict's compareKey:with: (Python
	__eq__ for PythonInstance keys), so a custom __eq__ is honored inside a
	collision bucket -- the kernel default is Smalltalk ``=''.  Falls back to
	``='' if the owning dict is somehow unset."

	keyValueDictionary ifNil: [^ key1 = key2].
	^ keyValueDictionary compareKey: key1 with: key2

]
