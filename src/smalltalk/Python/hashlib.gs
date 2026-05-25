! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
PythonInstance ifNil: [self error: 'PythonInstance is not defined.  Check file ordering.'].
%

! ------- Hash class definition (PythonInstance subclass)
expectvalue /Class
doit
PythonInstance subclass: 'Hash'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
Hash comment:
'A single hash object covering all algorithms via the ``algo``
instVar.  Constructed by the ``hashlib.md5`` / ``sha1`` / ``sha256``
etc. factory functions on the hashlib module.

``buffer`` accumulates the input data; ``digest`` / ``hexdigest``
re-hash the whole buffer on each call (CPython streams updates into
a stateful context; Grail re-hashes — fine for the small inputs
itsdangerous / Flask see; revisit if hot-path streaming hashes show
up).'
%

expectvalue /Class
doit
Hash category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
Hash removeAllMethods: 0.
Hash removeAllMethods: 1.
Hash class removeAllMethods: 0.
Hash class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Introspection'
classmethod: Hash
___pythonValueAttrs___
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
%

category: 'Grail-Private'
method: Hash
_initAlgo: algoSym data: someBytes
self @env0:dynamicInstVarAt: #algo put: algoSym.
self @env0:dynamicInstVarAt: #buffer put: ByteArray @env0:new.
	someBytes ifNotNil: [
		(someBytes @env0:isKindOf: ByteArray) ifTrue: [
			self @env0:dynamicInstVarAt: #buffer put: ((self @env0:dynamicInstVarAt: #buffer) @env0:, someBytes)
		] ifFalse: [
			"Treat str-shaped input as UTF-8; CPython hashes only bytes,
			so this is a permissive convenience."
			self @env0:dynamicInstVarAt: #buffer put: ((self @env0:dynamicInstVarAt: #buffer) @env0:, someBytes @env0:asByteArray)
		]
	].
%

