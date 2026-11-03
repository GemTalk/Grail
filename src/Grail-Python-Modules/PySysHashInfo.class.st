"
sys.hash_info: the parameters of numeric hashing, a struct sequence (Python/sysmodule.c).
It replaces the native module sys_hash_info, which stays in place unused for PySysFlags' reason.
"
Class {
	#name : 'PySysHashInfo',
	#superclass : 'PyStructSequence',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Fields' }
PySysHashInfo class >> ___sequenceNames___ [
	^ #(#'width' #'modulus' #'inf' #'nan' #'imag' #'algorithm' #'hash_bits' #'seed_bits' #'cutoff')

]

{ #category : 'Grail-Fields' }
PySysHashInfo class >> ___sysInstance___ [
	"CPython 64-bit's numeric-hash parameters: fractions.py reads modulus and inf
	at import.  Grail's own hash need not match them; the published constants
	are interface, not implementation."

	^ self ___sequence___: { 64. 2305843009213693951. 314159. 0. 1000003. 'siphash13'. 64. 128. 0 } named: nil

]

{ #category : 'Grail-Fields' }
PySysHashInfo class >> ___typeName___ [
	^ 'sys.hash_info'

]
