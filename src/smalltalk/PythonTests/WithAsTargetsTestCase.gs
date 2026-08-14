! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WithAsTargetsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
WithAsTargetsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WithAsTargetsTestCase - ``with EXPR as TARGET'' for every assignable target
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
WithAsTargetsTestCase removeAllMethods.
WithAsTargetsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - statements'
classmethod: WithAsTargetsTestCase
resultsRepr
	"Load tests/python/with_as_targets.py fresh and answer its RESULTS_REPR
	dict -- every value already reduced to its repr string, so the test
	methods compare one flat table against CPython 3.14's own repr output
	rather than walking nested tuples and lists."

	| mod |
	importlib @env1:modules removeKey: #'with_as_targets' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/with_as_targets.py')
		name: 'with_as_targets'.
	^ mod @env1:___pyAttrLoad___: #RESULTS_REPR
%

category: 'Grail-Tests - statements'
method: WithAsTargetsTestCase
assertRepr: expectations
	"Each entry is { key. CPython's repr of that value }."

	| results |
	results := WithAsTargetsTestCase resultsRepr.
	expectations do: [:pair |
		| got |
		got := (results @env1:__getitem__: (pair at: 1)) asString.
		self
			assert: (got = (pair at: 2))
			description: (pair at: 1) , ': expected <' , (pair at: 2) ,
				'> but got <' , got , '>']
%

category: 'Grail-Tests - statements'
method: WithAsTargetsTestCase
testWithAsNonNameTargets
	"``with EXPR as TARGET'' is an assignment, so TARGET may be any shape an
	assignment target may be.  WithAst handled the bare NameAst and emitted
	everything else through the target's own printSmalltalkOn:, which is a
	LOAD emit of a STORE-context node.  So:

	  * an attribute or subscript target raised ``Expression Context should
	    be <Load> but is <Store>'';
	  * a tuple target emitted ``(tuple withAll: {a. b}) := val'', which is
	    not Smalltalk, and at module scope also disagreed with the loads --
	    the store bound bare block temps while the reads went through
	    ___moduleAttrLoad___.

	Both failed inside the EMIT, so they were uncatchable and took the whole
	enclosing module's import with them rather than one statement.  That is
	why test.test_with scored IMPORTERROR with zero tests measured: the first
	``with ... as (foo, bar)'' in the file was enough.

	The shared emitter these now route through is the one AssignAst uses per
	element of a tuple unpack, so a with-target gets its iterable coercion,
	ValueError value-count check, PEP 3132 star support and @property setter
	dispatch -- hence the wrong_count and property_setter cases, which are
	not about parsing at all but about inheriting the right store.

	Expected values are CPython 3.14's."

	self assertRepr: {
		{ 'name'. '1' }.
		{ 'tuple_module'. '(1, 2)' }.
		{ 'attribute'. '5' }.
		{ 'subscript'. '7' }.
		{ 'tuple'. '(1, 2)' }.
		{ 'star'. '(1, [2, 3], 4)' }.
		{ 'nested'. '(1, 2, 3)' }.
		{ 'list_target'. '(9, 8)' }.
		{ 'multi_item'. '(1, 2, 3)' }.
		"The fixture normalises CPython's ``, got 3'' tail away -- Grail's
		shared unpack check does not emit it.  A separate gap; what this
		case shows is that a with-target gets the check at all."
		{ 'wrong_count'. '''ValueError: too many values to unpack (expected 2)''' }.
		{ 'property_setter'. '(42, [42])' } }
%

