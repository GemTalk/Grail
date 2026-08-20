! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CatchWarningsStateTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CatchWarningsStateTestCase comment:
'What ``catch_warnings()'' saves, and what it puts back.

The name undersells it.  It is not only a filter snapshot -- it isolates the
whole of the warning machinery''s mutable state, and the part Grail left out
was the DISPLAY.  A block that replaced ``showwarning'' left the replacement
installed for good, so every later warning went to a logger nobody was
reading.  That is a leak with no error attached: the warnings simply stop
arriving.  In test_warnings it leaked out of test_catch_warnings_restore and
quietly broke three later tests in other classes.

FILTERS are now swapped for a copy rather than snapshotted and refilled.
Code inside sees a DIFFERENT list object, and the original object -- not an
equal one -- comes back.  Restoring in place also cannot survive
``warnings.filters = [...]'' inside the block, which rebinds the name.

SHOWWARNING is saved and restored, and with record=True also RESET on entry:
the recorder IS the display, so an override installed before entering still
lets warnings be recorded (issue #28835), while one installed INSIDE the
block takes precedence -- it replaced the display more recently.  Grail had
that order backwards, so assigning showwarning inside a recording block did
nothing at all.

Detecting an override needed care.  It cannot be ``is an attribute bound'',
because merely READING warnings.showwarning binds one: the attribute
machinery memoises the BoundMethod it builds into the same store a Python
assignment writes to.  A memoised BoundMethod is recognisable by its receiver
and selector; anything else is a real override.

Also here: the single-use guard (``entered'' means HAS BEEN entered, not IS
inside, so exiting twice re-restores rather than raising); CPython 3.11''s
catch_warnings(action=..., category=...) shorthand; and the rule that a
warning raised as an INSTANCE is filtered under its own class rather than
under UserWarning.

See tests/python/catch_warnings_state.py.'
%

expectvalue /Class
doit
CatchWarningsStateTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CatchWarningsStateTestCase removeAllMethods: 0.
CatchWarningsStateTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CatchWarningsStateTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'catch_warnings_state' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/catch_warnings_state.py')
		name: 'catch_warnings_state'.
%

category: 'Grail-Helpers'
method: CatchWarningsStateTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CatchWarningsStateTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - filters'
method: CatchWarningsStateTestCase
testFiltersAreSwappedForACopy
	"A DIFFERENT list inside, and the ORIGINAL object back on exit -- not an
	equal one.  Callers compare by identity, and a rebinding inside the block
	could not otherwise be undone."

	self assertAll: #('filters_are_swapped_for_a_copy'
		'a_filter_added_inside_does_not_escape')
%

category: 'Grail-Tests - showwarning'
method: CatchWarningsStateTestCase
testShowwarningIsRestored
	"The part that used to leak."

	self assertAll: #('showwarning_is_restored')
%

category: 'Grail-Tests - showwarning'
method: CatchWarningsStateTestCase
testRecordingResetsAnEarlierOverride
	"record=True resets showwarning on entry, so an override installed BEFORE
	the block does not swallow what the block is trying to record."

	self assertAll: #('record_resets_showwarning')
%

category: 'Grail-Tests - showwarning'
method: CatchWarningsStateTestCase
testAnOverrideInsideBeatsTheRecorder
	"...but one installed INSIDE does take precedence, because it replaced
	the display more recently.  Grail checked the recorder first, so this
	assignment used to do nothing."

	self assertAll: #('an_override_inside_beats_the_recorder')
%

category: 'Grail-Tests - the message'
method: CatchWarningsStateTestCase
testEverythingSeesAWarningInstance
	"showwarning''s first argument is an INSTANCE, never the raw text, and so
	is a record''s ``message'' -- which is what lets either read
	``message.args[0]''.  The recorder coerced and the hook path did not."

	self assertAll: #('the_override_receives_a_warning_instance'
		'the_record_holds_instances_too')
%

category: 'Grail-Tests - single use'
method: CatchWarningsStateTestCase
testTheManagerIsSingleUse
	"Entering twice would overwrite the saved state with the state it had
	already installed."

	self assertAll: #('exit_without_entering_raises' 'entering_twice_raises'
		'entering_twice_without_record_raises')
%

category: 'Grail-Tests - single use'
method: CatchWarningsStateTestCase
testExitingTwiceIsNotAnError
	"``entered'' means HAS BEEN entered, not IS inside.  A stricter guard
	would turn Grail''s double __exit__ on a raising exit -- a codegen bug of
	its own -- into an error in code doing nothing wrong."

	self assertAll: #('exiting_twice_is_not_an_error')
%

category: 'Grail-Tests - the 3.11 shorthand'
method: CatchWarningsStateTestCase
testActionInstallsAFilterInsideTheIsolation
	"catch_warnings(action=..., category=...) installs the filter inside the
	isolation it was already providing, so it disappears with it."

	self assertAll: #('action_ignore_installs_a_filter'
		'action_error_honours_category'
		'the_shorthand_filter_does_not_escape')
%
