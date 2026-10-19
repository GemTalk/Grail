Class {
	#name : 'OsPathPredicateTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
OsPathPredicateTestCase >> assertMatchesCPythonAt: key [
	"Compare through repr -- the file SIZES below are the assertions that say
	which file was reached, and asString would let 0 and '0' pass for each
	other."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
OsPathPredicateTestCase >> setUp [
	"Reload tests/python/os_path_predicates.py fresh each test.  The module
	body builds its tree, records every answer, and removes the tree again."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'os_path_predicates' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_path_predicates.py')
		name: 'os_path_predicates'.

]

{ #category : 'Grail-Tests - Symlinks' }
OsPathPredicateTestCase >> testADanglingLinkIsALinkButDoesNotExist [
	"The case that decides lstat versus stat.  islink must LSTAT -- following
	would find nothing and answer false -- while exists must NOT, because
	CPython's exists follows and there is nothing at the far end.  A single
	shared probe would get one of the two backwards."

	self assertMatchesCPythonAt: 'broken_link_is_a_link'.
	self assertMatchesCPythonAt: 'broken_link_does_not_exist'.
	self assertMatchesCPythonAt: 'broken_link_is_not_a_file'.
	self assertMatchesCPythonAt: 'broken_link_is_listed'.

]

{ #category : 'Grail-Tests - Dollar In A Filename' }
OsPathPredicateTestCase >> testAFileWhoseNameHoldsADollarIsListed [
	"It was absent from os.listdir entirely: the public directory listing
	expands its argument as a shell pattern, and ``a$b'' expanded to ``a''."

	self assertMatchesCPythonAt: 'listdir_includes_dollar_names'.

]

{ #category : 'Grail-Tests - File Types' }
OsPathPredicateTestCase >> testANonRegularFileCanStillBeRemoved [
	"Reclassifying a fifo must not make it unremovable -- that would trade a
	wrong answer for a leak."

	self assertMatchesCPythonAt: 'fifo_can_be_removed'.
	self assertMatchesCPythonAt: 'fifo_is_gone'.

]

{ #category : 'Grail-Tests - Missing Paths' }
OsPathPredicateTestCase >> testAPredicateNeverRaisesButStatDoes [
	"The predicates answer a Boolean for anything, including a path that
	cannot be stat'd at all; os.stat on the same path raises.  That split is
	why there are two stat helpers -- a nil-answering one for the predicates
	and a signalling one for os.stat -- rather than one with a flag."

	self assertMatchesCPythonAt: 'missing_exists'.
	self assertMatchesCPythonAt: 'missing_isfile'.
	self assertMatchesCPythonAt: 'missing_isdir'.
	self assertMatchesCPythonAt: 'missing_islink'.
	self assertMatchesCPythonAt: 'missing_stat_raises'.

]

{ #category : 'Grail-Tests - Dollar In A Filename' }
OsPathPredicateTestCase >> testAVariableLikeNameIsNotSplitAtTheDollar [
	"``has$HOMEin'' is ONE undefined variable to a shell, not ``$HOME''
	followed by ``in'', so an expanding path lost the whole tail rather than
	substituting a home directory.  Worth its own case: a fix that merely
	special-cased known variable names would still fail it."

	self assertMatchesCPythonAt: 'dollar_home_like_name'.

]

{ #category : 'Grail-Tests - File Types' }
OsPathPredicateTestCase >> testDirectoriesAndFilesStayDistinct [
	"The ordinary cases, which the rewrite had to keep -- isdir no longer
	consults GsFile>>isServerDirectory:, whose answer for a MISSING path is
	nil rather than false, and which therefore could not be used as a Boolean
	without a preceding existence check that had the expansion flaw."

	self assertMatchesCPythonAt: 'dir_is_a_dir'.
	self assertMatchesCPythonAt: 'dir_is_not_a_file'.
	self assertMatchesCPythonAt: 'file_is_not_a_dir'.

]

{ #category : 'Grail-Tests - File Types' }
OsPathPredicateTestCase >> testIsFileMeansRegularFile [
	"A fifo is not a regular file, and isfile used to ask ``is it not a
	directory'' -- so it answered True for a fifo, a socket and a device
	alike.  A fifo is the easiest of the three to create portably; the rule
	it pins covers all of them."

	self assertMatchesCPythonAt: 'fifo_exists'.
	self assertMatchesCPythonAt: 'fifo_is_not_a_file'.
	self assertMatchesCPythonAt: 'fifo_is_not_a_dir'.
	self assertMatchesCPythonAt: 'fifo_is_not_a_link'.
	self assertMatchesCPythonAt: 'fifo_is_listed'.

]

{ #category : 'Grail-Tests - Dollar In A Filename' }
OsPathPredicateTestCase >> testTheOtherShellCharactersStayLiteral [
	"``*'' and ``~'' were never expanded, and must not start being.  A fix
	that reached for a shell to solve the ``$'' problem would be the same bug
	wearing a new hat, and these are what would catch it."

	self assertMatchesCPythonAt: 'star_is_literal'.
	self assertMatchesCPythonAt: 'tilde_is_literal'.
	self assertMatchesCPythonAt: 'star_is_not_a_glob'.

]

{ #category : 'Grail-Tests - Dollar In A Filename' }
OsPathPredicateTestCase >> testThePredicatesAnswerAboutTheFileThatWasNamed [
	"THE ASSERTION THAT MATTERS IS THE SIZE, not the boolean.  ``a$b'' is
	empty and the decoy ``a'' beside it holds six bytes, so 0 means the right
	file was reached and 6 means the expanded path won.  exists answering
	True proves nothing on its own -- it answered True before, about ``a''."

	self assertMatchesCPythonAt: 'dollar_stat_reaches_the_right_file'.
	self assertMatchesCPythonAt: 'decoy_is_a_different_file'.
	self assertMatchesCPythonAt: 'dollar_exists'.
	self assertMatchesCPythonAt: 'dollar_isfile'.
	self assertMatchesCPythonAt: 'dollar_isdir'.
	self assertMatchesCPythonAt: 'dollar_islink'.

]

{ #category : 'Grail-Tests - Symlinks' }
OsPathPredicateTestCase >> testThePredicatesFollowLinksExceptIsLink [
	self assertMatchesCPythonAt: 'link_exists'.
	self assertMatchesCPythonAt: 'link_is_a_dir'.
	self assertMatchesCPythonAt: 'link_is_a_link'.

]
