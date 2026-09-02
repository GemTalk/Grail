! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'HtmlUnescapeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
HtmlUnescapeTestCase comment:
'html.unescape does not require the semicolon.

HTML has never required the terminator for a NUMERIC character
reference, and permits its absence for 106 LEGACY named ones.  Grail''s
scanner searched ahead for a ``;'' within 32 characters and gave up if it
found none, so half of every pair disagreed: ``&gt;'' converted and
``&gt'' did not, ``&#123;'' converted and ``&#123'' did not.  Six of
test_htmlparser''s seven failures were this one function, which the
parser''s convert_charrefs path calls.

THE TABLE''S SHAPE WAS HALF THE FIX.  CPython''s html.entities.html5
holds every entity under ``name;'' and the legacy ones AGAIN under the
bare ``name'' -- 2231 keys for 2125 entities.  Grail''s held 2125 bare
names and nothing with a semicolon, which is wrong in both directions: a
lookup of ``gt;'' missed, and ``acE'' hit when only ``acE;'' should.
Regenerating it from upstream (scripts/generate_html5_entities.py) is
what lets the lookup be CPython''s with no special cases: an exact hit
wins, then the LONGEST PREFIX that is a key, keeping the unmatched tail
-- which is how ``&notit;'' answers the not-sign followed by ``it;''.

Numeric references get the three corrections upstream applies and Grail
applied none of: the Windows-1252 fixups the standard mandates (so
``&#128'' is a EURO SIGN, not U+0080), U+FFFD for a surrogate or
anything past U+10FFFF, and the empty string for the control and
non-character ranges.

FOUND BY THE REGRESSION HALF, and unrelated to any of that:
``html.escape(s, quote=False)'' -- the documented spelling -- answered
``escape() takes a different number of arguments''.  Only the
fixed-arity escape: and escape:_: existed, so a POSITIONAL second
argument worked and the keyword did not.  It has a varargs entry now.

Took test.test_htmlparser 7 -> 1; what is left there is a harness
signature issue with nothing to do with parsing.

See tests/python/html_unescape.py (13 checks, CPython-validated first).'
%

expectvalue /Class
doit
HtmlUnescapeTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
HtmlUnescapeTestCase removeAllMethods: 0.
HtmlUnescapeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: HtmlUnescapeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'html_unescape' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/html_unescape.py')
		name: 'html_unescape'.
%

category: 'Grail-Helpers'
method: HtmlUnescapeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: HtmlUnescapeTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: HtmlUnescapeTestCase
testTheSemicolonIsOptional
	"The whole of what was wrong: seven references each written both
	ways, and only the terminated half converted."

	self assertAll: #('unterminated' 'terminated_still_works')
%

category: 'Grail-Tests'
method: HtmlUnescapeTestCase
testOnlyForTheLegacyNames
	"``acE'' is not one of the 106, so only ``acE;'' is a key and the bare
	form stays literal.  This is the half a bare-names-only table gets
	wrong, and the reason the table was regenerated rather than patched."

	self assertAll: #('legacy_versus_not')
%

category: 'Grail-Tests'
method: HtmlUnescapeTestCase
testExactHitThenLongestPrefix
	"``&notit;'' is the not-sign followed by ``it;'', because ``notit;''
	is not a key and ``not'' is.  A one-character prefix never matches."

	self assertAll: #('longest_prefix')
%

category: 'Grail-Tests'
method: HtmlUnescapeTestCase
testTheThreeNumericCorrections
	"Windows-1252 fixups, U+FFFD for a surrogate or past U+10FFFF, and
	the empty string for the control and non-character ranges."

	self assertAll: #('numeric_corrections' 'degenerate')
%

category: 'Grail-Tests'
method: HtmlUnescapeTestCase
testTheParserConvertsWhatUnescapeConverts
	"convert_charrefs=True calls unescape, so it inherited the bug; the
	event path (convert_charrefs=False) was always right and stays so."

	self assertAll: #('parser_converts_unterminated'
		'parser_converts_unterminated_numeric'
		'parser_events_when_not_converting' 'parser_charref_events')
%

category: 'Grail-Tests'
method: HtmlUnescapeTestCase
testTheRegressionHalf
	"unescape() is used by Django and markupsafe, so ordinary text has to
	come through untouched.  This is also what found the escape() keyword
	gap, which had nothing to do with the change being made."

	self assertAll: #('ordinary_text' 'escape_is_untouched' 'round_trip')
%
