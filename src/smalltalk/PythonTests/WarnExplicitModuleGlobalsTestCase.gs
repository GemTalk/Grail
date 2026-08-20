! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarnExplicitModuleGlobalsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarnExplicitModuleGlobalsTestCase comment:
'``warn_explicit(module_globals=...)'' -- how a warning finds its loader.

module_globals is passed so the machinery can fetch the SOURCE LINE to
display, which means finding the module''s loader.  Finding it is a
compatibility tangle: ``__loader__'' was the original home, ``__spec__.loader''
replaced it, and globals in the wild carry either, both, or a disagreeing pair
(gh-86298, gh-97850).

Three outcomes.  A real __loader__ WINS, and any disagreement with
__spec__.loader is announced with a DeprecationWarning.  With __loader__
absent or None, __spec__.loader must supply one, and failing to is an ERROR --
AttributeError when the attribute is missing, ValueError when it is present
but None.  With neither present, silence; empty globals are legal.

The rules do not live in the warning machinery.  They live in
importlib._bootstrap_external._bless_my_loader, which _warnings.c calls by
importing it by name -- visible in the DeprecationWarning''s filename, which
points at the frozen importlib rather than at the caller.  The pure Python
warnings.py skips the whole thing, which is why test_warnings runs these cases
only against the accelerated module and lets the Py variant degrade.

Grail vendors that function rather than rewriting it, because two of its rules
lean on Python''s own comparison semantics: the sentinel test is
``spec_loader in (missing, None)'', and ``in'' compares with ``=='', so a
loader equal to everything looks like the sentinel; and the disagreement test
is ``!='' rather than ``is not'', so one object stored in both places still
disagrees with itself if its __eq__ says so.  Written out in Smalltalk both
would quietly become identity checks.

This closed the gh86298 group in test_warnings -- 8 tests -- plus
FilterTests.test_module_globals, which pins the argument checks.

See tests/python/warn_explicit_module_globals.py.'
%

expectvalue /Class
doit
WarnExplicitModuleGlobalsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarnExplicitModuleGlobalsTestCase removeAllMethods: 0.
WarnExplicitModuleGlobalsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarnExplicitModuleGlobalsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warn_explicit_module_globals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warn_explicit_module_globals.py')
		name: 'warn_explicit_module_globals'.
%

category: 'Grail-Helpers'
method: WarnExplicitModuleGlobalsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarnExplicitModuleGlobalsTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - the argument'
method: WarnExplicitModuleGlobalsTestCase
testTheArgumentIsValidated
	"None means NOT SUPPLIED and must not crash (bpo-33509); anything else
	that is not a dict is a TypeError; an empty dict is legal."

	self assertAll: #('none_is_not_a_crash' 'true_is_rejected'
		'a_list_is_rejected' 'empty_dict_is_silent')
%

category: 'Grail-Tests - nothing to find'
method: WarnExplicitModuleGlobalsTestCase
testNeitherLoaderNorSpecIsSilent
	"Globals carrying no loader information at all are not an error -- the
	source line is simply unavailable."

	self assertAll: #('no_loader_no_spec_is_silent'
		'loader_none_no_spec_is_silent')
%

category: 'Grail-Tests - __loader__ absent'
method: WarnExplicitModuleGlobalsTestCase
testAnUnusableSpecLoaderRaises
	"With no __loader__ to fall back on, a __spec__ that cannot supply one is
	an error -- and WHICH error is the fussy part: AttributeError when the
	attribute is missing, ValueError when it is present but None.  Both carry
	the same message, so only the type tells them apart."

	self assertAll: #('spec_none_without_loader_raises_value_error'
		'loader_none_spec_none_raises_value_error'
		'loader_none_spec_loader_none_raises_value_error'
		'spec_without_loader_attr_raises_attribute_error')
%

category: 'Grail-Tests - __loader__ absent'
method: WarnExplicitModuleGlobalsTestCase
testASpecLoaderAloneSuffices
	"__spec__.loader is the modern spelling and needs no __loader__ beside
	it."

	self assertAll: #('spec_loader_alone_is_silent')
%

category: 'Grail-Tests - __loader__ present'
method: WarnExplicitModuleGlobalsTestCase
testAMissingSpecLoaderOnlyDeprecates
	"A real __loader__ turns every one of those errors into a
	DeprecationWarning: the old attribute still works, it is just on notice."

	self assertAll: #('loader_without_spec_deprecates'
		'loader_with_spec_none_deprecates'
		'loader_with_spec_lacking_loader_deprecates'
		'loader_with_spec_loader_none_deprecates')
%

category: 'Grail-Tests - __loader__ present'
method: WarnExplicitModuleGlobalsTestCase
testDisagreementIsItsOwnMessage
	"Two DIFFERENT loaders is the transition''s real hazard, and says so;
	one loader in both places is silent."

	self assertAll: #('two_different_loaders_disagree'
		'one_loader_in_both_places_is_silent')
%

category: 'Grail-Tests - the comparison quirks'
method: WarnExplicitModuleGlobalsTestCase
testTheSentinelTestUsesEquality
	"``spec_loader in (missing, None)'' compares with ==, so a loader equal to
	everything IS the sentinel as far as that test can tell, and the missing
	branch fires with a perfectly good object sitting there."

	self assertAll: #('eq_always_takes_the_missing_branch')
%

category: 'Grail-Tests - the comparison quirks'
method: WarnExplicitModuleGlobalsTestCase
testDisagreementUsesEqualityToo
	"``loader != spec_loader'', not ``is not'' -- so one object stored in both
	places still disagrees with itself if its __eq__ says so."

	self assertAll: #('eq_never_disagrees_with_itself')
%

category: 'Grail-Tests - how it composes'
method: WarnExplicitModuleGlobalsTestCase
testTheDeprecationIsAnOrdinaryWarning
	"It arrives BEFORE the warning that was asked for, because the loader is
	resolved first; it obeys the filters like anything else; and an error case
	emits nothing at all."

	self assertAll: #('the_deprecation_comes_first'
		'the_deprecation_obeys_filters' 'an_error_suppresses_the_warning')
%

category: 'Grail-Tests - how it composes'
method: WarnExplicitModuleGlobalsTestCase
testNameIsOnlyNeededToAskTheLoader
	"__name__ is what gets passed to get_source; the loader CHECKS run
	without it."

	self assertAll: #('name_is_not_required_for_the_checks')
%
