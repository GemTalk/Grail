! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'RaiseSpanTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RaiseSpanTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RaiseSpanTestCase - PEP 657 columns for ``raise'' and ``assert'' frames.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RaiseSpanTestCase removeAllMethods.
RaiseSpanTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Runtime'
method: RaiseSpanTestCase
testRaiseAndAssertSpans
	"Codegen recorded a frame's columns only for the three statement shapes
	whose VALUE is the failing operation -- return, assignment, bare expression
	-- so every ``raise'' and every ``assert'' frame reported colno nil and drew
	no caret line, where CPython underlines them.

	The two go OPPOSITE WAYS, which is why neither could join the existing rule:
	a raise is blamed on the whole statement, keyword included and out to the
	end of a ``from'' clause, while an assert is blamed on its TEST alone.

	Every check here fails with ___curPosSpanNodeFor___ reverted, so the fixture
	measures the rule rather than restating it."

	| mod |
	importlib @env1:modules removeKey: #'raise_spans' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/raise_spans.py')
		name: 'raise_spans'.
	#( 'a_raise_spans_the_whole_statement'
	   'a_from_clause_is_part_of_the_span'
	   'a_bare_reraise_reports_the_original_raise'
	   "A span covering every character of its lines draws no caret row -- the
	    rule any whole-line span follows, checked here because a raise is the
	    shape most likely to be one."
	   'a_multi_line_raise_draws_no_caret_row'
	   'an_assert_spans_only_its_test' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'raise span check failed: ' , k , ' -> ' , answer printString]
%
