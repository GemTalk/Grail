Extension { #name : 'Hash' }

{ #category : 'Grail-Instance Creation' }
Hash class >> algo: algoSym data: someBytes [
	"Construct a fresh Hash for ``algoSym``, optionally pre-seeded
	with ``someBytes`` (or nil for empty)."

	| h |
	h := self @env0:new.
	h @env0:_initAlgo: algoSym data: someBytes.
	^ h

]

{ #category : 'Grail-Hash Protocol' }
Hash >> _update: positional kw: kwargs [
	"Varargs forwarder so ``___pyAttrLoad___`` detects ``update`` as a
	callable forwarder (presence of ``_<name>:kw:``) rather than the
	synthesized-instVar pattern (presence of ``<name>:`` paired with
	unary ``<name>`` getter)."

	^ self update: (positional @env0:at: 1)

]

{ #category : 'Grail-Hash Protocol' }
Hash >> block_size [
	"Internal block size in bytes (matters for HMAC keys)."

	(self @env0:dynamicInstVarAt: #algo) == #md5 ifTrue: [^ 64].
	(self @env0:dynamicInstVarAt: #algo) == #sha1 ifTrue: [^ 64].
	(self @env0:dynamicInstVarAt: #algo) == #sha256 ifTrue: [^ 64].
	(self @env0:dynamicInstVarAt: #algo) == #sha512 ifTrue: [^ 128].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_224 ifTrue: [^ 144].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_256 ifTrue: [^ 136].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_384 ifTrue: [^ 104].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_512 ifTrue: [^ 72].
	^ 0

]

{ #category : 'Grail-Hash Protocol' }
Hash >> copy [
	"Return an independent clone of this Hash."

	| h |
	h := Hash @env0:new.
	h @env0:_initAlgo: (self @env0:dynamicInstVarAt: #algo) data: nil.
	"Copy buffer manually so the clone has its own ByteArray.  Use
	``@env1:update:`` so dispatch finds the env-1 method (env-0 has
	no ``update:`` on Hash)."
	((self @env0:dynamicInstVarAt: #buffer) @env0:size @env0:> 0) ifTrue: [
		h update: ((self @env0:dynamicInstVarAt: #buffer) @env0:copyFrom: 1 to: (self @env0:dynamicInstVarAt: #buffer) @env0:size)
	].
	^ h

]

{ #category : 'Grail-Hash Protocol' }
Hash >> digest [
	"Return the digest as a bytes object."

	^ self @env0:_digestBytes

]

{ #category : 'Grail-Hash Protocol' }
Hash >> digest_size [
	"Output size of ``digest()`` in bytes."

	(self @env0:dynamicInstVarAt: #algo) == #md5 ifTrue: [^ 16].
	(self @env0:dynamicInstVarAt: #algo) == #sha1 ifTrue: [^ 20].
	(self @env0:dynamicInstVarAt: #algo) == #sha256 ifTrue: [^ 32].
	(self @env0:dynamicInstVarAt: #algo) == #sha512 ifTrue: [^ 64].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_224 ifTrue: [^ 28].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_256 ifTrue: [^ 32].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_384 ifTrue: [^ 48].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_512 ifTrue: [^ 64].
	^ 0

]

{ #category : 'Grail-Hash Protocol' }
Hash >> hexdigest [
	"Return the digest as a lowercase hex string."

	| bytes hex tbl b |
	bytes := self @env0:_digestBytes.
	tbl := '0123456789abcdef'.
	hex := Unicode7 @env0:new: bytes @env0:size @env0:* 2.
	1 @env0:to: bytes @env0:size do: [:i |
		b := bytes @env0:at: i.
		hex @env0:at: i @env0:* 2 @env0:- 1
			put: (tbl @env0:at: (b @env0:bitShift: -4) @env0:+ 1).
		hex @env0:at: i @env0:* 2
			put: (tbl @env0:at: (b @env0:bitAnd: 15) @env0:+ 1)
	].
	^ hex

]

{ #category : 'Grail-Hash Protocol' }
Hash >> name [
	"Return the algorithm name (lowercase string, matching CPython)."

	^ (self @env0:dynamicInstVarAt: #algo) @env0:asString

]

{ #category : 'Grail-Hash Protocol' }
Hash >> update: data [
	"Append ``data`` (bytes / str / bytearray) to the buffer."

	data ifNil: [^ None].
	(data isKindOf: ByteArray) ifTrue: [
		self @env0:dynamicInstVarAt: #buffer put: ((self @env0:dynamicInstVarAt: #buffer) @env0:, data)
	] ifFalse: [
		self @env0:dynamicInstVarAt: #buffer put: ((self @env0:dynamicInstVarAt: #buffer) @env0:, data @env0:asByteArray)
	].
	^ None

]
