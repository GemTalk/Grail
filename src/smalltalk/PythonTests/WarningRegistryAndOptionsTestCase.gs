! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarningRegistryAndOptionsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningRegistryAndOptionsTestCase comment:
'Four small contracts of warn(), and the _wm discipline under them.

THE CALLER GETS A __warningregistry__, created in its module''s globals on
first use and stamped with the filter version EVEN FOR AN IGNORED WARNING --
the stamp precedes the filters.  This forced an honest reorder of ___warn___:
the call site and registry now resolve before the filter walk, CPython''s own
cost model, retiring the pay-only-past-the-filters optimisation that could
neither stamp nor short-circuit.

A BROKEN __str__ IS THE CALLER''S TO SEE (issue 6415): only a MISSING
__str__ falls back to the Smalltalk rendering; an exception raised INSIDE
one propagates out of warn().

THE CATEGORY IS VALIDATED: None or a Warning subclass, else TypeError naming
the offender -- unless the MESSAGE is a Warning instance, which supplies its
own class and the slot is ignored.

_setoption INSTALLS A FILTER THAT WORKS.  The parser is CPython''s own,
delegated to -- and the delegation discipline is the part with a history.
The vendored _py_warnings is ONE object shared by Grail''s delegates and the
test suite''s py-variant handle, and every global it touches reads off _wm:
a permanent reclaim broke the py-variant (28 of 187 against 76), never
claiming installed filters into nowhere.  Every delegate now claims _wm for
the duration of its call and restores WHATEVER it found, including None --
the only claim invisible to the other driver.

See tests/python/warning_registry_and_options.py.'
%

expectvalue /Class
doit
WarningRegistryAndOptionsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarningRegistryAndOptionsTestCase removeAllMethods: 0.
WarningRegistryAndOptionsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningRegistryAndOptionsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warning_registry_and_options' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warning_registry_and_options.py')
		name: 'warning_registry_and_options'.
%

category: 'Grail-Helpers'
method: WarningRegistryAndOptionsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningRegistryAndOptionsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the caller registry'
method: WarningRegistryAndOptionsTestCase
testTheCallerGetsARegistry
	"Created on first use, stamped even when the warning is ignored -- the
	stamp precedes the filters, which is what forced the ___warn___ reorder."

	self assertAll: #('an_ignored_warn_stamps_the_callers_registry'
		'a_shown_warn_is_recorded_beside_the_stamp')
%

category: 'Grail-Tests - message and category'
method: WarningRegistryAndOptionsTestCase
testABrokenStrPropagates
	self assertAll: #('a_broken_str_raises_out_of_warn')
%

category: 'Grail-Tests - message and category'
method: WarningRegistryAndOptionsTestCase
testTheCategoryIsValidated
	self assertAll: #('a_string_category_is_rejected'
		'an_unrelated_class_is_rejected'
		'a_warning_instance_in_the_category_slot_is_rejected'
		'none_defaults_to_userwarning'
		'a_warning_message_overrides_the_category_slot')
%

category: 'Grail-Tests - _setoption'
method: WarningRegistryAndOptionsTestCase
testSetoptionInstallsAWorkingFilter
	self assertAll: #('setoption_installs_a_working_filter'
		'too_many_fields_is_an_optionerror' 'a_bogus_action_is_an_optionerror'
		'a_numeric_category_is_an_optionerror'
		'an_unknown_dotted_category_is_an_optionerror')
%

category: 'Grail-Tests - the _wm discipline'
method: WarningRegistryAndOptionsTestCase
testADelegateCallRestoresWm
	"The vendored module''s _wm holds after a delegated call exactly what it
	held before -- the invariant that keeps Grail''s delegates and the
	py-variant tests from stealing the module out from under each other.
	Checked around a real delegate call, for both a foreign value and the
	unset state."

	| w pw sentinel before after |
	w := (Python @env0:at: #warnings) @env0:___instance___.
	pw := w @env1:___pyWarningsModule___.
	self assert: pw notNil description: '_py_warnings not importable'.
	sentinel := Object new.
	pw @env1:_set_module: sentinel.
	w @env1:___pyWarningsCall___: #'_getaction' with: { 'ignore' } with: nil.
	after := [pw @env1:___pyAttrLoad___: #'_wm']
		on: AbstractException do: [:e | nil].
	self assert: after == sentinel
		description: 'foreign _wm was not restored'.
	pw @env1:_set_module: None.
	w @env1:___pyWarningsCall___: #'_getaction' with: { 'ignore' } with: nil.
	after := [pw @env1:___pyAttrLoad___: #'_wm']
		on: AbstractException do: [:e | nil].
	self assert: after == None
		description: 'unset _wm was not restored to None'.
	"Leave the module pointed at Grail, the interpreter-init state."
	pw @env1:_set_module: w.
%
