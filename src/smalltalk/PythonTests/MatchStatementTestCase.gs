! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MatchStatementTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MatchStatementTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MatchStatementTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MatchStatementTestCase
!
! PEP 634 structural pattern matching.  Grail's parser had NO ``match''
! statement at all -- core syntax since 3.10, four releases -- so every
! construct here raised SyntaxError rather than answering wrongly.
!
! The CPython suite barely registers this: 2 of 1335 vendored .py files use a
! match statement, because the corpus is older-style Python.  A gap the
! measurement is blind to is exactly the kind that survives, which is why these
! checks live here rather than relying on the scoreboard to catch a regression.
!
! Two of the rules are silently-wrong hazards rather than errors, and each has
! its own test below:
!
!   1. A BARE name CAPTURES; a DOTTED name COMPARES.  ``case RED:'' always
!      matches and rebinds RED -- only ``case Colour.RED:'' tests the constant.
!      An implementation that compared bare names would make every such case
!      silently unreachable.
!   2. A sequence pattern must NOT match str/bytes/bytearray, or
!      ``case [a, b]:'' quietly destructures the two-character string 'ab' into
!      two bindings.  dict and set are excluded for the same reason from the
!      other side: dict answers both __len__ and __getitem__, so a duck-typed
!      gate matched a two-entry dict and then indexed it with 0 -- a KeyError
!      raised from inside a pattern that should simply not have matched.
!
! The duck-typing that gate does offer is restricted to user-defined Python
! classes.  Grail's builtins answer far more protocol than they implement:
! probing None found both __len__ and __getitem__: (fallbacks that exist only
! to raise), so ``case [x, y]:'' matched None and surfaced __len__'s TypeError.
!
! Drives tests/python/match_statement.py, whose EXPECTED table was generated
! from CPython 3.14.6 and verified against it before being committed -- so a
! disagreement here is Grail differing from CPython, not from a guess.
!
! Feeds test_global's test_match / test_match_as / test_match_seq /
! test_match_map / test_match_attr.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MatchStatementTestCase removeAllMethods.
MatchStatementTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MatchStatementTestCase
setUp
	"Reload tests/python/match_statement.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'match_statement' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/match_statement.py')
		name: 'match_statement'.
%

category: 'Grail-Private'
method: MatchStatementTestCase
resultAt: key
	"The fixture's r[key], rendered with repr so the comparison is against
	the same text CPython printed when EXPECTED was generated."

	^ ((builtins @env1:instance) @env1:repr:
		((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key)) asString
%

category: 'Grail-Private'
method: MatchStatementTestCase
expectedAt: key
	"The fixture's own EXPECTED entry -- CPython 3.14.6's actual output."

	^ ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key) asString
%

category: 'Grail-Private'
method: MatchStatementTestCase
assertMatchesCPythonAt: key
	self assert: (self resultAt: key) equals: (self expectedAt: key)
%

category: 'Grail-Tests - Pattern kinds'
method: MatchStatementTestCase
testEveryPatternKind
	"One match statement exercising literal, or, guarded class, sequence,
	star, mapping, singleton and wildcard patterns against nine subjects."

	self assertMatchesCPythonAt: 'kinds'.
%

category: 'Grail-Tests - Pattern kinds'
method: MatchStatementTestCase
testNestedPatternsAndGroups
	"Patterns nest arbitrarily: a sequence of a sequence and a mapping, a
	parenthesised sequence, and the empty sequence."

	self assertMatchesCPythonAt: 'nested'.
%

category: 'Grail-Tests - Pattern kinds'
method: MatchStatementTestCase
testClassPatternsResolvePositionalsThroughMatchArgs
	"``Point(0, 0)'' reads __match_args__ to turn positions into attribute
	names; ``Point(x=0, y=yy)'' names them directly."

	self assertMatchesCPythonAt: 'class_patterns'.
%

