! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarningRegistryTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningRegistryTestCase comment:
'The registry: how a warning remembers it has already been shown.

Deciding to show a warning is the filters'' job.  Deciding whether it has
ALREADY been shown is a separate mechanism, and it is what makes the actions
differ from one another at all -- ``default'', ``module'' and ``once'' name the
same decision at three different scopes.  ``default'' is once per CALL SITE,
because the key carries the line number.  ``module'' rewrites the key with
line 0, so it is once per registry.  ``once'' does not use the caller''s
registry at all: it uses the module-level onceregistry keyed by (text,
category), with no file and no line, which is what makes it once per PROCESS.
``always''/``all'' remember nothing.

Grail had no registry.  It deduped through one module-global table keyed by
(text, category) with no line number in it, so every non-``always'' action
collapsed into the same thing -- ``default'' meant once per process rather
than once per call site -- and a registry= argument was accepted and ignored.

The registry carries a ``version'' stamped from the filter state and CLEARS
itself when that no longer matches, or a warning suppressed under one set of
filters would stay suppressed under new filters that would have shown it.
Grail''s _filters_version existed but never moved, so nothing ever
invalidated.  The stamp happens BEFORE the filters are consulted, which is
why even an ignored warning leaves the registry holding exactly ``version''.

Two module attributes had to become real: onceregistry and defaultaction are
documented, and both can be reassigned AND deleted.  Reading them out of the
SymbolDictionary made an assignment invisible -- Python writes to the
dynamic-instVar holder -- and deleting defaultaction raised, because an
ifAbsent: default leaves nothing there to delete.  ``filters'' is bound in
BOTH stores for the same reason in reverse: a Python delete reaches only one
of them, so the filtering survives ``del warnings.filters'' the way CPython''s
does.

See tests/python/warning_registry.py.'
%

expectvalue /Class
doit
WarningRegistryTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarningRegistryTestCase removeAllMethods: 0.
WarningRegistryTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningRegistryTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warning_registry' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warning_registry.py')
		name: 'warning_registry'.
%

category: 'Grail-Helpers'
method: WarningRegistryTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningRegistryTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - the three scopes'
method: WarningRegistryTestCase
testOnceIsOncePerProcess
	"No file and no line in the key, so the same message from anywhere else
	is still suppressed."

	self assertAll: #('once_is_once_per_process')
%

category: 'Grail-Tests - the three scopes'
method: WarningRegistryTestCase
testDefaultIsOncePerCallSite
	"The line number is in the key, so a second call site warns again.
	Grail''s old key had no line in it, which collapsed this into ``once''."

	self assertAll: #('default_is_once_per_line')
%

category: 'Grail-Tests - the three scopes'
method: WarningRegistryTestCase
testModuleIsOncePerRegistry
	"The key is rewritten with line 0, so the line stops mattering."

	self assertAll: #('module_is_once_per_registry')
%

category: 'Grail-Tests - the three scopes'
method: WarningRegistryTestCase
testAlwaysRemembersNothing
	"Three warnings, and nothing in the registry but the version stamp."

	self assertAll: #('always_never_dedupes')
%

category: 'Grail-Tests - the registry'
method: WarningRegistryTestCase
testTheRegistryIsStampedAndInvalidated
	"One real key plus the version -- and changing the filters clears it, or
	a warning suppressed under the old filters would stay suppressed under
	new ones that would have shown it."

	self assertAll: #('the_registry_is_stamped'
		'changing_the_filters_clears_the_registry')
%

category: 'Grail-Tests - the registry'
method: WarningRegistryTestCase
testAnIgnoredWarningStillStamps
	"The stamp happens before the filters are consulted, so a registry that
	caught nothing still holds exactly ``version''."

	self assertAll: #('an_ignored_warning_still_stamps')
%

category: 'Grail-Tests - the module attributes'
method: WarningRegistryTestCase
testOnceregistryCanBeReplaced
	"A Python assignment lands in the dynamic-instVar holder; reading only
	the SymbolDictionary made the reset invisible."

	self assertAll: #('onceregistry_can_be_replaced')
%

category: 'Grail-Tests - the module attributes'
method: WarningRegistryTestCase
testDefaultactionCanBeReplacedAndDeleted
	"Deleting it has to leave the module working.  An ifAbsent: default
	leaves nothing in the store for ``del'' to remove, so it raised."

	self assertAll: #('defaultaction_can_be_replaced'
		'defaultaction_can_be_deleted')
%

category: 'Grail-Tests - the module attributes'
method: WarningRegistryTestCase
testFiltersCanBeDeleted
	"``del warnings.filters'' is legal and the filtering keeps working --
	CPython keeps its own reference, and here the SymbolDictionary copy is
	what a Python delete cannot reach."

	self assertAll: #('filters_can_be_deleted')
%

category: 'Grail-Tests - an unknown call site'
method: WarningRegistryTestCase
testAnUnknownCallSiteDoesNotDedupe
	"The registry key carries the LINE, and Grail cannot always resolve one:
	the call site is recovered by raising to reach the live frame, and that
	occasionally comes back empty.

	Filing an unresolved site under a placeholder line would put two
	DIFFERENT call sites under the same key and drop the second warning --
	turning ``at most once per site'' into ``at most once'', silently, and
	only on the runs where the frame walk failed.  It cost a CI failure that
	did not reproduce locally on either GemStone version.

	So an unknown line dedupes NOTHING.  Showing a warning twice is
	recoverable; swallowing one is not."

	| w reg |
	w := (Python @env0:at: #warnings) @env0:___instance___.
	reg := KeyValueDictionary new.
	self assert: (w
		@env1:___recordAction___: 'default' text: 'msg'
		category: UserWarning lineno: nil registry: reg) equals: true.
	self assert: (w
		@env1:___recordAction___: 'default' text: 'msg'
		category: UserWarning lineno: nil registry: reg) equals: true.
	"...and nothing was filed under a stand-in line."
	self assert: reg isEmpty
%

category: 'Grail-Tests - an unknown call site'
method: WarningRegistryTestCase
testOnceStillDedupesWithoutALine
	"``once'' is the exception, and for a reason that falls out of its key:
	it has no line in it, so an unknown one costs it nothing."

	| w reg |
	w := (Python @env0:at: #warnings) @env0:___instance___.
	"Start from a clean onceregistry -- it is per-PROCESS by design, so it
	outlives everything else here.  This is the store a Python assignment
	writes to."
	w @env0:dynamicInstVarAt: #onceregistry put: KeyValueDictionary new.
	reg := KeyValueDictionary new.
	self assert: (w
		@env1:___recordAction___: 'once' text: 'unknown-site once'
		category: UserWarning lineno: nil registry: reg) equals: true.
	self assert: (w
		@env1:___recordAction___: 'once' text: 'unknown-site once'
		category: UserWarning lineno: nil registry: reg) equals: false
%
