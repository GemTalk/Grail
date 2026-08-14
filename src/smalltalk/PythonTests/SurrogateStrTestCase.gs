! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SurrogateStrTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SurrogateStrTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SurrogateStrTestCase - a Python str GemStone has no Character for
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SurrogateStrTestCase removeAllMethods.
SurrogateStrTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - str'
method: SurrogateStrTestCase
assertResults: expectations
	"Each entry is { key. CPython 3.14's repr of that value }."

	| mod results |
	importlib @env1:modules removeKey: #'surrogate_str' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/surrogate_str.py')
		name: 'surrogate_str'.
	results := mod @env1:___pyAttrLoad___: #RESULTS_REPR.
	expectations do: [:pair |
		| got |
		got := (results @env1:__getitem__: (pair at: 1)) asString.
		self
			assert: (got = (pair at: 2))
			description: (pair at: 1) , ': expected <' , (pair at: 2) ,
				'> but got <' , got , '>']
%

category: 'Grail-Tests - str'
method: SurrogateStrTestCase
testSurrogateLiteralIsAStr
	"``\\ud800'' is a legal one-character Python str.  GemStone's Character is
	a Unicode SCALAR VALUE -- code points minus the surrogate block -- so
	``Character codePoint: 16rD800'' raises OutOfRange and no
	CharacterCollection can hold one.  The tokenizer therefore died building
	the literal, and because Grail compiles every method body at import, one
	such literal anywhere in a file failed the WHOLE module: test_builtin,
	test_codecs, test_linecache, test_struct and test_warnings each scored
	IMPORTERROR on a single one.

	This is not an encoding difference.  Both systems store a fixed-width
	array of code points and encode to UTF-8 only on the way out; CPython
	refuses a lone surrogate on the wire too (see testEncoding).  What
	differs is the value set the CHARACTER type admits -- and CPython needs
	the wider one for PEP 383 surrogateescape, which maps OS bytes that are
	not valid UTF-8 into U+DC80..U+DCFF so filenames round-trip.

	PyStrSurrogate is where such a str lives: an AbstractPyStr subclass, so
	Grail's already many-to-one type mapping answers ``str'' for it exactly
	as it does for Unicode7 / Unicode16 / Unicode32 / StrEnum."

	self assertResults: {
		{ 'type_s'. '''str''' }.
		{ 'isinstance_str'. 'True' }.
		"Length is in CODE POINTS, not the bytes any encoding would take."
		{ 'len_s'. '1' }.
		{ 'len_t'. '3' }.
		{ 'repr_s'. '"''\\ud800''"' }.
		{ 'repr_t'. '"''a\\udc80b''"' }.
		{ 'str_is_self'. 'True' } }
%

category: 'Grail-Tests - str'
method: SurrogateStrTestCase
testComparisonAndMembership
	"A surrogate-bearing string can never equal one without a surrogate --
	no CharacterCollection can hold a surrogate, so the two representations
	share no value that ought to compare equal.  That is what makes the
	split safe rather than merely convenient: there is no cross-class
	equality to get wrong."

	self assertResults: {
		{ 'eq_self'. 'True' }.
		{ 'eq_other'. 'False' }.
		{ 'eq_same'. 'True' }.
		{ 'ne'. 'True' }.
		{ 'bool'. 'True' }.
		{ 'contains'. 'True' } }
%

category: 'Grail-Tests - str'
method: SurrogateStrTestCase
testDemotesWhenNoSurrogateRemains
	"The invariant the whole class rests on: anything built out of the
	string that does NOT itself contain a surrogate comes back an ORDINARY
	str.  ___fromCodePoints___: demotes.

	Without that, ``t[0]'' on ``a\\udc80b'' answered a surrogate-carrying
	object holding just ``a'', which compared UNEQUAL to ``'a''' and hashed
	differently -- a silently wrong answer, and precisely the hazard a
	second representation invites.  in_dict is the sharp version: a demoted
	character used as a dict key has to be found by the plain string."

	self assertResults: {
		{ 'index_0'. '"''a''"' }.
		{ 'index_1'. '"''\\udc80''"' }.
		{ 'idx0_eq'. 'True' }.
		{ 'idx2_eq'. 'True' }.
		{ 'idx1_eq_self'. 'True' }.
		{ 'idx1_ne_plain'. 'False' }.
		{ 'idx0_type'. '''str''' }.
		{ 'iter_eq'. '[True, True, True]' }.
		{ 'concat_r'. '"''\\ud800x''"' }.
		{ 'concat_l'. '"''x\\ud800''"' }.
		{ 'concat_keeps'. 'True' }.
		{ 'hash_idx0'. 'True' }.
		{ 'in_dict'. '1' } }
%

category: 'Grail-Tests - str'
method: SurrogateStrTestCase
testEncoding
	"The one place CPython and GemStone already agreed: strict UTF-8 refuses
	a lone surrogate, so ``'\\ud800'.encode('utf-8')'' is a UnicodeEncodeError
	in CPython for the same reason it always was here.  CPython's
	permissiveness is IN MEMORY ONLY.  ``surrogatepass'' is the documented
	way through and yields the WTF-8 form, U+D800 -> ED A0 80."

	self assertResults: {
		{ 'encode_strict'. '''UnicodeEncodeError''' }.
		{ 'encode_pass'. '[237, 160, 128]' } }
%

category: 'Grail-Tests - str'
method: SurrogateStrTestCase
testAdjacentLiteralConcatenation
	"How these actually appear: CPython's tests split them across source
	lines, so the PARSER has to join a surrogate part with ordinary ones.
	Streaming the parts into a Unicode7 sent ``addAll:'' to the surrogate
	object and died on ``do:''; the join now collects parts first and
	answers a PyStrSurrogate when any of them is one -- concatenating a
	representable prefix onto an unrepresentable character does not make it
	representable."

	self assertResults: {
		{ 'joined_len'. '12' }.
		{ 'joined_repr'. '"''before\\ud800after''"' } }
%

category: 'Grail-Tests - str'
method: SurrogateStrTestCase
testOrdinaryStringsAreUntouched
	"The fast path must not have moved.  It cannot, by construction: the
	tokenizer only promotes when a \\u or \\U escape names a surrogate, and
	nothing else can produce one (\\x tops out at 0xFF, octal at 0o777, \\N
	resolves against a table with none in it, and a raw source character
	cannot be a lone surrogate or the file would not have decoded).  An
	ordinary literal costs one extra send per \\u escape and nothing else."

	self assertResults: {
		{ 'plain'. '''ABC''' }.
		{ 'plain_type'. '''str''' }.
		{ 'plain_eq'. 'True' } }
%