category: 'Grail-Tests - Pattern kinds'
method: MatchStatementTestCase
testAPositionalPatternWithoutMatchArgsIsATypeError
	"A class that never declared __match_args__ accepts NO positional
	sub-patterns, and CPython makes that a TypeError AT MATCH TIME rather
	than a quiet non-match: it is a bug in the pattern, not a subject that
	failed to match, and it has to say so."

	self assertMatchesCPythonAt: 'no_match_args'.
%

category: 'Grail-Tests - Capture versus compare'
method: MatchStatementTestCase
testADottedNameComparesAndABareNameCaptures
	"PEP 634's one genuinely surprising rule, and the most common way to
	write a wrong match statement.  ``case Colour.RED:'' tests the
	constant; ``case RED:'' always matches and REBINDS RED, which is why
	bare_captures answers the subject rather than the constant."

	self assertMatchesCPythonAt: 'dotted_compares'.
	self assertMatchesCPythonAt: 'bare_captures'.
%

category: 'Grail-Tests - Sequence gate'
method: MatchStatementTestCase
testAStringIsNotASequencePattern
	"The exclusion PEP 634 makes explicit.  Without it ``case [a, b]:''
	silently destructures the two-character string 'ab' -- a wrong ANSWER,
	not an error, which is the worse failure."

	self assertMatchesCPythonAt: 'str_is_not_a_sequence'.
	self assertMatchesCPythonAt: 'bytes_is_not_a_sequence'.
%

category: 'Grail-Tests - Sequence gate'
method: MatchStatementTestCase
testAMappingOrSetIsNotASequencePattern
	"dict answers both __len__ and __getitem__, so a duck-typed gate let
	``case [x, y]:'' match a two-entry dict and then index it with 0 -- a
	KeyError raised from inside a pattern that should not have matched."

	self assertMatchesCPythonAt: 'dict_is_not_a_sequence'.
	self assertMatchesCPythonAt: 'set_is_not_a_sequence'.
%

category: 'Grail-Tests - Sequence gate'
method: MatchStatementTestCase
testAListOrTupleIsASequencePattern
	"The other side of the gate: tightening it must not exclude the two
	types sequence patterns exist for."

	self assertMatchesCPythonAt: 'list_is_a_sequence'.
	self assertMatchesCPythonAt: 'tuple_is_a_sequence'.
%

category: 'Grail-Tests - Singletons'
method: MatchStatementTestCase
testNoneTrueAndFalseCompareByIdentity
	"PEP 634 specifies ``is'' for the three singletons.  bool is an int
	subclass and 1 == True, so an ``==''-based implementation answers
	'True' for the integer 1 -- these five subjects are chosen to catch
	exactly that."

	self assertMatchesCPythonAt: 'singleton_identity'.
%

category: 'Grail-Tests - Evaluation order'
method: MatchStatementTestCase
testAGuardRunsAfterThePatternBindsAndCanReadTheBindings
	"``case [g, h] if g < h:'' is the point of guards: the guard must see
	names the pattern just bound, so it cannot be hoisted ahead of it."

	self assertMatchesCPythonAt: 'guard_sees_bindings'.
%

category: 'Grail-Tests - Evaluation order'
method: MatchStatementTestCase
testTheSubjectIsEvaluatedExactlyOnce
	"However many cases are tried.  Re-emitting the subject expression per
	case would make ``match next(it):'' consume the iterator on every
	failed case -- silently, and only for iterator subjects."

	self assertMatchesCPythonAt: 'subject_evaluated_once'.
%

category: 'Grail-Tests - Soft keywords'
method: MatchStatementTestCase
testMatchAndCaseRemainOrdinaryIdentifiers
	"``match'' and ``case'' are SOFT keywords: they open a match statement
	only in that one position and stay ordinary names everywhere else.
	Assignment, subscript store, tuple-unpack target, a def of the same
	name, and ``case'' as a plain variable all have to keep working."

	self assertMatchesCPythonAt: 'ident_assign'.
	self assertMatchesCPythonAt: 'ident_subscript'.
	self assertMatchesCPythonAt: 'ident_tuple_target'.
	self assertMatchesCPythonAt: 'ident_case'.
	self assertMatchesCPythonAt: 'ident_call'.
%
