Extension { #name : 'Symbol' }

{ #category : 'Grail-Interning' }
Symbol >> ___pyInterned___ [
	"The session's CANONICAL str for this name: the same object every time, and
	the one sys.intern answers for an equal string.

	A namespace stores its string keys as Symbols and hands them to Python as
	strs, and each hand-over used to be a fresh ``asString''.  So two reads of
	one key were never ``is''-identical, and neither was a key pickle interned
	on load (test_pickle's test_attribute_name_interning) -- where CPython's
	attribute names are interned strings that ``is'' compares equal."

	^ self ___pyInternedAs___: self asString

]

{ #category : 'Grail-Interning' }
Symbol >> ___pyInternedAs___: aString [
	"The canonical str for this Symbol, recording aString as it when there is
	none yet.  CPython's sys.intern answers its argument itself the first time,
	so aString is stored, not a copy.

	SESSION-LOCAL, like every other Grail cache of transient Python objects:
	the strings are session objects, and a persistent table would pin every
	name ever interned."

	| temps table |
	temps := SessionTemps current.
	table := temps at: #'___GrailInternedStrings___' otherwise: nil.
	table == nil ifTrue: [
		table := IdentityKeyValueDictionary new.
		temps at: #'___GrailInternedStrings___' put: table].
	^ table at: self ifAbsent: [table at: self put: aString]

]
