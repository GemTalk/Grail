Class {
	#name : 'OsWalkTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
OsWalkTestCase >> assertMatchesCPythonAt: key [
	"Compare through repr.  asString would flatten a list of triples and a
	tuple of the same names to the same text, and several answers here differ
	only in structure."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
OsWalkTestCase >> setUp [
	"Reload tests/python/os_walk.py fresh each test.  The module body builds
	its own tree and removes it again, so the tests read a recorded result
	rather than sharing filesystem state."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'os_walk' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_walk.py')
		name: 'os_walk'.

]

{ #category : 'Grail-Tests - Errors' }
OsWalkTestCase >> testAnUnlistableDirectoryIsSkippedNotYieldedEmpty [
	"CPython does not yield a directory it could not list.  Grail's did --
	os.listdir answered [] for a missing path rather than raising, so the
	walk produced one empty triple for a tree that does not exist."

	self assertMatchesCPythonAt: 'missing_top_yields_nothing'.

]

{ #category : 'Grail-Tests - Symlinks' }
OsWalkTestCase >> testASymlinkedDirectoryIsNotDescendedIntoByDefault [
	"The default that keeps os.walk from looping forever on a link back up
	the tree.  Here ``b/lnk'' points at ``a'', so following it silently walks
	a's whole subtree a second time."

	self assertMatchesCPythonAt: 'link_not_followed_by_default'.
	self assertMatchesCPythonAt: 'link_followed_when_asked'.

]

{ #category : 'Grail-Tests - Symlinks' }
OsWalkTestCase >> testASymlinkToADirectoryIsListedAsOne [
	"is_dir FOLLOWS symlinks, so the link belongs in dirnames -- whether it
	is DESCENDED INTO is a separate question, answered by followlinks."

	self assertMatchesCPythonAt: 'link_listed_as_dir'.

]

{ #category : 'Grail-Tests - Errors' }
OsWalkTestCase >> testATreeCanBeTornDownWithWalkItself [
	"The shape test_reprlib's tearDown uses, and the reason this work
	happened: walk bottom-up, remove the files, then the directories.  A
	symlinked directory is UNLINKED rather than rmdir'd, which is why the
	teardown needs islink as well as walk."

	self assertMatchesCPythonAt: 'teardown_removes_the_tree'.

]

{ #category : 'Grail-Tests - Laziness' }
OsWalkTestCase >> testBottomUpPruningHasNoEffect [
	"...and the deliberate ASYMMETRY.  Bottom-up fixes its descend list
	before yielding anything, because by the time the caller sees dirnames
	those directories have already been walked.  CPython documents this; an
	implementation that re-read the list after yielding -- the obvious way to
	share one code path with topdown -- would differ here."

	self assertMatchesCPythonAt: 'bottom_up_pruning_has_no_effect'.

]

{ #category : 'Grail-Tests - Ordering' }
OsWalkTestCase >> testBottomUpYieldsChildrenBeforeTheirParent [
	self assertMatchesCPythonAt: 'bottomup_children_first'.
	self assertMatchesCPythonAt: 'bottomup_root_last'.

]

{ #category : 'Grail-Tests - Contents' }
OsWalkTestCase >> testEveryDirectoryIsReportedWithItsOwnNames [
	"dirnames holds the SUBDIRECTORIES and filenames everything else, both as
	bare names rather than paths, for the root and every directory under it."

	self assertMatchesCPythonAt: 'topdown'.
	self assertMatchesCPythonAt: 'bottomup'.

]

{ #category : 'Grail-Tests - Symlinks' }
OsWalkTestCase >> testIsLinkDistinguishesLinksFromWhatTheyPointAt [
	"os.path.islink lstats rather than stats: stat FOLLOWS the link and would
	report the target's type, so every symlink would answer false.  And it
	answers false for what it cannot stat at all rather than raising, which
	is what makes it usable as a plain predicate."

	self assertMatchesCPythonAt: 'islink_on_link'.
	self assertMatchesCPythonAt: 'islink_on_dir'.
	self assertMatchesCPythonAt: 'islink_on_file'.
	self assertMatchesCPythonAt: 'islink_on_missing'.

]

{ #category : 'Grail-Tests - Errors' }
OsWalkTestCase >> testListdirRaisesForAMissingPathAndForAFile [
	"Both were SILENT.  GsFile's listing expands a pattern instead of opening
	a directory, so a missing path answered [] and a FILE answered a
	one-element list holding that file -- a directory containing itself,
	which is precisely what a recursive walker follows."

	self assertMatchesCPythonAt: 'listdir_missing'.
	self assertMatchesCPythonAt: 'listdir_on_a_file'.

]

{ #category : 'Grail-Tests - Errors' }
OsWalkTestCase >> testOnErrorSeesTheErrorAndMayAbortTheWalk [
	"onerror is how a caller learns about a directory the walk skipped; the
	default is to swallow it, which is what keeps one unreadable directory
	from ending a walk over a thousand readable ones.  Raising from onerror
	aborts -- the exception propagates out of the generator."

	self assertMatchesCPythonAt: 'onerror_is_called'.
	self assertMatchesCPythonAt: 'onerror_may_reraise'.

]

{ #category : 'Grail-Tests - Laziness' }
OsWalkTestCase >> testPruningStopsTheDescent [
	"THE test for os.walk being a real generator.  Removing a name from
	dirnames between yields stops the walk descending into it -- which a
	materialised list could not offer, having finished recursing before the
	caller ever saw it.  Every other test here would pass against a list."

	self assertMatchesCPythonAt: 'pruned'.
	self assertMatchesCPythonAt: 'walk_is_its_own_iterator'.

]

{ #category : 'Grail-Tests - Contents' }
OsWalkTestCase >> testTopdownAndBottomUpVisitTheSameDirectories [
	"Only the ORDER differs between the two -- if bottom-up dropped or
	duplicated a directory this is where it would show, independently of any
	claim about ordering."

	self assertMatchesCPythonAt: 'same_set_either_way'.

]

{ #category : 'Grail-Tests - Ordering' }
OsWalkTestCase >> testTopdownYieldsAParentBeforeItsChildren [
	"The invariant, not the literal sequence: sibling order is the
	filesystem's, and GsFile need not list in the same order as CPython's
	scandir."

	self assertMatchesCPythonAt: 'topdown_parents_first'.
	self assertMatchesCPythonAt: 'topdown_root_first'.

]
