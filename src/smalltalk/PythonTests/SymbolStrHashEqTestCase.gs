! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SymbolStrHashEqTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SymbolStrHashEqTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SymbolStrHashEqTestCase - a Symbol must honour Python's hash/eq invariant.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SymbolStrHashEqTestCase removeAllMethods.
SymbolStrHashEqTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Symbols'
method: SymbolStrHashEqTestCase
testASymbolHonoursTheHashEqInvariant
	"Python guarantees that ``a == b'' implies ``hash(a) == hash(b)''.  A GemStone
	Symbol satisfies ``isinstance(sym, str)'' and compares equal to the str with
	the same characters IN BOTH DIRECTIONS, but ``Symbol >> hash'' answers the
	IDENTITY hash -- so before Symbol >> __hash__ was defined, an equal Symbol and
	str hashed differently and a dict or set holding one never found the other.

	The 22 checks live in tests/python/symbol_str_hash_eq.py and are run here
	against a REAL Symbol.  The same file, run under CPython against a plain
	``class Symbol(str)'' subclass, answers True to every one of them -- which is
	what makes them CPython's contract rather than Grail's opinion.

	The big-dict / big-set checks are the load-bearing ones.  A PyDict bucket is
	``hash \\ tableSize'', so in a ONE-entry dict the identity hash and the content
	hash could collide by luck, __eq__ then matched, and the lookup SUCCEEDED:
	measured before the fix, the same probe answered 1 from a 1-entry dict and
	raised KeyError from a 65-entry one.  A one-entry check alone would have
	passed against the bug."

	| mod sym |
	importlib @env1:modules removeKey: #'symbol_str_hash_eq' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/symbol_str_hash_eq.py')
		name: 'symbol_str_hash_eq'.
	sym := #'grail_symbol_hash_probe'.
	self assert: (((mod @env1:___pyAttrLoad___: #'use')
			@env1:__call__: (Array with: sym with: sym asString asUnicodeString)) = true)
		description: 'the fixture would not accept the subject'.
	#( 'it_is_an_instance_of_str'
	   'it_is_equal_to_the_str_from_its_own_side'
	   'it_is_equal_to_the_str_from_the_str_side'
	   'hash_agrees_with_the_equal_str'
	   'hash_is_stable_across_calls'
	   'a_dict_keyed_by_it_is_found_by_the_str'
	   'a_dict_keyed_by_the_str_is_found_by_it'
	   'the_two_spellings_are_one_dict_entry'
	   'a_big_dict_keyed_by_it_is_found_by_the_str'
	   'a_big_dict_keyed_by_the_str_is_found_by_it'
	   'deleting_by_the_other_spelling_works'
	   'set_membership_holds_from_the_str_side'
	   'set_membership_holds_from_its_own_side'
	   'set_intersection_is_not_empty'
	   'the_two_spellings_are_one_set_element'
	   'a_big_set_finds_it_by_the_str'
	   'str_of_it_is_a_genuine_str'
	   'str_of_it_keeps_the_characters'
	   'str_of_it_can_be_copied_by_replace'
	   'concatenation_yields_a_genuine_str'
	   'formatting_yields_a_genuine_str'
	   'it_still_reads_as_the_same_characters' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'Symbol str check failed: ' , k , ' -> ' , answer printString]
%

category: 'Grail-Tests - Symbols'
method: SymbolStrHashEqTestCase
testTheSymbolHashIsTheContentHashNotTheIdentityHash
	"The env-1 __hash__ answers what the equal str answers, for every string
	representation.  Under Unicode comparison mode String / Unicode7 / Unicode16 /
	Unicode32 all hash alike, so this holds for a non-ASCII Symbol too -- not only
	for an ASCII one, which is what a naive ``asString'' fix would be tested on."

	| ascii wide |
	ascii := #'grail_symbol_hash_probe'.
	self assert: (ascii @env1:__hash__) equals: ascii asString hash.
	self assert: (ascii @env1:__hash__) equals: (ascii asString asUnicodeString @env1:__hash__).
	self deny: (ascii @env1:__hash__) = ascii identityHash
		description: 'the Python hash must not be the identity hash'.

	"caf<e-acute>: byte-format Symbol vs the wide str with the same characters."
	wide := (String with: $c with: $a with: $f with: (Character codePoint: 233)) asSymbol.
	self assert: (wide @env1:__hash__)
		equals: (wide asString asUnicodeString @env1:__hash__).
	self assert: (wide @env1:__eq__: wide asString asUnicodeString) equals: true
%

category: 'Grail-Tests - Symbols'
method: SymbolStrHashEqTestCase
testSmalltalkSymbolHashingIsUntouched
	"Only the env-1 (Python) __hash__ is overridden.  Smalltalk's ``Symbol >> hash''
	is what SymbolDictionary bucketing, symbol resolution and method lookup are
	built on, and it must still answer the identity hash -- this is the check that
	says the fix stayed on the Python side of the fence."

	| sym dict |
	sym := #'grail_symbol_hash_probe'.
	self assert: sym hash equals: sym identityHash.
	self deny: sym hash = sym asString hash
		description: 'Symbol >> hash (env 0) must remain the identity hash'.

	"Smalltalk equality is likewise untouched: a Symbol is NOT = to a String."
	self deny: sym = sym asString.
	self deny: sym asString = sym.

	"A SymbolDictionary still finds what it is asked for, by Symbol."
	dict := SymbolDictionary new.
	dict at: sym put: 42.
	self assert: (dict at: sym) equals: 42.
	self assert: (Globals at: #'Object') equals: Object.
	self assert: (Python at: #'str') equals: Unicode7
%

category: 'Grail-Tests - Symbols'
method: SymbolStrHashEqTestCase
testStrOfASymbolIsAGenuineStr
	"``str(x)'' of a str SUBCLASS is exactly ``str'' in CPython, and it is the
	obvious way to launder a Symbol at the boundary.  CharacterCollection >> __str__
	answers ``self'', which for a Symbol laundered NOTHING: the result was still a
	Symbol and still INVARIANT, so ``str(sym).replace(...)'' still died with the
	uncatchable ``Attempt to modify invariant object'' -- the very error that blocked
	``import kaggle'' (see PySysModules.gs)."

	| sym laundered |
	sym := #'grail_symbol_hash_probe'.
	laundered := sym @env1:__str__.
	self assert: laundered class equals: Unicode7.
	self assert: (laundered @env1:__eq__: sym) equals: true.
	self assert: (laundered @env0:copyReplaceAll: 'grail' with: 'GRAIL')
		equals: 'GRAIL_symbol_hash_probe'.
	"A plain str is still answered UNCHANGED -- identically, not merely equal --
	so no ordinary str pays for this."
	self assert: ('abc' asUnicodeString @env1:__str__) == 'abc' asUnicodeString
		description: 'str >> __str__ must still answer self'
%
