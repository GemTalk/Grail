! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'PositionalOnlyDefaultsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PositionalOnlyDefaultsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PositionalOnlyDefaultsTestCase - PEP 570 positional-only params with defaults
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PositionalOnlyDefaultsTestCase removeAllMethods.
PositionalOnlyDefaultsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - functions'
method: PositionalOnlyDefaultsTestCase
testPositionalOnlyDefaults
	"``def f(a=1, /, b=2)'': CPython's arguments node keeps positional-only
	parameters in posonlyargs and the rest in args, and applies ``defaults''
	to the two lists as ONE sequence.  FunctionDefAst's def-time
	default-capture indexed ``args'' alone when naming the temps it emits, so
	a default belonging to a posonly parameter put the first-defaulted index
	off the front of that list -- 2 defaults over 1 regular arg gives index 0
	-- and codegen signalled a raw OffsetError (2003
	objErrBadOffsetIncomplete, max:1 actual:0).

	It fired during the EMIT, so it was uncatchable and took the whole
	module's import with it rather than one function: both test.test_call and
	test.test_positional_only_arg scored IMPORTERROR on it, with nothing else
	about them measured.

	The capture block is where a default that references the ENCLOSING scope
	is resolved at def time (rather than in the inner block, where the same
	name is the local being bound), so the closing-over cases here are what
	prove the temps are wired to the right names and not merely that the
	arithmetic stopped throwing.  Expected values are CPython 3.14's."

	| mod results expected |
	importlib @env1:modules removeKey: #'positional_only_defaults' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/positional_only_defaults.py')
		name: 'positional_only_defaults'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	"Each entry: key -> the tuple elements CPython answers."
	expected := {
		{ 'defaults'. { 1. 2 } }.
		{ 'both_positional'. { 10. 20 } }.
		{ 'keyword_for_regular'. { 10. 30 } }.
		{ 'all_posonly_defaults'. { 1. 2 } }.
		{ 'all_posonly_given'. { 7. 8 } }.
		{ 'spanning_min'. { 1. 2. 3. 4 } }.
		{ 'spanning_all'. { 1. 20. 30. 40 } }.
		{ 'spanning_kwonly_only'. { 1. 2. 3. 40 } }.
		{ 'closes_over_enclosing'. { 99. true } }.
		{ 'closes_over_overridden'. { 5. false } }.
		{ 'no_default_on_posonly'. { 1. 2 } }.
		{ 'plain_defaults'. { 5. 6 } }.
		{ 'plain_given'. { 1. 2 } }.
		{ 'plain_kwonly'. { 5. 6 } }.
		{ 'plain_kwonly_given'. { 1. 2 } } }.
	expected do: [:pair |
		| key want got |
		key := pair at: 1.
		want := pair at: 2.
		got := results @env1:__getitem__: key.
		1 to: want size do: [:i |
			self
				assert: ((got @env1:__getitem__: (i - 1)) = (want at: i))
				description: key , ' element ' , i printString , ' was ' ,
					(got @env1:__getitem__: (i - 1)) printString]].
	"The by-name rejection this file used to pin at the WRONG answer now has
	its own test method below."
%

category: 'Grail-Tests - functions'
method: PositionalOnlyDefaultsTestCase
testPositionalOnlyCannotBePassedByName
	"PEP 570's actual point: a parameter declared before ``/'' is not
	keyword-bindable.  Grail accepted the keyword anyway, and the two ways
	that went wrong were not equally visible --

	  * with no default the call still failed, but as ``missing required
	    argument: a'', naming the right parameter for entirely the wrong
	    reason;
	  * WITH a default it silently ignored the keyword and used the default,
	    so ``def h(a=1, /, b=2)'' answered (1, 2) for ``h(a=9)''.  A wrong
	    answer, not an error.

	Two fixes.  The unexpected-keyword guard no longer treats posonly names as
	bindable, and reports them with CPython's own message -- names in
	PARAMETER order, joined by ', ' inside ONE pair of quotes (``'a, b''').
	And the arity/keyword guards now run BEFORE the per-parameter binding
	rather than after it, in both the varargs entry and the fixed-arity
	forwarder: the binding loop raises ``missing required argument'' for the
	first parameter it cannot fill, which outranked the real complaint.
	CPython validates the call before reporting what it could not fill, and
	prefers the posonly message when a call commits both sins.

	``**kwargs'' is the deliberate exception, in Grail as in CPython:
	``def collects(a, /, **kw)'' takes ``collects(1, a=2)'' with the name
	landing in kw and the parameter keeping its positional value.  The guard
	is skipped entirely for a def that collects extras.

	Every expected string here is CPython 3.14's, verbatim."

	| mod results expect |
	importlib @env1:modules removeKey: #'positional_only_defaults' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/positional_only_defaults.py')
		name: 'positional_only_defaults'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	expect := {
		{ 'byname_required'.
		  'TypeError: by_name() got some positional-only arguments passed as keyword arguments: ''a''' }.
		{ 'byname_defaulted'.
		  'TypeError: by_name_defaulted() got some positional-only arguments passed as keyword arguments: ''a''' }.
		"Two offenders: one quoted, comma-joined list -- not one pair of
		quotes each."
		{ 'byname_two'.
		  'TypeError: two_posonly() got some positional-only arguments passed as keyword arguments: ''a, b''' }.
		"The posonly complaint outranks the unexpected-keyword one."
		{ 'byname_beats_unknown'.
		  'TypeError: two_posonly() got some positional-only arguments passed as keyword arguments: ''a''' }.
		"...and the legal spellings still work."
		{ 'byname_positional_ok'. '(1, 2)' }.
		{ 'byname_defaulted_positional_ok'. '(9, 2)' }.
		{ 'byname_into_kwargs'. '(1, {''a'': 2})' } }.
	expect do: [:pair |
		| got |
		got := results @env1:__getitem__: (pair at: 1).
		self
			assert: (got asString = (pair at: 2))
			description: (pair at: 1) , ': expected <' , (pair at: 2) ,
				'> but got <' , got asString , '>']
%
