! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'FStringFieldPositionsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FStringFieldPositionsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FStringFieldPositionsTestCase
!
! A raise from inside an f-string REPLACEMENT FIELD must be blamed on the
! failing expression, the way CPython blames it -- ``f'{boom()}''' underlines
! ``boom()'', not the whole literal.
!
! Grail re-parses each field with a CHILD PythonParser over the field text
! alone, which is what makes nested quotes and PEP 701 line breaks work, and
! leaves every node in the field reporting a position relative to that snippet.
! Those positions used to be MARKED and excluded from the position map
! (___markFragmentPositions___), because a line-1 span nested inside a true one
! wins the map's innermost-range contest and would blame line 1 of the file.
! The frame fell back to the f-string node's own span: the whole literal.
!
! They were never wrong, only UNTRANSLATED.  The tokenizer now records where
! each field begins in BOTH coordinate systems (PythonToken >> fieldStarts) and
! the parser rebases the child parse onto the module.  Sound because inside a
! field the tokenizer keeps the text VERBATIM -- escapes are not decoded -- so
! value indices and source offsets differ by a constant across it; BETWEEN
! fields they do not, which is exactly why the anchor has to be recorded as each
! field is scanned rather than reconstructed afterwards.
!
! ONE CASE IS DELIBERATELY NOT PINNED HERE: a field spanning several lines
! (``f"""x {<newline> boom()<newline>} y"""'').  Its map entry is now CORRECT --
! the generated method carries ``11 4 11 10'', CPython's own answer -- but the
! raising send's step point falls inside the enclosing f-string node's Smalltalk
! range and outside the call's, so the reader's smallest-containing-range rule
! picks the coarser entry.  That is an emit/reader interaction, not a position
! one, and it reads IDENTICALLY on unmodified main (measured), so it is an
! untouched limitation rather than a regression.
!
! Drives tests/python/fstring_field_positions.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FStringFieldPositionsTestCase removeAllMethods.
FStringFieldPositionsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FStringFieldPositionsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'fstring_field_positions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_field_positions.py')
		name: 'fstring_field_positions'.
%

category: 'Grail-Private'
method: FStringFieldPositionsTestCase
resultAt: key
	^ ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key) asString
%

category: 'Grail-Tests'
method: FStringFieldPositionsTestCase
testASimpleFieldIsBlamedOnItsExpression
	"The base case, and the one the whole exercise is for: the span is
	``boom()'', not ``f'value is {boom()} ok'''.  Before the rebase this read
	[33, 15, 37] -- the literal."

	self assert: (self resultAt: 'simple') equals: '[33, 27, 33]'.
%

category: 'Grail-Tests'
method: FStringFieldPositionsTestCase
testTheRightFieldOfSeveralIsBlamed
	"Three fields on one line, so only the columns can say which raised --
	exactly the case the literal-wide span could not express."

	self assert: (self resultAt: 'two_fields') equals: '[40, 26, 32]'.
%

category: 'Grail-Tests'
method: FStringFieldPositionsTestCase
testADecodedEscapeBeforeTheFieldDoesNotShiftIt
	"THE CASE THAT DECIDES THE DESIGN.  Between fields the tokenizer DECODES
	escapes, so ``a\tb\n'' is 4 characters of token value over 6 of source: a
	value index no longer tracks a source offset.  Deriving the field's base
	from its value index afterwards would land 2 characters short here.  The
	anchor is recorded during the scan instead, from the live source position,
	so this is unaffected."

	self assert: (self resultAt: 'escaped_before') equals: '[49, 24, 30]'.
%

category: 'Grail-Tests'
method: FStringFieldPositionsTestCase
testAFieldContainingQuotesIsBlamedCorrectly
	"Nested quotes are why the field is re-parsed by a child parser at all
	(PEP 701), so they must survive the rebase."

	self assert: (self resultAt: 'nested_quotes') equals: '[56, 28, 34]'.
%

category: 'Grail-Tests'
method: FStringFieldPositionsTestCase
testImplicitConcatenationKeepsEachTokensOwnFields
	"``f'one {1}' f'two {boom()}''' is TWO tokens, each with its own anchors --
	a single shared base would blame the first literal."

	self assert: (self resultAt: 'adjacent_concat') equals: '[63, 33, 39]'.
%

category: 'Grail-Tests'
method: FStringFieldPositionsTestCase
testAFormatSpecDoesNotMoveTheField
	"A format spec is scanned after the expression and must not disturb the
	expression's own span -- plain spec, and a spec that is itself a nested
	field (whose subtree stays excluded, needing two anchors composed)."

	self assert: (self resultAt: 'with_format_spec') equals: '[70, 18, 24]'.
	self assert: (self resultAt: 'nested_field_in_spec') equals: '[78, 18, 24]'.
%

category: 'Grail-Tests'
method: FStringFieldPositionsTestCase
testDebugEqualsAndRawPrefixKeepTheirSpans
	"``f'{expr=}''' truncates the expression text after parsing, and an ``rf''
	prefix changes escape handling -- neither may move the field's base."

	self assert: (self resultAt: 'debug_equals') equals: '[85, 18, 24]'.
	self assert: (self resultAt: 'raw_fstring') equals: '[92, 22, 28]'.
%
