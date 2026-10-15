"The dict behind ``sys.modules''.  A PyDict whose keys are always genuine
Python ``str'' (Unicode7), so ``type(k) is str'' and str methods that COPY --
``k.replace(...)'' -- work on them; a Symbol key, the previous representation,
is invariant and killed the session there.  Symbol probes from Smalltalk callers
are normalized on the way in, at hashFunction: (all reads) and at the order-list
mutators (all writes), so ``mods removeKey: #''re'''' keeps working."
Class {
	#name : 'PySysModules',
	#superclass : 'PyDict',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Keys' }
PySysModules >> ___normalizeKey___: aKey [
	"Answer the spelling this registry keys by: the class a Python string
	literal evaluates to, so that ``type(k) is str'' holds of a stored key and
	not merely ``isinstance(k, str)'' -- which is the distinction the whole fix
	turns on.

	A Symbol goes via asString because the copy is the point: the Symbol itself
	is invariant, and an invariant key is what killed ``k.replace(...)''.  A
	String is widened too: it compares and hashes alike with a Unicode7 already,
	so this changes no lookup, but ``type()'' would report ``str'' off a
	DIFFERENT class and ``type(k) is str'' would be false.

	Everything else is answered unchanged -- Unicode7/16/32 are already str, and
	returning them untouched keeps the hot lookup path allocation-free; a
	non-string key (a meta-path finder may store one, and CPython allows it) is
	none of our business."

	(aKey isKindOf: Symbol) ifTrue: [^ aKey asString asUnicodeString].
	aKey class == String ifTrue: [^ aKey asUnicodeString].
	^ aKey

]

{ #category : 'Grail-Mutation' }
PySysModules >> add: anAssociation [
	"Re-associate under the normalized key rather than storing the caller's
	association, whose key is fixed at creation."

	| k |
	k := self ___normalizeKey___: anAssociation key.
	k == anAssociation key ifTrue: [^ super add: anAssociation].
	self at: k put: anAssociation value.
	^ anAssociation

]

{ #category : 'Grail-Mutation' }
PySysModules >> at: aKey put: aValue [
	^ super at: (self ___normalizeKey___: aKey) put: aValue

]

{ #category : 'Grail-Hashing' }
PySysModules >> hashFunction: aKey [
	"Bucket by the NORMALIZED key, so a Symbol probe lands in the same bucket
	as the str it names.  Every read the kernel dictionary does -- at:,
	at:ifAbsent:, at:otherwise:, includesKey:, associationAt:, removeKey: --
	goes through here, which is why this single override makes them all
	Symbol-tolerant.  PyDict's compareKey:with: settles the bucket by Python
	__eq__, and str/Symbol are __eq__ in both directions already."

	^ super hashFunction: (self ___normalizeKey___: aKey)

]

{ #category : 'Grail-Mutation' }
PySysModules >> removeAllKeys: aCollection [
	^ super removeAllKeys: (aCollection collect: [:k | self ___normalizeKey___: k])

]

{ #category : 'Grail-Mutation' }
PySysModules >> removeKey: aKey [
	"Normalize BEFORE super: PyDict>>removeKey: drops the key from its
	insertion-order list with Smalltalk ``='', which a Symbol does not
	satisfy against the stored str -- the entry would leave the table and
	stay in ``order''."

	^ super removeKey: (self ___normalizeKey___: aKey)

]

{ #category : 'Grail-Mutation' }
PySysModules >> removeKey: aKey ifAbsent: aBlock [
	^ super removeKey: (self ___normalizeKey___: aKey) ifAbsent: aBlock

]