category: 'Grail-Tests - statements'
method: WithAsTargetsTestCase
testForLoopNonNameTargets
	"``for h.slot in xs:'' and ``for d['k'] in xs:'' are legal Python, and
	ForAst had the same hole from the other side: printSmalltalkOn: sent
	every non-TupleAst target to a Name-only store, which sent
	isModuleVariableName: -- a NameAst selector -- to an AttributeAst and
	died with a doesNotUnderstand at compile time.

	``for [a, b] in xs:'' went the same way, since the tuple test named
	TupleAst alone; the list spelling means the same thing in Python."

	self assertRepr: {
		{ 'for_attribute'. '3' }.
		{ 'for_subscript'. '8' }.
		{ 'for_list_target'. '[3, 7]' }.
		"Nesting and PEP 3132 stars inside a for-target must not have moved."
		{ 'for_nested'. '[(1, 2, [3, 4]), (5, 6, [])]' } }
%

category: 'Grail-Tests - statements'
method: WithAsTargetsTestCase
testConstantIsNotAnAssignmentTarget
	"A constant can never be assigned to.  CPython rejects ``None = 1'',
	``with mock as None:'' and ``with mock as (foo, None, bar):'' at COMPILE
	time; Grail's parser accepted all of them and emitted code that silently
	did the wrong thing.  test_with has three tests on exactly this
	(testAssignmentToNoneError, ...TupleOnlyContainingNoneError,
	...TupleContainingNoneError).

	The check went into the parser's ___illegalStoreTargetDesc___:, which
	already rejected comprehension targets and is consulted from setStoreCtx:
	-- so one place covers assignment, with-as and for-targets alike, and the
	tuple recursion reaches a None nested inside a target tuple.

	The legal_* cases are the other half of the point: this must not have
	made attribute, subscript or ordinary tuple targets illegal."

	self assertRepr: {
		{ 'none_target'. '''SyntaxError''' }.
		{ 'none_parenthesized'. '''SyntaxError''' }.
		{ 'none_tuple'. '''SyntaxError''' }.
		{ 'none_tuple_paren'. '''SyntaxError''' }.
		{ 'none_in_tuple'. '''SyntaxError''' }.
		{ 'none_assign'. '''SyntaxError''' }.
		{ 'true_assign'. '''SyntaxError''' }.
		{ 'literal_assign'. '''SyntaxError''' }.
		{ 'none_for_target'. '''SyntaxError''' }.
		{ 'legal_attribute'. '''no error''' }.
		{ 'legal_subscript'. '''no error''' }.
		{ 'legal_tuple'. '''no error''' } }
%

category: 'Grail-Tests - statements'
method: WithAsTargetsTestCase
testContextManagerProtocolError
	"``with obj:'' on something that is not a context manager names WHICH
	half of the protocol is missing, and reports a missing __exit__ BEFORE a
	missing __enter__ -- CPython's SETUP_WITH looks __exit__ up first, so
	``with object():'' complains about __exit__ even though both are absent.
	Grail's message named neither, so all three cases read alike.

	Deciding this in object's fallback rather than in WithAst's emit keeps
	the check off the success path: it runs only once the object is already
	known not to be a context manager.

	The async_only case is the hint CPython adds when the object implements
	the ASYNC protocol and was used with a plain ``with''.  It is written
	with setattr rather than ``async def'' because Grail drops async def
	bodies entirely today -- which is also why test_with's
	testWithForAsyncManager still fails, and will until async defs compile.

	The type-name prefix is normalised to <TYPE> in the fixture: CPython 3.14
	qualifies it (``'mod.Cls' object ...'') where Grail uses the bare class
	name.  That difference is real but separate, and test_with does not test
	it either -- it matches the message as a substring."

	self assertRepr: {
		{ 'missing_enter'.
		  '''<TYPE> object does not support the context manager protocol (missed __enter__ method)''' }.
		{ 'missing_exit'.
		  '''<TYPE> object does not support the context manager protocol (missed __exit__ method)''' }.
		"Neither half present: the __exit__ complaint wins."
		{ 'missing_both'.
		  '''<TYPE> object does not support the context manager protocol (missed __exit__ method)''' }.
		{ 'async_only'.
		  '"<TYPE> object does not support the context manager protocol (missed __exit__ method) but it supports the asynchronous context manager protocol. Did you mean to use ''async with''?"' } }
%
