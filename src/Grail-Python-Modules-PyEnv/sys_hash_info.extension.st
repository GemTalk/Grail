Extension { #name : 'sys_hash_info' }

{ #category : 'Grail-Initialization' }
sys_hash_info >> initialize [
	"CPython's 64-bit numeric-hash parameters.  fractions.py reads
	.modulus/.inf at import; Grail's own hash need not match these,
	but the published constants do (they are interface, not
	implementation, for consumers like Fraction.__hash__)."

	self @env0:dynamicInstVarAt: #width put: 64.
	self @env0:dynamicInstVarAt: #modulus put: 2305843009213693951.
	self @env0:dynamicInstVarAt: #inf put: 314159.
	self @env0:dynamicInstVarAt: #nan put: 0.
	self @env0:dynamicInstVarAt: #imag put: 1000003.
	self @env0:dynamicInstVarAt: #algorithm put: 'siphash13'.
	self @env0:dynamicInstVarAt: #hash_bits put: 64.
	self @env0:dynamicInstVarAt: #seed_bits put: 128.
	self @env0:dynamicInstVarAt: #cutoff put: 0

]
