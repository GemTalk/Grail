! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarningFiltersTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningFiltersTestCase comment:
'The filter list: what goes in it, and what it matches.

A filter is CPython''s five-tuple (action, message, category, module, lineno)
and the list is walked in order, first match wins.  Two things about it were
wrong in Grail, and both change which warnings a program sees.

WHAT MATCHES.  ``message'' and ``module'' are REGEXES, compiled at
filterwarnings() time and applied with #match -- ANCHORED at the start, not
searched for anywhere in the string.  Grail used a plain substring test, which
is a different predicate in BOTH directions: it accepted ``match'' against
``suffix match'', and it rejected ``hex*'' against ``hex/oct'' because it
compared the pattern literally rather than as a regex.  The message pattern is
case-insensitive and the module pattern is not.

WHAT GOES IN.  simplefilter used to CLEAR the whole list.  That reads like a
stronger version of inserting at the front and is not: it throws away filters
the caller installed deliberately, and it makes append meaningless.  CPython
inserts, and re-adding an equal filter PROMOTES it -- the old copy is removed
first, so it is not left further down waiting to be found by a later walk.
With append=True the rule inverts: the filter goes at the END, and an equal
one already present means do nothing, because appending would put it in the
wrong place.

The MODULE pattern is matched against the module NAME, which warn_explicit
derives from the filename when the caller does not supply one -- the filename
with a trailing ``.py'' stripped -- so one pattern covers both
``package.module'' and ``/path/to/package/module.py''.  Grail passed no module
at all, so a module-scoped filter could never be shown to apply.

Also here: the argument validation, which is load-bearing rather than
decorative.  A misspelled action silently matches nothing and the filter sits
in the list doing the opposite of what was asked.

See tests/python/warning_filters.py.'
%

expectvalue /Class
doit
WarningFiltersTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarningFiltersTestCase removeAllMethods: 0.
WarningFiltersTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningFiltersTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warning_filters' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warning_filters.py')
		name: 'warning_filters'.
%

category: 'Grail-Helpers'
method: WarningFiltersTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningFiltersTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - message matching'
method: WarningFiltersTestCase
testTheMessagePatternIsAnchored
	"#match, not #search: a prefix counts and a suffix does not.  The
	substring test Grail used accepted the suffix case."

	self assertAll: #('an_exact_message_matches' 'a_prefix_matches'
		'a_suffix_does_not_match' 'an_unrelated_message_does_not_match')
%

category: 'Grail-Tests - message matching'
method: WarningFiltersTestCase
testTheMessagePatternIsARegex
	"``hex*'' is ''he'' then any number of ''x'', so it applies to ''hex/oct''.
	Compared literally it applies to nothing."

	self assertAll: #('the_pattern_is_a_regex' 'the_pattern_is_not_a_literal'
		'the_message_pattern_ignores_case'
		'the_empty_pattern_matches_everything')
%

category: 'Grail-Tests - category matching'
method: WarningFiltersTestCase
testCategoryMatchesBySubclass
	self assertAll: #('a_subclass_matches_its_base'
		'an_unrelated_category_does_not_match')
%

category: 'Grail-Tests - the list'
method: WarningFiltersTestCase
testSimplefilterInsertsRatherThanClearing
	"resetwarnings() is the call that clears."

	self assertAll: #('simplefilter_does_not_clear_the_list'
		'resetwarnings_clears_the_list')
%

category: 'Grail-Tests - the list'
method: WarningFiltersTestCase
testARepeatedFilterIsPromoted
	"Removed first, then re-inserted at the front -- so no stale copy is left
	further down for a later walk to find."

	self assertAll: #('duplicates_are_promoted_not_repeated'
		'filterwarnings_promotes_too')
%

category: 'Grail-Tests - the list'
method: WarningFiltersTestCase
testAppendInvertsTheRule
	"The filter goes LAST, and an equal one already present means do nothing
	-- appending would put it in the wrong place."

	self assertAll: #('append_goes_last_and_never_duplicates'
		'an_appended_filter_does_not_win')
%

category: 'Grail-Tests - module matching'
method: WarningFiltersTestCase
testAnExplicitModuleIsMatched
	self assertAll: #('an_explicit_module_matches'
		'a_different_module_does_not_match')
%

category: 'Grail-Tests - module matching'
method: WarningFiltersTestCase
testTheModuleIsDerivedFromTheFilename
	"Filename minus a trailing .py, so one pattern covers both spellings of
	the same module."

	self assertAll: #('the_module_is_derived_from_the_filename'
		'the_derived_module_keeps_the_rest_of_the_path')
%

category: 'Grail-Tests - module matching'
method: WarningFiltersTestCase
testTheModulePatternIsAnchoredToo
	self assertAll: #('the_module_pattern_is_anchored'
		'the_module_pattern_is_not_searched')
%

category: 'Grail-Tests - validation'
method: WarningFiltersTestCase
testAnInvalidActionIsRejected
	"A misspelled action would otherwise sit in the list matching nothing."

	self assertAll: #('an_invalid_action_is_a_value_error'
		'simplefilter_validates_the_action')
%

category: 'Grail-Tests - validation'
method: WarningFiltersTestCase
testTheOtherArgumentsAreTypeChecked
	"message and module are strings, category is a Warning SUBCLASS -- int is
	a type but not one -- and lineno is a non-negative int."

	self assertAll: #('a_non_string_message_is_a_type_error'
		'a_non_class_category_is_a_type_error'
		'a_non_warning_category_is_a_type_error'
		'a_non_string_module_is_a_type_error'
		'a_non_int_lineno_is_a_type_error'
		'a_negative_lineno_is_a_value_error'
		'simplefilter_validates_the_lineno_type'
		'simplefilter_validates_the_lineno_sign')
%
