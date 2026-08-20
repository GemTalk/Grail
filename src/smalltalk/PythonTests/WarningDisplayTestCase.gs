! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarningDisplayTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningDisplayTestCase comment:
'How a warning is RENDERED and WHERE it is written.

Two functions, deliberately separate: formatwarning turns a warning into text,
showwarning writes that text somewhere.  Splitting them is what lets a caller
replace either half.

The rendering is TWO lines, not one -- header, then the SOURCE LINE, indented
by two spaces and read from linecache when the caller does not supply it.  The
second line is how you see what the code at the reported frame actually said.
Grail rendered only the header, and without the trailing newline.

The writing has an order: the ``file'' argument, else sys.stderr.  Grail
dropped ``file'' entirely and wrote to the Transcript unconditionally, which
is not cosmetic -- capturing warning output is how a test reads what was
displayed, and with the argument ignored every such capture came back EMPTY.

Where Grail diverges, deliberately: CPython gives up when sys.stderr is None
and the warning is lost.  Grail''s sys.stderr is None by DEFAULT, so giving up
would lose every warning it ever displays; the Transcript is the last resort
instead of the first choice.  Both return None quietly, which is what the
fixture pins.

One subtlety with a bug number (bpo-35178): showwarning passes the line to a
REPLACED formatwarning as a fifth POSITIONAL argument, so an override written
with five plain parameters works.  Passing it as a keyword breaks every such
override.

The warn() call site is now computed for the PRINTED path too, not only the
recording one.  It used to be skipped there on cost grounds, and every
displayed warning claimed to come from ``<unknown>:0''; it sits past the
filters, so only a warning that is actually going somewhere pays for it.

See tests/python/warning_display.py.'
%

expectvalue /Class
doit
WarningDisplayTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarningDisplayTestCase removeAllMethods: 0.
WarningDisplayTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningDisplayTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warning_display' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warning_display.py')
		name: 'warning_display'.
%

category: 'Grail-Helpers'
method: WarningDisplayTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningDisplayTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - the header'
method: WarningDisplayTestCase
testTheHeaderLine
	"file:lineno: Category: message, ending in a newline, naming the category
	by __name__ rather than by repr."

	self assertAll: #('no_source_line_means_one_line'
		'the_text_ends_with_a_newline' 'the_header_names_the_category'
		'the_header_is_not_a_repr')
%

category: 'Grail-Tests - the source line'
method: WarningDisplayTestCase
testAnExplicitLineIsUsed
	"Given a line, formatwarning strips it and indents it by two spaces --
	positionally or by keyword.  An EMPTY line is falsy, so it means ''no
	line'' rather than a blank one."

	self assertAll: #('an_explicit_line_is_indented'
		'an_explicit_line_is_stripped' 'the_line_can_be_a_keyword'
		'an_empty_line_is_omitted')
%

category: 'Grail-Tests - the source line'
method: WarningDisplayTestCase
testAnAbsentLineIsReadFromTheFile
	"linecache supplies it, and asking past the end of the file is not an
	error -- it just leaves the second line off."

	self assertAll: #('the_source_line_is_read_from_the_file'
		'the_read_line_is_indented_too' 'a_line_past_the_end_is_not_an_error')
%

category: 'Grail-Tests - where it goes'
method: WarningDisplayTestCase
testTheFileArgumentIsHonoured
	"The argument Grail used to drop.  Positionally or by keyword, and what
	lands there is exactly what formatwarning returned."

	self assertAll: #('showwarning_writes_to_its_file'
		'showwarning_writes_what_formatwarning_returns'
		'the_file_can_be_a_keyword')
%

category: 'Grail-Tests - where it goes'
method: WarningDisplayTestCase
testStderrIsTheFallback
	"With no file, sys.stderr -- and with nowhere at all to write, a quiet
	return rather than a raise.  That last case is where Grail diverges: it
	reaches the Transcript rather than losing the warning, because its
	sys.stderr is None by default."

	self assertAll: #('no_file_means_stderr'
		'nowhere_to_write_is_not_an_error')
%

category: 'Grail-Tests - a replaced formatwarning'
method: WarningDisplayTestCase
testAnOverrideGetsTheLinePositionally
	"bpo-35178: five plain parameters, no keyword.  And replacing it is not
	one-way."

	self assertAll: #('a_replaced_formatwarning_is_used'
		'the_override_can_be_put_back')
%
