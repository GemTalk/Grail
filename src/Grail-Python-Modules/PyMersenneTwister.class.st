"Python ``_random.Random' -- one MT19937 generator: ``mt' is the 624-word
state (an Array of SmallIntegers, each < 2^32) and ``mti' is CPython's
``index', the number of words of the current block already used (0..624).

random.py subclasses this, ``class Random(_random.Random)', and reaches it
through super() for seed(), getstate() and setstate()."
Class {
	#name : 'PyMersenneTwister',
	#superclass : 'Object',
	#instVars : [
		'mt',
		'mti'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Mersenne Twister' }
PyMersenneTwister >> ___genrandUint32 [
	"genrand_uint32(): the next tempered 32-bit word."

	| y |
	mt == nil ifTrue: [self ___seedFrom: nil].
	mti >= 624 ifTrue: [self ___twist].
	mti := mti + 1.
	y := mt at: mti.
	y := y bitXor: (y bitShift: -11).
	y := y bitXor: ((y bitShift: 7) bitAnd: 16r9D2C5680).
	y := y bitXor: ((y bitShift: 15) bitAnd: 16rEFC60000).
	^ y bitXor: (y bitShift: -18)

]

{ #category : 'Grail-Mersenne Twister' }
PyMersenneTwister >> ___getrandbits: k [
	"getrandbits(k) for an int k >= 0: built from 32-bit words least
	significant first; a final partial word keeps its HIGH bits."

	| remaining shift result r |
	k = 0 ifTrue: [^ 0].
	k <= 32 ifTrue: [^ self ___genrandUint32 bitShift: k - 32].
	remaining := k.
	shift := 0.
	result := 0.
	[remaining > 0] whileTrue: [
		r := self ___genrandUint32.
		remaining < 32 ifTrue: [r := r bitShift: remaining - 32].
		result := result bitOr: (r bitShift: shift).
		shift := shift + 32.
		remaining := remaining - 32].
	^ result

]

{ #category : 'Grail-Mersenne Twister' }
PyMersenneTwister >> ___initByArray: key [
	"init_by_array(key, key_length).  ``i'' and ``j'' keep C's values (i is the
	C index of the word being written, so it lives at ``mt at: i + 1'')."

	| n i j prev |
	self ___initGenrand: 19650218.
	n := key size.
	i := 1.
	j := 0.
	(624 max: n) timesRepeat: [
		prev := mt at: i.
		mt at: i + 1 put: (((mt at: i + 1) bitXor: (prev bitXor: (prev bitShift: -30)) * 1664525)
			+ (key at: j + 1) + j
			bitAnd: 16rFFFFFFFF).
		i := i + 1.
		j := j + 1.
		i >= 624 ifTrue: [mt at: 1 put: (mt at: 624). i := 1].
		j >= n ifTrue: [j := 0]].
	623 timesRepeat: [
		prev := mt at: i.
		mt at: i + 1 put: (((mt at: i + 1) bitXor: (prev bitXor: (prev bitShift: -30)) * 1566083941)
			- i
			bitAnd: 16rFFFFFFFF).
		i := i + 1.
		i >= 624 ifTrue: [mt at: 1 put: (mt at: 624). i := 1]].
	"MSB is 1, assuring a non-zero initial array."
	mt at: 1 put: 16r80000000

]

{ #category : 'Grail-Mersenne Twister' }
PyMersenneTwister >> ___initGenrand: s [
	"init_genrand(s)."

	| prev |
	mt := Array new: 624.
	mt at: 1 put: (s bitAnd: 16rFFFFFFFF).
	2 to: 624 do: [:i |
		prev := mt at: i - 1.
		mt at: i put: ((1812433253 * (prev bitXor: (prev bitShift: -30))) + (i - 1)
			bitAnd: 16rFFFFFFFF)].
	mti := 624

]

{ #category : 'Grail-Mersenne Twister' }
PyMersenneTwister >> ___randbelow: m [
	"_randbelow_with_getrandbits for an int m > 0."

	| k r |
	k := m highBit.
	r := self ___getrandbits: k.
	[r >= m] whileTrue: [r := self ___getrandbits: k].
	^ r

]

{ #category : 'Grail-Mersenne Twister' }
PyMersenneTwister >> ___seedFrom: arg [
	"random_seed(self, arg).  None draws 624 words of OS entropy; an int
	seeds with its absolute value; anything else with its hash, read as
	unsigned.  The seed is cut into 32-bit words from the right, least
	significant first, and at least one word is used."

	| n h key |
	(arg == nil or: [arg == None]) ifTrue: [^ self ___seedFromEntropy].
	(arg isKindOf: Boolean)
		ifTrue: [n := arg ifTrue: [1] ifFalse: [0]]
		ifFalse: [
			(arg isKindOf: Integer)
				ifTrue: [n := arg abs]
				ifFalse: [
					(arg isKindOf: AbstractPyInt)
						ifTrue: [n := arg value abs]
						ifFalse: [
							h := arg @env1:__hash__.
							n := h < 0 ifTrue: [h + (1 bitShift: 64)] ifFalse: [h]]]].
	key := OrderedCollection new.
	[key add: (n bitAnd: 16rFFFFFFFF).
	 n := n bitShift: -32.
	 n > 0] whileTrue.
	self ___initByArray: key asArray

]

{ #category : 'Grail-Mersenne Twister' }
PyMersenneTwister >> ___seedFromEntropy [
	"random_seed_urandom(): init_by_array over 624 words from the OS CSPRNG
	(HostRandom, which secrets draws from too).  Kept per session like
	secrets' generator, because HostRandom holds an open OS resource."

	| temps gen key |
	temps := SessionTemps current.
	gen := temps at: #'___GrailRandomEntropy___' otherwise: nil.
	(gen == nil or: [(gen respondsTo: #isOpen) and: [gen isOpen not]]) ifTrue: [
		gen := HostRandom new.
		temps at: #'___GrailRandomEntropy___' put: gen].
	key := Array new: 624.
	1 to: 624 do: [:i | key at: i put: (gen integerBetween: 0 and: 16rFFFFFFFF)].
	self ___initByArray: key

]

{ #category : 'Grail-Mersenne Twister' }
PyMersenneTwister >> ___twist [
	"Generate the next 624 words (the ``mti >= N'' block of genrand_uint32)."

	| y |
	1 to: 227 do: [:k |
		y := ((mt at: k) bitAnd: 16r80000000) bitOr: ((mt at: k + 1) bitAnd: 16r7FFFFFFF).
		mt at: k put: (((mt at: k + 397) bitXor: (y bitShift: -1))
			bitXor: ((y bitAnd: 1) == 0 ifTrue: [0] ifFalse: [16r9908B0DF]))].
	228 to: 623 do: [:k |
		y := ((mt at: k) bitAnd: 16r80000000) bitOr: ((mt at: k + 1) bitAnd: 16r7FFFFFFF).
		mt at: k put: (((mt at: k - 227) bitXor: (y bitShift: -1))
			bitXor: ((y bitAnd: 1) == 0 ifTrue: [0] ifFalse: [16r9908B0DF]))].
	y := ((mt at: 624) bitAnd: 16r80000000) bitOr: ((mt at: 1) bitAnd: 16r7FFFFFFF).
	mt at: 624 put: (((mt at: 397) bitXor: (y bitShift: -1))
		bitXor: ((y bitAnd: 1) == 0 ifTrue: [0] ifFalse: [16r9908B0DF])).
	mti := 0

]
