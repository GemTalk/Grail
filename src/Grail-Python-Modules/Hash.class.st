"A single hash object covering all algorithms via the ``algo``
instVar.  Constructed by the ``hashlib.md5`` / ``sha1`` / ``sha256``
etc. factory functions on the hashlib module.

``buffer`` accumulates the input data; ``digest`` / ``hexdigest``
re-hash the whole buffer on each call (CPython streams updates into
a stateful context; Grail re-hashes — fine for the small inputs
itsdangerous / Flask see; revisit if hot-path streaming hashes show
up)."
Class {
	#name : 'Hash',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
Hash class >> ___pythonValueAttrs___ [
	"Selectors that ___pyAttrLoad___ should treat as *value* reads
	(invoke the unary accessor and return the result) rather than
	BoundMethod wraps.  Python introspection (``h.block_size`` for
	HMAC padding) wants the int back, not a callable.  ENV-0 so
	the env-0 ``respondsTo:`` probe in ``___pyAttrLoad___:`` finds it."

	^ IdentitySet new
		add: #name;
		add: #digest_size;
		add: #block_size;
		yourself

]

{ #category : 'Grail-Private' }
Hash >> _digestBytes [
	"Run the hash algorithm against the current buffer.  Returns a
	ByteArray.  Unknown algo raises ValueError."

	(self dynamicInstVarAt: #algo) == #md5 ifTrue: [^ (self dynamicInstVarAt: #buffer) md5sumBytes].
	(self dynamicInstVarAt: #algo) == #sha1 ifTrue: [^ (self dynamicInstVarAt: #buffer) sha1SumBytes].
	(self dynamicInstVarAt: #algo) == #sha256 ifTrue: [^ (self dynamicInstVarAt: #buffer) sha256SumBytes].
	(self dynamicInstVarAt: #algo) == #sha512 ifTrue: [^ (self dynamicInstVarAt: #buffer) sha512SumBytes].
	(self dynamicInstVarAt: #algo) == #sha3_224 ifTrue: [^ (self dynamicInstVarAt: #buffer) sha3_224SumBytes].
	(self dynamicInstVarAt: #algo) == #sha3_256 ifTrue: [^ (self dynamicInstVarAt: #buffer) sha3_256SumBytes].
	(self dynamicInstVarAt: #algo) == #sha3_384 ifTrue: [^ (self dynamicInstVarAt: #buffer) sha3_384SumBytes].
	(self dynamicInstVarAt: #algo) == #sha3_512 ifTrue: [^ (self dynamicInstVarAt: #buffer) sha3_512SumBytes].
	ValueError @env1:___signal___:
		'unsupported hash algorithm ''' , (self dynamicInstVarAt: #algo) asString , ''''

]

{ #category : 'Grail-Private' }
Hash >> _initAlgo: algoSym data: someBytes [
self dynamicInstVarAt: #algo put: algoSym.
self dynamicInstVarAt: #buffer put: ByteArray new.
	someBytes ifNotNil: [
		(someBytes isKindOf: ByteArray) ifTrue: [
			self dynamicInstVarAt: #buffer put: ((self dynamicInstVarAt: #buffer) , someBytes)
		] ifFalse: [
			"Treat str-shaped input as UTF-8; CPython hashes only bytes,
			so this is a permissive convenience."
			self dynamicInstVarAt: #buffer put: ((self dynamicInstVarAt: #buffer) , someBytes asByteArray)
		]
	].

]