category: 'Grail-Private'
method: Hash
_digestBytes
	"Run the hash algorithm against the current buffer.  Returns a
	ByteArray.  Unknown algo raises ValueError."

	(self @env0:dynamicInstVarAt: #algo) == #md5 ifTrue: [^ (self @env0:dynamicInstVarAt: #buffer) @env0:md5sumBytes].
	(self @env0:dynamicInstVarAt: #algo) == #sha1 ifTrue: [^ (self @env0:dynamicInstVarAt: #buffer) @env0:sha1SumBytes].
	(self @env0:dynamicInstVarAt: #algo) == #sha256 ifTrue: [^ (self @env0:dynamicInstVarAt: #buffer) @env0:sha256SumBytes].
	(self @env0:dynamicInstVarAt: #algo) == #sha512 ifTrue: [^ (self @env0:dynamicInstVarAt: #buffer) @env0:sha512SumBytes].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_224 ifTrue: [^ (self @env0:dynamicInstVarAt: #buffer) @env0:sha3_224SumBytes].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_256 ifTrue: [^ (self @env0:dynamicInstVarAt: #buffer) @env0:sha3_256SumBytes].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_384 ifTrue: [^ (self @env0:dynamicInstVarAt: #buffer) @env0:sha3_384SumBytes].
	(self @env0:dynamicInstVarAt: #algo) == #sha3_512 ifTrue: [^ (self @env0:dynamicInstVarAt: #buffer) @env0:sha3_512SumBytes].
	ValueError @env1:___signal___:
		'unsupported hash algorithm ''' @env0:, (self @env0:dynamicInstVarAt: #algo) @env0:asString @env0:, ''''
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: Hash
algo: algoSym data: someBytes
	"Construct a fresh Hash for ``algoSym``, optionally pre-seeded
	with ``someBytes`` (or nil for empty)."

	| h |
	h := self @env0:new.
	h @env0:_initAlgo: algoSym data: someBytes.
	^ h
%

category: 'Grail-Hash Protocol'
method: Hash
name
	"Return the algorithm name (lowercase string, matching CPython)."

	^ (self @env0:dynamicInstVarAt: #algo) @env0:asString
%

category: 'Grail-Hash Protocol'
method: Hash
digest_size
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
%

category: 'Grail-Hash Protocol'
method: Hash
block_size
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
%

category: 'Grail-Hash Protocol'
method: Hash
update: data
	"Append ``data`` (bytes / str / bytearray) to the buffer."

	data ifNil: [^ None].
	(data @env0:isKindOf: ByteArray) ifTrue: [
		self @env0:dynamicInstVarAt: #buffer put: ((self @env0:dynamicInstVarAt: #buffer) @env0:, data)
	] ifFalse: [
		self @env0:dynamicInstVarAt: #buffer put: ((self @env0:dynamicInstVarAt: #buffer) @env0:, data @env0:asByteArray)
	].
	^ None
%

category: 'Grail-Hash Protocol'
method: Hash
_update: positional kw: kwargs
	"Varargs forwarder so ``___pyAttrLoad___`` detects ``update`` as a
	callable forwarder (presence of ``_<name>:kw:``) rather than the
	synthesized-instVar pattern (presence of ``<name>:`` paired with
	unary ``<name>`` getter)."

	^ self @env1:update: (positional @env0:at: 1)
%

category: 'Grail-Hash Protocol'
method: Hash
digest
	"Return the digest as a bytes object."

	^ self @env0:_digestBytes
%

category: 'Grail-Hash Protocol'
method: Hash
hexdigest
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
%

category: 'Grail-Hash Protocol'
method: Hash
copy
	"Return an independent clone of this Hash."

	| h |
	h := Hash @env0:new.
	h @env0:_initAlgo: (self @env0:dynamicInstVarAt: #algo) data: nil.
	"Copy buffer manually so the clone has its own ByteArray.  Use
	``@env1:update:`` so dispatch finds the env-1 method (env-0 has
	no ``update:`` on Hash)."
	((self @env0:dynamicInstVarAt: #buffer) @env0:size @env0:> 0) ifTrue: [
		h @env1:update: ((self @env0:dynamicInstVarAt: #buffer) @env0:copyFrom: 1 to: (self @env0:dynamicInstVarAt: #buffer) @env0:size)
	].
	^ h
%

set compile_env: 0

! ------- hashlib module class
expectvalue /Class
doit
module subclass: 'hashlib'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
hashlib comment:
'Python hashlib module — secure hash and message digest algorithms.

Implementation note: each algorithm function (``md5``, ``sha1``,
``sha256``, etc.) returns a ``Hash`` instance.  Output sizes and
block sizes match CPython.  Algorithms backed directly by
GemStone''s built-in ``ByteArray >> *sumBytes`` primitives — no
external dependencies.'
%

expectvalue /Class
doit
hashlib category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
hashlib removeAllMethods: 0.
hashlib removeAllMethods: 1.
hashlib class removeAllMethods: 0.
hashlib class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: hashlib
initialize
	| names |
	names := #(#md5 #sha1 #sha256 #sha512 #sha3_224 #sha3_256 #sha3_384 #sha3_512).
	self @env0:at: #algorithms_guaranteed put: names @env0:asSet.
	self @env0:at: #algorithms_available put: names @env0:asSet.
%

category: 'Grail-Module accessors'
method: hashlib
algorithms_guaranteed
	^ self @env0:at: #algorithms_guaranteed
%

category: 'Grail-Module accessors'
method: hashlib
algorithms_available
	^ self @env0:at: #algorithms_available
%

category: 'Grail-Constructors'
method: hashlib
new: name
	"Generic constructor: ``hashlib.new('sha256')``."

	^ Hash @env1:algo: name @env0:asSymbol data: nil
%

category: 'Grail-Constructors'
method: hashlib
new: name _: data
	"``hashlib.new('sha256', b'abc')`` — name + initial data."

	^ Hash @env1:algo: name @env0:asSymbol data: data
%

category: 'Grail-Constructors'
method: hashlib
md5
	^ Hash @env1:algo: #md5 data: nil
%

category: 'Grail-Constructors'
method: hashlib
md5: data
	^ Hash @env1:algo: #md5 data: data
%

category: 'Grail-Constructors'
method: hashlib
sha1
	^ Hash @env1:algo: #sha1 data: nil
%

category: 'Grail-Constructors'
method: hashlib
sha1: data
	^ Hash @env1:algo: #sha1 data: data
%

category: 'Grail-Constructors'
method: hashlib
sha256
	^ Hash @env1:algo: #sha256 data: nil
%

category: 'Grail-Constructors'
method: hashlib
sha256: data
	^ Hash @env1:algo: #sha256 data: data
%

category: 'Grail-Constructors'
method: hashlib
sha512
	^ Hash @env1:algo: #sha512 data: nil
%

category: 'Grail-Constructors'
method: hashlib
sha512: data
	^ Hash @env1:algo: #sha512 data: data
%

category: 'Grail-Constructors'
method: hashlib
sha3_224
	^ Hash @env1:algo: #sha3_224 data: nil
%

category: 'Grail-Constructors'
method: hashlib
sha3_224: data
	^ Hash @env1:algo: #sha3_224 data: data
%

category: 'Grail-Constructors'
method: hashlib
sha3_256
	^ Hash @env1:algo: #sha3_256 data: nil
%

category: 'Grail-Constructors'
method: hashlib
sha3_256: data
	^ Hash @env1:algo: #sha3_256 data: data
%

category: 'Grail-Constructors'
method: hashlib
sha3_384
	^ Hash @env1:algo: #sha3_384 data: nil
%

category: 'Grail-Constructors'
method: hashlib
sha3_384: data
	^ Hash @env1:algo: #sha3_384 data: data
%

category: 'Grail-Constructors'
method: hashlib
sha3_512
	^ Hash @env1:algo: #sha3_512 data: nil
%

category: 'Grail-Constructors'
method: hashlib
sha3_512: data
	^ Hash @env1:algo: #sha3_512 data: data
%

set compile_env: 0
