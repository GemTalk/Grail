! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CaretAnchorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CaretAnchorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CaretAnchorTestCase - PEP 657 caret lines: the anchor locator and the renderer.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CaretAnchorTestCase removeAllMethods.
CaretAnchorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Runtime'
method: CaretAnchorTestCase
testCaretAnchorsAndRendering
	"CPython 3.11+ underlines the sub-expression that failed:

		File ''t.py'', line 2, in divide
		  return a / b
			 ~~^~~

	``^'' marks the ANCHOR -- the operator for a binary op, the bracket for a
	call or subscript -- and ``~'' marks the rest of the span.  The split is the
	whole difficulty; an unsplit run of ``^'' is CPython's own FALLBACK for when
	it cannot compute anchors, so producing that is not a match.

	Section 9.33 recorded this cluster as blocked on ``a real ast'': CPython
	finds the anchor by parsing the segment and reading ``col_offset'' off the
	node, and Grail's ``ast'' is a stub with no positions.  That was too
	pessimistic -- an ast is sufficient, not necessary.  For the restricted
	grammar of ``a valid Python expression segment'' the anchor can be found by
	SCANNING: track bracket depth and string literals, then take either the
	trailing call/subscript bracket or the loosest-binding depth-0 binary
	operator.

	Verified against CPython's own ast-based extractor over EVERY
	BinOp/Subscript/Call node in the 3.14.6 stdlib -- 36641 segments, 100%
	agreement -- and the renderer against 31 real raised exceptions.  The
	quirks the checks below pin were all found by that corpus rather than by
	reading CPython: the operator span is never tokenized but taken as one
	character plus a conditional extension, a parenthesised operand extends it
	while a TUPLE operand does not, and a float exponent's sign is not an
	operator.

	STILL MISSING, and it is why this wins no test yet: Grail's frames carry no
	columns -- ``colno'' is None on every frame -- so nothing draws a caret in a
	real traceback.  That is section 9.33's third item, per-operation spans in
	codegen, and it is now the ONLY remaining blocker.  These checks therefore
	build FrameSummary objects with EXPLICIT columns, which is exactly what the
	renderer will receive once codegen supplies them.

	All twenty-six checks answer identically under real CPython, verified by
	running the fixture directly.  See tests/python/caret_anchors.py.

	The last EIGHT are a different subject from the rest, and are grouped at the
	end rather than in a file of their own because they share the fixture's
	machinery: a SyntaxError's OWN caret range, under its own source line, which
	needs no frame columns and so does win tests today."

	| mod |
	importlib @env1:modules removeKey: #'caret_anchors' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/caret_anchors.py')
		name: 'caret_anchors'.
	#( 'a_call_anchors_its_parentheses'
	   'a_binary_op_anchors_the_operator'
	   'the_loosest_operator_is_the_anchor'
	   'a_two_character_operator_spans_two'
	   'a_subscript_anchors_its_brackets'
	   'brackets_inside_strings_are_not_brackets'
	   'a_bytes_literal_can_be_subscripted'
	   'a_float_exponent_sign_is_not_an_operator'
	   'redundant_parentheses_are_seen_through'
	   'a_parenthesised_operand_extends_the_operator'
	   'a_tuple_operand_does_not_extend_it'
	   'a_non_binary_expression_has_no_anchor'
	   'a_binary_op_renders_a_split_caret_line'
	   'a_call_renders_carets_on_its_brackets'
	   'a_subscript_chain_renders_carets_on_the_last'
	   'a_frame_without_columns_renders_no_caret_line'
	   'a_whole_line_call_suppresses_the_caret_line'
	   'a_partial_span_still_draws_when_anchors_are_absent'
	   "A SyntaxError's own caret RANGE, which is a different thing from the
	    PEP 657 anchors above: Grail emitted a single '^' where CPython
	    underlines offset..end_offset, and with end_lineno unset that runs to
	    the end of the line -- the ordinary case, not a rare one."
	   'a_syntaxerror_underlines_to_end_of_line'
	   'the_range_starts_at_the_offset'
	   'an_offset_at_end_of_line_gets_one_caret'
	   'an_offset_past_end_of_line_is_clamped'
	   'a_leading_indent_is_discounted_from_the_offset'
	   'an_explicit_end_offset_bounds_the_range'
	   'a_trailing_space_is_not_stripped_before_measuring'
	   'a_none_offset_renders_the_line_without_carets'
	   "A SPAN CROSSING LINES.  The renderer gave up at the first sign of one
	    and printed the first line alone with no carets, which is not a rare
	    shape -- any call whose arguments wrap is one.  The anchor scan refused
	    a multi-line segment too, and that cost more than the carets: with no
	    anchors there are no significant lines to keep either, so a five-line
	    call elided its middle where CPython prints all five."
	   'a_multi_line_span_renders_every_line'
	   'a_multi_line_call_suppresses_carets_like_a_single_line_one'
	   'a_long_span_elides_the_middle_only_when_nothing_marks_it'
	   'a_clause_header_is_not_an_expression' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'caret check failed: ' , k , ' -> ' , answer printString]
%
