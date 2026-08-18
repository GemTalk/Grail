! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FStringPep701TestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FStringPep701TestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
FStringPep701TestCase comment:
'PEP 701 f-strings: the replacement field holds SOURCE, not string data.

Before Python 3.12 f-strings were scanned by a special-cased mini-parser whose
restrictions had nothing to do with the language.  PEP 701 moved them into the
ordinary grammar and the restrictions went away.  The one that bites:

	f''{'' ''.join(cmd)}''

was a SyntaxError, because the second quote ended the literal.  CPython''s own
test.support.socket_helper is written that way, so Grail could not read it.

Grail scanned an f-string to its matching quote with no idea braces existed.
The tokenizer now tracks brace depth, and inside a field consumes text
VERBATIM -- which is what the backslash cases test: decoding an escape there
would hand the inner parser a string literal with a raw newline in it rather
than the two characters the author wrote.  Tracking nested quotes is also what
makes arbitrary nesting work, since each nested f-string''s quotes pair off in
turn and the scan finds the right closer without recursing.

Two parser-side bugs surfaced with it, both pre-existing and both about the
field being an EXPRESSION rather than a statement: ``f''{ x }''`` failed
because the child parse starts at column 1, so the leading space tokenized as
an INDENT.  The field is now parsed as if parenthesized, which is what CPython
does -- that fixes the space and makes PEP 701''s multi-line fields work, since
the tokenizer already suppresses NEWLINE/INDENT while parenDepth > 0.

Half the checks are regressions rather than new syntax.  Brace tracking is easy
to get wrong in ways only visible on doubled braces, format specs, slices, or a
brace inside a nested string -- all of which worked before.

See tests/python/fstring_pep701.py.'
%

expectvalue /Class
doit
FStringPep701TestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
FStringPep701TestCase removeAllMethods: 0.
FStringPep701TestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: FStringPep701TestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'fstring_pep701' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_pep701.py')
		name: 'fstring_pep701'.
%

category: 'Grail-Helpers'
method: FStringPep701TestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: FStringPep701TestCase
assertAll: keys
	"Assert every named check passed, naming the failing one."

	keys do: [:each |
		self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - PEP 701'
method: FStringPep701TestCase
testSameQuoteInsideTheField
	"The headline case: the outer quote no longer ends the literal when it
	appears inside a replacement field."

	self assertAll: #('single_inside_single' 'double_inside_double'
		'single_with_conversion' 'subscript_same_quote' 'same_quote_amid_text'
		'mixed_quotes_still_work')
%

category: 'Grail-Tests - PEP 701'
method: FStringPep701TestCase
testBackslashesInsideTheField
	"Field text is consumed verbatim, so an escape reaches the inner parser
	as source; an escape in the LITERAL part is still decoded."

	self assertAll: #('backslash_escape_in_expr' 'backslash_tab_in_expr'
		'literal_escape_still_decoded' 'escape_both_sides')
%

category: 'Grail-Tests - PEP 701'
method: FStringPep701TestCase
testArbitraryNesting
	"Nested f-strings to depth three, and one with surrounding text."

	self assertAll: #('nested_once' 'nested_twice' 'nested_with_text')
%

category: 'Grail-Tests - PEP 701'
method: FStringPep701TestCase
testWhitespaceAndMultilineFields
	"The field is an expression, not a statement: leading space is not an
	INDENT and a line break is not a terminator."

	self assertAll: #('leading_space_in_field' 'space_around_nested_display'
		'multiline_field' 'multiline_field_with_comment')
%

category: 'Grail-Tests - regressions'
method: FStringPep701TestCase
testSelfDocumentingEqualsForm
	"``f'{expr=}''' emits the field's source, then the value -- repr'd by
	default, formatted when a spec is given.  Grail dropped the ``='' silently
	until parsing the field as parenthesized turned that into a hard error;
	the shape lives mostly in assertion messages a passing test never reads,
	so nothing had caught the wrong output."

	self assertAll: #('debug_eq_plain' 'debug_eq_reprs_by_default'
		'debug_eq_with_spec_formats' 'debug_eq_with_spec_pads'
		'debug_eq_conversion_r' 'debug_eq_conversion_s'
		'debug_eq_keeps_spacing' 'debug_eq_expression_source')
%

category: 'Grail-Tests - regressions'
method: FStringPep701TestCase
testOperatorEqualsIsNotTheDebugForm
	"An ``='' belonging to == / != / >= / := is an operator."

	self assertAll: #('eq_operator_not_debug' 'ne_operator_not_debug'
		'ge_operator_not_debug' 'walrus_not_debug')
%

category: 'Grail-Tests - regressions'
method: FStringPep701TestCase
testDoubledBracesAreLiteral
	"Brace tracking must not treat ``{{`` as opening a field."

	self assertAll: #('doubled_open_brace' 'doubled_close_brace'
		'doubled_braces_around_field' 'doubled_braces_only')
%

category: 'Grail-Tests - regressions'
method: FStringPep701TestCase
testConversionsAndFormatSpecs
	"!r / !s, a plain spec, a nested spec, and a spec after a field that
	itself contains quotes."

	self assertAll: #('conversion_r' 'conversion_s' 'format_spec'
		'nested_format_spec' 'spec_with_quotes_in_expr')
%

category: 'Grail-Tests - regressions'
method: FStringPep701TestCase
testBracesInsideNestedStringsAreData
	"A brace inside an embedded literal must not shift the depth."

	self assertAll: #('brace_inside_nested_string'
		'close_brace_in_string_literal' 'open_brace_in_string_literal')
%

category: 'Grail-Tests - regressions'
method: FStringPep701TestCase
testDisplaysAndSlicesInsideTheField
	"Slice colons must not read as a format-spec opener, and dict/set
	displays must not unbalance the depth."

	self assertAll: #('slice_in_expr' 'dict_display_in_expr'
		'set_display_in_expr')
%

category: 'Grail-Tests - regressions'
method: FStringPep701TestCase
testConcatenationQuotingAndDegenerateShapes
	"Implicit concatenation across string kinds, triple quotes, raw
	f-strings, and the empty/plain/adjacent cases."

	self assertAll: #('implicit_concat' 'concat_plain_then_f'
		'triple_quoted' 'triple_quoted_with_newline'
		'raw_fstring_literal_part' 'empty_fstring' 'no_fields'
		'adjacent_fields')
%
