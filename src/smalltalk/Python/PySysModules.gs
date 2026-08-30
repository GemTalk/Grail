! ------------------- Superclass check
run
PyDict ifNil: [self error: 'PyDict is not defined. Check file ordering.'].
%

! ===============================================================================
! PySysModules -- the dict behind ``sys.modules''.
! ===============================================================================
!
! WHY THIS CLASS EXISTS.  ``sys.modules'' used to be a SymbolDictionary, so its
! keys were GemStone Symbols.  A Symbol satisfies ``isinstance(k, str)'' -- which
! is what made it dangerous, because ordinary defensive Python code checks
! exactly that and then proceeds:
!
!     for mod in list(sys.modules):
!         sys.modules[mod.replace(target, 'chardet')] = sys.modules[mod]
!
! That loop is ``requests/packages.py'', and it is what blocked ``import
! kaggle''.  ``Symbol >> replace:_:'' ends in ``copyReplaceAll:with:'', and a
! Symbol is INVARIANT, so it died with ``Attempt to modify invariant object'' --
! an uncatchable Smalltalk error that ``except BaseException'' cannot see and
! that takes the process with it.  ``type(k).__name__'' also read ``Symbol''
! where CPython says ``str''.
!
! The fix is CPython fidelity at the source: sys.modules keys are GENUINE
! ``str'' (Unicode7 -- what a Python string literal evaluates to, so
! ``type(k) is str'' holds, not merely isinstance).  Being a PyDict rather than
! a SymbolDictionary also brings sys.modules two other CPython properties for
! free: insertion order (CPython 3.7+) and ``type(sys.modules).__name__ ==
! 'dict''' (Object >> ___pythonBuiltinTypeName___ maps this class to ``dict'',
! alongside PyDict / PyInstanceDict / PyModuleDict).
!
! WHY A SUBCLASS RATHER THAN A PLAIN PyDict.  A hundred-odd Smalltalk callers --
! Grail's own module machinery and, overwhelmingly, test-case tearDowns
! (``mods removeKey: #'enum_nested_class' ifAbsent: []'') -- probe this registry
! with SYMBOL keys, and Symbols are NOT interchangeable with strings here:
!
!     'abc' = #abc              -> false   (Symbol compares by identity)
!     'abc' hash = #abc hash    -> false
!     #abc @env1:__hash__       -> the identity hash, not the str hash
!
! so a plain PyDict would silently MISS every one of those probes -- a miss that
! reads as ``module not loaded'' and re-imports rather than as an error.  (A
! String and a Unicode7 of the same characters DO compare and hash alike, so
! only Symbols need the treatment.)
!
! This class therefore normalizes at two choke points and nowhere else:
!
!   * ``hashFunction:'' -- every READ path (at:, at:ifAbsent:, at:otherwise:,
!     includesKey:, associationAt:, and the whole Python protocol built on them:
!     d[k], k in d, .get/.pop/.setdefault) buckets through it, so normalizing
!     the PROBE key here makes all of them Symbol-tolerant in one place.
!     PyDict>>compareKey:with: then matches by Python ``__eq__'', and
!     ``'abc'.__eq__(#abc)'' is already true both ways.
!
!   * the five mutators PyDict overrides for its order list (at:put:, add:,
!     removeKey:, removeKey:ifAbsent:, removeAllKeys:) -- so the key that is
!     STORED is always a str, and so that PyDict's ``order remove: aKey'', which
!     uses Smalltalk ``='', is handed the same spelling the list holds.  Missing
!     that one leaves a removed key stranded in ``order'', where the next
!     keysDo: yields a key the table no longer has.
!
! Non-string keys pass through untouched: a meta-path finder may put anything in
! sys.modules, and CPython accepts any hashable key there.
! ===============================================================================

expectvalue /Class
doit
PyDict subclass: 'PySysModules'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PySysModules comment:
'The dict behind ``sys.modules''''.  A PyDict whose keys are always genuine
Python ``str'''' (Unicode7), so ``type(k) is str'''' and str methods that COPY --
``k.replace(...)'''' -- work on them; a Symbol key, the previous representation,
is invariant and killed the session there.  Symbol probes from Smalltalk callers
are normalized on the way in, at hashFunction: (all reads) and at the order-list
mutators (all writes), so ``mods removeKey: #''''re'''''''' keeps working.'
%

expectvalue /Class
doit
PySysModules category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PySysModules removeAllMethods: 0.
PySysModules removeAllMethods: 1.
PySysModules class removeAllMethods: 0.
PySysModules class removeAllMethods: 1.
%

set compile_env: 0

! ------------------- key normalization

category: 'Grail-Keys'
method: PySysModules
___normalizeKey___: aKey
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
%

! ------------------- reads: one choke point for every lookup path

category: 'Grail-Hashing'
method: PySysModules
hashFunction: aKey
	"Bucket by the NORMALIZED key, so a Symbol probe lands in the same bucket
	as the str it names.  Every read the kernel dictionary does -- at:,
	at:ifAbsent:, at:otherwise:, includesKey:, associationAt:, removeKey: --
	goes through here, which is why this single override makes them all
	Symbol-tolerant.  PyDict's compareKey:with: settles the bucket by Python
	__eq__, and str/Symbol are __eq__ in both directions already."

	^ super hashFunction: (self ___normalizeKey___: aKey)
%

! ------------------- writes: the key that is STORED is always a str

category: 'Grail-Mutation'
method: PySysModules
at: aKey put: aValue
	^ super at: (self ___normalizeKey___: aKey) put: aValue
%

category: 'Grail-Mutation'
method: PySysModules
add: anAssociation
	"Re-associate under the normalized key rather than storing the caller's
	association, whose key is fixed at creation."

	| k |
	k := self ___normalizeKey___: anAssociation key.
	k == anAssociation key ifTrue: [^ super add: anAssociation].
	self at: k put: anAssociation value.
	^ anAssociation
%

category: 'Grail-Mutation'
method: PySysModules
removeKey: aKey
	"Normalize BEFORE super: PyDict>>removeKey: drops the key from its
	insertion-order list with Smalltalk ``='', which a Symbol does not
	satisfy against the stored str -- the entry would leave the table and
	stay in ``order''."

	^ super removeKey: (self ___normalizeKey___: aKey)
%

category: 'Grail-Mutation'
method: PySysModules
removeKey: aKey ifAbsent: aBlock
	^ super removeKey: (self ___normalizeKey___: aKey) ifAbsent: aBlock
%

category: 'Grail-Mutation'
method: PySysModules
removeAllKeys: aCollection
	^ super removeAllKeys: (aCollection collect: [:k | self ___normalizeKey___: k])
%

set compile_env: 0
