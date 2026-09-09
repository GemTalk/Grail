! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrPaddingTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StrPaddingTestCase comment:
'center / ljust / rjust: the fill character, and where the odd one goes.

TWO DEFECTS, one loud and one silent.

THE LOUD ONE.  ``str'''' had only the ONE-argument forms, so every
``''''ab''''.center(6, ''''-'''')'''' raised ``center() takes a different
number of arguments''''.  That is what kept CPython''s test_decimal from
importing AT ALL -- 368 tests lost to a missing optional parameter.
``bytes'''' had the two-argument forms all along, which is why the gap
never showed up anywhere else.

THE SILENT ONE, found while fixing the first, and present in BOTH str and
bytes: the odd margin went to the wrong side.  CPython''s rule is

    left = marg // 2 + (marg & width & 1)

so when the margin AND the width are both odd the extra character goes
LEFT -- ``''''ab''''.center(7, ''''*'''')'''' is ''''***ab**''''.  Grail
answered ''''**ab***''''.  It had done so since long before the
two-argument form existed and nobody had noticed, because the
one-argument form pads with SPACES and nobody counts spaces.  A test here
pins the non-obvious half too: an odd margin with an EVEN width goes
RIGHT, so the rule is not ``odd margin goes left''''.

AND THE RECEIVER''S OWN TYPE.  A bytearray answers a bytearray, as upper
and slicing already did; these three hardcoded ``bytes''''.  They are not
the only bytes methods that lose the subclass -- replace and strip do too
-- but they are the three this change rewrites, and docs/Issues.md
records the wider inconsistency rather than this fixing it by halves.'
%

doit
StrPaddingTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
StrPaddingTestCase removeAllMethods: 0.
StrPaddingTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StrPaddingTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_padding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_padding.py')
		name: 'str_padding'.
%

category: 'Grail-Helpers'
method: StrPaddingTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StrPaddingTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: StrPaddingTestCase
testStrTakesAFillCharacter
	"The two-argument forms that did not exist.  The default stays a space,
	and a width that does not pad answers the string unchanged."

	self assertAll: #('str_takes_a_fill' 'the_default_is_still_a_space'
		'a_width_that_does_not_pad')
%

category: 'Grail-Tests'
method: StrPaddingTestCase
testAFillMustBeExactlyOneCharacter
	"CPython says so in the message; an empty or multi-character fill is a
	TypeError rather than a silent truncation."

	self assertAll: #('a_fill_must_be_one_character')
%

category: 'Grail-Tests'
method: StrPaddingTestCase
testTheOddPadGoesLeft
	"left = marg // 2 + (marg & width & 1).  Both odd puts the extra on the
	LEFT; an odd margin with an EVEN width puts it on the right, which is
	the half that shows the rule is not the obvious one."

	self assertAll: #('the_odd_pad_goes_left' 'an_even_margin_splits_evenly'
		'an_odd_margin_with_an_even_width_goes_right')
%

category: 'Grail-Tests'
method: StrPaddingTestCase
testBytesFollowsTheSameRule
	"The same off-by-one was in bytes, where the two-argument form HAD
	existed all along -- so it was reachable, and wrong, the whole time."

	self assertAll: #('the_same_rule_for_bytes' 'bytes_two_argument_forms')
%

category: 'Grail-Tests'
method: StrPaddingTestCase
testAByteArrayKeepsItsType
	"``self class'', not a hardcoded bytes -- the idiom upper already used."

	self assertAll: #('a_bytearray_answers_a_bytearray' 'and_the_right_bytes'
		'bytes_still_answers_bytes')
%

category: 'Grail-Tests'
method: StrPaddingTestCase
testTheResultIsAlwaysTheRequestedWidth
	"The arithmetic, across every width from 0 up -- the property the
	off-by-one never broke and a rewrite easily could."

	self assertAll: #('the_padding_is_the_right_length')
%
