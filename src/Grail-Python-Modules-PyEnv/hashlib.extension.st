Extension { #name : 'hashlib' }

{ #category : 'Grail-Constructors' }
hashlib >> ___hashFor___: algo positional: positional kw: kwargs from: fnName [
	"The keyword half of every constructor: CPython's
	``(data=b'', *, usedforsecurity=True, string=None)''.  The positional
	arities above never saw a keyword, so ``hashlib.new('md5',
	usedforsecurity=True)'' -- what test.support.hashlib_helper asks before
	running a digest-auth test -- was a TypeError.  usedforsecurity is
	accepted and ignored: every algorithm here is always available.  string=
	is data's other name, and giving both is CPython's TypeError."

	| data string |
	positional @env0:size @env0:> 1 ifTrue: [
		^ TypeError ___signal___: (fnName @env0:, '() takes at most 1 positional argument (' @env0:,
			positional @env0:size @env0:printString @env0:, ' given)')].
	data := positional @env0:size @env0:= 1 ifTrue: [positional @env0:at: 1] ifFalse: [nil].
	string := nil.
	(kwargs == nil @env0:or: [kwargs == None]) ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			(key @env0:= 'data')
				ifTrue: [data == nil ifFalse: [
						^ TypeError ___signal___: ('argument for ' @env0:, fnName @env0:,
							'() given by name (''data'') and position ('
							@env0:, ((fnName @env0:= 'new') ifTrue: ['2'] ifFalse: ['1']) @env0:, ')')].
					data := v]
				ifFalse: [(key @env0:= 'string')
					ifTrue: [string := v]
					ifFalse: [(key @env0:= 'usedforsecurity') ifFalse: [
						^ TypeError ___signal___: (fnName @env0:, '() got an unexpected keyword argument '''
							@env0:, key @env0:, '''')]]]]].
	(string == nil @env0:or: [string == None]) ifFalse: [
		(data == nil @env0:or: [data == None]) ifFalse: [
			^ TypeError ___signal___: '''data'' and ''string'' are mutually exclusive and support for ''string'' keyword parameter is slated for removal in a future version.'].
		data := string].
	data == None ifTrue: [data := nil].
	^ Hash algo: algo data: data

]

{ #category : 'Grail-Constructors' }
hashlib >> ___withoutName___: kwargs [
	| copy |
	(kwargs == nil @env0:or: [kwargs == None]) ifTrue: [^ kwargs].
	(kwargs @env0:includesKey: 'name') ifFalse: [^ kwargs].
	copy := KeyValueDictionary @env0:new.
	kwargs @env0:keysAndValuesDo: [:k :v |
		(k @env0:asString @env0:= 'name') ifFalse: [copy @env0:at: k put: v]].
	^ copy

]

{ #category : 'Grail-Constructors' }
hashlib >> _md5: positional kw: kwargs [
	^ self ___hashFor___: #md5 positional: positional kw: kwargs from: 'openssl_md5'

]

{ #category : 'Grail-Constructors' }
hashlib >> _new: positional kw: kwargs [
	"``hashlib.new(name, data=b'', *, usedforsecurity=True, string=None)''."

	| name |
	name := positional @env0:size @env0:>= 1
		ifTrue: [positional @env0:at: 1]
		ifFalse: [(kwargs == nil @env0:or: [kwargs == None])
			ifTrue: [nil]
			ifFalse: [kwargs @env0:at: 'name' ifAbsent: [nil]]].
	name == nil ifTrue: [
		^ TypeError ___signal___: 'new() missing required argument ''name'' (pos 1)'].
	^ self ___hashFor___: name @env0:asSymbol
		positional: (positional @env0:size @env0:>= 1
			ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
			ifFalse: [#()])
		kw: (self ___withoutName___: kwargs)
		from: 'new'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha1: positional kw: kwargs [
	^ self ___hashFor___: #sha1 positional: positional kw: kwargs from: 'openssl_sha1'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha224: positional kw: kwargs [
	^ self ___hashFor___: #sha224 positional: positional kw: kwargs from: 'openssl_sha224'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha256: positional kw: kwargs [
	^ self ___hashFor___: #sha256 positional: positional kw: kwargs from: 'openssl_sha256'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha3_224: positional kw: kwargs [
	^ self ___hashFor___: #sha3_224 positional: positional kw: kwargs from: 'openssl_sha3_224'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha3_256: positional kw: kwargs [
	^ self ___hashFor___: #sha3_256 positional: positional kw: kwargs from: 'openssl_sha3_256'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha3_384: positional kw: kwargs [
	^ self ___hashFor___: #sha3_384 positional: positional kw: kwargs from: 'openssl_sha3_384'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha3_512: positional kw: kwargs [
	^ self ___hashFor___: #sha3_512 positional: positional kw: kwargs from: 'openssl_sha3_512'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha384: positional kw: kwargs [
	^ self ___hashFor___: #sha384 positional: positional kw: kwargs from: 'openssl_sha384'

]

{ #category : 'Grail-Constructors' }
hashlib >> _sha512: positional kw: kwargs [
	^ self ___hashFor___: #sha512 positional: positional kw: kwargs from: 'openssl_sha512'

]

{ #category : 'Grail-Module accessors' }
hashlib >> algorithms_available [
	^ self @env0:at: #algorithms_available

]

{ #category : 'Grail-Module accessors' }
hashlib >> algorithms_guaranteed [
	^ self @env0:at: #algorithms_guaranteed

]

{ #category : 'Grail-Initialization' }
hashlib >> initialize [
	| names |
	names := #(#md5 #sha1 #sha224 #sha256 #sha384 #sha512 #sha3_224 #sha3_256 #sha3_384 #sha3_512).
	self @env0:at: #algorithms_guaranteed put: names @env0:asSet.
	self @env0:at: #algorithms_available put: names @env0:asSet.

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> md5 [
	^ Hash algo: #md5 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> md5: data [
	^ Hash algo: #md5 data: data

]

{ #category : 'Grail-Constructors' }
hashlib >> new: name [
	"Generic constructor: ``hashlib.new('sha256')``."

	^ Hash algo: name @env0:asSymbol data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> new: name _: data [
	"``hashlib.new('sha256', b'abc')`` — name + initial data."

	^ Hash algo: name @env0:asSymbol data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha1 [
	^ Hash algo: #sha1 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha1: data [
	^ Hash algo: #sha1 data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha224 [
	^ Hash algo: #sha224 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha224: data [
	^ Hash algo: #sha224 data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha256 [
	^ Hash algo: #sha256 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha256: data [
	^ Hash algo: #sha256 data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha3_224 [
	^ Hash algo: #sha3_224 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha3_224: data [
	^ Hash algo: #sha3_224 data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha3_256 [
	^ Hash algo: #sha3_256 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha3_256: data [
	^ Hash algo: #sha3_256 data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha3_384 [
	^ Hash algo: #sha3_384 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha3_384: data [
	^ Hash algo: #sha3_384 data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha3_512 [
	^ Hash algo: #sha3_512 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha3_512: data [
	^ Hash algo: #sha3_512 data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha384 [
	^ Hash algo: #sha384 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha384: data [
	^ Hash algo: #sha384 data: data

]

{ #category : 'Grail-Built-in Functions' }
hashlib >> sha512 [
	^ Hash algo: #sha512 data: nil

]

{ #category : 'Grail-Constructors' }
hashlib >> sha512: data [
	^ Hash algo: #sha512 data: data

]
