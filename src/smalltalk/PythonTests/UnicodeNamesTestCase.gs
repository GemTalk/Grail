! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'UnicodeNamesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
UnicodeNamesTestCase comment:
'Unicode character names, generated instead of curated.

THE DEFECT WAS A HAND-CURATED TABLE OF 33 NAMES, in TWO places:
PythonTokenizer >> ___unicodeNameToCodePoint___: for the escape in string
literals, and stdlib/unicodedata.py''s own _name_to_codepoint for
unicodedata.lookup() and the escape in regexes.  Each carried a comment
saying ``extend as needed'''' and asking the next person to keep it in
sync with the other, which is a promise nobody keeps.

An unknown name was a hard SyntaxError rather than a fallback, so the
cost was not a wrong answer -- it was a whole module.  CPython''s
test/pickletester.py is 5300 lines and contains exactly one named escape,
EMPTY SET, which neither list happened to hold.

WHAT IS GENERATED, AND WHAT IS COMPUTED.  scripts/generate_unicode_names.py
emits 34202 stored names.  The UCD names 148853 code points, but 114716 of
them are ALGORITHMIC -- 11172 Hangul syllables composed from jamo, and
103544 whose name is a fixed prefix plus their own hex -- and storing those
would quadruple the table to say nothing new.  CPython splits them the same
way, so unicode_names.gs does the arithmetic and the generator emits only
the RANGES, read out of the UCD rather than written down.

THE HEX SUFFIX IS THE ANSWER, NOT AN INDEX, which is why
CJK UNIFIED IDEOGRAPH-0041 is correctly unknown: 0041 decodes to a code
point outside every CJK range.  A test here holds that line, along with a
right-shaped name under the wrong prefix.

CONTROL ALIASES ARE STORED and are the only names the generator writes
down rather than reads.  A C0/C1 control has no name at all --
unicodedata.name(chr(0)) raises in CPython too -- so without its alias the
code point cannot be named, and \N{NULL} is a spelling CPython accepts
that the old curated table already had.  The generator refuses to run if
any of them fails to resolve in CPython or if any C0/C1 code point is
left without one.

The fixture asserts everything against CPython''s OWN unicodedata, so
under the fixture gate it is checking the real UCD and under Grail the
same assertions check the generated table agrees with it.'
%

doit
UnicodeNamesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
UnicodeNamesTestCase removeAllMethods: 0.
UnicodeNamesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnicodeNamesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'unicode_name_database' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_name_database.py')
		name: 'unicode_name_database'.
%

category: 'Grail-Helpers'
method: UnicodeNamesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: UnicodeNamesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: UnicodeNamesTestCase
testTheEscapeThatCostAModule
	"EMPTY SET, the one named escape in CPython's 5300-line
	test/pickletester.py, and the reason this change exists."

	self assertAll: #('the_escape_that_cost_a_module')
%

category: 'Grail-Tests'
method: UnicodeNamesTestCase
testTheEscapeResolvesEveryFamily
	"A stored name, a composed Hangul syllable, two hex-suffixed families,
	a control alias, and a lower-case spelling -- through the TOKENIZER,
	which is the consumer that raises SyntaxError on a miss."

	self assertAll: #('escapes')
%

category: 'Grail-Tests'
method: UnicodeNamesTestCase
testLookupResolvesEveryFamily
	"The same six through unicodedata.lookup(), which is the OTHER
	consumer -- and the one re._parser uses for a regex escape."

	self assertAll: #('lookup_stored' 'lookup_hangul_all_three_parts'
		'lookup_algorithmic' 'lookup_control_aliases'
		'lookup_is_case_insensitive')
%

category: 'Grail-Tests'
method: UnicodeNamesTestCase
testAHangulSyllableIsFoundByComposition
	"Lead, vowel and trail run together with no separator and several are
	prefixes of others, so the split is searched for rather than scanned.
	All three present, and each of the two degenerate spellings."

	self assertAll: #('lookup_hangul_all_three_parts' 'hangul_boundaries')
%

category: 'Grail-Tests'
method: UnicodeNamesTestCase
testANameThatShouldNotResolveDoesNot
	"The half that makes the table mean something.  A hex suffix is the
	code point ITSELF, not an index into the range, so
	CJK UNIFIED IDEOGRAPH-0041 must miss -- as must a real code point
	under the wrong family's prefix, and a Hangul spelling with no
	decomposition."

	self assertAll: #('unknown_name_raises' 'hex_suffix_outside_its_range'
		'wrong_prefix_for_a_real_code_point' 'not_a_hangul_syllable')
%

category: 'Grail-Tests'
method: UnicodeNamesTestCase
testNameIsTheInverseAndRoundTrips
	"unicodedata.name() did not exist before.  A control still has NO
	name -- its alias is not one, so lookup('NULL') succeeds where
	name(chr(0)) raises, exactly as in CPython."

	self assertAll: #('name_stored' 'name_hangul' 'name_algorithmic'
		'name_of_a_control_raises' 'name_takes_a_default'
		'name_round_trips')
%
