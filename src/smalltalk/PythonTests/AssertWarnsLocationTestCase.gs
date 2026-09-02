! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AssertWarnsLocationTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AssertWarnsLocationTestCase comment:
'assertWarns reports WHERE the warning came from.

Its context object carries ``filename'' and ``lineno'', and CPython''s own
suite checks them -- test_gettext asserts both for every plural-form
warning, which is thirteen tests.  Grail stamped the filename from the
test''s module and left the lineno at 0.

THE CHANGE HAD BEEN TRIED AND REVERTED, with the note ``+4 in
test_gettext, -5 in test_re''.  Re-measured on 2026-09-02 it is +4 and
-0: the test_re half was fixed by the frame and traceback work that
landed in between.  A stale measurement is worse than none -- it made the
right change look wrong for as long as nobody re-ran it, and the only
cost of finding out was one install and one module run.

WHAT STILL CANNOT BE REPORTED, and the reason the code takes both fields
or neither.  A warning raised inside a function built by ``exec'' blames
the GENERATED code.  Grail derives a frame''s globals from its code
object''s filename; an exec-built function has none, so f_globals is None,
and a stacklevel walk that reads f_globals to decide how far to climb
stops there.  gettext''s c2py plural functions are exactly that shape, so
nine of the thirteen still fail -- with ``<grail>'' as the filename and a
line number belonging to the generated source.  Pairing that lineno with
the stamped fallback filename would report a position that exists in
NEITHER file, which is why a ``<grail>'' record is ignored whole.  The
root is in docs/Issues.md.

Took test.test_gettext 15 -> 11, with test_re unchanged at 0.

See tests/python/assertwarns_location.py (9 checks, CPython-validated
first).'
%

expectvalue /Class
doit
AssertWarnsLocationTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AssertWarnsLocationTestCase removeAllMethods: 0.
AssertWarnsLocationTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AssertWarnsLocationTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'assertwarns_location' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/assertwarns_location.py')
		name: 'assertwarns_location'.
%

category: 'Grail-Helpers'
method: AssertWarnsLocationTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AssertWarnsLocationTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: AssertWarnsLocationTestCase
testTheLineTheWarningCameFrom
	"Each expected line is computed from the enclosing function's own
	co_firstlineno, so the checks do not rot when the file is edited --
	which is how CPython's test_gettext writes them too."

	self assertAll: #('direct' 'via_stacklevel')
%

category: 'Grail-Tests'
method: AssertWarnsLocationTestCase
testInAMethodAndOneCallDeeper
	"stacklevel=2 attributes the warning to the CALLER, which is the whole
	reason a library passes it: the user wants their own line, not the
	library's."

	self assertAll: #('in_a_method' 'one_call_deeper' 'assert_warns_regex')
%

category: 'Grail-Tests'
method: AssertWarnsLocationTestCase
testTheRestOfTheContractIsUnchanged
	"The regression half: every assertWarns in the corpus runs through
	this context, so category selection, the regex form, the refusal when
	nothing warns, and the fact that the block keeps running after a
	warning all have to keep working."

	self assertAll: #('still_selects_by_category' 'refuses_when_absent'
		'regex_that_does_not_match' 'the_block_keeps_running')
%
