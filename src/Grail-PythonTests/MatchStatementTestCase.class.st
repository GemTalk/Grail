Class {
	#name : 'MatchStatementTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MatchStatementTestCase >> assertMatchesCPythonAt: key [
	self assert: (self resultAt: key) equals: (self expectedAt: key)

]

{ #category : 'Grail-Private' }
MatchStatementTestCase >> expectedAt: key [
	"The fixture's own EXPECTED entry -- CPython 3.14.6's actual output."

	^ ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key) asString

]

{ #category : 'Grail-Private' }
MatchStatementTestCase >> resultAt: key [
	"The fixture's r[key], rendered with repr so the comparison is against
	the same text CPython printed when EXPECTED was generated."

	^ ((builtins @env1:instance) @env1:repr:
		((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
MatchStatementTestCase >> setUp [
	"Reload tests/python/match_statement.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'match_statement' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/match_statement.py')
		name: 'match_statement'.

]

{ #category : 'Grail-Tests - Capture versus compare' }
MatchStatementTestCase >> testADottedNameComparesAndABareNameCaptures [
	"PEP 634's one genuinely surprising rule, and the most common way to
	write a wrong match statement.  ``case Colour.RED:'' tests the
	constant; ``case RED:'' always matches and REBINDS RED, which is why
	bare_captures answers the subject rather than the constant."

	self assertMatchesCPythonAt: 'dotted_compares'.
	self assertMatchesCPythonAt: 'bare_captures'.

]

{ #category : 'Grail-Tests - Evaluation order' }
MatchStatementTestCase >> testAGuardRunsAfterThePatternBindsAndCanReadTheBindings [
	"``case [g, h] if g < h:'' is the point of guards: the guard must see
	names the pattern just bound, so it cannot be hoisted ahead of it."

	self assertMatchesCPythonAt: 'guard_sees_bindings'.

]

{ #category : 'Grail-Tests - Sequence gate' }
MatchStatementTestCase >> testAListOrTupleIsASequencePattern [
	"The other side of the gate: tightening it must not exclude the two
	types sequence patterns exist for."

	self assertMatchesCPythonAt: 'list_is_a_sequence'.
	self assertMatchesCPythonAt: 'tuple_is_a_sequence'.

]

{ #category : 'Grail-Tests - The subject' }
MatchStatementTestCase >> testALoneStarredSubjectIsASyntaxError [
	"``match *x:'' has no comma, so it is not a tuple display: CPython's
	subject_expr rejects it at compile time rather than matching a
	one-element tuple."

	self assertMatchesCPythonAt: 'lone_starred_subject'.

]

{ #category : 'Grail-Tests - Sequence gate' }
MatchStatementTestCase >> testAMappingOrSetIsNotASequencePattern [
	"dict answers both __len__ and __getitem__, so a duck-typed gate let
	``case [x, y]:'' match a two-entry dict and then index it with 0 -- a
	KeyError raised from inside a pattern that should not have matched."

	self assertMatchesCPythonAt: 'dict_is_not_a_sequence'.
	self assertMatchesCPythonAt: 'set_is_not_a_sequence'.

]

{ #category : 'Grail-Tests - The subject' }
MatchStatementTestCase >> testAnEllipsisSubjectOpensAMatchStatement [
	"``match ...:'' is a statement, so the soft-keyword lookahead has to read
	an ellipsis after ``match'' as the start of a subject."

	self assertMatchesCPythonAt: 'ellipsis_subject'.

]

{ #category : 'Grail-Tests - Pattern kinds' }
MatchStatementTestCase >> testAPositionalPatternWithoutMatchArgsIsATypeError [
	"A class that never declared __match_args__ accepts NO positional
	sub-patterns, and CPython makes that a TypeError AT MATCH TIME rather
	than a quiet non-match: it is a bug in the pattern, not a subject that
	failed to match, and it has to say so."

	self assertMatchesCPythonAt: 'no_match_args'.

]

{ #category : 'Grail-Tests - Pattern kinds' }
MatchStatementTestCase >> testASelfMatchingBuiltinBindsTheSubjectItself [
	"``case int(i):'' binds the subject, not an attribute.  bool, int, str and
	the other builtins CPython flags _Py_TPFLAGS_MATCH_SELF take one
	positional sub-pattern without any __match_args__, and a subclass
	inherits that."

	self assertMatchesCPythonAt: 'self_matching'.

]

{ #category : 'Grail-Tests - Pattern kinds' }
MatchStatementTestCase >> testASelfMatchingBuiltinTakesOnlyOnePositionalSubPattern [
	"``case int(a, b):'' is a TypeError at match time, not a quiet non-match."

	self assertMatchesCPythonAt: 'self_matching_takes_one'.

]

{ #category : 'Grail-Tests - The subject' }
MatchStatementTestCase >> testAStarredElementMakesTheSubjectATuple [
	"``match *rest, 3:'' unpacks rest into the subject tuple."

	self assertMatchesCPythonAt: 'starred_subject'.

]

{ #category : 'Grail-Tests - Sequence gate' }
MatchStatementTestCase >> testAStringIsNotASequencePattern [
	"The exclusion PEP 634 makes explicit.  Without it ``case [a, b]:''
	silently destructures the two-character string 'ab' -- a wrong ANSWER,
	not an error, which is the worse failure."

	self assertMatchesCPythonAt: 'str_is_not_a_sequence'.
	self assertMatchesCPythonAt: 'bytes_is_not_a_sequence'.

]

{ #category : 'Grail-Tests - The subject' }
MatchStatementTestCase >> testAWalrusSubjectBindsItsName [
	"The subject's elements are named expressions, so ``match w := 1, 2:''
	binds w to the first element and ``match (w := 5):'' to the whole
	subject."

	self assertMatchesCPythonAt: 'walrus_subject'.
	self assertMatchesCPythonAt: 'bare_walrus_subject'.

]

{ #category : 'Grail-Tests - Pattern kinds' }
MatchStatementTestCase >> testClassPatternsResolvePositionalsThroughMatchArgs [
	"``Point(0, 0)'' reads __match_args__ to turn positions into attribute
	names; ``Point(x=0, y=yy)'' names them directly."

	self assertMatchesCPythonAt: 'class_patterns'.

]

{ #category : 'Grail-Tests - Pattern kinds' }
MatchStatementTestCase >> testDoubleStarRestCopiesTheSubjectThroughTheMappingProtocol [
	"``**z'' copies the subject with update and then deletes the matched keys,
	as CPython's COPY_DICT_WITHOUT_KEYS does -- so a UserDict, a Mapping that
	is not a dict, still yields its remaining items."

	self assertMatchesCPythonAt: 'rest_from_userdict'.

]

{ #category : 'Grail-Tests - Pattern kinds' }
MatchStatementTestCase >> testEveryPatternKind [
	"One match statement exercising literal, or, guarded class, sequence,
	star, mapping, singleton and wildcard patterns against nine subjects."

	self assertMatchesCPythonAt: 'kinds'.

]

{ #category : 'Grail-Tests - Soft keywords' }
MatchStatementTestCase >> testMatchAndCaseRemainOrdinaryIdentifiers [
	"``match'' and ``case'' are SOFT keywords: they open a match statement
	only in that one position and stay ordinary names everywhere else.
	Assignment, subscript store, tuple-unpack target, a def of the same
	name, and ``case'' as a plain variable all have to keep working."

	self assertMatchesCPythonAt: 'ident_assign'.
	self assertMatchesCPythonAt: 'ident_subscript'.
	self assertMatchesCPythonAt: 'ident_tuple_target'.
	self assertMatchesCPythonAt: 'ident_case'.
	self assertMatchesCPythonAt: 'ident_call'.

]

{ #category : 'Grail-Tests - Pattern kinds' }
MatchStatementTestCase >> testNestedPatternsAndGroups [
	"Patterns nest arbitrarily: a sequence of a sequence and a mapping, a
	parenthesised sequence, and the empty sequence."

	self assertMatchesCPythonAt: 'nested'.

]

{ #category : 'Grail-Tests - Singletons' }
MatchStatementTestCase >> testNoneTrueAndFalseCompareByIdentity [
	"PEP 634 specifies ``is'' for the three singletons.  bool is an int
	subclass and 1 == True, so an ``==''-based implementation answers
	'True' for the integer 1 -- these five subjects are chosen to catch
	exactly that."

	self assertMatchesCPythonAt: 'singleton_identity'.

]

{ #category : 'Grail-Tests - Evaluation order' }
MatchStatementTestCase >> testTheSubjectIsEvaluatedExactlyOnce [
	"However many cases are tried.  Re-emitting the subject expression per
	case would make ``match next(it):'' consume the iterator on every
	failed case -- silently, and only for iterator subjects."

	self assertMatchesCPythonAt: 'subject_evaluated_once'.

]
