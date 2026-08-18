! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ParseErrorLocationTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ParseErrorLocationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ParseErrorLocationTestCase
!
! A parse error carries filename / lineno / offset / text, so a traceback can
! draw a caret under it.
!
! See tests/python/parse_error_location.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ParseErrorLocationTestCase removeAllMethods.
ParseErrorLocationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - tracebacks'
method: ParseErrorLocationTestCase
testAParseErrorCarriesItsLocation
	"``compile()'' and ``exec()'' answer a SyntaxError with a real location.

	They used to answer one with filename, lineno, offset and text all absent, so
	traceback.py had no source line to draw under and rendered ONE line where
	CPython renders four.  The position was never missing: Grail's parser puts it
	in the MESSAGE STRING ('... at line 3') at 42 raise sites across
	PythonParser / PythonTokenizer / AbstractNode.  So this was about where the
	position was reported, not about computing it.

	FILLED AT A BOUNDARY, NOT AT THE 42 SITES.  PythonParser class >> parse: is
	the single entry every caller reaches, and ``source:'' tokenizes inside it, so
	one handler there covers both parser and tokenizer failures -- including the
	several sites that have no token in scope to pass ('Unknown operator',
	'Expected comparison operator'), which could not have been fixed
	individually.  It is idempotent, so a site that reports its own location
	(___signalGlobalSyntaxError___ does) keeps it.

	TWO RE-RAISES WERE DISCARDING IT, and finding the second is what made exec
	work.  compile() and ModuleAst>>evaluateSource: each caught the parser's
	SyntaxError and re-signalled the MESSAGE ALONE -- they have to re-signal,
	because the env-0 parser can set only messageText while the Python ``args''
	tuple comes from the env-1 constructor -- so the location died at the
	boundary no matter how well the parser had computed it.  Both now go through
	ModuleAst class >> ___resignalSyntaxError___:.

	AND A TUPLE OF NILS IS NOT A TUPLE OF NONES.  ___pyAttrLoad___ treats a
	dynamic instVar holding Smalltalk nil as ABSENT, so passing nils for an
	unlocated error SHADOWED the accessors that answer None and made ``e.lineno''
	raise AttributeError -- turning a clean SyntaxError into an AttributeError in
	three unrelated places.  A tokenizer error genuinely has no position (it
	fails before the token list exists), so that path is taken in practice and
	the last check below pins it.

	Twenty-six checks, identical under real CPython 3.14.6.  The message text is
	deliberately NOT compared: Grail's parser says ''Unexpected token: NEWLINE'
	where CPython says 'invalid syntax', and reconciling those is a separate
	matter from locating the error."

	| mod |
	importlib @env1:modules removeKey: #'parse_error_location' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/parse_error_location.py')
		name: 'parse_error_location'.
	#( 'a_parse_error_reports_its_line'
	   'a_parse_error_reports_a_column'
	   'a_parse_error_reports_its_source_line'
	   'the_end_fields_are_set'
	   'the_render_has_four_lines'
	   'the_caret_sits_under_the_offending_character'
	   'exactly_one_caret_is_drawn'
	   'a_tab_indent_keeps_the_caret_aligned'
	   'an_error_at_end_of_line_points_past_the_last_character'
	   'a_first_line_error_reports_line_one'
	   'an_unlocated_error_still_answers_none_rather_than_raising'
	   "STRICTNESS, not location: two constructs Grail used to accept.  Both
	    are asserted through the rendered caret, which is what makes them
	    testable here rather than in a parser-only fixture."
	   'an_unparenthesized_genexp_among_arguments_is_rejected'
	   'the_genexp_error_underlines_the_whole_genexp'
	   'a_sole_argument_genexp_is_still_legal'
	   'a_genexp_before_other_arguments_is_rejected'
	   'a_genexp_after_a_keyword_is_rejected'
	   'an_unclosed_bracket_is_rejected'
	   'the_unclosed_bracket_error_points_at_the_bracket'
	   'the_innermost_unclosed_bracket_is_named'
	   'a_balanced_bracket_is_fine'
	   "Indentation problems are IndentationError, and CPython's two shapes
	    differ in whether a caret is drawn -- which follows from the OFFSET,
	    not from a special case in the renderer."
	   'an_unindent_mismatch_is_an_indentation_error'
	   'an_unindent_mismatch_is_reported_at_end_of_line'
	   'an_unexpected_indent_is_an_indentation_error'
	   'an_unexpected_indent_draws_no_caret'
	   'an_indentation_error_is_still_a_syntax_error'
	   'a_correctly_indented_block_is_fine' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'parse-error location check failed: ' , k
				, ' -> ' , answer printString]
%
